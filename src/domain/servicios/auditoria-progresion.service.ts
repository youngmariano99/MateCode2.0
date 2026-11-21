import { lunesDeLaSemana, sumarDias } from "../entidades/personal.entity";
import type { Actividad } from "../entidades/actividad.entity";
import type { AreaPersonal } from "../entidades/area-personal.entity";
import type { ObjetivoCuantificable } from "../entidades/objetivo-cuantificable.entity";
import type { ProyectoPersonal } from "../entidades/proyecto-personal.entity";
import type { Entregable } from "../entidades/entregable.entity";
import { rangoDelMes } from "../entidades/diagnostico-planificacion.entity";

export interface ResumenSemanaHistorica {
  semanaInicio: string; // YYYY-MM-DD (lunes)
  semanaFin: string; // YYYY-MM-DD (domingo)
  totalActividades: number;
  completadas: number;
  porcentaje: number; // 0 a 100
  cumplio80: boolean;
}

export interface DiagnosticoProgresion {
  cumplimientoSemanaActual: number;
  semanasEvaluadas: ResumenSemanaHistorica[];
  semanasConsecutivas80: number; // 0 a 4
  puedeProgresar: boolean; // true si semanasConsecutivas80 >= 4
  debeEstabilizar: boolean; // true si cumplimientoSemanaActual < 80
  estado: "consolidando" | "estabilizando" | "desbloqueado_para_progresar";
  titulo: string;
  mensaje: string;
  recomendacion: string;
  factorSugerido: number; // 1.0 (mantener) o 1.15 (progresar)
}

/**
 * Calcula el cumplimiento real de las últimas semanas (hasta 4)
 * y dictamina según la REGLA DEL 80% si corresponde congelar carga o progresar.
 */
export function auditarProgresionSemanal(params: {
  actividades: Actividad[];
  fechaHoy: string;
}): DiagnosticoProgresion {
  const { actividades, fechaHoy } = params;
  const lunesActual = lunesDeLaSemana(fechaHoy);

  // Analizar las últimas 4 semanas (desde hace 3 semanas hasta la actual)
  const semanas: ResumenSemanaHistorica[] = [];

  for (let offset = 3; offset >= 0; offset--) {
    const inicio = sumarDias(lunesActual, -offset * 7);
    const fin = sumarDias(inicio, 6);

    const actsSemana = actividades.filter(
      (a) =>
        Boolean(a.diaTarea) &&
        a.diaTarea! >= inicio &&
        a.diaTarea! <= fin &&
        a.tipo !== "backlog"
    );

    const total = actsSemana.length;
    const completadas = actsSemana.filter(
      (a) => a.estado === "completada"
    ).length;
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;
    const cumplio80 = total > 0 && porcentaje >= 80;

    semanas.push({
      semanaInicio: inicio,
      semanaFin: fin,
      totalActividades: total,
      completadas,
      porcentaje,
      cumplio80,
    });
  }

  const semanaActual = semanas[semanas.length - 1];
  const cumplimientoActual = semanaActual.porcentaje;

  // Calcular racha de semanas consecutivas con >= 80% (de más reciente a más antigua)
  let consecutivas = 0;
  for (let i = semanas.length - 1; i >= 0; i--) {
    if (semanas[i].cumplio80) {
      consecutivas++;
    } else {
      break;
    }
  }

  const puedeProgresar = consecutivas >= 4;
  const debeEstabilizar = cumplimientoActual < 80;

  if (puedeProgresar) {
    return {
      cumplimientoSemanaActual: cumplimientoActual,
      semanasEvaluadas: semanas,
      semanasConsecutivas80: consecutivas,
      puedeProgresar: true,
      debeEstabilizar: false,
      estado: "desbloqueado_para_progresar",
      titulo: "Base Consolidada: Desbloqueaste Progresión",
      mensaje: `Lograste 4 semanas consecutivas cumpliendo ≥ 80% de tus actividades.`,
      recomendacion:
        "Tenés evidencia empírica suficiente para subir la exigencia gradualmente (+15% a 20%) sin riesgo de sobrecarga.",
      factorSugerido: 1.15,
    };
  }

  if (debeEstabilizar) {
    return {
      cumplimientoSemanaActual: cumplimientoActual,
      semanasEvaluadas: semanas,
      semanasConsecutivas80: consecutivas,
      puedeProgresar: false,
      debeEstabilizar: true,
      estado: "estabilizando",
      titulo: "Estabilización de Carga (Regla del 80%)",
      mensaje: `El cumplimiento de esta semana fue del ${cumplimientoActual}%. El umbral mínimo de solidez es 80%.`,
      recomendacion:
        "Prohibido escalar carga. Mantené exactamente los mismos niveles y volumen la próxima semana para consolidar el hábito y evitar acumular deuda de tareas.",
      factorSugerido: 1.0,
    };
  }

  return {
    cumplimientoSemanaActual: cumplimientoActual,
    semanasEvaluadas: semanas,
    semanasConsecutivas80: consecutivas,
    puedeProgresar: false,
    debeEstabilizar: false,
    estado: "consolidando",
    titulo: `En Consolidación (${consecutivas}/4 semanas sólidas)`,
    mensaje: `Buen ritmo (${cumplimientoActual}% cumplido). Llevás ${consecutivas} semana(s) consecutiva(s) cumpliendo al 80%.`,
    recomendacion:
      "Mantené este mismo ritmo la próxima semana para completar las 4 semanas de consolidación antes de incrementar volumen.",
    factorSugerido: 1.0,
  };
}

