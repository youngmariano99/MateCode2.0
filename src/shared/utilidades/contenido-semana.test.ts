import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarContenidoUseCase } from "../../application/use-cases/contenido/gestionar-contenido.use-case";
import {
  distribuirPublicaciones,
  estadoPasosPlanificacion,
  estadoPlanificacion,
  etiquetaSemana,
  fechaDeDiaSemana,
  numeroSemanaISO,
  pendienteDeEdicion,
  pendienteDeGrabar,
  planInicial,
  sugerirMezcla,
  tareasDelDia,
} from "../../domain/entidades/contenido-semana.entity";
import { revisarGuion } from "../../domain/entidades/revisar-guion";
import {
  parsearGuionesIA,
  parsearIdeasIA,
  parsearPlanSemanaIA,
} from "../../domain/entidades/contenido-ia.entity";
import {
  generarPromptGuiones,
  generarPromptIdeas,
  generarPromptPlan,
} from "../../domain/prompts/generar-prompt-contenido";
import {
  SECCIONES_GUION_DEFAULT,
  type Contenido,
} from "../../domain/entidades/contenido.entity";
import { armarContextoContenido } from "../../application/servicios/armar-contexto-contenido.service";

const LUNES = "2026-09-21"; // lunes
const uc = new GestionarContenidoUseCase();

describe("Semana de contenido: fechas y días", () => {
  test("etiqueta, número de semana y fecha de un día de la semana", () => {
    assert.strictEqual(numeroSemanaISO(LUNES), 39);
    assert.strictEqual(etiquetaSemana(LUNES), "Semana 39 · 21 sep – 27 sep");
    assert.strictEqual(fechaDeDiaSemana(LUNES, 1), "2026-09-21");
    assert.strictEqual(fechaDeDiaSemana(LUNES, 0), "2026-09-27");
  });

  test("planInicial usa los días por defecto o los que se cambien esa semana", () => {
    assert.deepStrictEqual(planInicial(LUNES, undefined), {
      guion: "2026-09-21",
      grabacion: "2026-09-22",
      edicion: "2026-09-23",
    });
    assert.strictEqual(
      planInicial(LUNES, { grabacion: 5 }).grabacion,
      "2026-09-25"
    );
  });

  test("distribuirPublicaciones rota entre los días permitidos de cada tipo, pudiendo repetir día", () => {
    const r = distribuirPublicaciones(
      [
        { id: "v1", tipo: "Video" },
        { id: "v2", tipo: "Video" },
        { id: "v3", tipo: "Video" },
        { id: "p1", tipo: "Post" },
        { id: "p2", tipo: "Post" },
      ],
      { Video: [1, 3, 5], Post: [2] },
      LUNES
    );
    assert.deepStrictEqual(r, {
      v1: "2026-09-21",
      v2: "2026-09-23",
      v3: "2026-09-25",
      p1: "2026-09-22",
      p2: "2026-09-22",
    });
  });

  test("sugerirMezcla toma la cuota semanal de las metas por unidad", () => {
    assert.deepStrictEqual(
      sugerirMezcla([
        { unidad: "videos", cuotaSemanal: 3, meta: 12 },
        { unidad: "posts", meta: 3 },
        { unidad: "metros", meta: 900 },
      ]),
      { Video: 3, Post: 3 }
    );
  });
});

