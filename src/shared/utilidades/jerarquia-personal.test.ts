import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarAreasUseCase } from "../../application/use-cases/personal/gestionar-areas.use-case";
import { GestionarObjetivosUseCase } from "../../application/use-cases/personal/gestionar-objetivos.use-case";
import { GestionarProyectosPersonalUseCase } from "../../application/use-cases/personal/gestionar-proyectos-personal.use-case";
import { GestionarEntregablesUseCase } from "../../application/use-cases/personal/gestionar-entregables.use-case";
import { GestionarActividadesUseCase } from "../../application/use-cases/personal/gestionar-actividades.use-case";
import { GestionarHabitosUseCase } from "../../application/use-cases/personal/gestionar-habitos.use-case";
import { EliminarNodoPersonalUseCase } from "../../application/use-cases/personal/eliminar-nodo-personal.use-case";
import {
  PreviewarAjusteFechaUseCase,
  AplicarAjusteFechaUseCase,
} from "../../application/use-cases/personal/ajustar-fecha-personal.use-case";
import { MaterializarActividadesDelDiaUseCase } from "../../application/use-cases/personal/materializar-actividades-del-dia.use-case";
import { ImportarArbolPersonalUseCase } from "../../application/use-cases/personal/importar-arbol-personal.use-case";
import { aplicaHoyEntregable } from "../../domain/entidades/entregable.entity";
import {
  mapearTareaDiariaAActividad,
  mapearTareaPendienteAActividad,
} from "../../domain/entidades/actividad.entity";
import {
  resolverAreaId,
  idAreaDesdeEtiqueta,
  AREA_SIN_ASIGNAR_ID,
} from "../../domain/entidades/area-personal.entity";

const areas = new GestionarAreasUseCase();
const objetivos = new GestionarObjetivosUseCase();
const proyectos = new GestionarProyectosPersonalUseCase();
const entregables = new GestionarEntregablesUseCase();
const actividades = new GestionarActividadesUseCase();
const habitos = new GestionarHabitosUseCase();
const eliminarNodo = new EliminarNodoPersonalUseCase();
const previewFecha = new PreviewarAjusteFechaUseCase();
const aplicarFecha = new AplicarAjusteFechaUseCase();

