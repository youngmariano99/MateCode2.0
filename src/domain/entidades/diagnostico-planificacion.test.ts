import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  diagnosticarPlanificacion,
  rangoDelMes,
  type DatosDiagnosticoPlanificacion,
} from "./diagnostico-planificacion.entity";

function datosBaseVacios(hoy = "2026-10-12"): DatosDiagnosticoPlanificacion {
  return {
    hoy,
    areas: [],
    objetivos: [],
    proyectos: [],
    entregables: [],
    fases: [],
    actividades: [],
    inbox: [],
  };
}

describe("diagnosticarPlanificacion — Procedimiento guiado por horizonte", () => {
  it("rangoDelMes calcula el primer y último día del mes en curso", () => {
    assert.deepEqual(rangoDelMes("2026-10-12"), {
      inicioMes: "2026-10-01",
      finMes: "2026-10-31",
    });
    assert.deepEqual(rangoDelMes("2026-02-15"), {
      inicioMes: "2026-02-01",
      finMes: "2026-02-28",
    });
  });

  it("en horizonte 'mapa' detecta cuando faltan áreas, proyectos o entregables y pasa a completado cuando la cadena está completa", () => {
    const vacio = diagnosticarPlanificacion("mapa", datosBaseVacios());
    assert.equal(vacio.pasosCompletados, 0);
    assert.equal(vacio.pasos[0].estado, "pendiente");
    assert.equal(vacio.pasos[0].faltantes[0].accion, "crear_area");

    const conArbolCompleto: DatosDiagnosticoPlanificacion = {
      ...datosBaseVacios(),
      areas: [
        {
          id: "area_1",
          nombre: "Agencia",
          activa: true,
          creadoEn: 1,
          actualizadoEn: 1,
        },
      ],
      objetivos: [
        {
          id: "obj_1",
          areaId: "area_1",
          titulo: "250 contactos",
          cantidadObjetivo: 250,
          progresoActual: 100,
          unidad: "contactos",
          diaInicio: "2026-10-01",
          diaLimite: "2026-12-31",
          area: "profesional",
          estado: "activo",
          creadoEn: 1,
          actualizadoEn: 1,
        },
      ],
      proyectos: [
        {
          id: "proy_1",
          objetivoId: "obj_1",
          titulo: "Prospección",
          diaInicio: "2026-10-01",
          diaLimite: "2026-11-30",
          progresoActual: 100,
          estado: "activo",
          tieneHijos: true,
          creadoEn: 1,
          actualizadoEn: 1,
        },
      ],
      entregables: [
        {
          id: "ent_1",
          proyectoId: "proy_1",
          objetivoId: "obj_1",
          titulo: "Mensajes diarios",
          diaInicio: "2026-10-01",
          diaLimite: "2026-10-31",
          cantidadObjetivo: 100,
          unidad: "contactos",
          progresoActual: 40,
          estado: "activo",
          tieneHijos: false,
          creadoEn: 1,
          actualizadoEn: 1,
        },
      ],
    };

    const lleno = diagnosticarPlanificacion("mapa", conArbolCompleto);
    assert.equal(lleno.pasosCompletados, 3);
    assert.equal(lleno.pasos[0].estado, "completado");
    assert.equal(lleno.pasos[1].estado, "completado");
    assert.equal(lleno.pasos[2].estado, "completado");
  });

  it("en horizonte 'mes' avisa cuando un entregable activo en el mes no tiene fase ni actividades asignadas", () => {
    const datos: DatosDiagnosticoPlanificacion = {
      ...datosBaseVacios("2026-10-12"),
      objetivos: [
        {
          id: "obj_1",
          titulo: "Meta anual",
          cantidadObjetivo: 100,
          progresoActual: 50,
          unidad: "pts",
          diaInicio: "2026-01-01",
          diaLimite: "2026-12-31",
          area: "ambas",
          estado: "activo",
          creadoEn: 1,
          actualizadoEn: 1,
        },
      ],
      entregables: [
        {
          id: "ent_oct",
          proyectoId: "proy_1",
          objetivoId: "obj_1",
          titulo: "Entregable Octubre",
          diaInicio: "2026-10-01",
          diaLimite: "2026-10-31",
          progresoActual: 0,
          estado: "activo",
          tieneHijos: false,
          creadoEn: 1,
          actualizadoEn: 1,
        },
      ],
    };

    const diagMes = diagnosticarPlanificacion("mes", datos);
    assert.equal(diagMes.pasos[1].estado, "atencion");
    assert.equal(diagMes.pasos[1].faltantes[0].accion, "crear_fase");
    assert.equal(diagMes.pasos[1].faltantes[0].contextoPadreId, "ent_oct");
  });

  it("en horizonte 'semana' detecta tareas vencidas de días anteriores y fases activas sin actividades en la semana", () => {
    const datos: DatosDiagnosticoPlanificacion = {
      ...datosBaseVacios("2026-10-12"),
      fases: [
        {
          id: "fase_sem",
          entregableId: "ent_1",
          titulo: "Semana 2 Octubre",
          orden: 0,
          diaInicio: "2026-10-12",
          diaLimite: "2026-10-18",
          cantidadObjetivo: 25,
          unidad: "contactos",
          progresoActual: 0,
          estado: "abierta",
          creadoEn: 1,
          actualizadoEn: 1,
        },
      ],
      actividades: [
        {
          id: "act_ayer",
          tipo: "mantenimiento",
          descripcion: "Tarea de ayer colgada",
          diaTarea: "2026-10-11",
          estado: "pendiente",
          creadoEn: 1,
          actualizadoEn: 1,
        },
      ],
    };

    const diagSem = diagnosticarPlanificacion("semana", datos);
    assert.equal(diagSem.pasos[0].estado, "atencion");
    assert.equal(diagSem.pasos[1].estado, "atencion");
    assert.equal(diagSem.pasos[1].faltantes[0].accion, "crear_tarea");
  });

  it("en horizonte 'dia' verifica si hay tarea de enfoque hoy", () => {
    const sinEnfoque: DatosDiagnosticoPlanificacion = {
      ...datosBaseVacios("2026-10-12"),
      actividades: [
        {
          id: "act_mant",
          tipo: "mantenimiento",
          descripcion: "Responder mensajes",
          diaTarea: "2026-10-12",
          estado: "pendiente",
          creadoEn: 1,
          actualizadoEn: 1,
        },
      ],
    };

    const diagSinEnfoque = diagnosticarPlanificacion("dia", sinEnfoque);
    assert.equal(diagSinEnfoque.pasos[1].estado, "atencion");

    const conEnfoque: DatosDiagnosticoPlanificacion = {
      ...sinEnfoque,
      actividades: [
        ...sinEnfoque.actividades,
        {
          id: "act_foco",
          tipo: "enfoque",
          descripcion: "Cerrar propuesta comercial",
          diaTarea: "2026-10-12",
          estado: "pendiente",
          creadoEn: 1,
          actualizadoEn: 1,
        },
      ],
    };

    const diagConEnfoque = diagnosticarPlanificacion("dia", conEnfoque);
    assert.equal(diagConEnfoque.pasos[1].estado, "completado");
    assert.equal(diagConEnfoque.pasosCompletados, 3);
  });
});