describe("Semana de contenido: planificado / no planificado y flujo", () => {
  beforeEach(async () => {
    for (const t of [
      db.ciclo_semanal,
      db.contenido,
      db.idea_contenido,
      db.entregable,
      db.actividad,
      db.plantilla_guion,
    ])
      await t.clear();
  });

  test("sin ciclo de esta semana = no planificado; con mezcla + piezas + días = planificado", async () => {
    assert.strictEqual(
      estadoPlanificacion(undefined, [], LUNES).estado,
      "no_planificado"
    );
    const r = await uc.iniciarCiclo(0, [], {
      semanaInicio: LUNES,
      mezcla: { Video: 2, Post: 1 },
    });
    assert.ok(r.ok);
    const ciclo = (await db.ciclo_semanal.get(r.valor!))!;
    let est = estadoPlanificacion(ciclo, [], LUNES);
    assert.strictEqual(est.estado, "no_planificado");
    assert.deepStrictEqual(est.faltanPorTipo, { Video: 2, Post: 1 });

    assert.strictEqual((await uc.crearPiezasFaltantes(ciclo.id)).valor, 3);
    let piezas = await db.contenido.toArray();
    est = estadoPlanificacion(ciclo, piezas, LUNES);
    assert.strictEqual(est.estado, "no_planificado");
    assert.strictEqual(est.sinDiaDePublicacion, 3);

    await uc.distribuirPublicaciones(ciclo.id, { Video: [1, 3], Post: [2] });
    piezas = await db.contenido.toArray();
    assert.strictEqual(
      estadoPlanificacion(ciclo, piezas, LUNES).estado,
      "planificado"
    );
    // Otra semana: el mismo ciclo ya no cuenta como planificado.
    assert.strictEqual(
      estadoPlanificacion(ciclo, piezas, "2026-09-28").estado,
      "no_planificado"
    );
  });

  test("la mezcla cambia semana a semana y crearPiezasFaltantes solo agrega lo que falta", async () => {
    const r = await uc.iniciarCiclo(0, [], {
      semanaInicio: LUNES,
      mezcla: { Video: 1 },
    });
    const id = r.valor!;
    await uc.crearPiezasFaltantes(id);
    await uc.actualizarSemana(id, { mezcla: { Video: 2, Historia: 2 } });
    assert.strictEqual((await uc.crearPiezasFaltantes(id)).valor, 3);
    assert.strictEqual(await db.contenido.count(), 4);
  });

  test("tareasDelDia junta varias etapas y varias piezas del mismo día", async () => {
    const r = await uc.iniciarCiclo(0, [], {
      semanaInicio: LUNES,
      mezcla: { Video: 2 },
    });
    await uc.crearPiezasFaltantes(r.valor!);
    const piezas = await db.contenido.toArray();
    await uc.asignarPlan(piezas[0].id, {
      grabacion: "2026-09-22",
      edicion: "2026-09-22",
    });
    const tareas = tareasDelDia(await db.contenido.toArray(), "2026-09-22");
    // Ambas piezas graban el martes (plan inicial) + la primera también edita ese día.
    assert.strictEqual(tareas.filter((t) => t.etapa === "grabacion").length, 2);
    assert.strictEqual(tareas.filter((t) => t.etapa === "edicion").length, 1);
  });

  test("las importaciones de IA: ideas → plan → guiones se encadenan por título", async () => {
    const ciclo = (await uc.iniciarCiclo(0, [], { semanaInicio: LUNES }))
      .valor!;
    const ideas = parsearIdeasIA(
      '```json\n{"ideas":[{"texto":"El cuaderno de fiado","dolorSemana":"cuentas corrientes","pilar":"Tips"}]}\n```'
    );
    assert.ok(ideas.ok);
    assert.strictEqual((await uc.importarIdeasIA(ciclo, ideas.data)).valor, 1);
    // Repetir no duplica.
    assert.strictEqual((await uc.importarIdeasIA(ciclo, ideas.data)).valor, 0);

    const plan = parsearPlanSemanaIA(
      JSON.stringify({
        mezcla: { Video: 1, Historia: 1 },
        piezas: [
          {
            titulo: "Fiado en 60 segundos",
            tipoContenido: "Video",
            idea: "El cuaderno de fiado",
            pilar: "Tips",
            persona: "Comerciante Desbordado",
            keyword: "PACK",
            dias: { publicacion: "2026-09-25", grabacion: "2026-09-24" },
          },
          { titulo: "Historia del cuaderno", tipoContenido: "Historia" },
        ],
      })
    );
    assert.ok(plan.ok);
    const rp = await uc.importarPlanIA(ciclo, plan.data);
    assert.deepStrictEqual(rp.valor, {
      creadas: 2,
      actualizadas: 0,
      completadas: 0,
    });
    const video = (await db.contenido.toArray()).find(
      (c) => c.titulo === "Fiado en 60 segundos"
    )!;
    assert.strictEqual(video.ficha?.keyword, "PACK");
    assert.strictEqual(video.plan?.grabacion, "2026-09-24");
    assert.strictEqual(video.diaEstimado, "2026-09-25");
    assert.ok(video.ideaId);
    assert.strictEqual(
      (await db.ciclo_semanal.get(ciclo))?.mezcla?.Historia,
      1
    );

    const guiones = parsearGuionesIA(
      '{"guiones":[{"titulo":"fiado en 60 segundos","guion":{"gancho":"Se te pierde el fiado"}}]}'
    );
    assert.ok(guiones.ok);
    assert.deepStrictEqual(
      (await uc.importarGuionesIA(ciclo, guiones.data)).valor,
      { creados: 0, actualizados: 1 }
    );
    assert.strictEqual(
      (await db.contenido.get(video.id))?.guion.gancho,
      "Se te pierde el fiado"
    );
    // Y el contexto para la siguiente etapa ya incluye lo decidido.
    const ctx = await armarContextoContenido(ciclo);
    assert.ok(
      ctx.piezas.some(
        (p) => p.includes("Fiado en 60 segundos") && p.includes("con guion")
      )
    );
    assert.ok(ctx.ideas.some((i) => i.includes("El cuaderno de fiado")));
  });

  test("publicar suma +1 a la meta del plan si hay un único entregable del tipo", async () => {
    const ciclo = (
      await uc.iniciarCiclo(0, [], {
        semanaInicio: LUNES,
        mezcla: { Video: 1 },
      })
    ).valor!;
    await uc.crearPiezasFaltantes(ciclo);
    await db.entregable.add({
      id: "e_videos",
      proyectoId: "p",
      objetivoId: "o",
      titulo: "Videos",
      unidad: "videos",
      cantidadObjetivo: 12,
      progresoActual: 0,
      estado: "activo",
      diaInicio: "2026-09-21",
      diaLimite: "2027-02-28",
      tieneHijos: false,
    } as never);
    const pieza = (await db.contenido.toArray())[0];
    const publicada = new Date("2026-09-24T15:00:00-03:00").getTime();
    assert.ok((await uc.publicar(pieza.id, publicada)).ok);
    assert.strictEqual(
      (await db.entregable.get("e_videos"))?.progresoActual,
      1
    );
  });

  test("asegurarPlantillaSop pasa la plantilla vieja a la del SOP pero respeta una editada", async () => {
    await db.plantilla_guion.put({
      id: "plantilla_default",
      nombre: "x",
      activa: true,
      creadoEn: 0,
      secciones: [
        { id: "gancho", etiqueta: "Gancho", grupo: "principal", orden: 1 },
        {
          id: "desarrollo",
          etiqueta: "Desarrollo",
          grupo: "principal",
          orden: 2,
        },
        {
          id: "cierre_cta",
          etiqueta: "Cierre con CTA",
          grupo: "principal",
          orden: 3,
        },
        {
          id: "descripcion",
          etiqueta: "Descripción",
          grupo: "extra",
          orden: 4,
        },
        { id: "texto_pantalla", etiqueta: "Palabra", grupo: "extra", orden: 5 },
        { id: "hashtags", etiqueta: "Hashtags", grupo: "extra", orden: 6 },
        {
          id: "gancho_visual",
          etiqueta: "Gancho visual",
          grupo: "extra",
          orden: 7,
        },
      ],
    });
    assert.strictEqual(await uc.asegurarPlantillaSop(), true);
    assert.strictEqual(
      (await db.plantilla_guion.get("plantilla_default"))?.secciones.length,
      SECCIONES_GUION_DEFAULT.length
    );
    assert.strictEqual(await uc.asegurarPlantillaSop(), false);
  });
});

