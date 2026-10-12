import type { AreaPersonal } from "./area-personal.entity";
import {
  calcularRitmoObjetivo,
  type ObjetivoCuantificable,
} from "./objetivo-cuantificable.entity";
import type { ProyectoPersonal } from "./proyecto-personal.entity";
import type { Entregable } from "./entregable.entity";
import type { FasePersonal } from "./fase-personal.entity";
import type { Actividad } from "./actividad.entity";
import { lunesDeLaSemana, sumarDias, type InboxItem } from "./personal.entity";

export type HorizontePlanificacion = "dia" | "semana" | "mes" | "mapa";

export type EstadoPasoProcedimiento = "completado" | "pendiente" | "atencion";

export type TipoAccionDiagnostico =
  | "crear_area"
  | "crear_objetivo"
  | "crear_proyecto"
  | "crear_entregable"
  | "crear_fase"
  | "crear_tarea"
  | "abrir_wizard"
  | "ir_oficina";

export interface AlertaFaltantePlanificacion {
  id: string;
  texto: string;
  accion?: TipoAccionDiagnostico;
  etiquetaAccion?: string;
  contextoPadreId?: string;
}

export interface PasoProcedimiento {
  id: string;
  numero: number;
  titulo: string;
  descripcion: string;
  estado: EstadoPasoProcedimiento;
  resumen: string;
  faltantes: AlertaFaltantePlanificacion[];
}

export interface DiagnosticoHorizonte {
  horizonte: HorizontePlanificacion;
  tituloProcedimiento: string;
  subtitulo: string;
  pasosCompletados: number;
  totalPasos: number;
  resumenGlobal: string;
  pasos: PasoProcedimiento[];
}

export interface DatosDiagnosticoPlanificacion {
  hoy: string;
  areas: AreaPersonal[];
  objetivos: ObjetivoCuantificable[];
  proyectos: ProyectoPersonal[];
  entregables: Entregable[];
  fases: FasePersonal[];
  actividades: Actividad[];
  inbox: InboxItem[];
}

