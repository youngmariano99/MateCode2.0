import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarContenidoUseCase } from "../../application/use-cases/contenido/gestionar-contenido.use-case";

const useCase = new GestionarContenidoUseCase();

describe("Planificador de Contenido: ciclo semanal completo + estructura de guion dinámica", () => {
  beforeEach(async () => {
    await db.idea_contenido.clear();
    await db.ciclo_semanal.clear();
    await db.contenido.clear();
  });

  test("Idea → ciclo → guion → producción → publicado → métricas", async () => {
    const idea = await useCase.crearIdea({
      texto: "Cuentas corrientes",
      dolorSemana: "Fiado",
    });
    assert.strictEqual(idea.ok, true);

    const ciclo = await useCase.iniciarCiclo(6, [idea.valor]);
    assert.strictEqual(ciclo.ok, true);
    const cicloId = ciclo.valor;

    const ideaActualizada = await db.idea_contenido.get(idea.valor);
    assert.strictEqual(ideaActualizada?.estado, "Seleccionada");

    const contenido = await useCase.crearContenidoDesdeIdea(
      cicloId,
      {
        titulo: "Video cuentas corrientes",
        tipoContenido: "Video",
        canales: ["Instagram", "TikTok"],
        guion: { gancho: "...", desarrollo: "...", cierre_cta: "Comentá DEMO" },
      },
      idea.valor
    );
    assert.strictEqual(contenido.ok, true);
    const contenidoId = contenido.valor;

    const produccion = await useCase.avanzarAProduccion(contenidoId);
    assert.strictEqual(produccion.ok, true);
    const enProduccion = await db.contenido.get(contenidoId);
    assert.strictEqual(enProduccion?.estado, "Producción");
    assert.ok(
      (enProduccion?.tareasPendientes.length || 0) > 0,
      "trae el checklist por defecto"
    );

    const tareaExtra = await useCase.agregarTareaPendiente(
      contenidoId,
      "Hacer intro con IA"
    );
    assert.strictEqual(tareaExtra.ok, true);

    const publicar = await useCase.publicar(contenidoId, Date.now());
    assert.strictEqual(publicar.ok, true);

    const metricas = await useCase.actualizarMetricas(contenidoId, {
      kpi_retencion_3s: 52,
    });
    assert.strictEqual(metricas.ok, true);
    const final = await db.contenido.get(contenidoId);
    assert.strictEqual(final?.estado, "Publicado");
    assert.strictEqual(final?.metricas.kpi_retencion_3s, 52);
  });

  test("Editar la estructura del guion no rompe el contenido ya creado", async () => {
    const ciclo = await useCase.iniciarCiclo(6, []);
    const contenido = await useCase.crearContenidoDesdeIdea(ciclo.valor, {
      titulo: "Post viejo",
      tipoContenido: "Post",
      canales: [],
      guion: { gancho: "Gancho viejo" },
    });

    await useCase.editarPlantillaGuion([
      { id: "gancho", etiqueta: "Gancho", grupo: "principal", orden: 1 },
      {
        id: "seccion_nueva",
        etiqueta: "Sección nueva",
        grupo: "extra",
        orden: 2,
      },
    ]);

    const plantilla = await db.plantilla_guion.get("plantilla_default");
    assert.strictEqual(plantilla?.secciones.length, 2);
    assert.ok(plantilla?.secciones.some((s) => s.id === "seccion_nueva"));

    // El contenido viejo conserva su valor aunque la plantilla ya no lo pida.
    const contenidoViejo = await db.contenido.get(contenido.valor);
    assert.strictEqual(contenidoViejo?.guion.gancho, "Gancho viejo");
  });

  test("Cierre de semana: completar, pasar a la siguiente y eliminar", async () => {
    const cicloViejo = await useCase.iniciarCiclo(3, []);
    const idea1 = await useCase.crearIdea({ texto: "Idea A" });
    const idea2 = await useCase.crearIdea({ texto: "Idea B" });
    await db.idea_contenido.update(idea1.valor, {
      estado: "Seleccionada",
      cicloId: cicloViejo.valor,
    });
    await db.idea_contenido.update(idea2.valor, {
      estado: "Seleccionada",
      cicloId: cicloViejo.valor,
    });

    const cierre = await useCase.cerrarSemanaYcrearNueva(cicloViejo.valor, 6, [
      { tipo: "idea", id: idea1.valor, accion: "completar" },
      { tipo: "idea", id: idea2.valor, accion: "eliminar" },
    ]);
    assert.strictEqual(cierre.ok, true);

    const cicloViejoFinal = await db.ciclo_semanal.get(cicloViejo.valor);
    assert.strictEqual(cicloViejoFinal?.estado, "cerrado");

    assert.strictEqual(
      (await db.idea_contenido.get(idea1.valor))?.estado,
      "Descartada"
    );
    assert.strictEqual(await db.idea_contenido.get(idea2.valor), undefined);
  });
});