describe("Revisión de guion y prompts", () => {
  const largo = (n: number) =>
    Array.from({ length: n }, () => "palabra").join(" ");

  test("detecta emojis de colores, urgencia, humo y tecnicismos; permite ✦ ➔", () => {
    const limpio = revisarGuion(
      {
        gancho: "✦ Se te acumula el fiado ➔ ordenalo",
        desarrollo: largo(60),
        cierre_cta: largo(50),
      },
      "Video"
    );
    assert.deepStrictEqual(limpio, []);
    const reglas = revisarGuion(
      {
        gancho: "🔥 Comprá ya, últimos cupos",
        desarrollo: "Duplicá tus ventas con nuestra base de datos y API",
        cierre_cta: "",
      },
      "Post"
    ).map((a) => a.regla);
    assert.ok(
      reglas.includes("emojis") &&
        reglas.includes("urgencia") &&
        reglas.includes("humo") &&
        reglas.includes("tecnicismos")
    );
  });

  test("el largo del guion solo se controla en Videos", () => {
    const corto = { gancho: largo(20), desarrollo: "", cierre_cta: "" };
    assert.ok(revisarGuion(corto, "Video").some((a) => a.regla === "largo"));
    assert.ok(
      !revisarGuion(corto, "Historia").some((a) => a.regla === "largo")
    );
  });

  test("los 3 prompts llevan el SOP completo, el contexto y el formato del JSON", async () => {
    const ctx = await armarContextoContenido(undefined);
    for (const [p, clave] of [
      [generarPromptIdeas(ctx), '"ideas"'],
      [generarPromptPlan(ctx), '"piezas"'],
      [generarPromptGuiones(ctx), '"guiones"'],
    ] as const) {
      assert.match(p, /Cero emojis de colores/);
      assert.match(p, /Sándwich invertido/);
      assert.match(p, /Dueño Consolidado/);
      assert.match(p, /<contexto_de_la_semana>/);
      assert.match(p, /<lo_ya_decidido>/);
      assert.ok(p.includes(clave));
    }
    assert.match(generarPromptPlan(ctx), /NO asumas una mezcla fija/);
    assert.match(generarPromptGuiones(ctx), /"seo_audio"/);
  });

  test("no se cuelan contenidos de otra semana en el tipo Contenido", () => {
    const c = {
      cicloId: "x",
      tipoContenido: "Video",
      estado: "Guion",
    } as Contenido;
    assert.strictEqual(
      estadoPlanificacion(undefined, [c], LUNES).estado,
      "no_planificado"
    );
  });
});

