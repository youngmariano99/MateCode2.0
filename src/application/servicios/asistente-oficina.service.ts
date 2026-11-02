import { db } from "../../offline/dexie/db";
import {
  obtenerDiaTareaHoy,
  lunesDeLaSemana,
  sumarDias,
} from "../../domain/entidades/personal.entity";
import { segundosTrabajados } from "../../domain/entidades/sesion-trabajo.entity";
import { calcularEstadoHito } from "../../domain/entidades/recurso-oficina.entity";
import type {
  IntencionAsistente,
  DatosPreprocesadosHoy,
  DatosPreprocesadosSemana,
  DatosPreprocesadosPlanificacion,
  EntregablePisoAnalisis,
  ContextoAsistentePayload,
  RespuestaAsistenteOficina,
  LogErrorAPI,
} from "../../domain/entidades/asistente-oficina.entity";

export class AsistenteOficinaService {
  /**
   * Recolecta y calcula numéricamente todas las métricas de hoy.
   */
  async recolectarDatosHoy(): Promise<DatosPreprocesadosHoy> {
    const hoy = obtenerDiaTareaHoy();
    const actividades = await db.actividad
      .where("diaTarea")
      .equals(hoy)
      .toArray();

    const entregables = await db.entregable.toArray();
    const entregablesMap = new Map(entregables.map((e) => [e.id, e]));

    const completadas = actividades.filter((a) => a.estado === "completada");
    const pendientes = actividades.filter(
      (a) => a.estado === "pendiente" && a.tipo !== "backlog"
    );

    // Calcular minutos trabajados en sesiones hoy
    const ahoraMs = Date.now();
    const inicioHoyMs = new Date(`${hoy}T00:00:00`).getTime();
    const finHoyMs = new Date(`${hoy}T23:59:59.999`).getTime();

    const sesiones = await db.sesion_trabajo.toArray();
    const sesionesHoy = sesiones.filter(
      (s) => s.iniciadoEn >= inicioHoyMs && s.iniciadoEn <= finHoyMs
    );
    const segundosTotales = sesionesHoy.reduce(
      (acc, s) => acc + segundosTrabajados(s, ahoraMs),
      0
    );
    const minutosTrabajadosHoy = Math.round(segundosTotales / 60);

    // Hitos y fechas importantes en alerta
    const recursosHitos = await db.recurso_oficina
      .where("tipo")
      .equals("hito_fecha")
      .toArray();

    const hitosProximos = recursosHitos
      .map((h) => {
        const alerta = calcularEstadoHito(h, hoy);
        return alerta && alerta.debeAvisar
          ? { titulo: h.titulo, mensajeAlerta: alerta.mensajeAlerta }
          : null;
      })
      .filter(
        (h): h is { titulo: string; mensajeAlerta: string } => h !== null
      );

    const total = actividades.length;
    const porcentajeCumplimiento =
      total > 0 ? Math.round((completadas.length / total) * 100) : 0;

    return {
      fecha: hoy,
      totalActividades: total,
      completadasCount: completadas.length,
      pendientesCount: pendientes.length,
      porcentajeCumplimiento,
      minutosTrabajadosHoy,
      tareasHechas: completadas.map((a) => ({
        descripcion: a.descripcion,
        progreso: a.progresoActual,
        meta: a.cantidadObjetivo,
        unidad: a.unidad,
      })),
      tareasPendientes: pendientes.map((a) => {
        const ent = a.entregableId
          ? entregablesMap.get(a.entregableId)
          : undefined;
        let pisoMinimo: number | undefined = undefined;
        if (a.cantidadObjetivo && ent?.bandaAceptable) {
          pisoMinimo = Math.round(
            a.cantidadObjetivo * (ent.bandaAceptable / 100)
          );
        }
        return {
          descripcion: a.descripcion,
          progreso: a.progresoActual ?? 0,
          meta: a.cantidadObjetivo,
          unidad: a.unidad,
          pisoMinimo,
        };
      }),
      hitosProximos,
    };
  }

