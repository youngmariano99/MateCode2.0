import { test, describe } from "node:test";
import assert from "node:assert";
import {
  auditarProgresionSemanal,
  evaluarEstadoHorizontes,
} from "./auditoria-progresion.service";
import type { Actividad } from "../entidades/actividad.entity";

describe("auditoria-progresion.service: Regla del 80% y Horizontes", () => {
  const fechaHoy = "2026-11-21"; // Sábado de una semana

  test("Debe dictaminar 'estabilizando' si el cumplimiento de la semana actual es < 80%", () => {
    // 10 actividades en la semana, solo 6 completadas (60%)
    const actividades: Partial<Actividad>[] = [
      {
        id: "1",
        diaTarea: "2026-11-16",
        estado: "completada",
        tipo: "enfoque",
      },
      {
        id: "2",
        diaTarea: "2026-11-17",
        estado: "completada",
        tipo: "enfoque",
      },
      {
        id: "3",
        diaTarea: "2026-11-18",
        estado: "completada",
        tipo: "enfoque",
      },
      {
        id: "4",
        diaTarea: "2026-11-19",
        estado: "completada",
        tipo: "enfoque",
      },
      {
        id: "5",
        diaTarea: "2026-11-20",
        estado: "completada",
        tipo: "enfoque",
      },
      {
        id: "6",
        diaTarea: "2026-11-21",
        estado: "completada",
        tipo: "mantenimiento",
      },
      {
        id: "7",
        diaTarea: "2026-11-16",
        estado: "pendiente",
        tipo: "mantenimiento",
      },
      {
        id: "8",
        diaTarea: "2026-11-17",
        estado: "pendiente",
        tipo: "mantenimiento",
      },
      {
        id: "9",
        diaTarea: "2026-11-18",
        estado: "pendiente",
        tipo: "mantenimiento",
      },
      {
        id: "10",
        diaTarea: "2026-11-19",
        estado: "pendiente",
        tipo: "mantenimiento",
      },
    ];

    const diag = auditarProgresionSemanal({
      actividades: actividades as Actividad[],
      fechaHoy,
    });

    assert.strictEqual(diag.cumplimientoSemanaActual, 60);
    assert.strictEqual(diag.debeEstabilizar, true);
    assert.strictEqual(diag.puedeProgresar, false);
    assert.strictEqual(diag.estado, "estabilizando");
    assert.strictEqual(diag.factorSugerido, 1.0);
  });

  test("Debe dictaminar 'consolidando' si la semana actual tiene >= 80% pero aún no alcanza 4 semanas consecutivas", () => {
    // 5 actividades completadas de 5 (100%) en la semana actual
    const actividades: Partial<Actividad>[] = [
      {
        id: "1",
        diaTarea: "2026-11-16",
        estado: "completada",
        tipo: "enfoque",
      },
      {
        id: "2",
        diaTarea: "2026-11-17",
        estado: "completada",
        tipo: "enfoque",
      },
      {
        id: "3",
        diaTarea: "2026-11-18",
        estado: "completada",
        tipo: "enfoque",
      },
      {
        id: "4",
        diaTarea: "2026-11-19",
        estado: "completada",
        tipo: "enfoque",
      },
      {
        id: "5",
        diaTarea: "2026-11-20",
        estado: "completada",
        tipo: "enfoque",
      },
    ];

    const diag = auditarProgresionSemanal({
      actividades: actividades as Actividad[],
      fechaHoy,
    });

    assert.strictEqual(diag.cumplimientoSemanaActual, 100);
    assert.strictEqual(diag.debeEstabilizar, false);
    assert.strictEqual(diag.puedeProgresar, false);
    assert.strictEqual(diag.estado, "consolidando");
    assert.strictEqual(diag.semanasConsecutivas80, 1);
  });

  test("Debe dictaminar 'desbloqueado_para_progresar' si lleva 4 semanas consecutivas cumpliendo >= 80%", () => {
    // Generar 4 semanas de actividades (hace 3 semanas, hace 2 semanas, semana pasada y actual), todas completadas
    const fechas = [
      "2026-10-26", // Semana -3
      "2026-11-02", // Semana -2
      "2026-11-09", // Semana -1
      "2026-11-16", // Semana actual
    ];

    const actividades: Partial<Actividad>[] = [];
    fechas.forEach((f, idx) => {
      actividades.push({
        id: `act-${idx}-1`,
        diaTarea: f,
        estado: "completada",
        tipo: "enfoque",
      });
      actividades.push({
        id: `act-${idx}-2`,
        diaTarea: f,
        estado: "completada",
        tipo: "mantenimiento",
      });
    });

    const diag = auditarProgresionSemanal({
      actividades: actividades as Actividad[],
      fechaHoy,
    });

    assert.strictEqual(diag.cumplimientoSemanaActual, 100);
    assert.strictEqual(diag.semanasConsecutivas80, 4);
    assert.strictEqual(diag.puedeProgresar, true);
    assert.strictEqual(diag.debeEstabilizar, false);
    assert.strictEqual(diag.estado, "desbloqueado_para_progresar");
    assert.strictEqual(diag.factorSugerido, 1.15);
  });

  test("evaluarEstadoHorizontes detecta si la próxima semana está vacía y si el mes no tiene proyecto de construcción", () => {
    const estado = evaluarEstadoHorizontes({
      hoy: fechaHoy,
      areas: [
        {
          id: "a1",
          nombre: "Salud y Deporte",
          color: "#10b981",
          activa: true,
          creadoEn: Date.now(),
          actualizadoEn: Date.now(),
        },
      ],
      objetivos: [
        {
          id: "o1",
          areaId: "a1",
          titulo: "Entrenar 4 días",
          unidad: "días",
          cantidadObjetivo: 16,
          progresoActual: 10,
          diaInicio: "2026-11-01",
          diaLimite: "2026-11-30",
          area: "personal",
          estado: "activo",
          creadoEn: Date.now(),
          actualizadoEn: Date.now(),
        },
      ],
      proyectos: [],
      entregables: [],
      actividades: [],
    });

    assert.strictEqual(estado.mes.estado, "pendiente");
    assert.strictEqual(estado.proximaSemana.estado, "pendiente");
    assert.strictEqual(estado.proximaSemana.actividadesAgendadas, 0);
  });
});