describe("Cinta: grabar en lote y editar aparte", () => {
  beforeEach(async () => {
    for (const t of [db.ciclo_semanal, db.contenido]) await t.clear();
  });

  test("marcar grabado pasa la pieza a Producción y de 'para grabar' a 'para editar'", async () => {
    const ciclo = (
      await uc.iniciarCiclo(0, [], {
        semanaInicio: LUNES,
        mezcla: { Video: 2, Post: 1 },
      })
    ).valor!;
    await uc.crearPiezasFaltantes(ciclo);
    let piezas = await db.contenido.toArray();
    const video = piezas.find((p) => p.tipoContenido === "Video")!;
    const post = piezas.find((p) => p.tipoContenido === "Post")!;
    // Los videos hay que grabarlos; el post no se graba.
    assert.strictEqual(piezas.filter(pendienteDeGrabar).length, 2);
    assert.ok(!pendienteDeGrabar(post));

    assert.ok((await uc.marcarGrabado(video.id)).ok);
    const grabado = (await db.contenido.get(video.id))!;
    assert.strictEqual(grabado.estado, "Producción");
    assert.ok(pendienteDeEdicion(grabado));
    assert.ok(!pendienteDeGrabar(grabado));
    // Deshacer lo devuelve a la lista de grabación.
    await uc.marcarGrabado(video.id, false);
    assert.ok(pendienteDeGrabar((await db.contenido.get(video.id))!));

    // El lote entero.
    const otros = (await db.contenido.toArray())
      .filter(pendienteDeGrabar)
      .map((p) => p.id);
    assert.strictEqual((await uc.marcarGrabadoLote(otros)).valor, 2);
    piezas = await db.contenido.toArray();
    assert.strictEqual(piezas.filter(pendienteDeEdicion).length, 2);
    // El post entra a edición recién cuando se envía a producción.
    await uc.avanzarAProduccion(post.id);
    assert.strictEqual(
      (await db.contenido.toArray()).filter(pendienteDeEdicion).length,
      3
    );
  });

  test("lo ya grabado no vuelve a figurar como 'grabar' en el día", async () => {
    const ciclo = (
      await uc.iniciarCiclo(0, [], {
        semanaInicio: LUNES,
        mezcla: { Video: 1 },
      })
    ).valor!;
    await uc.crearPiezasFaltantes(ciclo);
    const v = (await db.contenido.toArray())[0];
    const antes = tareasDelDia(
      await db.contenido.toArray(),
      "2026-09-22"
    ).filter((t) => t.etapa === "grabacion");
    assert.strictEqual(antes.length, 1);
    await uc.marcarGrabado(v.id);
    const despues = tareasDelDia(
      await db.contenido.toArray(),
      "2026-09-22"
    ).filter((t) => t.etapa === "grabacion");
    assert.strictEqual(despues.length, 0);
  });
});

