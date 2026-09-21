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
import { calcularNivelLogro } from "../../domain/entidades/objetivo-cuantificable.entity";
import { GestionarFasesUseCase } from "../../application/use-cases/personal/gestionar-fases.use-case";
import { calcularDistribucionProgresiva } from "../../domain/entidades/fase-personal.entity";
import {
  repartirEnDias,
  bucketDeActividad,
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
const fases = new GestionarFasesUseCase();
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
    await db.fase_personal.clear();
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
    const fase = await fases.crearFase({
      entregableId: entregable.valor!,
      titulo: "Semana 1",
      orden: 0,
      diaInicio: "2026-01-01",
      diaLimite: "2026-01-07",
      cantidadObjetivo: 5,
      unidad: "wireframes",
    });
    return {
      areaId: area.valor,
      objetivoId: objetivo.valor,
      proyectoId: proyecto.valor,
      entregableId: entregable.valor,
      actividadId: actividad.valor,
      habitoId: habito.valor,
      faseId: fase.valor,
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
    assert.strictEqual(
      await db.fase_personal.get(arbol.faseId),
      undefined,
      "la Fase del entregable borrado también debe borrarse"
    );

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
    assert.strictEqual(
      await db.fase_personal.get(arbol.faseId),
      undefined,
      "la Fase también debe borrarse al eliminar el Objetivo"
    );

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
    assert.strictEqual(
      await db.fase_personal.get(arbol.faseId),
      undefined,
      "la Fase también debe borrarse al eliminar el Área (vía cascada del Objetivo)"
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
    await db.fase_personal.clear();
    await db.personal_historial.clear();
  });

  test("importarArbol crea las Fases anidadas dentro del Entregable en la misma pasada (Sprint 21)", async () => {
    const res = await importarArbol.importarArbol([
      {
        areaTitulo: "Freelancer",
        objetivosNuevos: [
          {
            titulo: "1000 contactos",
            unidad: "contactos",
            cantidadObjetivo: 1000,
            diaLimite: "2027-01-31",
            proyectos: [
              {
                titulo: "Contacto en frío",
                diaLimite: "2026-12-31",
                entregables: [
                  {
                    titulo: "Contacto en frío recurrente",
                    diaLimite: "2026-12-31",
                    cantidadObjetivo: 1000,
                    unidad: "contactos",
                    recurrencia: {
                      frecuencia: "dias_especificos",
                      diasSemana: [1, 2, 3, 4, 5],
                    },
                    actividades: [],
                    fases: [
                      {
                        titulo: "Semana 1",
                        orden: 0,
                        diaInicio: "2026-01-05",
                        diaLimite: "2026-01-11",
                        cantidadObjetivo: 10,
                        unidad: "contactos",
                      },
                      {
                        titulo: "Semana 2",
                        orden: 1,
                        diaInicio: "2026-01-12",
                        diaLimite: "2026-01-18",
                        cantidadObjetivo: 15,
                        unidad: "contactos",
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

    const entregable = await db.entregable
      .filter((e) => e.titulo === "Contacto en frío recurrente")
      .first();
    assert.ok(entregable);
    const fases = await db.fase_personal
      .where("entregableId")
      .equals(entregable!.id)
      .sortBy("orden");
    assert.strictEqual(fases.length, 2);
    assert.strictEqual(fases[0].titulo, "Semana 1");
    assert.strictEqual(fases[0].cantidadObjetivo, 10);
    assert.strictEqual(fases[1].cantidadObjetivo, 15);
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
                    diaLimite: "2027-09-20",
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
                    diaLimite: "2027-09-20",
                    cantidadObjetivo: 8,
                    unidad: "pantallas",
                    actividades: [
                      {
                        tipo: "enfoque",
                        descripcion: "Wireframe home",
                        diaTarea: "2027-09-16",
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

describe("calcularNivelLogro — bandas de aceptación (Sprint 21)", () => {
  test("sin bandaAceptable configurada, no da veredicto", () => {
    assert.strictEqual(calcularNivelLogro(100, 50), undefined);
  });

  test("100% o más siempre es ideal, incluso con bandas bajas", () => {
    assert.strictEqual(calcularNivelLogro(100, 100, 80, 60), "ideal");
    assert.strictEqual(calcularNivelLogro(100, 120, 80, 60), "ideal");
  });

  test("por encima de la banda aceptable pero bajo 100% es aceptable", () => {
    assert.strictEqual(calcularNivelLogro(100, 85, 80, 60), "aceptable");
  });

  test("entre la banda mejorable y la aceptable es mejorable", () => {
    assert.strictEqual(calcularNivelLogro(100, 70, 80, 60), "mejorable");
  });

  test("por debajo de la banda mejorable es bajo", () => {
    assert.strictEqual(calcularNivelLogro(100, 40, 80, 60), "bajo");
  });

  test("sin bandaMejorable, cualquier cosa bajo la aceptable es directamente bajo", () => {
    assert.strictEqual(calcularNivelLogro(100, 70, 80), "bajo");
  });
});

describe("calcularDistribucionProgresiva — motor de reparto pirámide (Sprint 21)", () => {
  test("modo constante (incrementoPorFase=0): mismo reparto todas las semanas", () => {
    const r = calcularDistribucionProgresiva({
      diaInicio: "2026-01-05", // lunes
      diaLimite: "2026-01-18", // 2 semanas exactas
      diasSemana: [1, 2, 3, 4, 5],
      duracionFaseDias: 7,
      cantidadPorDiaInicial: 5,
      incrementoPorFase: 0,
      cantidadObjetivoTotal: 50,
    });
    assert.strictEqual(r.fases.length, 2);
    assert.strictEqual(r.fases[0].diasHabiles, 5);
    assert.strictEqual(r.fases[0].cantidadObjetivo, 25);
    assert.strictEqual(r.fases[1].cantidadObjetivo, 25);
    assert.strictEqual(r.totalProyectado, 50);
    assert.strictEqual(r.diferencia, 0);
  });

  test("modo creciente con tope: la cuota sube por fase hasta el tope y se queda ahí", () => {
    const r = calcularDistribucionProgresiva({
      diaInicio: "2026-01-05",
      diaLimite: "2026-01-25", // 3 semanas
      diasSemana: [1, 2, 3, 4, 5],
      duracionFaseDias: 7,
      cantidadPorDiaInicial: 2,
      incrementoPorFase: 1,
      topePorDia: 3,
      cantidadObjetivoTotal: 100,
    });
    assert.strictEqual(r.fases.length, 3);
    assert.strictEqual(r.fases[0].cantidadPorDia, 2);
    assert.strictEqual(r.fases[1].cantidadPorDia, 3);
    assert.strictEqual(
      r.fases[2].cantidadPorDia,
      3,
      "se queda en el tope, no sigue subiendo"
    );
  });

  test("si el total proyectado no coincide con el pedido, reporta la diferencia en vez de forzarlo", () => {
    const r = calcularDistribucionProgresiva({
      diaInicio: "2026-01-05",
      diaLimite: "2026-01-11", // 1 semana, 5 días hábiles x 5/día = 25
      diasSemana: [1, 2, 3, 4, 5],
      duracionFaseDias: 7,
      cantidadPorDiaInicial: 5,
      incrementoPorFase: 0,
      cantidadObjetivoTotal: 1000,
    });
    assert.strictEqual(r.totalProyectado, 25);
    assert.strictEqual(r.diferencia, 975);
  });
});

describe("Fases: progreso por rango de fechas y cierre con arrastre (Sprint 21)", () => {
  const fases = new GestionarFasesUseCase();

  beforeEach(async () => {
    await db.area_personal.clear();
    await db.objetivo_cuantificable.clear();
    await db.proyecto_personal.clear();
    await db.entregable.clear();
    await db.actividad.clear();
    await db.fase_personal.clear();
    await db.personal_historial.clear();
  });

  async function crearCadena(): Promise<string> {
    const objetivo = await objetivos.crearObjetivo({
      titulo: "1000 contactos",
      unidad: "contactos",
      cantidadObjetivo: 1000,
      diaInicio: "2026-01-01",
      diaLimite: "2026-06-30",
    });
    const proyecto = await proyectos.crearProyecto({
      objetivoId: objetivo.valor,
      titulo: "Contacto en frío",
      diaInicio: "2026-01-01",
      diaLimite: "2026-06-30",
    });
    const entregable = await entregables.crearEntregable({
      proyectoId: proyecto.valor,
      objetivoId: objetivo.valor,
      titulo: "Contacto en frío recurrente",
      diaInicio: "2026-01-01",
      diaLimite: "2026-06-30",
      cantidadObjetivo: 1000,
      unidad: "contactos",
      recurrencia: {
        frecuencia: "dias_especificos",
        diasSemana: [1, 2, 3, 4, 5],
      },
    });
    return entregable.valor;
  }

  test("una Fase creada DESPUÉS de cargar Actividades ya nace con su avance (no queda en 0)", async () => {
    const entregableId = await crearCadena();
    const act = await actividades.crearActividad({
      entregableId,
      tipo: "mantenimiento",
      descripcion: "Contactos previos",
      diaTarea: "2026-01-06",
      cantidadObjetivo: 8,
    });
    await actividades.registrarAvance(act.valor, 8);

    const fase = await fases.crearFase({
      entregableId,
      titulo: "Semana 1",
      orden: 0,
      diaInicio: "2026-01-05",
      diaLimite: "2026-01-11",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });
    assert.strictEqual(
      (await db.fase_personal.get(fase.valor))?.progresoActual,
      8
    );
  });

  test("ajustarFase cambia meta/fecha, recalcula el avance y rechaza una fecha anterior al inicio", async () => {
    const entregableId = await crearCadena();
    const fase = await fases.crearFase({
      entregableId,
      titulo: "Semana 1",
      orden: 0,
      diaInicio: "2026-01-05",
      diaLimite: "2026-01-07",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });
    const act = await actividades.crearActividad({
      entregableId,
      tipo: "mantenimiento",
      descripcion: "Contactos jueves",
      diaTarea: "2026-01-08",
      cantidadObjetivo: 4,
    });
    await actividades.registrarAvance(act.valor, 4);
    assert.strictEqual(
      (await db.fase_personal.get(fase.valor))?.progresoActual,
      0
    );

    const res = await fases.ajustarFase({
      id: fase.valor!,
      diaLimite: "2026-01-11",
      cantidadObjetivo: 12,
    });
    assert.strictEqual(res.ok, true);
    const ajustada = await db.fase_personal.get(fase.valor);
    assert.strictEqual(ajustada?.cantidadObjetivo, 12);
    assert.strictEqual(
      ajustada?.progresoActual,
      4,
      "la actividad del jueves ahora cae en la fase"
    );

    const invalida = await fases.ajustarFase({
      id: fase.valor!,
      diaLimite: "2026-01-01",
    });
    assert.strictEqual(invalida.ok, false);
  });

  test("cancelar y migrar una Actividad guardan el motivo en el historial", async () => {
    const act = await actividades.crearActividad({
      tipo: "mantenimiento",
      descripcion: "Llamar al cliente",
      diaTarea: "2026-01-06",
    });
    await actividades.cancelarActividad(act.valor!, "sin_tiempo");
    const act2 = await actividades.crearActividad({
      tipo: "mantenimiento",
      descripcion: "Enviar propuesta",
      diaTarea: "2026-01-06",
    });
    await actividades.migrarActividad({
      id: act2.valor!,
      nuevoDiaTarea: "2026-01-07",
      motivo: "se_complico",
    });

    const historial = await db.personal_historial.toArray();
    const motivos = historial
      .map((h) => (h.campoNuevo as { motivo?: string } | undefined)?.motivo)
      .filter(Boolean);
    assert.deepStrictEqual(motivos.sort(), ["se_complico", "sin_tiempo"]);
  });

  test("recomputarFasesDeEntregable solo cuenta Actividades dentro del rango de la Fase", async () => {
    const entregableId = await crearCadena();
    const fase1 = await fases.crearFase({
      entregableId,
      titulo: "Semana 1",
      orden: 0,
      diaInicio: "2026-01-05",
      diaLimite: "2026-01-11",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });
    const fase2 = await fases.crearFase({
      entregableId,
      titulo: "Semana 2",
      orden: 1,
      diaInicio: "2026-01-12",
      diaLimite: "2026-01-18",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });

    const actSemana1 = await actividades.crearActividad({
      entregableId,
      tipo: "mantenimiento",
      descripcion: "Contactos día 1",
      diaTarea: "2026-01-06",
      cantidadObjetivo: 6,
    });
    await actividades.registrarAvance(actSemana1.valor, 6);

    const actSemana2 = await actividades.crearActividad({
      entregableId,
      tipo: "mantenimiento",
      descripcion: "Contactos semana 2",
      diaTarea: "2026-01-13",
      cantidadObjetivo: 4,
    });
    await actividades.registrarAvance(actSemana2.valor, 4);

    const filaFase1 = await db.fase_personal.get(fase1.valor);
    const filaFase2 = await db.fase_personal.get(fase2.valor);
    assert.strictEqual(
      filaFase1?.progresoActual,
      6,
      "solo cuenta lo hecho en su propia semana"
    );
    assert.strictEqual(filaFase2?.progresoActual, 4);
  });

  test("cerrarFase 'trasladar_siguiente': el faltante se suma a la meta de la próxima fase abierta", async () => {
    const entregableId = await crearCadena();
    const fase1 = await fases.crearFase({
      entregableId,
      titulo: "Semana 1",
      orden: 0,
      diaInicio: "2026-01-05",
      diaLimite: "2026-01-11",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });
    const fase2 = await fases.crearFase({
      entregableId,
      titulo: "Semana 2",
      orden: 1,
      diaInicio: "2026-01-12",
      diaLimite: "2026-01-18",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });
    const act = await actividades.crearActividad({
      entregableId,
      tipo: "mantenimiento",
      descripcion: "Contactos",
      diaTarea: "2026-01-06",
      cantidadObjetivo: 6,
    });
    await actividades.registrarAvance(act.valor, 6); // hizo 6 de 10 — faltan 4

    const res = await fases.cerrarFase({
      id: fase1.valor,
      decision: "trasladar_siguiente",
    });
    assert.strictEqual(res.ok, true);

    const cerrada = await db.fase_personal.get(fase1.valor);
    assert.strictEqual(cerrada?.estado, "cerrada");
    assert.strictEqual(cerrada?.cierre?.faltante, 4);
    assert.strictEqual(cerrada?.cierre?.cantidadTrasladada, 4);

    const siguiente = await db.fase_personal.get(fase2.valor);
    assert.strictEqual(
      siguiente?.cantidadObjetivo,
      14,
      "10 original + 4 trasladados"
    );
  });

  test("cerrarFase 'trasladar_siguiente' sin fase siguiente falla con mensaje claro", async () => {
    const entregableId = await crearCadena();
    const fase1 = await fases.crearFase({
      entregableId,
      titulo: "Única fase",
      orden: 0,
      diaInicio: "2026-01-05",
      diaLimite: "2026-01-11",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });
    const res = await fases.cerrarFase({
      id: fase1.valor,
      decision: "trasladar_siguiente",
    });
    assert.strictEqual(res.ok, false);
  });

  test("cerrarFase 'repartir_restantes' divide el faltante entre las fases abiertas que quedan", async () => {
    const entregableId = await crearCadena();
    const fase1 = await fases.crearFase({
      entregableId,
      titulo: "Semana 1",
      orden: 0,
      diaInicio: "2026-01-05",
      diaLimite: "2026-01-11",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });
    const fase2 = await fases.crearFase({
      entregableId,
      titulo: "Semana 2",
      orden: 1,
      diaInicio: "2026-01-12",
      diaLimite: "2026-01-18",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });
    const fase3 = await fases.crearFase({
      entregableId,
      titulo: "Semana 3",
      orden: 2,
      diaInicio: "2026-01-19",
      diaLimite: "2026-01-25",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });

    const res = await fases.cerrarFase({
      id: fase1.valor,
      decision: "repartir_restantes",
    });
    assert.strictEqual(res.ok, true);

    const f2 = await db.fase_personal.get(fase2.valor);
    const f3 = await db.fase_personal.get(fase3.valor);
    assert.strictEqual(
      f2?.cantidadObjetivo,
      15,
      "10 + la mitad de los 10 faltantes"
    );
    assert.strictEqual(f3?.cantidadObjetivo, 15);
  });

  test("cerrarFase 'descartar' no traslada nada", async () => {
    const entregableId = await crearCadena();
    const fase1 = await fases.crearFase({
      entregableId,
      titulo: "Semana 1",
      orden: 0,
      diaInicio: "2026-01-05",
      diaLimite: "2026-01-11",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });
    const fase2 = await fases.crearFase({
      entregableId,
      titulo: "Semana 2",
      orden: 1,
      diaInicio: "2026-01-12",
      diaLimite: "2026-01-18",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });

    const res = await fases.cerrarFase({
      id: fase1.valor,
      decision: "descartar",
    });
    assert.strictEqual(res.ok, true);

    const cerrada = await db.fase_personal.get(fase1.valor);
    assert.strictEqual(cerrada?.cierre?.cantidadTrasladada, 0);
    const siguiente = await db.fase_personal.get(fase2.valor);
    assert.strictEqual(siguiente?.cantidadObjetivo, 10, "no se tocó");
  });

  test("bandas de aceptación: si el logro queda 'bajo', las decisiones clásicas se rechazan salvo reestructurar/descartar", async () => {
    const entregableId = await crearCadena();
    const fase1 = await fases.crearFase({
      entregableId,
      titulo: "Semana 1",
      orden: 0,
      diaInicio: "2026-01-05",
      diaLimite: "2026-01-11",
      cantidadObjetivo: 100,
      unidad: "contactos",
      bandaAceptable: 80,
      bandaMejorable: 60,
    });
    const fase2 = await fases.crearFase({
      entregableId,
      titulo: "Semana 2",
      orden: 1,
      diaInicio: "2026-01-12",
      diaLimite: "2026-01-18",
      cantidadObjetivo: 100,
      unidad: "contactos",
    });
    const act = await actividades.crearActividad({
      entregableId,
      tipo: "mantenimiento",
      descripcion: "Contactos",
      diaTarea: "2026-01-06",
      cantidadObjetivo: 30, // 30/100 = "bajo"
    });
    await actividades.registrarAvance(act.valor, 30);

    const rechazado = await fases.cerrarFase({
      id: fase1.valor,
      decision: "trasladar_siguiente",
    });
    assert.strictEqual(
      rechazado.ok,
      false,
      "con nivel 'bajo', trasladar_siguiente no es una opción válida"
    );

    const reestructurado = await fases.cerrarFase({
      id: fase1.valor,
      decision: "reestructurar_restantes",
      nuevasCantidadesRestantes: [
        { faseId: fase2.valor, cantidadObjetivo: 170 },
      ],
    });
    assert.strictEqual(reestructurado.ok, true);
    const f2 = await db.fase_personal.get(fase2.valor);
    assert.strictEqual(f2?.cantidadObjetivo, 170);
  });

  test("detectarFasesPendientesDeCierre solo devuelve fases abiertas ya vencidas", async () => {
    const entregableId = await crearCadena();
    const vencida = await fases.crearFase({
      entregableId,
      titulo: "Vencida",
      orden: 0,
      diaInicio: "2026-01-01",
      diaLimite: "2026-01-07",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });
    await fases.crearFase({
      entregableId,
      titulo: "Futura",
      orden: 1,
      diaInicio: "2026-02-01",
      diaLimite: "2026-02-07",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });

    const pendientes =
      await fases.detectarFasesPendientesDeCierre("2026-01-15");
    assert.strictEqual(pendientes.length, 1);
    assert.strictEqual(pendientes[0].id, vencida.valor);
  });
});

describe("Tareas acumulables: cerrar con cantidad, faltante y fondo (Sprint 23)", () => {
  beforeEach(async () => {
    await db.area_personal.clear();
    await db.objetivo_cuantificable.clear();
    await db.proyecto_personal.clear();
    await db.entregable.clear();
    await db.actividad.clear();
    await db.fase_personal.clear();
    await db.personal_historial.clear();
  });

  async function entregableDeContactos(): Promise<{
    entregableId: string;
    objetivoId: string;
  }> {
    const objetivo = await objetivos.crearObjetivo({
      titulo: "250 contactos",
      unidad: "contactos",
      cantidadObjetivo: 250,
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
      cantidadObjetivo: 250,
      unidad: "contactos",
    });
    return { entregableId: entregable.valor!, objetivoId: objetivo.valor! };
  }

  async function tareaDeContactos(
    entregableId: string,
    diaTarea: string,
    cantidad = 2
  ) {
    const r = await actividades.crearActividad({
      entregableId,
      tipo: "mantenimiento",
      descripcion: "Contactar clientes",
      diaTarea,
      cantidadObjetivo: cantidad,
      unidad: "contactos",
    });
    assert.strictEqual(r.ok, true);
    return r.valor!;
  }

  test("repartirEnDias reparte parejo sin perder ni inventar unidades", () => {
    assert.deepStrictEqual(repartirEnDias(5, 2), [3, 2]);
    assert.deepStrictEqual(repartirEnDias(5, 3), [2, 2, 1]);
    assert.deepStrictEqual(repartirEnDias(3, 10), [1, 1, 1]);
    assert.deepStrictEqual(repartirEnDias(4, 1), [4]);
  });

  test("migrar una tarea con avance pasa SOLO el faltante y el avance cuenta una sola vez (bug del doble conteo)", async () => {
    const { entregableId } = await entregableDeContactos();
    const id = await tareaDeContactos(entregableId, "2026-03-10");
    await actividades.registrarAvance(id, 1);

    const res = await actividades.migrarActividad({
      id,
      nuevoDiaTarea: "2026-03-11",
    });
    assert.strictEqual(res.ok, true);

    const original = await db.actividad.get(id);
    assert.strictEqual(original?.estado, "completada");
    assert.strictEqual(original?.progresoActual, 1);

    const copia = await db.actividad.get(res.valor!);
    assert.strictEqual(copia?.cantidadObjetivo, 1, "solo lo que faltó");
    assert.strictEqual(copia?.progresoActual, undefined);
    assert.strictEqual(copia?.estado, "pendiente");

    const entregable = await db.entregable.get(entregableId);
    assert.strictEqual(entregable?.progresoActual, 1, "1 contacto, no 2");
  });

  test("migrar suma el faltante a la tarea de mañana si ya existe (2 + 1 = 3)", async () => {
    const { entregableId } = await entregableDeContactos();
    const hoy = await tareaDeContactos(entregableId, "2026-03-10");
    const manana = await tareaDeContactos(entregableId, "2026-03-11");
    await actividades.registrarAvance(hoy, 1);

    const res = await actividades.migrarActividad({
      id: hoy,
      nuevoDiaTarea: "2026-03-11",
    });
    assert.strictEqual(res.valor, manana, "usa la de mañana, no crea otra");
    assert.strictEqual((await db.actividad.get(manana))?.cantidadObjetivo, 3);
    const deMañana = await db.actividad
      .where("diaTarea")
      .equals("2026-03-11")
      .toArray();
    assert.strictEqual(deMañana.length, 1);
  });

  test("cerrar con menos de la meta: pide destino, y 'fondo' acumula el faltante de varios días en un solo fondo", async () => {
    const { entregableId } = await entregableDeContactos();
    const dia1 = await tareaDeContactos(entregableId, "2026-03-10");
    const dia2 = await tareaDeContactos(entregableId, "2026-03-11");

    const sinDestino = await actividades.cerrarConCantidad({
      id: dia1,
      hecha: 1,
    });
    assert.strictEqual(sinDestino.ok, false);

    await actividades.cerrarConCantidad({
      id: dia1,
      hecha: 1,
      destino: "fondo",
    });
    await actividades.cerrarConCantidad({
      id: dia2,
      hecha: 1,
      destino: "fondo",
    });

    assert.strictEqual((await db.actividad.get(dia1))?.estado, "completada");
    const fondos = await db.actividad
      .filter((a) => a.esFaltante === true)
      .toArray();
    assert.strictEqual(fondos.length, 1, "un solo fondo por tarea");
    assert.strictEqual(fondos[0].cantidadObjetivo, 2);
    assert.strictEqual(fondos[0].tipo, "backlog");
    assert.strictEqual(
      (await db.entregable.get(entregableId))?.progresoActual,
      2,
      "el fondo pendiente no suma progreso"
    );
  });

  test("repartir el fondo en varios días crea/suma tareas y lo repartido sale del fondo", async () => {
    const { entregableId } = await entregableDeContactos();
    const id = await tareaDeContactos(entregableId, "2026-03-10", 5);
    await actividades.cerrarConCantidad({ id, hecha: 0, destino: "fondo" });
    const fondo = (
      await db.actividad.filter((a) => a.esFaltante === true).toArray()
    )[0];
    assert.strictEqual(fondo.cantidadObjetivo, 5);

    const demasiado = await actividades.repartirFondo({
      fondoId: fondo.id,
      reparto: [{ dia: "2026-03-12", cantidad: 9 }],
    });
    assert.strictEqual(demasiado.ok, false);

    const res = await actividades.repartirFondo({
      fondoId: fondo.id,
      reparto: [
        { dia: "2026-03-12", cantidad: 3 },
        { dia: "2026-03-13", cantidad: 2 },
      ],
    });
    assert.strictEqual(res.ok, true);

    const d12 = await db.actividad
      .where("diaTarea")
      .equals("2026-03-12")
      .toArray();
    const d13 = await db.actividad
      .where("diaTarea")
      .equals("2026-03-13")
      .toArray();
    assert.strictEqual(d12[0].cantidadObjetivo, 3);
    assert.strictEqual(d13[0].cantidadObjetivo, 2);
    assert.strictEqual(
      (await db.actividad.get(fondo.id))?.estado,
      "descartada"
    );
    assert.strictEqual(
      (await db.entregable.get(entregableId))?.progresoActual,
      0
    );
  });

  test("cerrar con la meta completa no deja faltante ni fondo", async () => {
    const { entregableId } = await entregableDeContactos();
    const id = await tareaDeContactos(entregableId, "2026-03-10");
    const res = await actividades.cerrarConCantidad({ id, hecha: 2 });
    assert.strictEqual(res.ok, true);
    assert.strictEqual((await db.actividad.get(id))?.estado, "completada");
    const fondos = await db.actividad
      .filter((a) => a.esFaltante === true)
      .toArray();
    assert.strictEqual(fondos.length, 0);
  });
});

describe("Planilla del día: categorías, reclasificar y pendientes sin cerrar", () => {
  beforeEach(async () => {
    await db.actividad.clear();
    await db.personal_historial.clear();
  });

  test("bucketDeActividad: enfoque = Prioridad, mantenimiento = Mantenimiento, 'puede esperar' = Si llego", () => {
    assert.strictEqual(bucketDeActividad({ tipo: "enfoque" }), "prioridad");
    assert.strictEqual(
      bucketDeActividad({ tipo: "mantenimiento" }),
      "mantenimiento"
    );
    assert.strictEqual(
      bucketDeActividad({ tipo: "mantenimiento", prioridad: "puede_esperar" }),
      "si_llego"
    );
    assert.strictEqual(
      bucketDeActividad({ tipo: "enfoque", prioridad: "puede_esperar" }),
      "si_llego",
      "'si llego' gana sobre el tipo"
    );
  });

  test("reclasificarActividad mueve entre Prioridad / Mantenimiento / Si llego sin tocar fecha ni cantidad", async () => {
    const r = await actividades.crearActividad({
      tipo: "mantenimiento",
      descripcion: "Contactar",
      diaTarea: "2026-05-04",
      cantidadObjetivo: 5,
      unidad: "contactos",
    });
    const id = r.valor!;

    await actividades.reclasificarActividad(id, "si_llego");
    let fila = await db.actividad.get(id);
    assert.strictEqual(bucketDeActividad(fila!), "si_llego");
    assert.strictEqual(fila?.tipo, "mantenimiento");

    await actividades.reclasificarActividad(id, "prioridad");
    fila = await db.actividad.get(id);
    assert.strictEqual(fila?.tipo, "enfoque");
    assert.strictEqual(fila?.prioridad, undefined, "sale de 'si llego'");
    assert.strictEqual(bucketDeActividad(fila!), "prioridad");

    await actividades.reclasificarActividad(id, "mantenimiento");
    fila = await db.actividad.get(id);
    assert.strictEqual(bucketDeActividad(fila!), "mantenimiento");
    assert.strictEqual(fila?.diaTarea, "2026-05-04");
    assert.strictEqual(fila?.cantidadObjetivo, 5);

    const hist = await db.personal_historial.toArray();
    assert.ok(hist.some((h) => h.descripcion?.includes("reclasificada")));
  });

  test("solo se reclasifica una tarea pendiente", async () => {
    const r = await actividades.crearActividad({
      tipo: "mantenimiento",
      descripcion: "Ya hecha",
      diaTarea: "2026-05-04",
    });
    await actividades.completarActividad(r.valor!);
    const res = await actividades.reclasificarActividad(r.valor!, "prioridad");
    assert.strictEqual(res.ok, false);
  });

  test("pasarPendientesAHoy trae todo lo sin cerrar: suma faltantes cuantificados, completa lo ya cumplido y migra el resto", async () => {
    const hoy = "2026-05-06";
    const conAvance = await actividades.crearActividad({
      tipo: "mantenimiento",
      descripcion: "Contactar",
      diaTarea: "2026-05-04",
      cantidadObjetivo: 4,
      unidad: "contactos",
    });
    await actividades.registrarAvance(conAvance.valor!, 1);
    // registrarAvance(1) de 4 → sigue pendiente; ya cumplida:
    const cumplida = await actividades.crearActividad({
      tipo: "mantenimiento",
      descripcion: "Cumplida sin cerrar",
      diaTarea: "2026-05-03",
      cantidadObjetivo: 2,
    });
    await db.actividad.update(cumplida.valor!, { progresoActual: 2 });
    const simple = await actividades.crearActividad({
      tipo: "enfoque",
      descripcion: "Preparar propuesta",
      diaTarea: "2026-05-05",
    });
    // Ya existe una "Contactar" de hoy: el faltante se suma (3 + 2 = 5)
    const deHoy = await actividades.crearActividad({
      tipo: "mantenimiento",
      descripcion: "Contactar",
      diaTarea: hoy,
      cantidadObjetivo: 2,
      unidad: "contactos",
    });

    const res = await actividades.pasarPendientesAHoy(hoy);
    assert.strictEqual(res.ok, true);
    assert.deepStrictEqual(res.valor, {
      pasadas: 2,
      completadas: 1,
      errores: [],
    });

    const pendientesViejas = await db.actividad
      .where("diaTarea")
      .below(hoy)
      .and((a) => a.estado === "pendiente")
      .toArray();
    assert.strictEqual(pendientesViejas.length, 0, "nada queda sin cerrar");
    assert.strictEqual(
      (await db.actividad.get(cumplida.valor!))?.estado,
      "completada"
    );
    assert.strictEqual(
      (await db.actividad.get(deHoy.valor!))?.cantidadObjetivo,
      5
    );
    const copiaSimple = (
      await db.actividad
        .where("diaTarea")
        .equals(hoy)
        .and((a) => a.descripcion === "Preparar propuesta")
        .toArray()
    )[0];
    assert.strictEqual(copiaSimple?.tipo, "enfoque", "conserva su categoría");
    assert.strictEqual(
      (await db.actividad.get(simple.valor!))?.estado,
      "migrada"
    );
  });
});