  /**
   * Recolecta métricas cuantitativas de la semana actual.
   */
  async recolectarDatosSemana(): Promise<DatosPreprocesadosSemana> {
    const hoy = obtenerDiaTareaHoy();
    const lunes = lunesDeLaSemana(hoy);
    const domingo = sumarDias(lunes, 6);

    const actividadesSemana = await db.actividad
      .where("diaTarea")
      .between(lunes, domingo, true, true)
      .toArray();

    const completadas = actividadesSemana.filter(
      (a) => a.estado === "completada"
    );

    const inicioSemanaMs = new Date(`${lunes}T00:00:00`).getTime();
    const finSemanaMs = new Date(`${domingo}T23:59:59.999`).getTime();
    const ahoraMs = Date.now();

    const sesiones = await db.sesion_trabajo.toArray();
    const sesionesSemana = sesiones.filter(
      (s) => s.iniciadoEn >= inicioSemanaMs && s.iniciadoEn <= finSemanaMs
    );
    const minutosTrabajadosSemana = Math.round(
      sesionesSemana.reduce(
        (acc, s) => acc + segundosTrabajados(s, ahoraMs),
        0
      ) / 60
    );

    const entregables = await db.entregable
      .where("estado")
      .equals("activo")
      .toArray();

    const total = actividadesSemana.length;
    const porcentajeSemana =
      total > 0 ? Math.round((completadas.length / total) * 100) : 0;

    return {
      semanaInicio: lunes,
      semanaFin: domingo,
      totalActividadesSemana: total,
      completadasSemana: completadas.length,
      porcentajeSemana,
      minutosTrabajadosSemana,
      entregablesActivos: entregables.map((e) => ({
        titulo: e.titulo,
        progreso: e.progresoActual,
        meta: e.cantidadObjetivo,
        unidad: e.unidad,
      })),
    };
  }

  /**
   * Analiza cuantitativamente qué entregables están cerca o lejos de su piso mínimo.
   */
  async recolectarDatosPlanificacion(): Promise<DatosPreprocesadosPlanificacion> {
    const hoy = obtenerDiaTareaHoy();
    const hoyMs = new Date(`${hoy}T00:00:00Z`).getTime();
    const msPorDia = 86400000;

    const entregables = await db.entregable
      .where("estado")
      .equals("activo")
      .toArray();

    const proyectos = await db.proyecto_personal.toArray();
    const proyectosMap = new Map(proyectos.map((p) => [p.id, p]));

    const analisis: EntregablePisoAnalisis[] = entregables
      .filter((e) => e.cantidadObjetivo !== undefined && e.cantidadObjetivo > 0)
      .map((e) => {
        const meta = e.cantidadObjetivo!;
        const banda = e.bandaAceptable ?? 70;
        const pisoMinimo = Math.round((meta * banda) / 100);
        const progreso = e.progresoActual ?? 0;
        const distanciaAlPiso = Math.max(0, pisoMinimo - progreso);
        const alcanzoPiso = progreso >= pisoMinimo;
        const porcentajeObjetivo = Math.round((progreso / meta) * 100);

        const limiteMs = new Date(`${e.diaLimite}T00:00:00Z`).getTime();
        const diasRestantes = Math.round((limiteMs - hoyMs) / msPorDia);

        return {
          id: e.id,
          titulo: e.titulo,
          proyectoTitulo: e.proyectoId
            ? proyectosMap.get(e.proyectoId)?.titulo
            : undefined,
          progresoActual: progreso,
          cantidadObjetivo: meta,
          unidad: e.unidad || "unidades",
          bandaAceptable: banda,
          pisoMinimo,
          distanciaAlPiso,
          alcanzoPiso,
          porcentajeObjetivo,
          diaLimite: e.diaLimite,
          diasRestantes,
        };
      });

    const entregablesEnRiesgo = analisis
      .filter((a) => !a.alcanzoPiso)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);

    const entregablesAlDia = analisis
      .filter((a) => a.alcanzoPiso)
      .sort((a, b) => b.porcentajeObjetivo - a.porcentajeObjetivo);