describe("Jerarquía Personal: CRUD + cascada de progreso + auditoría", () => {
  beforeEach(async () => {
    await db.area_personal.clear();
    await db.objetivo_cuantificable.clear();
    await db.proyecto_personal.clear();
    await db.entregable.clear();
    await db.actividad.clear();
    await db.personal_historial.clear();
    await db.habito_definicion.clear();
  });

  test("GestionarAreasUseCase: crear, editar, desactivar", async () => {
    const creada = await areas.crearArea({ nombre: "Freelancer" });
    assert.strictEqual(creada.ok, true);

    const editada = await areas.editarArea({
      id: creada.valor,
      descripcion: "Trabajo independiente",
    });
    assert.strictEqual(editada.ok, true);
    const fila = await db.area_personal.get(creada.valor);
    assert.strictEqual(fila?.descripcion, "Trabajo independiente");

    const desactivada = await areas.desactivarArea(creada.valor);
    assert.strictEqual(desactivada.ok, true);
    const filaDesactivada = await db.area_personal.get(creada.valor);
    assert.strictEqual(filaDesactivada?.activa, false);
  });

  test("Crear un Proyecto marca tieneHijos=true en su Objetivo, y bloquea registrarAvance directo", async () => {
    const objetivo = await objetivos.crearObjetivo({
      titulo: "Cerrar 5 clientes",
      unidad: "clientes",
      cantidadObjetivo: 5,
      diaInicio: "2026-01-01",
      diaLimite: "2026-12-31",
    });
    assert.strictEqual(objetivo.ok, true);

    const avanceAntes = await objetivos.registrarAvance(objetivo.valor, 1);
    assert.strictEqual(
      avanceAntes.ok,
      true,
      "sin hijos, registrarAvance debe funcionar"
    );

    const proyecto = await proyectos.crearProyecto({
      objetivoId: objetivo.valor,
      titulo: "Rediseño web",
      diaInicio: "2026-01-01",
      diaLimite: "2026-01-31",
    });
    assert.strictEqual(proyecto.ok, true);

    const objetivoActualizado = await db.objetivo_cuantificable.get(
      objetivo.valor
    );
    assert.strictEqual(objetivoActualizado?.tieneHijos, true);

    const avanceDespues = await objetivos.registrarAvance(objetivo.valor, 1);
    assert.strictEqual(
      avanceDespues.ok,
      false,
      "con hijos, registrarAvance directo debe rechazarse"
    );
  });

  test("Cascada de progreso: Actividad completada sube hasta Objetivo pasando por Entregable y Proyecto", async () => {
    const objetivo = await objetivos.crearObjetivo({
      titulo: "200 contactos este año",
      unidad: "contactos",
      cantidadObjetivo: 200,
      diaInicio: "2026-01-01",
      diaLimite: "2026-12-31",
    });
    const proyecto = await proyectos.crearProyecto({
      objetivoId: objetivo.valor,
      titulo: "Prospección Q1",
      diaInicio: "2026-01-01",
      diaLimite: "2026-03-31",
      cantidadObjetivo: 50,
      unidad: "contactos",
    });
    const entregable = await entregables.crearEntregable({
      proyectoId: proyecto.valor,
      objetivoId: objetivo.valor,
      titulo: "Contacto en frío semana 1",
      diaInicio: "2026-01-01",
      diaLimite: "2026-01-07",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });
    assert.strictEqual(entregable.ok, true);

    const actividad1 = await actividades.crearActividad({
      entregableId: entregable.valor,
      tipo: "mantenimiento",
      descripcion: "Contactar 5 potenciales",
      diaTarea: "2026-01-02",
      cantidadObjetivo: 5,
      unidad: "contactos",
    });
    const actividad2 = await actividades.crearActividad({
      entregableId: entregable.valor,
      tipo: "mantenimiento",
      descripcion: "Contactar 5 más",
      diaTarea: "2026-01-03",
      cantidadObjetivo: 5,
      unidad: "contactos",
    });
    assert.strictEqual(actividad1.ok, true);
    assert.strictEqual(actividad2.ok, true);

    const entregableConHijos = await db.entregable.get(entregable.valor);
    assert.strictEqual(entregableConHijos?.tieneHijos, true);

    // Completar ambas actividades — cada una cuenta su cantidadObjetivo completa (5+5=10).
    await actividades.completarActividad(actividad1.valor);
    await actividades.completarActividad(actividad2.valor);

    const entregableFinal = await db.entregable.get(entregable.valor);
    assert.strictEqual(entregableFinal?.progresoActual, 10);
    assert.strictEqual(
      entregableFinal?.estado,
      "cumplido",
      "10/10 debe marcarse cumplido"
    );

    const proyectoFinal = await db.proyecto_personal.get(proyecto.valor);
    assert.strictEqual(proyectoFinal?.progresoActual, 10);

    const objetivoFinal = await db.objetivo_cuantificable.get(objetivo.valor);
    assert.strictEqual(objetivoFinal?.progresoActual, 10);
  });

  test("Entregable sin hijos: registrarAvance funciona directo y sube al Proyecto", async () => {
    const objetivo = await objetivos.crearObjetivo({
      titulo: "Objetivo X",
      unidad: "u",
      cantidadObjetivo: 100,
      diaInicio: "2026-01-01",
      diaLimite: "2026-12-31",
    });
    const proyecto = await proyectos.crearProyecto({
      objetivoId: objetivo.valor,
      titulo: "Proyecto X",
      diaInicio: "2026-01-01",
      diaLimite: "2026-01-31",
      cantidadObjetivo: 20,
      unidad: "u",
    });
    const entregable = await entregables.crearEntregable({
      proyectoId: proyecto.valor,
      objetivoId: objetivo.valor,
      titulo: "Entregable X",
      diaInicio: "2026-01-01",
      diaLimite: "2026-01-07",
      cantidadObjetivo: 10,
      unidad: "u",
    });

    const avance = await entregables.registrarAvance(entregable.valor, 4);
    assert.strictEqual(avance.ok, true);

    const proyectoFinal = await db.proyecto_personal.get(proyecto.valor);
    assert.strictEqual(proyectoFinal?.progresoActual, 4);
  });

  test("Actividad de tipo enfoque/mantenimiento NO tiene tope duro — 1 enfoque + 3 mantenimiento es solo la cantidad recomendada", async () => {
    const dia = "2026-02-01";
    const foco1 = await actividades.crearActividad({
      tipo: "enfoque",
      descripcion: "El foco de hoy",
      diaTarea: dia,
    });
    assert.strictEqual(foco1.ok, true);

    const foco2 = await actividades.crearActividad({
      tipo: "enfoque",
      descripcion: "Un segundo foco, si hace falta",
      diaTarea: dia,
    });
    assert.strictEqual(
      foco2.ok,
      true,
      "un 2do enfoque el mismo día ya no debe bloquearse — el usuario decide si le hace sentido"
    );

    for (let i = 0; i < 5; i++) {
      const m = await actividades.crearActividad({
        tipo: "mantenimiento",
        descripcion: `Mantenimiento ${i}`,
        diaTarea: dia,
      });
      assert.strictEqual(
        m.ok,
        true,
        `mantenimiento ${i} no debería bloquearse aunque supere la cantidad recomendada`
      );
    }

    const todasDelDia = await db.actividad.where({ diaTarea: dia }).toArray();
    assert.strictEqual(todasDelDia.length, 7);
  });

  test("Cada mutación deja una fila en personal_historial", async () => {
    const objetivo = await objetivos.crearObjetivo({
      titulo: "Con historial",
      unidad: "u",
      cantidadObjetivo: 10,
      diaInicio: "2026-01-01",
      diaLimite: "2026-06-30",
    });
    await objetivos.registrarAvance(objetivo.valor, 2);
    await objetivos.ajustarObjetivo({
      id: objetivo.valor,
      cantidadObjetivo: 15,
    });

    const historial = await db.personal_historial
      .where("entidadId")
      .equals(objetivo.valor)
      .toArray();
    const acciones = historial.map((h) => h.accion).sort();
    assert.deepStrictEqual(acciones, [
      "ajustar_cantidad",
      "crear",
      "registrar_avance",
    ]);
  });
});