/** Primer y último día (YYYY-MM-DD) del mes de `diaISO`. */
export function rangoDelMes(diaISO: string): {
  inicioMes: string;
  finMes: string;
} {
  const [anio, mes] = diaISO.split("-").map(Number);
  const inicioMes = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const finMes = `${anio}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  return { inicioMes, finMes };
}

function seSolapanRangos(
  inicioA: string,
  finA: string,
  inicioB: string,
  finB: string
): boolean {
  return inicioA <= finB && finA >= inicioB;
}

/**
 * Calcula el estado guiado del procedimiento de planificación para cualquiera
 * de los 4 horizontes (Hoy, Semana, Mes, Mapa/Anual).
 * Función pura y determinística: sin efectos secundarios ni acceso a DB.
 */
export function diagnosticarPlanificacion(
  horizonte: HorizontePlanificacion,
  datos: DatosDiagnosticoPlanificacion
): DiagnosticoHorizonte {
  switch (horizonte) {
    case "mapa":
      return diagnosticarMapa(datos);
    case "mes":
      return diagnosticarMes(datos);
    case "semana":
      return diagnosticarSemana(datos);
    case "dia":
      return diagnosticarDia(datos);
  }
}

function diagnosticarMapa(
  datos: DatosDiagnosticoPlanificacion
): DiagnosticoHorizonte {
  const areasActivas = datos.areas.filter((a) => a.activa);
  const objetivosActivos = datos.objetivos.filter(
    (o) => o.estado === "activo" || o.estado === "vencido"
  );
  const proyectosActivos = datos.proyectos.filter(
    (p) => p.estado === "activo" || p.estado === "vencido"
  );
  const entregablesActivos = datos.entregables.filter(
    (e) => e.estado === "activo" || e.estado === "vencido"
  );

  // Paso 1: Áreas y Objetivos definidos
  const areasSinObjetivos = areasActivas.filter(
    (a) => !objetivosActivos.some((o) => o.areaId === a.id)
  );
  const faltantesPaso1: AlertaFaltantePlanificacion[] = [];
  if (areasActivas.length === 0) {
    faltantesPaso1.push({
      id: "sin-areas",
      texto: "Todavía no creaste ninguna Área (ej. Agencia, Salud, Finanzas).",
      accion: "crear_area",
      etiquetaAccion: "Crear primera Área",
    });
  }
  for (const area of areasSinObjetivos) {
    faltantesPaso1.push({
      id: `area-sin-obj-${area.id}`,
      texto: `El área "${area.nombre}" no tiene ningún Objetivo activo.`,
      accion: "crear_objetivo",
      etiquetaAccion: "Agregar Objetivo",
      contextoPadreId: area.id,
    });
  }

  const alDiaCount = objetivosActivos.filter((o) => {
    const r = calcularRitmoObjetivo(o, datos.hoy).estado;
    return r === "al_dia" || r === "adelantado" || r === "cumplido";
  }).length;
  const atrasadosCount = objetivosActivos.length - alDiaCount;

  const estadoPaso1: EstadoPasoProcedimiento =
    areasActivas.length === 0 || objetivosActivos.length === 0
      ? "pendiente"
      : areasSinObjetivos.length > 0
        ? "atencion"
        : "completado";

  // Paso 2: Objetivos bajados a Proyectos
  const objetivosSinProyectos = objetivosActivos.filter(
    (o) => !proyectosActivos.some((p) => p.objetivoId === o.id)
  );
  const faltantesPaso2: AlertaFaltantePlanificacion[] =
    objetivosSinProyectos.map((o) => ({
      id: `obj-sin-proy-${o.id}`,
      texto: `El objetivo "${o.titulo}" no tiene ningún Proyecto asignado.`,
      accion: "crear_proyecto",
      etiquetaAccion: "Agregar Proyecto",
      contextoPadreId: o.id,
    }));

  const estadoPaso2: EstadoPasoProcedimiento =
    objetivosActivos.length === 0
      ? "pendiente"
      : objetivosSinProyectos.length > 0
        ? "atencion"
        : "completado";

  // Paso 3: Proyectos bajados a Entregables accionables
  const proyectosSinEntregables = proyectosActivos.filter(
    (p) => !entregablesActivos.some((e) => e.proyectoId === p.id)
  );
  const faltantesPaso3: AlertaFaltantePlanificacion[] =
    proyectosSinEntregables.map((p) => ({
      id: `proy-sin-ent-${p.id}`,
      texto: `El proyecto "${p.titulo}" no tiene Entregables concretos.`,
      accion: "crear_entregable",
      etiquetaAccion: "Agregar Entregable",
      contextoPadreId: p.id,
    }));

  const estadoPaso3: EstadoPasoProcedimiento =
    proyectosActivos.length === 0
      ? "pendiente"
      : proyectosSinEntregables.length > 0
        ? "atencion"
        : "completado";

  const pasos: PasoProcedimiento[] = [
    {
      id: "mapa-1",
      numero: 1,
      titulo: "1. Áreas y Objetivos de Largo Plazo",
      descripcion:
        "Definir las áreas clave y al menos un objetivo medible con fecha límite en cada una.",
      estado: estadoPaso1,
      resumen:
        areasActivas.length === 0
          ? "Sin áreas definidas"
          : `${areasActivas.length} área(s) · ${objetivosActivos.length} objetivo(s) (${alDiaCount} en ritmo${atrasadosCount > 0 ? `, ${atrasadosCount} por ajustar` : ""})`,
      faltantes: faltantesPaso1,
    },
    {
      id: "mapa-2",
      numero: 2,
      titulo: "2. Frentes de Trabajo (Proyectos)",
      descripcion:
        "Dividir cada Objetivo en los Proyectos concretos que lo van a hacer realidad.",
      estado: estadoPaso2,
      resumen:
        proyectosActivos.length === 0
          ? "Sin proyectos activos"
          : `${proyectosActivos.length} proyecto(s) activo(s) bajo ${objetivosActivos.length - objetivosSinProyectos.length}/${objetivosActivos.length} objetivos`,
      faltantes: faltantesPaso2,
    },
    {
      id: "mapa-3",
      numero: 3,
      titulo: "3. Entregables Medibles o Recurrentes",
      descripcion:
        "Cada Proyecto debe tener al menos un Entregable que indique qué producir o repetir.",
      estado: estadoPaso3,
      resumen:
        entregablesActivos.length === 0
          ? "Sin entregables definidos"
          : `${entregablesActivos.length} entregable(s) activo(s)`,
      faltantes: faltantesPaso3,
    },
  ];

  const pasosCompletados = pasos.filter(
    (p) => p.estado === "completado"
  ).length;
  return {
    horizonte: "mapa",
    tituloProcedimiento:
      "Procedimiento de Planificación General (Anual / Trimestral)",
    subtitulo:
      "Seguí estos 3 pasos cuando armes un plan nuevo o revises que toda tu estructura esté conectada de punta a punta.",
    pasosCompletados,
    totalPasos: pasos.length,
    resumenGlobal: `${areasActivas.length} Áreas · ${objetivosActivos.length} Objetivos · ${proyectosActivos.length} Proyectos · ${entregablesActivos.length} Entregables`,
    pasos,
  };
}

function diagnosticarMes(
  datos: DatosDiagnosticoPlanificacion
): DiagnosticoHorizonte {
  const { inicioMes, finMes } = rangoDelMes(datos.hoy);
  const objetivosActivos = datos.objetivos.filter(
    (o) => o.estado === "activo" || o.estado === "vencido"
  );
  const entregablesDelMes = datos.entregables.filter(
    (e) =>
      e.estado === "activo" &&
      seSolapanRangos(e.diaInicio, e.diaLimite, inicioMes, finMes)
  );
  const fasesAbiertas = datos.fases.filter((f) => f.estado === "abierta");
  const fasesVencidas = fasesAbiertas.filter((f) => f.diaLimite < datos.hoy);
  const fasesDelMes = datos.fases.filter((f) =>
    seSolapanRangos(f.diaInicio, f.diaLimite, inicioMes, finMes)
  );

  // Paso 1: Cerrar fases vencidas y revisar objetivos atrasados
  const objetivosAtrasados = objetivosActivos.filter((o) => {
    const r = calcularRitmoObjetivo(o, datos.hoy).estado;
    return r === "atrasado" || r === "vencido";
  });

  const faltantesPaso1: AlertaFaltantePlanificacion[] = [];
  if (fasesVencidas.length > 0) {
    faltantesPaso1.push({
      id: "mes-fases-vencidas",
      texto: `Tenés ${fasesVencidas.length} fase(s) vencida(s) pendiente(s) de cierre.`,
    });
  }
  for (const obj of objetivosAtrasados.slice(0, 3)) {
    faltantesPaso1.push({
      id: `mes-obj-atrasado-${obj.id}`,
      texto: `Objetivo "${obj.titulo}" viene atrasado (${obj.progresoActual}/${obj.cantidadObjetivo} ${obj.unidad}).`,
    });
  }

  const estadoPaso1: EstadoPasoProcedimiento =
    fasesVencidas.length > 0
      ? "atencion"
      : objetivosActivos.length === 0
        ? "pendiente"
        : "completado";

  // Paso 2: Asegurar que los Entregables activos este mes tengan Fases o Recurrencia/Actividades
  const entregablesSinPlanEsteMes = entregablesDelMes.filter((e) => {
    if (e.recurrencia) return false;
    const tieneFaseEnMes = fasesDelMes.some((f) => f.entregableId === e.id);
    const tieneActividadesEnMes = datos.actividades.some(
      (a) =>
        a.entregableId === e.id &&
        a.diaTarea &&
        a.diaTarea >= inicioMes &&
        a.diaTarea <= finMes
    );
    return !tieneFaseEnMes && !tieneActividadesEnMes;
  });

  const faltantesPaso2: AlertaFaltantePlanificacion[] =
    entregablesSinPlanEsteMes.map((e) => ({
      id: `ent-sin-fase-mes-${e.id}`,
      texto: `El entregable "${e.titulo}" está activo este mes pero no tiene Fases ni actividades asignadas.`,
      accion: "crear_fase",
      etiquetaAccion: "Agregar Fase",
      contextoPadreId: e.id,
    }));

  const estadoPaso2: EstadoPasoProcedimiento =
    entregablesDelMes.length === 0
      ? "pendiente"
      : entregablesSinPlanEsteMes.length > 0
        ? "atencion"
        : "completado";

  // Paso 3: Actividades y entregas en el calendario del mes
  const actividadesDelMes = datos.actividades.filter(
    (a) =>
      a.tipo !== "backlog" &&
      a.diaTarea &&
      a.diaTarea >= inicioMes &&
      a.diaTarea <= finMes
  );
  const hechasMes = actividadesDelMes.filter(
    (a) => a.estado === "completada"
  ).length;

  const estadoPaso3: EstadoPasoProcedimiento =
    actividadesDelMes.length === 0 && fasesDelMes.length === 0
      ? "pendiente"
      : "completado";

  const pasos: PasoProcedimiento[] = [
    {
      id: "mes-1",
      numero: 1,
      titulo: "1. Revisar cierre anterior y ritmo de Objetivos",
      descripcion:
        "Cerrar fases vencidas y verificar si algún objetivo requiere ajustar fecha o meta.",
      estado: estadoPaso1,
      resumen:
        fasesVencidas.length > 0
          ? `${fasesVencidas.length} fase(s) vencida(s) por cerrar`
          : `${objetivosActivos.length - objetivosAtrasados.length}/${objetivosActivos.length} objetivos al día`,
      faltantes: faltantesPaso1,
    },
    {
      id: "mes-2",
      numero: 2,
      titulo: "2. Definir Fases y Cuotas del Mes",
      descripcion:
        "Asegurar que cada Entregable activo este mes tenga su meta mensual o fases semanales.",
      estado: estadoPaso2,
      resumen: `${entregablesDelMes.length} entregable(s) en el mes · ${fasesDelMes.length} fase(s) programada(s)`,
      faltantes: faltantesPaso2,
    },
    {
      id: "mes-3",
      numero: 3,
      titulo: "3. Avance Mensual en Calendario",
      descripcion:
        "Seguir el progreso acumulado en las metas del mes y la distribución en la grilla mensual.",
      estado: estadoPaso3,
      resumen: `${hechasMes}/${actividadesDelMes.length} actividad(es) completadas este mes`,
      faltantes: [],
    },
  ];

  const pasosCompletados = pasos.filter(
    (p) => p.estado === "completado"
  ).length;
  return {
    horizonte: "mes",
    tituloProcedimiento: `Procedimiento Mensual (${inicioMes.slice(0, 7)})`,
    subtitulo:
      "Al empezar el mes: cerrá lo pendiente del mes anterior, asegurá las fases de este mes y controlá el ritmo.",
    pasosCompletados,
    totalPasos: pasos.length,
    resumenGlobal: `${fasesDelMes.length} fases este mes · ${hechasMes}/${actividadesDelMes.length} tareas hechas`,
    pasos,
  };
}

function diagnosticarSemana(
  datos: DatosDiagnosticoPlanificacion
): DiagnosticoHorizonte {
  const lunes = lunesDeLaSemana(datos.hoy);
  const domingo = sumarDias(lunes, 6);

  const atrasadasAntesDeHoy = datos.actividades.filter(
    (a) =>
      a.tipo !== "backlog" &&
      a.estado === "pendiente" &&
      a.diaTarea &&
      a.diaTarea < datos.hoy
  );
  const fasesVencidas = datos.fases.filter(
    (f) => f.estado === "abierta" && f.diaLimite < datos.hoy
  );

  // Paso 1: Repaso y limpieza de pendientes vencidos
  const faltantesPaso1: AlertaFaltantePlanificacion[] = [];
  if (atrasadasAntesDeHoy.length > 0) {
    faltantesPaso1.push({
      id: "sem-atrasadas",
      texto: `Tenés ${atrasadasAntesDeHoy.length} tarea(s) de días anteriores sin resolver.`,
    });
  }
  if (fasesVencidas.length > 0) {
    faltantesPaso1.push({
      id: "sem-fases-vencidas",
      texto: `Hay ${fasesVencidas.length} fase(s) vencida(s) que necesitan cerrarse para decidir qué hacer con el faltante.`,
    });
  }

  const estadoPaso1: EstadoPasoProcedimiento =
    atrasadasAntesDeHoy.length > 0 || fasesVencidas.length > 0
      ? "atencion"
      : "completado";

  // Paso 2: Fases de esta semana bajadas a actividades diarias
  const fasesDeEstaSemana = datos.fases.filter(
    (f) =>
      f.estado === "abierta" &&
      seSolapanRangos(f.diaInicio, f.diaLimite, lunes, domingo)
  );
  const actividadesSemana = datos.actividades.filter(
    (a) =>
      a.tipo !== "backlog" &&
      a.diaTarea &&
      a.diaTarea >= lunes &&
      a.diaTarea <= domingo
  );

  const fasesSinActividadesEstaSemana = fasesDeEstaSemana.filter(
    (f) => !actividadesSemana.some((a) => a.entregableId === f.entregableId)
  );

  const faltantesPaso2: AlertaFaltantePlanificacion[] =
    fasesSinActividadesEstaSemana.map((f) => ({
      id: `fase-sin-act-${f.id}`,
      texto: `La fase "${f.titulo}" (${f.cantidadObjetivo} ${f.unidad}) está activa esta semana pero no tiene tareas repartidas en los días.`,
      accion: "crear_tarea",
      etiquetaAccion: "Agendar tarea",
      contextoPadreId: f.entregableId,
    }));

  const estadoPaso2: EstadoPasoProcedimiento =
    fasesSinActividadesEstaSemana.length > 0
      ? "atencion"
      : fasesDeEstaSemana.length === 0 && actividadesSemana.length === 0
        ? "pendiente"
        : "completado";

  // Paso 3: Armar agenda de los 7 días (Lunes a Domingo)
  const hechasSemana = actividadesSemana.filter(
    (a) => a.estado === "completada"
  ).length;
  const pendientesBacklogSinAsignar = datos.actividades.filter(
    (a) =>
      a.tipo === "backlog" &&
      a.estado === "pendiente" &&
      !a.esFaltante &&
      a.semanaId !== lunes
  );

  const diasConTarea = new Set(
    actividadesSemana.map((a) => a.diaTarea).filter(Boolean)
  ).size;

  const faltantesPaso3: AlertaFaltantePlanificacion[] = [];
  if (actividadesSemana.length === 0) {
    faltantesPaso3.push({
      id: "sem-vacia",
      texto: "Todavía no hay tareas asignadas a los días de esta semana.",
      accion: "crear_tarea",
      etiquetaAccion: "Agregar tarea a la semana",
    });
  }

  const estadoPaso3: EstadoPasoProcedimiento =
    actividadesSemana.length === 0 ? "pendiente" : "completado";

  const pasos: PasoProcedimiento[] = [
    {
      id: "sem-1",
      numero: 1,
      titulo: "1. Repaso y Limpieza",
      descripcion:
        "Resolver lo que quedó colgado de días anteriores y revisar motivos de desvío.",
      estado: estadoPaso1,
      resumen:
        atrasadasAntesDeHoy.length === 0 && fasesVencidas.length === 0
          ? "Al día — sin tareas ni fases vencidas colgadas"
          : `${atrasadasAntesDeHoy.length} tarea(s) vencida(s) · ${fasesVencidas.length} fase(s) por cerrar`,
      faltantes: faltantesPaso1,
    },
    {
      id: "sem-2",
      numero: 2,
      titulo: "2. Fases y Metas de la Semana",
      descripcion:
        "Verificar las cuotas semanales de tus Entregables/Fases y bajarlas a los días.",
      estado: estadoPaso2,
      resumen: `${fasesDeEstaSemana.length} fase(s) activa(s) esta semana`,
      faltantes: faltantesPaso2,
    },
    {
      id: "sem-3",
      numero: 3,
      titulo: "3. Distribuir en el Calendario Semanal (Lun–Dom)",
      descripcion:
        "Elegir qué pendientes del backlog entran esta semana y equilibrar los 7 días.",
      estado: estadoPaso3,
      resumen: `${actividadesSemana.length} tarea(s) en ${diasConTarea}/7 días (${hechasSemana} hechas)${pendientesBacklogSinAsignar.length > 0 ? ` · ${pendientesBacklogSinAsignar.length} en backlog general` : ""}`,
      faltantes: faltantesPaso3,
    },
  ];

  const pasosCompletados = pasos.filter(
    (p) => p.estado === "completado"
  ).length;
  return {
    horizonte: "semana",
    tituloProcedimiento: `Procedimiento Semanal (${lunes} → ${domingo})`,
    subtitulo:
      "Al arrancar la semana: limpiá lo vencido, revisá las metas que tocan esta semana y equilibrá los 7 días en el calendario.",
    pasosCompletados,
    totalPasos: pasos.length,
    resumenGlobal: `${hechasSemana}/${actividadesSemana.length} tareas hechas esta semana · ${diasConTarea}/7 días con carga`,
    pasos,
  };
}

function diagnosticarDia(
  datos: DatosDiagnosticoPlanificacion
): DiagnosticoHorizonte {
  const atrasadasAntesDeHoy = datos.actividades.filter(
    (a) =>
      a.tipo !== "backlog" &&
      a.estado === "pendiente" &&
      a.diaTarea &&
      a.diaTarea < datos.hoy
  );
  const fasesVencidas = datos.fases.filter(
    (f) => f.estado === "abierta" && f.diaLimite < datos.hoy
  );

  // Paso 1: Limpiar ayer
  const faltantesPaso1: AlertaFaltantePlanificacion[] = [];
  if (atrasadasAntesDeHoy.length > 0) {
    faltantesPaso1.push({
      id: "dia-atrasadas",
      texto: `Quedaron ${atrasadasAntesDeHoy.length} tarea(s) de días anteriores sin cerrar (marcalas hechas, pasalas a hoy o cancelalas).`,
    });
  }
  if (fasesVencidas.length > 0) {
    faltantesPaso1.push({
      id: "dia-fases",
      texto: `Tenés ${fasesVencidas.length} fase(s) vencida(s) arriba para resolver.`,
    });
  }
  const estadoPaso1: EstadoPasoProcedimiento =
    atrasadasAntesDeHoy.length > 0 || fasesVencidas.length > 0
      ? "atencion"
      : "completado";

  // Paso 2: Definir prioridad #1 (Enfoque) y agenda de hoy
  const actividadesHoy = datos.actividades.filter(
    (a) => a.tipo !== "backlog" && a.diaTarea === datos.hoy
  );
  const enfoqueHoy = actividadesHoy.filter((a) => a.tipo === "enfoque");
  const hechasHoy = actividadesHoy.filter(
    (a) => a.estado === "completada"
  ).length;

  const faltantesPaso2: AlertaFaltantePlanificacion[] = [];
  if (actividadesHoy.length === 0) {
    faltantesPaso2.push({
      id: "dia-sin-tareas",
      texto: "Hoy no tenés tareas agendadas todavía.",
      accion: "crear_tarea",
      etiquetaAccion: "Agendar tarea para hoy",
    });
  } else if (enfoqueHoy.length === 0) {
    faltantesPaso2.push({
      id: "dia-sin-enfoque",
      texto:
        "Tenés tareas de mantenimiento hoy, pero no elegiste cuál es LA prioridad #1 (Enfoque).",
      accion: "crear_tarea",
      etiquetaAccion: "Definir prioridad #1",
    });
  }

  const estadoPaso2: EstadoPasoProcedimiento =
    actividadesHoy.length === 0
      ? "pendiente"
      : enfoqueHoy.length === 0
        ? "atencion"
        : "completado";

  // Paso 3: Bandeja limpia y pasar a Oficina a ejecutar
  const inboxPendientes = datos.inbox.filter((i) => i.estado === "pendiente");
  const faltantesPaso3: AlertaFaltantePlanificacion[] = [];
  if (inboxPendientes.length > 0) {
    faltantesPaso3.push({
      id: "dia-inbox",
      texto: `Tenés ${inboxPendientes.length} idea(s) en la Bandeja de Entrada al final de la página para convertir en tarea o descartar.`,
    });
  }

  const estadoPaso3: EstadoPasoProcedimiento =
    inboxPendientes.length > 3
      ? "atencion"
      : actividadesHoy.length > 0
        ? "completado"
        : "pendiente";

  const pasos: PasoProcedimiento[] = [
    {
      id: "dia-1",
      numero: 1,
      titulo: "1. Resolver lo pendiente de ayer",
      descripcion:
        "No acumular deuda invisible: pasar a hoy, completar o cancelar lo de días previos.",
      estado: estadoPaso1,
      resumen:
        atrasadasAntesDeHoy.length === 0
          ? "Todo lo anterior está resuelto"
          : `${atrasadasAntesDeHoy.length} pendiente(s) de días anteriores`,
      faltantes: faltantesPaso1,
    },
    {
      id: "dia-2",
      numero: 2,
      titulo: "2. Confirmar Prioridad #1 y Agenda de Hoy",
      descripcion:
        "Tener definida la tarea de Enfoque principal y las de mantenimiento del día.",
      estado: estadoPaso2,
      resumen: `${actividadesHoy.length} tarea(s) para hoy (${enfoqueHoy.length} de prioridad #1 · ${hechasHoy} hecha(s))`,
      faltantes: faltantesPaso2,
    },
    {
      id: "dia-3",
      numero: 3,
      titulo: "3. Ejecutar en Oficina y vaciar Bandeja",
      descripcion:
        "Con el día claro, abrir Oficina para trabajar con el cronómetro por tarea.",
      estado: estadoPaso3,
      resumen:
        inboxPendientes.length === 0
          ? "Bandeja de entrada al día"
          : `${inboxPendientes.length} nota(s) en bandeja de entrada`,
      faltantes: [
        ...faltantesPaso3,
        {
          id: "dia-ir-oficina",
          texto:
            "Cuando tengas lista tu agenda de hoy, pasá a Oficina para enfocarte.",
          accion: "ir_oficina",
          etiquetaAccion: "Ir a Oficina",
        },
      ],
    },
  ];

  const pasosCompletados = pasos.filter(
    (p) => p.estado === "completado"
  ).length;
  return {
    horizonte: "dia",
    tituloProcedimiento: `Procedimiento Diario (${datos.hoy})`,
    subtitulo:
      "En 2 minutos cada mañana: limpiá lo de ayer, confirmá tu prioridad #1 de hoy y pasá a Oficina.",
    pasosCompletados,
    totalPasos: pasos.length,
    resumenGlobal: `${hechasHoy}/${actividadesHoy.length} hechas hoy · ${enfoqueHoy.length} prioridad #1`,
    pasos,
  };
}
