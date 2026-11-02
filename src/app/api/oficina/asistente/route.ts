import { NextRequest, NextResponse } from "next/server";
import { generarConGeminiFallback } from "../../../../infrastructure/ai/gemini-fallback";
import type {
  ContextoAsistentePayload,
  LogErrorAPI,
} from "../../../../domain/entidades/asistente-oficina.entity";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const payload: ContextoAsistentePayload = await req.json();

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      const errorAPI: LogErrorAPI = {
        tipo: "API_KEY_FALTANTE",
        mensaje:
          "La variable de entorno GEMINI_API_KEY no está configurada en .env.",
        origen: "servidor",
        codigoHttp: 500,
      };
      return NextResponse.json({ success: false, errorAPI }, { status: 500 });
    }

    let promptContexto = `Intención: ${payload.intencion}\n`;
    if (payload.consultaUsuario) {
      promptContexto += `Pregunta del usuario: "${payload.consultaUsuario}"\n\n`;
    }

    if (payload.datosHoy) {
      promptContexto += `DATOS PREPROCESADOS DE HOY (${payload.datosHoy.fecha}):\n${JSON.stringify(payload.datosHoy, null, 2)}\n\n`;
    }
    if (payload.datosSemana) {
      promptContexto += `DATOS PREPROCESADOS DE LA SEMANA (${payload.datosSemana.semanaInicio} al ${payload.datosSemana.semanaFin}):\n${JSON.stringify(payload.datosSemana, null, 2)}\n\n`;
    }
    if (payload.datosPlanificacion) {
      promptContexto += `DIAGNÓSTICO PREPROCESADO DE PISOS MÍNIMOS:\n${JSON.stringify(payload.datosPlanificacion, null, 2)}\n\n`;
    }

    promptContexto +=
      "Instrucción final: Redacta tu análisis táctico y consejo ejecutivo para el usuario respondiendo a su intención.";

    const { texto: respuestaTexto } = await generarConGeminiFallback({
      apiKey,
      prompt: promptContexto,
      systemInstruction:
        "Eres el Copiloto Ejecutivo de Oficina para MateCode 2.0. Tu misión es asistir al usuario en su jornada laboral analizando los datos cuantitativos y cualitativos que el sistema ya calculó para ti.\n" +
        "REGLAS INQUEBRANTABLES:\n" +
        "1. QUEDA ESTRICTAMENTE PROHIBIDO INVENTAR, ALUCINAR O ASUMIR DATOS, tareas, clientes o metas que no aparezcan explícitamente en el contexto provisto.\n" +
        "2. Sé profesional, directo y conciso. Evita introducciones vacías (ej: '¡Hola! Claro que sí...'). Ve al grano.\n" +
        "3. Estructura tu respuesta en Markdown limpio con negritas y bullets cuando sea útil.\n" +
        "4. Si la consulta involucra la planificación, enfócate en aconsejar cómo llegar al piso mínimo o banda aceptable de cada entregable.",
      generationConfig: {
        temperature: 0.2, // Baja temperatura para máxima precisión y cero alucinación
        maxOutputTokens: 600, // Token saving: respuestas ejecutivas y concisas
      },
    });

    if (!respuestaTexto) {
      throw new Error("Gemini no devolvió texto de respuesta.");
    }

    return NextResponse.json({
      success: true,
      contenido: respuestaTexto,
    });
  } catch (err: unknown) {
    const errorObj = err as Record<string, unknown>;
    const mensaje = errorObj?.message ? String(errorObj.message) : String(err);
    const status = typeof errorObj?.status === "number" ? errorObj.status : 500;

    let tipo: LogErrorAPI["tipo"] = "ERROR_INTERNO";
    let mensajeAmigable = "Error inesperado al conectar con Gemini.";

    if (
      mensaje.includes("429") ||
      mensaje.includes("RESOURCE_EXHAUSTED") ||
      mensaje.includes("quota")
    ) {
      tipo = "LIMITE_CUOTA_EXCEDIDO";
      mensajeAmigable =
        "Límite de cuota de la API de Gemini alcanzado (HTTP 429).";
    } else if (
      mensaje.includes("503") ||
      status === 503 ||
      mensaje.includes("high demand") ||
      mensaje.includes("Service Unavailable")
    ) {
      tipo = "SERVICIO_NO_DISPONIBLE";
      mensajeAmigable =
        "Gemini está temporalmente con alta demanda en los servidores de Google (HTTP 503). Intentá de nuevo en unos segundos.";
    } else if (
      mensaje.includes("API_KEY_INVALID") ||
      status === 400 ||
      status === 401 ||
      status === 403
    ) {
      tipo = "API_KEY_INVALIDA";
      mensajeAmigable =
        "La clave GEMINI_API_KEY es inválida o no tiene permisos.";
    } else if (
      mensaje.includes("timeout") ||
      mensaje.includes("ETIMEDOUT") ||
      mensaje.includes("ECONNRESET")
    ) {
      tipo = "TIMEOUT_RED";
      mensajeAmigable = "Tiempo de espera agotado al comunicarse con Gemini.";
    }

    const errorAPI: LogErrorAPI = {
      tipo,
      mensaje: mensajeAmigable,
      detalle: mensaje,
      codigoHttp: status,
      origen: "gemini",
    };

    return NextResponse.json({ success: false, errorAPI }, { status });
  }
}