describe("Borrado en cascada: conteo real y sin huérfanos", () => {
  beforeEach(async () => {
    await db.area_personal.clear();
    await db.objetivo_cuantificable.clear();
    await db.proyecto_personal.clear();
    await db.entregable.clear();
    await db.actividad.clear();
    await db.personal_historial.clear();
    await db.habito_definicion.clear();
  });

  async function armarArbolDeEjemplo() {
    const area = await areas.crearArea({ nombre: "Freelancer" });
    const objetivo = await objetivos.crearObjetivo({
      titulo: "Cerrar clientes",
      unidad: "clientes",
      cantidadObjetivo: 5,
      diaInicio: "2026-01-01",
      diaLimite: "2026-12-31",
      areaId: area.valor,
    });
    const proyecto = await proyectos.crearProyecto({
      objetivoId: objetivo.valor,
      titulo: "Rediseño web",
      diaInicio: "2026-01-01",
      diaLimite: "2026-01-31",
    });
    const entregable = await entregables.crearEntregable({
      proyectoId: proyecto.valor,
      objetivoId: objetivo.valor,
      titulo: "Wireframes",
      diaInicio: "2026-01-01",
      diaLimite: "2026-01-07",
    });
    const actividad = await actividades.crearActividad({
      entregableId: entregable.valor,
      tipo: "mantenimiento",
      descripcion: "Wireframe home",
      diaTarea: "2026-01-02",
    });
    const habito = await habitos.crearHabito({
      nombre: "Meditar",
      descripcionMin: "1 min",
      descripcionMed: "5 min",
      descripcionMax: "15 min",
      objetivoId: objetivo.valor,
      entregableId: entregable.valor,
    });
    return {
      areaId: area.valor,
      objetivoId: objetivo.valor,
      proyectoId: proyecto.valor,
      entregableId: entregable.valor,
      actividadId: actividad.valor,
      habitoId: habito.valor,
    };
  }

  test("contarDescendientes de un Objetivo cuenta todo lo real, incluyendo hábitos vinculados", async () => {
    const arbol = await armarArbolDeEjemplo();
    const conteo = await eliminarNodo.contarDescendientes(
      "objetivo",
      arbol.objetivoId
    );
    assert.strictEqual(conteo.ok, true);
    assert.deepStrictEqual(conteo.valor, {
      proyectos: 1,
      entregables: 1,
      actividades: 1,
      habitosVinculados: 1,
    });
  });

  test("eliminar un Entregable borra sus Actividades y limpia (no borra) el hábito vinculado", async () => {
    const arbol = await armarArbolDeEjemplo();
    const res = await eliminarNodo.ejecutar("entregable", arbol.entregableId);
    assert.strictEqual(res.ok, true);

    assert.strictEqual(await db.entregable.get(arbol.entregableId), undefined);
    assert.strictEqual(await db.actividad.get(arbol.actividadId), undefined);

    const habito = await db.habito_definicion.get(arbol.habitoId);
    assert.notStrictEqual(habito, undefined, "el hábito no debe borrarse");
    assert.strictEqual(
      habito?.entregableId,
      undefined,
      "el vínculo colgante debe limpiarse"
    );
  });

  test("eliminar un Objetivo borra toda la cadena (Proyecto/Entregable/Actividad) sin dejar huérfanos", async () => {
    const arbol = await armarArbolDeEjemplo();
    const res = await eliminarNodo.ejecutar("objetivo", arbol.objetivoId);
    assert.strictEqual(res.ok, true);

    assert.strictEqual(
      await db.objetivo_cuantificable.get(arbol.objetivoId),
      undefined
    );
    assert.strictEqual(
      await db.proyecto_personal.get(arbol.proyectoId),
      undefined
    );
    assert.strictEqual(await db.entregable.get(arbol.entregableId), undefined);
    assert.strictEqual(await db.actividad.get(arbol.actividadId), undefined);

    // Ninguna fila viva debe seguir apuntando al objetivo borrado.
    const proyectosHuerfanos = await db.proyecto_personal
      .where("objetivoId")
      .equals(arbol.objetivoId)
      .toArray();
    const entregablesHuerfanos = await db.entregable
      .where("objetivoId")
      .equals(arbol.objetivoId)
      .toArray();
    assert.strictEqual(proyectosHuerfanos.length, 0);
    assert.strictEqual(entregablesHuerfanos.length, 0);

    const habito = await db.habito_definicion.get(arbol.habitoId);
    assert.notStrictEqual(habito, undefined);
    assert.strictEqual(habito?.objetivoId, undefined);
  });

  test("eliminar un Área elimina en cascada sus Objetivos y todo lo de abajo", async () => {
    const arbol = await armarArbolDeEjemplo();
    const res = await eliminarNodo.ejecutar("area", arbol.areaId);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(await db.area_personal.get(arbol.areaId), undefined);
    assert.strictEqual(
      await db.objetivo_cuantificable.get(arbol.objetivoId),
      undefined
    );
    assert.strictEqual(
      await db.proyecto_personal.get(arbol.proyectoId),
      undefined
    );
  });
});