describe("Planificar: una sola cinta sin duplicados", () => {
  beforeEach(async () => {
    for (const t of [db.ciclo_semanal, db.contenido, db.idea_contenido])
      await t.clear();
  });

  test("el plan de IA completa las piezas genéricas en vez de duplicarlas", async () => {
    const ciclo = (
      await uc.iniciarCiclo(0, [], {
        semanaInicio: LUNES,
        mezcla: { Video: 2 },
      })
    ).valor!;
    await uc.crearPiezasFaltantes(ciclo);
    const plan = parsearPlanSemanaIA(
      JSON.stringify({
        piezas: [
          { titulo: "Fiado en 60 segundos", tipoContenido: "Video" },
          { titulo: "Cierre de caja", tipoContenido: "Video" },
        ],
      })
    );
    assert.ok(plan.ok);
    const r = await uc.importarPlanIA(ciclo, plan.data);
    assert.deepStrictEqual(r.valor, {
      creadas: 0,
      actualizadas: 0,
      completadas: 2,
    });
    const piezas = await db.contenido.toArray();
    assert.strictEqual(piezas.length, 2);
    assert.deepStrictEqual(piezas.map((p) => p.titulo).sort(), [
      "Cierre de caja",
      "Fiado en 60 segundos",
    ]);
  });

  test("limpiar: 'todo' borra piezas e ideas; 'devolver_ideas' las manda al backlog; lo publicado no se toca", async () => {
    const armar = async () => {
      const ciclo = (
        await uc.iniciarCiclo(0, [], {
          semanaInicio: LUNES,
          mezcla: { Video: 2 },
        })
      ).valor!;
      await uc.crearPiezasFaltantes(ciclo);
      const idea = (await uc.crearIdea({ texto: "Idea A" })).valor!;
      await uc.usarIdeaEstaSemana(idea, ciclo);
      return { ciclo, idea };
    };
    const { ciclo, idea } = await armar();
    const [p1] = await db.contenido.toArray();
    await db.contenido.update(p1.id, { estado: "Publicado" });

    const prev = await uc.previsualizarLimpieza(ciclo);
    assert.strictEqual(prev.piezasABorrar, 1);
    assert.strictEqual(prev.publicadas, 1);

    await uc.limpiarPlanificacion(ciclo, "devolver_ideas");
    assert.strictEqual(await db.contenido.count(), 1);
    const i = await db.idea_contenido.get(idea);
    assert.strictEqual(i?.estado, "Backlog");
    assert.strictEqual(i?.cicloId, undefined);

    await uc.usarIdeaEstaSemana(idea, ciclo);
    const r = await uc.limpiarPlanificacion(ciclo, "todo");
    assert.strictEqual(r.valor!.ideas, 1);
    assert.strictEqual(await db.idea_contenido.get(idea), undefined);
    assert.strictEqual(await db.contenido.count(), 1);
  });

  test("al cerrar la semana las ideas sin usar vuelven al backlog", async () => {
    const ciclo = (await uc.iniciarCiclo(0, [], { semanaInicio: LUNES }))
      .valor!;
    const idea = (await uc.crearIdea({ texto: "Idea B" })).valor!;
    await uc.usarIdeaEstaSemana(idea, ciclo);
    await uc.cerrarSemanaYcrearNueva(ciclo, 0, []);
    assert.strictEqual((await db.idea_contenido.get(idea))?.estado, "Backlog");
  });

  test("estadoPasosPlanificacion indica qué se hizo y qué falta", async () => {
    const ciclo = (
      await uc.iniciarCiclo(0, [], {
        semanaInicio: LUNES,
        mezcla: { Video: 1 },
      })
    ).valor!;
    const c = await db.ciclo_semanal.get(ciclo);
    const vacio = estadoPasosPlanificacion(c, [], [], LUNES);
    assert.strictEqual(vacio.pasos.length, 3);
    assert.strictEqual(vacio.piezas, 0);
    assert.strictEqual(vacio.pasos[0].estado, "pendiente");
    await uc.crearPiezasFaltantes(ciclo);
    const con = estadoPasosPlanificacion(
      c,
      [],
      await db.contenido.toArray(),
      LUNES
    );
    assert.strictEqual(con.piezas, 1);
    assert.strictEqual(con.piezasConGuion, 0);
    assert.ok(con.pasos[2].falta);
  });
});