export interface EstadoHorizontesGlobal {
  mes: {
    inicioMes: string;
    finMes: string;
    diasRestantes: number;
    proyectoConstruccion?: ProyectoPersonal;
    totalProyectosConstruccion: number;
    estado: "planificado" | "pendiente" | "sobrecargado";
    mensaje: string;
  };
  proximaSemana: {
    inicioSemana: string;
    finSemana: string;
    actividadesAgendadas: number;
    estado: "planificado" | "pendiente";
    mensaje: string;
  };
  sistemaBase: {
    totalAreas: number;
    areasSinObjetivo: string[];
    equilibrioPCP: boolean;
    estado: "optimo" | "atencion" | "incompleto";
    mensaje: string;
  };
  progresion: DiagnosticoProgresion;
}

/**
 * Evalúa el estado general de los 3 horizontes para saber qué está cubierto y qué falta planificar.
 */
export function evaluarEstadoHorizontes(params: {
  hoy: string;
  areas: AreaPersonal[];
  objetivos: ObjetivoCuantificable[];
  proyectos: ProyectoPersonal[];
  entregables: Entregable[];
  actividades: Actividad[];
}): EstadoHorizontesGlobal {
  const { hoy, areas, objetivos, proyectos, actividades } = params;

  // 1. Evaluación del Mes en curso
  const { inicioMes, finMes } = rangoDelMes(hoy);
  const [aHoy, mHoy, dHoy] = hoy.split("-").map(Number);
  const ultimoDiaMes = new Date(Date.UTC(aHoy, mHoy, 0)).getUTCDate();
  const diasRestantes = Math.max(0, ultimoDiaMes - dHoy);

  // Proyectos activos que coinciden con el mes
  const proyectosMes = proyectos.filter(
    (p) =>
      p.estado === "activo" &&
      p.diaInicio <= finMes &&
      p.diaLimite >= inicioMes &&
      !p.titulo.toLowerCase().includes("sistema base") &&
      !p.titulo.toLowerCase().includes("mantenimiento")
  );

  let estadoMes: "planificado" | "pendiente" | "sobrecargado" = "planificado";
  let mensajeMes = "";

  if (proyectosMes.length === 0) {
    estadoMes = "pendiente";
    mensajeMes = `Falta asignar el Proyecto Único de Construcción para este mes (${diasRestantes} días restantes).`;
  } else if (proyectosMes.length === 1) {
    estadoMes = "planificado";
    mensajeMes = `Proyecto enfocado: "${proyectosMes[0].titulo}" (${diasRestantes} días restantes).`;
  } else {
    estadoMes = "sobrecargado";
    mensajeMes = `Atención: Tenés ${proyectosMes.length} proyectos de construcción compitiendo (límite WIP recomendado: 1 por mes).`;
  }

  // 2. Evaluación de la Próxima Semana
  const lunesActual = lunesDeLaSemana(hoy);
  const lunesProximo = sumarDias(lunesActual, 7);
  const domingoProximo = sumarDias(lunesProximo, 6);

  const actsProximaSemana = actividades.filter(
    (a) =>
      Boolean(a.diaTarea) &&
      a.diaTarea! >= lunesProximo &&
      a.diaTarea! <= domingoProximo &&
      a.tipo !== "backlog"
  );

  const estadoProximaSemana: "planificado" | "pendiente" =
    actsProximaSemana.length > 0 ? "planificado" : "pendiente";
  const mensajeProximaSemana =
    actsProximaSemana.length > 0
      ? `${actsProximaSemana.length} actividades agendadas para la semana del ${lunesProximo}.`
      : `La próxima semana (${lunesProximo} al ${domingoProximo}) no tiene actividades agendadas todavía.`;

  // 3. Evaluación del Sistema Base (Áreas y Equilibrio P/CP)
  const areasActivas = areas.filter((a) => a.activa !== false);
  const objsActivos = objetivos.filter((o) => o.estado === "activo");

  const areasSinObj = areasActivas
    .filter((a) => !objsActivos.some((o) => o.areaId === a.id))
    .map((a) => a.nombre);

  // Verificar presencia de salud / personal / profesional
  const nombresAreasLower = areasActivas.map((a) => a.nombre.toLowerCase());
  const tieneSalud = nombresAreasLower.some(
    (n) => n.includes("salud") || n.includes("deport") || n.includes("físic")
  );
  const tienePersonal = nombresAreasLower.some(
    (n) =>
      n.includes("personal") || n.includes("familia") || n.includes("descanso")
  );
  const tieneProfesional = nombresAreasLower.some(
    (n) =>
      n.includes("profesional") ||
      n.includes("ingreso") ||
      n.includes("trabajo") ||
      n.includes("negocio") ||
      n.includes("agencia") ||
      n.includes("carrera")
  );

  const equilibrioPCP = tieneSalud && (tienePersonal || tieneProfesional);

  let estadoBase: "optimo" | "atencion" | "incompleto" = "optimo";
  let mensajeBase = "";

  if (areasActivas.length === 0) {
    estadoBase = "incompleto";
    mensajeBase = "No tenés áreas configuradas. Iniciá con el setup general.";
  } else if (areasSinObj.length > 0) {
    estadoBase = "atencion";
    mensajeBase = `${areasSinObj.length} área(s) no tienen objetivo activo (${areasSinObj.join(", ")}).`;
  } else if (!equilibrioPCP) {
    estadoBase = "atencion";
    mensajeBase =
      "Recordá equilibrar Producción con Capacidad de Producción (Salud/Familia).";
  } else {
    estadoBase = "optimo";
    mensajeBase = `${areasActivas.length} áreas activas con objetivos y equilibrio P/CP.`;
  }

  // 4. Progresión Semanal
  const progresion = auditarProgresionSemanal({
    actividades,
    fechaHoy: hoy,
  });

  return {
    mes: {
      inicioMes,
      finMes,
      diasRestantes,
      proyectoConstruccion: proyectosMes[0],
      totalProyectosConstruccion: proyectosMes.length,
      estado: estadoMes,
      mensaje: mensajeMes,
    },
    proximaSemana: {
      inicioSemana: lunesProximo,
      finSemana: domingoProximo,
      actividadesAgendadas: actsProximaSemana.length,
      estado: estadoProximaSemana,
      mensaje: mensajeProximaSemana,
    },
    sistemaBase: {
      totalAreas: areasActivas.length,
      areasSinObjetivo: areasSinObj,
      equilibrioPCP,
      estado: estadoBase,
      mensaje: mensajeBase,
    },
    progresion,
  };
}