describe("Ajuste de fecha con preview: nunca silencioso", () => {
  beforeEach(async () => {
    await db.objetivo_cuantificable.clear();
    await db.proyecto_personal.clear();
    await db.personal_historial.clear();
  });

  test("el preview marca conflicto cuando la fecha del hijo supera la nueva fecha propuesta del padre", async () => {
    const objetivo = await objetivos.crearObjetivo({
      titulo: "Objetivo con proyectos",
      unidad: "u",
      cantidadObjetivo: 10,
      diaInicio: "2026-01-01",
      diaLimite: "2026-06-30",
    });
    const proyectoOk = await proyectos.crearProyecto({
      objetivoId: objetivo.valor,
      titulo: "Termina antes",
      diaInicio: "2026-01-01",
      diaLimite: "2026-02-15",
    });
    const proyectoConflicto = await proyectos.crearProyecto({
      objetivoId: objetivo.valor,
      titulo: "Termina después",
      diaInicio: "2026-01-01",
      diaLimite: "2026-05-01",
    });

    const preview = await previewFecha.ejecutar(
      "objetivo",
      objetivo.valor,
      "2026-03-01"
    );
    assert.strictEqual(preview.ok, true);
    const porId = new Map(preview.valor.map((i) => [i.id, i]));
    assert.strictEqual(porId.get(proyectoOk.valor)?.conflicto, false);
    assert.strictEqual(porId.get(proyectoConflicto.valor)?.conflicto, true);
  });

  test("aplicar el ajuste escribe la fecha del padre y de los hijos confirmados, con historial", async () => {
    const objetivo = await objetivos.crearObjetivo({
      titulo: "Objetivo a correr",
      unidad: "u",
      cantidadObjetivo: 10,
      diaInicio: "2026-01-01",
      diaLimite: "2026-06-30",
    });
    const proyecto = await proyectos.crearProyecto({
      objetivoId: objetivo.valor,
      titulo: "Proyecto a correr también",
      diaInicio: "2026-01-01",
      diaLimite: "2026-05-01",
    });

    const res = await aplicarFecha.ejecutar(
      "objetivo",
      objetivo.valor,
      "2026-08-31",
      [{ id: proyecto.valor, nuevaFecha: "2026-07-31" }]
    );
    assert.strictEqual(res.ok, true);

    const objetivoFinal = await db.objetivo_cuantificable.get(objetivo.valor);
    const proyectoFinal = await db.proyecto_personal.get(proyecto.valor);
    assert.strictEqual(objetivoFinal?.diaLimite, "2026-08-31");
    assert.strictEqual(proyectoFinal?.diaLimite, "2026-07-31");

    const historialProyecto = await db.personal_historial
      .where("entidadId")
      .equals(proyecto.valor)
      .toArray();
    assert.ok(historialProyecto.some((h) => h.accion === "ajustar_fecha"));
  });
});