    return {
      fecha: hoy,
      totalEntregablesActivos: analisis.length,
      entregablesQueAlcanzaronPiso: entregablesAlDia.length,
      entregablesEnRiesgo,
      entregablesAlDia,
    };
  }

  /**
   * Generador Determinista de Respuestas (Modo Ahorro = 0 tokens).
   * Redacta con datos exactos sin realizar llamadas externas.
   */
  generarReporteDeterminista(payload: ContextoAsistentePayload): string {
    const { intencion, datosHoy, datosSemana, datosPlanificacion } = payload;

    if (intencion === "resumen_hoy" && datosHoy) {
      const {
        fecha,
        totalActividades,
        completadasCount,
        pendientesCount,
        porcentajeCumplimiento,
        minutosTrabajadosHoy,
        tareasHechas,
        tareasPendientes,
        hitosProximos,
      } = datosHoy;

      let md = `### 📋 Estado de tu jornada (${fecha})\n\n`;
      md += `* **Progreso del día:** ${completadasCount} de ${totalActividades} tareas completadas (**${porcentajeCumplimiento}%**).\n`;
      md += `* **Tiempo invertido:** ${minutosTrabajadosHoy} minutos registrados en sesiones de trabajo.\n\n`;

      if (hitosProximos.length > 0) {
        md += `#### ⚠️ Hitos y Fechas Clave:\n`;
        hitosProximos.forEach((h) => {
          md += `- **${h.titulo}**: ${h.mensajeAlerta}\n`;
        });
        md += `\n`;
      }

      if (tareasHechas.length > 0) {
        md += `#### ✅ Lo que ya completaste:\n`;
        tareasHechas.forEach((t) => {
          const detalle =
            t.progreso !== undefined && t.meta
              ? ` (${t.progreso}/${t.meta} ${t.unidad || ""})`
              : "";
          md += `- ~~${t.descripcion}~~${detalle}\n`;
        });
        md += `\n`;
      }

      if (tareasPendientes.length > 0) {
        md += `#### ⏳ Pendiente para hoy (${pendientesCount}):\n`;
        tareasPendientes.forEach((t) => {
          const detallePiso =
            t.pisoMinimo !== undefined && t.meta
              ? ` — Meta: ${t.meta} ${t.unidad || ""} (Piso: ${t.pisoMinimo})`
              : t.meta
                ? ` — Meta: ${t.meta} ${t.unidad || ""}`
                : "";
          md += `- **${t.descripcion}**${detallePiso}\n`;
        });
        md += `\n> **Recomendación:** Iniciá con la primera tarea pendiente activando un bloque de 45 o 60 minutos en el temporizador.`;
      } else {
        md += `🎉 **¡Completaste todas las tareas planificadas para hoy!** Podés usar el tiempo restante para adelantar tareas del backlog o descansar.`;
      }

      return md;
    }

    if (intencion === "resumen_semana" && datosSemana) {
      const {
        semanaInicio,
        semanaFin,
        totalActividadesSemana,
        completadasSemana,
        porcentajeSemana,
        minutosTrabajadosSemana,
        entregablesActivos,
      } = datosSemana;

      const horas = (minutosTrabajadosSemana / 60).toFixed(1);
      let md = `### 📊 Balance Semanal (${semanaInicio} al ${semanaFin})\n\n`;
      md += `* **Cumplimiento general:** ${completadasSemana} de ${totalActividadesSemana} actividades completadas (**${porcentajeSemana}%**).\n`;
      md += `* **Dedicación acumulada:** ${minutosTrabajadosSemana} minutos (~${horas} hs de foco).\n\n`;

      if (entregablesActivos.length > 0) {
        md += `#### 🎯 Entregables en curso (${entregablesActivos.length}):\n`;
        entregablesActivos.slice(0, 5).forEach((e) => {
          const cant =
            e.meta !== undefined
              ? `${e.progreso}/${e.meta} ${e.unidad || ""}`
              : `${e.progreso} ${e.unidad || ""}`;
          md += `- **${e.titulo}**: ${cant}\n`;
        });
        if (entregablesActivos.length > 5) {
          md += `- *(y ${entregablesActivos.length - 5} entregables más en seguimiento)*\n`;
        }
      }

      return md;
    }

    if (intencion === "ajuste_planificacion" && datosPlanificacion) {
      const {
        totalEntregablesActivos,
        entregablesQueAlcanzaronPiso,
        entregablesEnRiesgo,
      } = datosPlanificacion;

      let md = `### 🎯 Diagnóstico de Pisos Mínimos de Planificación\n\n`;
      md += `* **Total entregables analizados:** ${totalEntregablesActivos}\n`;
      md += `* **Piso alcanzado:** ${entregablesQueAlcanzaronPiso} entregables ya cumplieron o superaron su banda aceptable.\n`;
      md += `* **En riesgo / por debajo del piso:** ${entregablesEnRiesgo.length} entregables.\n\n`;

      if (entregablesEnRiesgo.length > 0) {
        md += `#### ⚠️ Prioridades para asegurar el piso mínimo:\n`;
        entregablesEnRiesgo.slice(0, 4).forEach((e) => {
          md += `* **${e.titulo}** ${e.proyectoTitulo ? `(*${e.proyectoTitulo}*)` : ""}\n`;
          md += `  - Progreso: ${e.progresoActual}/${e.cantidadObjetivo} ${e.unidad} (${e.porcentajeObjetivo}%)\n`;
          md += `  - **Falta para el piso mínimo (${e.bandaAceptable}%):** **${e.distanciaAlPiso} ${e.unidad}**\n`;
          md += `  - Tiempo restante: ${e.diasRestantes} días (vence ${e.diaLimite})\n`;
        });
        md += `\n> **Consejo táctico:** Concentrate en los entregables que vencen más pronto para asegurar al menos su banda mínima aceptable.`;
      } else {
        md += `✨ **¡Excelente! Todos tus entregables activos han alcanzado o superado su piso mínimo.** Podés apuntar al 100% de la meta con tranquilidad.`;
      }

      return md;
    }

    // Respuesta genérica para consulta libre en modo ahorro
    return `### 💡 Copiloto de Oficina (Modo Ahorro)\n\nHas consultado: *"${payload.consultaUsuario || "Estado general"}"*.\n\nEn Modo Ahorro los datos son extraídos determinísticamente de tu base local sin consumir tokens. Podés usar las opciones rápidas: **¿Qué hice hoy y qué me falta?**, **Balance semanal** o **Diagnóstico de pisos mínimos**.`;
  }

  /**
   * Consulta al Copiloto de Oficina:
   * Si modoAhorro = true: genera en 0ms y 0 tokens localmente.
   * Si modoAhorro = false: consulta a Gemini con datos preprocesados; si falla, hace fallback automático al determinista.
   */
  async consultarCopiloto(opciones: {
    intencion: IntencionAsistente;
    consultaUsuario?: string;
    modoAhorro: boolean;
  }): Promise<RespuestaAsistenteOficina> {
    const ahora = Date.now();
    const { intencion, consultaUsuario, modoAhorro } = opciones;

    // 1. Recolectar datos según la intención
    let datosHoy: DatosPreprocesadosHoy | undefined;
    let datosSemana: DatosPreprocesadosSemana | undefined;
    let datosPlanificacion: DatosPreprocesadosPlanificacion | undefined;

    if (intencion === "resumen_hoy" || intencion === "consulta_libre") {
      datosHoy = await this.recolectarDatosHoy();
    }
    if (intencion === "resumen_semana") {
      datosSemana = await this.recolectarDatosSemana();
    }
    if (
      intencion === "ajuste_planificacion" ||
      intencion === "consulta_libre"
    ) {
      datosPlanificacion = await this.recolectarDatosPlanificacion();
    }

    const payload: ContextoAsistentePayload = {
      intencion,
      consultaUsuario,
      datosHoy,
      datosSemana,
      datosPlanificacion,
    };

    // 2. Si el usuario activó Modo Ahorro, generar determinista sin invocar API
    if (modoAhorro) {
      const contenido = this.generarReporteDeterminista(payload);
      return {
        contenido,
        modoUsado: "ahorro",
        timestamp: ahora,
      };
    }

    // 3. Modo IA: Enviar a la API con fallback seguro
    try {
      const res = await fetch("/api/oficina/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok && json.success && json.contenido) {
        return {
          contenido: json.contenido,
          modoUsado: "ia",
          timestamp: ahora,
        };
      }

      // Si la API devolvió error controlado
      const errorAPI: LogErrorAPI = json.errorAPI ?? {
        tipo: res.status === 429 ? "LIMITE_CUOTA_EXCEDIDO" : "ERROR_INTERNO",
        mensaje: json.error || `Error HTTP ${res.status}`,
        origen: "gemini",
        codigoHttp: res.status,
      };

      // Fallback transparente al modo ahorro
      const contenidoFallback = this.generarReporteDeterminista(payload);
      return {
        contenido: contenidoFallback,
        modoUsado: "ahorro",
        timestamp: ahora,
        errorAPI,
        advertenciaFallback: `Generado en Modo Ahorro debido a: ${errorAPI.mensaje}`,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const errorAPI: LogErrorAPI = {
        tipo: "TIMEOUT_RED",
        mensaje: "No se pudo conectar con el servidor de IA.",
        detalle: errorMsg,
        origen: "cliente",
      };

      const contenidoFallback = this.generarReporteDeterminista(payload);
      return {
        contenido: contenidoFallback,
        modoUsado: "ahorro",
        timestamp: ahora,
        errorAPI,
        advertenciaFallback: `Generado en Modo Ahorro debido a problemas de red o conexión.`,
      };
    }
  }
}
