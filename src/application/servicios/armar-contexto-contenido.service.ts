import { db } from "../../offline/dexie/db";
import type { ContextoContenidoPrompt } from "../../domain/prompts/generar-prompt-contenido";
import {
  ETIQUETA_ETAPA,
  KPIS_CONTENIDO_DEFAULT,
  SECCIONES_GUION_DEFAULT,
  type Contenido,
} from "../../domain/entidades/contenido.entity";
import {
  etiquetaSemana,
  semanaDeCiclo,
} from "../../domain/entidades/contenido-semana.entity";
import {
  lunesDeLaSemana,
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../domain/entidades/personal.entity";
import { aprendizajeAcumulado } from "../../domain/entidades/contacto-frio-cinta.entity";

const NOMBRES_DIA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const DIA_MS = 86_400_000;

const texto = (v: unknown): string => (typeof v === "string" ? v : "");

function lineaPieza(c: Contenido): string {
  const partes = [`"${c.titulo}" (${c.tipoContenido}, ${c.estado})`];
  if (c.ficha?.pilar) partes.push(`pilar ${c.ficha.pilar}`);
  if (c.ficha?.persona) partes.push(`persona: ${c.ficha.persona}`);
  if (c.ficha?.serie) partes.push(`serie: ${c.ficha.serie}`);
  if (c.ficha?.keyword) partes.push(`keyword ${c.ficha.keyword}`);
  const dias = Object.entries(c.plan ?? {})
    .map(
      ([etapa, dia]) =>
        `${ETIQUETA_ETAPA[etapa as keyof typeof ETIQUETA_ETAPA] ?? etapa} ${dia}`
    )
    .join(", ");
  if (dias) partes.push(`días: ${dias}`);
  partes.push(
    Object.keys(c.guion ?? {}).length > 0 ? "con guion" : "sin guion"
  );
  return partes.join(" · ");
}

/**
 * Junta, para los prompts de la planificación de contenido, lo que la app ya
 * sabe: qué pasó en el resto del trabajo (tareas, proyectos, clientes nuevos,
 * lo aprendido en las conversaciones de contacto en frío), cómo le fue al
 * contenido la semana anterior, y lo que ya se decidió en las etapas previas
 * de ESTA semana. Es lo que le da contexto a cada etapa.
 */
export async function armarContextoContenido(
  cicloId: string | undefined
): Promise<ContextoContenidoPrompt> {
  const hoy = obtenerDiaTareaHoy();
  const ciclo = cicloId ? await db.ciclo_semanal.get(cicloId) : undefined;
  const lunes = ciclo ? semanaDeCiclo(ciclo) : lunesDeLaSemana(hoy);
  const domingo = sumarDias(lunes, 6);

  // --- trabajo de la semana
  const actividades = (
    await db.actividad
      .where("diaTarea")
      .between(lunes, domingo, true, true)
      .toArray()
  ).filter((a) => a.tipo !== "backlog" && !a.descripcion.startsWith("Avance:"));
  const entregables = (
    await db.entregable.where("estado").equals("activo").toArray()
  )
    .filter(
      (e) => e.diaLimite >= lunes && e.diaLimite <= sumarDias(domingo, 14)
    )
    .filter((e) => !e.recurrencia);
  const proyectos = (await db.proyecto_personal.toArray()).filter(
    (p) => p.estado === "activo"
  );
  const haceUnMes = Date.now() - 30 * DIA_MS;
  const clientes = (await db.clientes.toArray()).filter(
    (c) => typeof c.creadoEn === "number" && c.creadoEn >= haceUnMes
  );
  const proyectosNodexa = (await db.proyectos.toArray()).filter((p) => {
    const e = texto(p.estado).toLowerCase();
    return e !== "" && !e.includes("complet") && !e.includes("cancel");
  });

  // --- contacto en frío: dolores y frases reales
  const fichas = await db.ficha_digital.toArray();
  const dolores = new Map<string, number>();
  for (const f of fichas)
    for (const d of f.dolorTags ?? [])
      dolores.set(d, (dolores.get(d) ?? 0) + 1);
  const topDolores = [...dolores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const intentos = await db.intento_contacto.toArray();
  const porProspecto = new Map<string, typeof intentos>();
  for (const i of intentos) {
    const l = porProspecto.get(i.potencialClienteId) ?? [];
    l.push(i);
    porProspecto.set(i.potencialClienteId, l);
  }
  const frases: string[] = [];
  for (const lista of porProspecto.values()) {
    const a = aprendizajeAcumulado(lista);
    if (a.citaDolor) frases.push(`"${a.citaDolor}"`);
    if (a.comoLoResuelve)
      frases.push(`hoy lo resuelve así: ${a.comoLoResuelve}`);
  }

  const bloques: string[] = [];
  if (actividades.length)
    bloques.push(
      "Tareas de esta semana:\n" +
        actividades
          .slice(0, 20)
          .map((a) => `- ${a.descripcion}`)
          .join("\n")
    );
  if (entregables.length)
    bloques.push(
      "Entregables que vencen pronto:\n" +
        entregables
          .slice(0, 10)
          .map((e) => `- ${e.titulo} (hasta ${e.diaLimite})`)
          .join("\n")
    );
  if (proyectos.length)
    bloques.push(
      "Proyectos activos: " +
        proyectos
          .slice(0, 10)
          .map((p) => p.titulo)
          .join("; ")
    );
  if (proyectosNodexa.length)
    bloques.push(
      "Proyectos/software en desarrollo: " +
        proyectosNodexa
          .slice(0, 10)
          .map((p) => texto(p.nombre) || texto(p.titulo))
          .filter(Boolean)
          .join("; ")
    );
  if (clientes.length)
    bloques.push(
      "Clientes nuevos (último mes): " +
        clientes
          .slice(0, 8)
          .map((c) => texto(c.empresa) || texto(c.nombre))
          .filter(Boolean)
          .join("; ")
    );
  if (topDolores.length)
    bloques.push(
      "Dolores que más aparecen en los comercios que estoy contactando: " +
        topDolores.map(([d, n]) => `${d} (${n})`).join(", ")
    );
  if (frases.length)
    bloques.push(
      "Frases y hábitos reales que dijeron en las conversaciones:\n" +
        frases
          .slice(0, 8)
          .map((f) => `- ${f}`)
          .join("\n")
    );

  // --- resultados de la semana anterior
  const publicados = (
    await db.contenido.where("estado").equals("Publicado").toArray()
  )
    .filter((c) => (c.fechaPublicacion ?? 0) >= Date.now() - 14 * DIA_MS)
    .filter((c) => Object.keys(c.metricas ?? {}).length > 0);
  const nombreKpi = new Map(
    (await db.catalogo_kpi_contenido.toArray()).map((k) => [k.id, k.nombre])
  );
  for (const k of KPIS_CONTENIDO_DEFAULT)
    if (!nombreKpi.has(k.id)) nombreKpi.set(k.id, k.nombre);
  const resultados = publicados
    .slice(0, 8)
    .map(
      (c) =>
        `- "${c.titulo}" (${c.tipoContenido}): ` +
        Object.entries(c.metricas)
          .map(([k, v]) => `${nombreKpi.get(k) ?? k} ${v}`)
          .join(", ")
    )
    .join("\n");

  // --- lo decidido en etapas previas de esta semana
  const piezas = ciclo
    ? await db.contenido.where("cicloId").equals(ciclo.id).toArray()
    : [];
  const ideasTodas = await db.idea_contenido.toArray();
  const ideas = ideasTodas
    .filter((i) => i.estado !== "Descartada")
    .slice(-30)
    .map(
      (i) =>
        `${i.texto}${i.dolorSemana ? ` (dolor: ${i.dolorSemana})` : ""} [${i.estado === "Seleccionada" ? "esta semana" : "backlog"}]`
    );

  const plantilla = await db.plantilla_guion.get("plantilla_default");
  const mezcla = ciclo?.mezcla
    ? Object.entries(ciclo.mezcla)
        .filter(([, n]) => (n ?? 0) > 0)
        .map(([t, n]) => `${n} ${t}`)
        .join(", ")
    : "";

  return {
    etiquetaSemana: etiquetaSemana(lunes),
    diasSemana: NOMBRES_DIA.map((dia, i) => ({
      dia,
      fecha: sumarDias(lunes, i),
    })),
    mezcla,
    contextoTrabajo: bloques.join("\n\n"),
    resultadosAnteriores: resultados,
    ideas,
    piezas: piezas.map(lineaPieza),
    secciones: plantilla?.secciones ?? SECCIONES_GUION_DEFAULT,
  };
}