describe("Recurrencia de Entregables: aplicaHoyEntregable y materialización", () => {
  const materializar = new MaterializarActividadesDelDiaUseCase();

  beforeEach(async () => {
    await db.objetivo_cuantificable.clear();
    await db.proyecto_personal.clear();
    await db.entregable.clear();
    await db.actividad.clear();
    await db.personal_historial.clear();
  });

  test("aplicaHoyEntregable: diaria siempre true, dias_especificos depende del día de semana", () => {
    assert.strictEqual(
      aplicaHoyEntregable({ frecuencia: "diaria" }, "2026-02-01"),
      true
    );
    // 2026-02-02 es lunes (día 1 UTC).
    assert.strictEqual(
      aplicaHoyEntregable(
        { frecuencia: "dias_especificos", diasSemana: [1, 2, 3, 4, 5] },
        "2026-02-02"
      ),
      true
    );
    // 2026-02-01 es domingo (día 0 UTC) — no está en Lun-Vie.
    assert.strictEqual(
      aplicaHoyEntregable(
        { frecuencia: "dias_especificos", diasSemana: [1, 2, 3, 4, 5] },
        "2026-02-01"
      ),
      false
    );
  });

  async function armarEntregableRecurrente(cantidadObjetivo?: number) {
    const objetivo = await objetivos.crearObjetivo({
      titulo: "200 contactos/año",
      unidad: "contactos",
      cantidadObjetivo: 200,
      diaInicio: "2026-01-01",
      diaLimite: "2026-12-31",
    });
    const proyecto = await proyectos.crearProyecto({
      objetivoId: objetivo.valor,
      titulo: "Prospección",
      diaInicio: "2026-01-01",
      diaLimite: "2026-12-31",
    });
    const entregable = await entregables.crearEntregable({
      proyectoId: proyecto.valor,
      objetivoId: objetivo.valor,
      titulo: "Contacto en frío",
      diaInicio: "2026-01-01",
      diaLimite: "2026-12-31",
      cantidadObjetivo,
      unidad: cantidadObjetivo !== undefined ? "contactos" : undefined,
      recurrencia: {
        frecuencia: "dias_especificos",
        diasSemana: [1, 2, 3, 4, 5],
      },
    });
    return {
      objetivoId: objetivo.valor,
      proyectoId: proyecto.valor,
      entregableId: entregable.valor,
    };
  }

  test("materializa una Actividad de hoy para un Entregable recurrente cuando el día aplica", async () => {
    const { entregableId } = await armarEntregableRecurrente();
    // 2026-02-02 es lunes.
    const res = await materializar.ejecutar("2026-02-02");
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.valor, 1);

    const actividades = await db.actividad
      .where("entregableId")
      .equals(entregableId)
      .toArray();
    assert.strictEqual(actividades.length, 1);
    assert.strictEqual(actividades[0].diaTarea, "2026-02-02");
    assert.strictEqual(actividades[0].recurrenciaId, entregableId);
  });

  test("materializar dos veces el mismo día es idempotente (no duplica)", async () => {
    await armarEntregableRecurrente();
    const primera = await materializar.ejecutar("2026-02-02");
    const segunda = await materializar.ejecutar("2026-02-02");
    assert.strictEqual(primera.valor, 1);
    assert.strictEqual(segunda.valor, 0);
  });

  test("no materializa en un día que no le toca (domingo, Lun-Vie)", async () => {
    await armarEntregableRecurrente();
    const res = await materializar.ejecutar("2026-02-01"); // domingo
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.valor, 0);
  });

  test("registrar avance en la instancia materializada sube el progreso hasta el Objetivo", async () => {
    const { entregableId, proyectoId, objetivoId } =
      await armarEntregableRecurrente(10);
    await materializar.ejecutar("2026-02-02");
    const [actividad] = await db.actividad
      .where("entregableId")
      .equals(entregableId)
      .toArray();

    const avance = await actividades.registrarAvance(actividad.id, 5);
    assert.strictEqual(avance.ok, true);

    const entregableFinal = await db.entregable.get(entregableId);
    const proyectoFinal = await db.proyecto_personal.get(proyectoId);
    const objetivoFinal = await db.objetivo_cuantificable.get(objetivoId);
    assert.strictEqual(entregableFinal?.progresoActual, 5);
    assert.strictEqual(proyectoFinal?.progresoActual, 5);
    assert.strictEqual(objetivoFinal?.progresoActual, 5);
  });

  test("no genera más instancias una vez que el Entregable ya alcanzó su cantidad objetivo", async () => {
    const { entregableId } = await armarEntregableRecurrente(5);
    await materializar.ejecutar("2026-02-02");
    const [actividad] = await db.actividad
      .where("entregableId")
      .equals(entregableId)
      .toArray();
    await actividades.registrarAvance(actividad.id, 5); // llega a 5/5

    const res = await materializar.ejecutar("2026-02-03"); // martes, también aplica
    assert.strictEqual(
      res.valor,
      0,
      "ya cumplió el objetivo, no debería crear más instancias"
    );
  });
});

