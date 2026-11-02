import { NextRequest, NextResponse } from "next/server";
import { generarConGeminiFallback } from "../../../infrastructure/ai/gemini-fallback";

export const maxDuration = 30;

export interface NoticiaNormalizada {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  category: "Programación e IA" | "Tecnología" | "Ciencia";
  tags: string[];
  aiSummary: string;
  score?: number;
}

const PALABRAS_IA = [
  "ai",
  "ia",
  "llm",
  "gpt",
  "gemini",
  "claude",
  "openai",
  "anthropic",
  "model",
  "python",
  "code",
  "software",
  "developer",
  "rust",
  "react",
  "agent",
  "machine learning",
  "deep learning",
];

const PALABRAS_CIENCIA = [
  "physics",
  "quantum",
  "space",
  "nasa",
  "biology",
  "math",
  "science",
  "astronomy",
  "research",
  "genome",
  "neuroscience",
];

function categorizarManual(
  title: string
): "Programación e IA" | "Tecnología" | "Ciencia" {
  const low = title.toLowerCase();
  if (PALABRAS_IA.some((p) => low.includes(p))) return "Programación e IA";
  if (PALABRAS_CIENCIA.some((p) => low.includes(p))) return "Ciencia";
  return "Tecnología";
}

function tagsManuales(title: string): string[] {
  const low = title.toLowerCase();
  const tags: string[] = [];
  if (low.includes("python")) tags.push("Python");
  if (low.includes("ai") || low.includes("llm") || low.includes("gpt"))
    tags.push("IA");
  if (low.includes("rust")) tags.push("Rust");
  if (low.includes("react") || low.includes("frontend")) tags.push("Frontend");
  if (low.includes("cloud") || low.includes("aws") || low.includes("server"))
    tags.push("Cloud");
  if (low.includes("security") || low.includes("vulnerability"))
    tags.push("Seguridad");
  if (low.includes("quantum")) tags.push("Quantum");
  if (low.includes("database") || low.includes("sql")) tags.push("Database");

  if (tags.length === 0) tags.push("Tech");
  return tags;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const modoAhorro = Boolean(body?.modoAhorro);

    // 1. Obtener top stories de Hacker News
    const hnRes = await fetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty",
      { next: { revalidate: 3600 } }
    );

    if (!hnRes.ok) {
      throw new Error(`Error al conectar con Hacker News (${hnRes.status})`);
    }

    const ids: number[] = await hnRes.json();
    const topIds = ids.slice(0, 15);

    // Obtener detalles de cada historia
    const itemsPromises = topIds.map(async (id) => {
      try {
        const itemRes = await fetch(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
          { next: { revalidate: 3600 } }
        );
        if (!itemRes.ok) return null;
        return await itemRes.json();
      } catch {
        return null;
      }
    });

    const itemsRaw = await Promise.all(itemsPromises);
    const validItems = itemsRaw
      .filter((it) => it && it.title && it.url && !it.deleted && !it.dead)
      .slice(0, 10);

    // Si está en Modo Ahorro, clasificar localmente sin tokens de Gemini
    if (modoAhorro) {
      const noticiasAhorro: NoticiaNormalizada[] = validItems.map((item) => {
        const dateIso = new Date(
          (item.time || Date.now() / 1000) * 1000
        ).toISOString();
        const category = categorizarManual(item.title);
        const tags = tagsManuales(item.title);

        return {
          id: `hn_${item.id}`,
          title: item.title,
          url: item.url,
          source: "Hacker News",
          publishedAt: dateIso,
          category,
          tags,
          aiSummary: `Artículo técnico sobre ${tags.join(", ")} publicado en Hacker News con score de ${item.score || 0} puntos.`,
          score: item.score,
        };
      });

      return NextResponse.json({
        success: true,
        noticias: noticiasAhorro,
        modoUsado: "ahorro",
      });
    }

    // Modo IA: Procesar lote con Gemini
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      // Fallback a modo ahorro si no hay API key
      const noticiasFallback: NoticiaNormalizada[] = validItems.map((item) => ({
        id: `hn_${item.id}`,
        title: item.title,
        url: item.url,
        source: "Hacker News",
        publishedAt: new Date(
          (item.time || Date.now() / 1000) * 1000
        ).toISOString(),
        category: categorizarManual(item.title),
        tags: tagsManuales(item.title),
        aiSummary: item.title,
        score: item.score,
      }));

      return NextResponse.json({
        success: true,
        noticias: noticiasFallback,
        modoUsado: "ahorro",
        aviso: "API Key no configurada, generado con resumen básico.",
      });
    }

    try {
      const promptLote = JSON.stringify(
        validItems.map((it) => ({
          id: `hn_${it.id}`,
          title: it.title,
          url: it.url,
        }))
      );

      const { texto } = await generarConGeminiFallback({
        apiKey,
        prompt: `Procesa este lote de noticias:\n${promptLote}`,
        systemInstruction:
          "Eres el editor jefe de un diario técnico exclusivo para desarrolladores de software y científicos. " +
          "Recibirás una lista de noticias en bruto con { id, title, url }. " +
          "Tu tarea es devolver un JSON con un array de noticias procesadas donde cada una tenga:\n" +
          "- id (mantener el id original)\n" +
          "- aiSummary (un resumen ejecutivo técnico de 2 frases explicando por qué es importante para un programador)\n" +
          "- category (exactamente una de: 'Programación e IA', 'Tecnología', 'Ciencia')\n" +
          "- tags (array de 2 a 4 tags concisos sin #, ej: ['Python', 'Cloud', 'OpenAI'])\n\n" +
          'Devuelve ÚNICAMENTE el JSON válido con el array: { "noticias": [ ... ] }',
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 1200,
        },
      });
      const aiData = JSON.parse(texto);
      const aiMap = new Map<
        string,
        { aiSummary: string; category: string; tags: string[] }
      >(
        (aiData.noticias || []).map(
          (n: {
            id: string;
            aiSummary: string;
            category: string;
            tags: string[];
          }) => [n.id, n]
        )
      );

      const noticiasProcesadas: NoticiaNormalizada[] = validItems.map(
        (item) => {
          const id = `hn_${item.id}`;
          const enriquecido = aiMap.get(id);

          return {
            id,
            title: item.title,
            url: item.url,
            source: "Hacker News",
            publishedAt: new Date(
              (item.time || Date.now() / 1000) * 1000
            ).toISOString(),
            category:
              enriquecido?.category === "Programación e IA" ||
              enriquecido?.category === "Ciencia" ||
              enriquecido?.category === "Tecnología"
                ? enriquecido.category
                : categorizarManual(item.title),
            tags:
              enriquecido?.tags && enriquecido.tags.length > 0
                ? enriquecido.tags
                : tagsManuales(item.title),
            aiSummary: enriquecido?.aiSummary || item.title,
            score: item.score,
          };
        }
      );

      return NextResponse.json({
        success: true,
        noticias: noticiasProcesadas,
        modoUsado: "ia",
      });
    } catch {
      // Fallback seguro a categorización manual si falla Gemini
      const noticiasFallback: NoticiaNormalizada[] = validItems.map((item) => ({
        id: `hn_${item.id}`,
        title: item.title,
        url: item.url,
        source: "Hacker News",
        publishedAt: new Date(
          (item.time || Date.now() / 1000) * 1000
        ).toISOString(),
        category: categorizarManual(item.title),
        tags: tagsManuales(item.title),
        aiSummary: `Artículo técnico publicado en Hacker News con score de ${item.score || 0} puntos.`,
        score: item.score,
      }));

      return NextResponse.json({
        success: true,
        noticias: noticiasFallback,
        modoUsado: "ahorro",
        aviso: "Gemini no estuvo disponible, se utilizó el clasificador local.",
      });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Error al obtener noticias: ${errorMsg}` },
      { status: 500 }
    );
  }
}
