import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";

/**
 * Cadena de modelos ordenada por velocidad comprobada y disponibilidad de cuota:
 * 1. gemini-3.5-flash-lite (~890ms, ultrarrápido y disponible)
 * 2. gemini-flash-lite-latest (~950ms)
 * 3. gemini-3.5-flash (alta calidad de síntesis)
 * 4. gemini-3.1-flash-lite (~2.8s)
 * 5. gemini-3.8-flash (fallback final)
 */
export const MODELOS_GEMINI_FALLBACK: string[] = [
  process.env.GEMINI_MODEL,
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
].filter((m): m is string => Boolean(m));

export interface GenerarConGeminiOptions {
  apiKey: string;
  prompt: string;
  systemInstruction?: string;
  generationConfig?: GenerationConfig;
  timeoutMs?: number;
}

export async function generarConGeminiFallback(
  options: GenerarConGeminiOptions
): Promise<{ texto: string; modeloUsado: string }> {
  const {
    apiKey,
    prompt,
    systemInstruction,
    generationConfig,
    timeoutMs = 15000, // 15 segundos para dar margen holgado a respuestas largas sin cortar
  } = options;

  const genAI = new GoogleGenerativeAI(apiKey);
  const errores: string[] = [];

  for (const modeloNombre of MODELOS_GEMINI_FALLBACK) {
    const inicio = Date.now();
    try {
      const model = genAI.getGenerativeModel(
        {
          model: modeloNombre,
          systemInstruction,
          generationConfig,
        },
        { timeout: timeoutMs }
      );

      const res = await model.generateContent(prompt);
      const texto = res.response.text();
      const elapsed = Date.now() - inicio;

      if (texto) {
        console.log(
          `[Gemini] ✅ Modelo "${modeloNombre}" respondió con éxito en ${elapsed}ms.`
        );
        return { texto, modeloUsado: modeloNombre };
      }
    } catch (err: unknown) {
      const elapsed = Date.now() - inicio;
      const msg = err instanceof Error ? err.message : String(err);
      errores.push(`[${modeloNombre} (${elapsed}ms)]: ${msg}`);
      console.warn(
        `[Gemini] ⚠️ Falló "${modeloNombre}" tras ${elapsed}ms: ${msg.slice(0, 100)}... Probando siguiente candidato...`
      );
      // Si el modelo tarda más de timeoutMs, está ocupado (503) o sin cuota (429), salta al siguiente
      continue;
    }
  }

  throw new Error(
    `Todos los modelos de la cadena de fallback fallaron:\n${errores.join("\n")}`
  );
}