describe("Migración Sprint 5: funciones puras de mapeo (TareaDiaria/TareaPendiente/etiquetaArea)", () => {
  test("mapearTareaDiariaAActividad conserva id, fechas y campos tal cual", () => {
    const original = {
      id: "tdi_123_abcd",
      tipo: "enfoque" as const,
      descripcion: "Terminar el informe",
      diaTarea: "2026-03-05",
      estado: "pendiente",
      fechaMigradaDesde: "2026-03-04",
      origenInboxId: "inb_1",
      creadoEn: 1000,
      actualizadoEn: 2000,
    };
    const actividad = mapearTareaDiariaAActividad(original);
    assert.strictEqual(actividad.id, "tdi_123_abcd");
    assert.strictEqual(actividad.tipo, "enfoque");
    assert.strictEqual(actividad.diaTarea, "2026-03-05");
    assert.strictEqual(actividad.fechaMigradaDesde, "2026-03-04");
    assert.strictEqual(actividad.creadoEn, 1000);
    assert.strictEqual(actividad.entregableId, undefined);
  });

  test("mapearTareaPendienteAActividad: 'promovida' pasa a 'completada', el resto de estados se conserva", () => {
    const base = {
      id: "tpe_1",
      descripcion: "Pagar el hosting",
      prioridad: "urgente" as const,
      area: "profesional" as const,
      semanaId: "2026-03-02",
      creadoEn: 500,
      actualizadoEn: 600,
    };
    assert.strictEqual(
      mapearTareaPendienteAActividad({ ...base, estado: "promovida" }).estado,
      "completada"
    );
    assert.strictEqual(
      mapearTareaPendienteAActividad({ ...base, estado: "pendiente" }).estado,
      "pendiente"
    );
    assert.strictEqual(
      mapearTareaPendienteAActividad({ ...base, estado: "descartada" }).estado,
      "descartada"
    );
    const actividad = mapearTareaPendienteAActividad({
      ...base,
      estado: "pendiente",
    });
    assert.strictEqual(actividad.tipo, "backlog");
    assert.strictEqual(actividad.area, "profesional");
    assert.strictEqual(actividad.diaTarea, undefined);
  });

  test("resolverAreaId: mismo nombre de etiqueta siempre resuelve al mismo id, sin etiqueta va a 'Sin área'", () => {
    assert.strictEqual(resolverAreaId(undefined), AREA_SIN_ASIGNAR_ID);
    assert.strictEqual(resolverAreaId(""), AREA_SIN_ASIGNAR_ID);
    assert.strictEqual(
      resolverAreaId("Freelancer"),
      idAreaDesdeEtiqueta("Freelancer")
    );
    // Mismo nombre con distinta capitalización/espacios → mismo id (evita duplicar áreas).
    assert.strictEqual(
      idAreaDesdeEtiqueta("Freelancer"),
      idAreaDesdeEtiqueta("  freelancer  ")
    );
  });
});

