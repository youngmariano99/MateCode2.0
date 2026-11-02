import { describe, test } from "node:test";
import assert from "node:assert";
import { AsistenteOficinaService } from "../../application/servicios/asistente-oficina.service";
import type {
  DatosPreprocesadosHoy,
  DatosPreprocesadosSemana,
  DatosPreprocesadosPlanificacion,
} from "../../domain/entidades/asistente-oficina.entity";

describe("AsistenteOficinaService - Generador Determinista (Modo Ahorro = 0 tokens)", () => {
  const service = new AsistenteOficinaService();

  test("genera un reporte de hoy determinista con cálculos exactos", () => {
    const datosHoy: DatosPreprocesadosHoy = {
      fecha: "2026-11-02",
      totalActividades: 3,
      completadasCount: 1,
      pendientesCount: 2,
      porcentajeCumplimiento: 33,
      minutosTrabajadosHoy: 45,
      tareasHechas: [
        { descripcion: "SQL Roadmap", progreso: 45, meta: 60, unidad: "min" },
      ],
      tareasPendientes: [
        {
          descripcion: "Caso May Delicias",
          meta: 45,
          unidad: "min",
          pisoMinimo: 30,
        },
        {
          descripcion: "Postulaciones quirúrgicas",
          meta: 5,
          unidad: "postulaciones",
        },
      ],
      hitosProximos: [
        { titulo: "Examen Base de Datos", mensajeAlerta: "En 2 días" },
      ],
    };

    const reporte = service.generarReporteDeterminista({
      intencion: "resumen_hoy",
      datosHoy,
    });

    assert.ok(reporte.includes("1 de 3 tareas completadas"));
    assert.ok(reporte.includes("33%"));
    assert.ok(reporte.includes("45 minutos"));
    assert.ok(reporte.includes("Examen Base de Datos"));
    assert.ok(reporte.includes("En 2 días"));
    assert.ok(reporte.includes("SQL Roadmap"));
    assert.ok(reporte.includes("Caso May Delicias"));
    assert.ok(reporte.includes("Piso: 30"));
  });

  test("genera un reporte semanal determinista", () => {
    const datosSemana: DatosPreprocesadosSemana = {
      semanaInicio: "2026-11-02",
      semanaFin: "2026-11-08",
      totalActividadesSemana: 10,
      completadasSemana: 6,
      porcentajeSemana: 60,
      minutosTrabajadosSemana: 300,
      entregablesActivos: [
        {
          titulo: "Capacitación Nivel 1",
          progreso: 180,
          meta: 1200,
          unidad: "min",
        },
      ],
    };

    const reporte = service.generarReporteDeterminista({
      intencion: "resumen_semana",
      datosSemana,
    });

    assert.ok(reporte.includes("6 de 10 actividades completadas"));
    assert.ok(reporte.includes("60%"));
    assert.ok(reporte.includes("300 minutos"));
    assert.ok(reporte.includes("Capacitación Nivel 1"));
  });

  test("genera diagnóstico de pisos mínimos con entregables en riesgo", () => {
    const datosPlanificacion: DatosPreprocesadosPlanificacion = {
      fecha: "2026-11-02",
      totalEntregablesActivos: 2,
      entregablesQueAlcanzaronPiso: 1,
      entregablesEnRiesgo: [
        {
          id: "ent_1",
          titulo: "Bloque Diario Capacitación Nivel 1",
          proyectoTitulo: "Roadmap Nivel 1",
          progresoActual: 100,
          cantidadObjetivo: 1200,
          unidad: "min",
          bandaAceptable: 70,
          pisoMinimo: 840,
          distanciaAlPiso: 740,
          alcanzoPiso: false,
          porcentajeObjetivo: 8,
          diaLimite: "2026-11-29",
          diasRestantes: 27,
        },
      ],
      entregablesAlDia: [
        {
          id: "ent_2",
          titulo: "Postulaciones Bloque 1",
          progresoActual: 25,
          cantidadObjetivo: 30,
          unidad: "postulaciones",
          bandaAceptable: 70,
          pisoMinimo: 21,
          distanciaAlPiso: 0,
          alcanzoPiso: true,
          porcentajeObjetivo: 83,
          diaLimite: "2026-11-29",
          diasRestantes: 27,
        },
      ],
    };

    const reporte = service.generarReporteDeterminista({
      intencion: "ajuste_planificacion",
      datosPlanificacion,
    });

    assert.ok(reporte.includes("Total entregables analizados: 2"));
    assert.ok(reporte.includes("Piso alcanzado: 1"));
    assert.ok(reporte.includes("En riesgo / por debajo del piso: 1"));
    assert.ok(reporte.includes("Bloque Diario Capacitación Nivel 1"));
    assert.ok(reporte.includes("Falta para el piso mínimo (70%): **740 min**"));
  });
});