describe("Import JSON con IA de la jerarquía (árbol completo y por nivel)", () => {
  const importarArbol = new ImportarArbolPersonalUseCase();

  beforeEach(async () => {
    await db.area_personal.clear();
    await db.objetivo_cuantificable.clear();
    await db.proyecto_personal.clear();
    await db.entregable.clear();
    await db.actividad.clear();
    await db.personal_historial.clear();
  });

  test("rechaza un JSON con estructura inválida (sin objetivosNuevos) en vez de importarlo a medias", async () => {
    const res = await importarArbol.importarArbol([
      { areaTitulo: "Freelancer" },
    ]);
    assert.strictEqual(res.ok, false);
    assert.match(res.error!.mensaje, /estructura esperada/);
  });

  test("importarArbol crea Área nueva + Objetivo + Proyecto + Entregable (recurrente) + Actividad anidados, sin huérfanos", async () => {
    const res = await importarArbol.importarArbol([
      {
        areaTitulo: "Freelancer",
        objetivosNuevos: [
          {
            titulo: "Cerrar 5 clientes",
            unidad: "clientes",
            cantidadObjetivo: 5,
            diaLimite: "2027-01-31",
            proyectos: [
              {
                titulo: "Rediseño web",
                diaLimite: "2026-10-31",
                cantidadObjetivo: 120,
                unidad: "horas",
                entregables: [
                  {
                    titulo: "Contacto en frío",
                    diaLimite: "2026-09-20",
                    cantidadObjetivo: 200,
                    unidad: "contactos",
                    recurrencia: {
                      frecuencia: "dias_especificos",
                      diasSemana: [1, 2, 3, 4, 5],
                    },
                    actividades: [],
                  },
                  {
                    titulo: "Wireframes",
                    diaLimite: "2026-09-20",
                    cantidadObjetivo: 8,
                    unidad: "pantallas",
                    actividades: [
                      {
                        tipo: "enfoque",
                        descripcion: "Wireframe home",
                        diaTarea: "2026-09-16",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
    assert.strictEqual(res.ok, true);

    const areas = await db.area_personal.toArray();
    const objetivos = await db.objetivo_cuantificable.toArray();
    const proyectos = await db.proyecto_personal.toArray();
    const entregables = await db.entregable.toArray();
    const actividades = await db.actividad.toArray();

    assert.strictEqual(areas.length, 1);
    assert.strictEqual(areas[0].nombre, "Freelancer");
    assert.strictEqual(objetivos.length, 1);
    assert.strictEqual(objetivos[0].areaId, areas[0].id);
    assert.strictEqual(proyectos.length, 1);
    assert.strictEqual(proyectos[0].objetivoId, objetivos[0].id);
    assert.strictEqual(entregables.length, 2);
    for (const e of entregables)
      assert.strictEqual(e.proyectoId, proyectos[0].id);
    assert.strictEqual(actividades.length, 1);
    assert.strictEqual(
      actividades[0].entregableId,
      entregables.find((e) => e.titulo === "Wireframes")?.id
    );
  });

  test("importarArbol reusa un Área existente por título exacto, no la duplica", async () => {
    const primeraVez = await importarArbol.importarArbol([
      {
        areaTitulo: "Salud",
        objetivosNuevos: [
          {
            titulo: "Correr una maratón",
            unidad: "km",
            cantidadObjetivo: 42,
            diaLimite: "2026-12-31",
            proyectos: [],
          },
        ],
      },
    ]);
    assert.strictEqual(primeraVez.ok, true);

    const segundaVez = await importarArbol.importarArbol([
      {
        areaTitulo: "salud", // distinta capitalización, mismo título
        objetivosNuevos: [
          {
            titulo: "Bajar de peso",
            unidad: "kg",
            cantidadObjetivo: 5,
            diaLimite: "2026-12-31",
            proyectos: [],
          },
        ],
      },
    ]);
    assert.strictEqual(segundaVez.ok, true);

    const areas = await db.area_personal.toArray();
    assert.strictEqual(
      areas.length,
      1,
      "no debería crear una segunda área 'Salud'"
    );
  });

  test("importarProyecto: falla con mensaje claro si el Objetivo padre no existe", async () => {
    const res = await importarArbol.importarProyecto([
      {
        objetivoTitulo: "Objetivo inexistente",
        proyectosNuevos: [
          { titulo: "P", diaLimite: "2026-12-31", entregables: [] },
        ],
      },
    ]);
    assert.strictEqual(res.ok, false);
    assert.match(res.error!.mensaje, /No se encontró un objetivo activo/);
  });

  test("importarProyecto crea el Proyecto bajo el Objetivo existente resuelto por título", async () => {
    const arbol = await importarArbol.importarArbol([
      {
        areaTitulo: "Freelancer",
        objetivosNuevos: [
          {
            titulo: "Objetivo base",
            unidad: "u",
            cantidadObjetivo: 10,
            diaLimite: "2026-12-31",
            proyectos: [],
          },
        ],
      },
    ]);
    assert.strictEqual(arbol.ok, true);

    const res = await importarArbol.importarProyecto([
      {
        objetivoTitulo: "Objetivo base",
        proyectosNuevos: [
          {
            titulo: "Proyecto nuevo",
            diaLimite: "2026-11-30",
            entregables: [],
          },
        ],
      },
    ]);
    assert.strictEqual(res.ok, true);

    const proyectos = await db.proyecto_personal.toArray();
    assert.strictEqual(proyectos.length, 1);
    assert.strictEqual(proyectos[0].titulo, "Proyecto nuevo");
    const objetivos = await db.objetivo_cuantificable.toArray();
    assert.strictEqual(proyectos[0].objetivoId, objetivos[0].id);
  });

  test("importarEntregable e importarActividades encadenan correctamente sobre lo creado antes", async () => {
    await importarArbol.importarArbol([
      {
        areaTitulo: "Freelancer",
        objetivosNuevos: [
          {
            titulo: "Obj",
            unidad: "u",
            cantidadObjetivo: 10,
            diaLimite: "2026-12-31",
            proyectos: [],
          },
        ],
      },
    ]);
    await importarArbol.importarProyecto([
      {
        objetivoTitulo: "Obj",
        proyectosNuevos: [
          { titulo: "Proy", diaLimite: "2026-11-30", entregables: [] },
        ],
      },
    ]);

    const resEntregable = await importarArbol.importarEntregable([
      {
        proyectoTitulo: "Proy",
        entregablesNuevos: [
          { titulo: "Entreg", diaLimite: "2026-10-31", actividades: [] },
        ],
      },
    ]);
    assert.strictEqual(resEntregable.ok, true);

    const resActividades = await importarArbol.importarActividades([
      {
        entregableTitulo: "Entreg",
        actividadesNuevas: [
          {
            tipo: "mantenimiento",
            descripcion: "Primer paso",
            diaTarea: "2026-10-01",
          },
        ],
      },
    ]);
    assert.strictEqual(resActividades.ok, true);

    const entregables = await db.entregable.toArray();
    const proyectos = await db.proyecto_personal.toArray();
    const actividades = await db.actividad.toArray();
    assert.strictEqual(entregables.length, 1);
    assert.strictEqual(entregables[0].proyectoId, proyectos[0].id);
    assert.strictEqual(actividades.length, 1);
    assert.strictEqual(actividades[0].entregableId, entregables[0].id);
  });
});

describe("Actividad de backlog: promover a agenda y armar la semana", () => {
  beforeEach(async () => {
    await db.actividad.clear();
  });

  test("promoverAAgenda crea una actividad de enfoque/mantenimiento y marca la de backlog como completada", async () => {
    const backlog = await actividades.crearActividad({
      tipo: "backlog",
      descripcion: "Pagar el hosting",
      prioridad: "urgente",
    });
    assert.strictEqual(backlog.ok, true);

    const res = await actividades.promoverAAgenda(
      backlog.valor,
      "2026-04-01",
      "mantenimiento"
    );
    assert.strictEqual(res.ok, true);

    const original = await db.actividad.get(backlog.valor);
    const nueva = await db.actividad.get(res.valor);
    assert.strictEqual(original?.estado, "completada");
    assert.strictEqual(nueva?.tipo, "mantenimiento");
    assert.strictEqual(nueva?.diaTarea, "2026-04-01");
    assert.strictEqual(nueva?.descripcion, "Pagar el hosting");
  });

  test("asignarASemanaActual asigna el lunes de la semana actual a las actividades elegidas", async () => {
    const a = await actividades.crearActividad({
      tipo: "backlog",
      descripcion: "A",
    });
    const b = await actividades.crearActividad({
      tipo: "backlog",
      descripcion: "B",
    });

    const res = await actividades.asignarASemanaActual([a.valor, b.valor]);
    assert.strictEqual(res.ok, true);

    const filaA = await db.actividad.get(a.valor);
    const filaB = await db.actividad.get(b.valor);
    assert.ok(filaA?.semanaId);
    assert.strictEqual(filaA?.semanaId, filaB?.semanaId);
  });

  test("asignarASemanaActual sin ids falla con mensaje claro", async () => {
    const res = await actividades.asignarASemanaActual([]);
    assert.strictEqual(res.ok, false);
  });
});
