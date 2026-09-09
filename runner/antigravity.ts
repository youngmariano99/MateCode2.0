import { SchemaType, type Tool } from "@google/generative-ai";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import type {
  InvocacionClaudeCodeResult,
  InvocarClaudeCodeOptions,
} from "./claude-code";

const execAsync = promisify(exec);

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "readFile",
        description: "Lee el contenido de un archivo desde el disco.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: {
              type: SchemaType.STRING,
              description: "Ruta absoluta o relativa del archivo",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "writeFile",
        description: "Escribe contenido en un archivo. Sobrescribe si existe.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Ruta del archivo" },
            content: {
              type: SchemaType.STRING,
              description: "Contenido a escribir",
            },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "runCommand",
        description:
          "Ejecuta un comando en la consola (ej: tsc, npm run lint, pruebas).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            command: {
              type: SchemaType.STRING,
              description: "Comando a ejecutar",
            },
          },
          required: ["command"],
        },
      },
    ],
  },
] as unknown as Tool[];

const functions: Record<
  string,
  (args: Record<string, string>, cwd: string) => Promise<unknown> | unknown
> = {
  readFile: ({ path: filepath }, cwd) => {
    try {
      return fs.readFileSync(path.resolve(cwd, filepath), "utf8");
    } catch (e: unknown) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
  writeFile: ({ path: filepath, content }, cwd) => {
    try {
      const absPath = path.resolve(cwd, filepath);
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, content, "utf8");
      return `Success: File ${filepath} written successfully.`;
    } catch (e: unknown) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
  runCommand: async ({ command }, cwd) => {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout: 30000,
      });
      return `stdout:\n${stdout}\nstderr:\n${stderr}`;
    } catch (e: unknown) {
      if (e instanceof Error) {
        return `Error executing command: ${e.message}`;
      }
      return `Error executing command: ${String(e)}`;
    }
  },
};

/** Arma una línea corta y legible a partir de una function call de Gemini. */
function resumirFunctionCall(
  nombre: string,
  args: Record<string, string>
): string {
  switch (nombre) {
    case "readFile":
      return `Leyendo ${args.path || ""}`;
    case "writeFile":
      return `Escribiendo ${args.path || ""}`;
    case "runCommand":
      return `Ejecutando: ${(args.command || "").slice(0, 100)}`;
    default:
      return `Usando herramienta ${nombre}`;
  }
}

export async function invocarAntigravity({
  prompt,
  rutaRepo,
  modelo = "gemini-3.6-flash",
  onPaso,
}: InvocarClaudeCodeOptions): Promise<InvocacionClaudeCodeResult> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        textoResultado: "",
        errorMensaje:
          "La variable de entorno GEMINI_API_KEY no está configurada.",
      };
    }

    const systemInstruction =
      "Eres un agente desarrollador experto (Antigravity). Tu misión es resolver el ticket. Tienes herramientas para leer archivos, escribir archivos y ejecutar comandos. Utiliza las herramientas para inspeccionar el código, hacer los cambios necesarios, y verificar que no hay errores corriendo linters o pruebas. IMPORTANTE: Cuando hayas terminado con los cambios y las pruebas, y el ticket esté resuelto, tu ULTIMO mensaje debe ser UNICAMENTE un bloque JSON válido (Handoff JSON) que comience con { y termine con }.";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const history: any[] = [{ role: "user", parts: [{ text: prompt }] }];
    let maxIterations = 20;
    let finalOutput = "";

    let tokensInput = 0;
    let tokensOutput = 0;

    while (maxIterations > 0) {
      const payload = {
        contents: history,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        tools: tools,
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Google API Error (${res.status}): ${errorText}`);
      }

      const data = await res.json();

      if (data.usageMetadata) {
        tokensInput += data.usageMetadata.promptTokenCount || 0;
        tokensOutput += data.usageMetadata.candidatesTokenCount || 0;
      }

      const candidate = data.candidates?.[0];
      if (!candidate || !candidate.content) {
        finalOutput = "No se recibió respuesta válida del modelo.";
        break;
      }

      const responseContent = candidate.content;
      history.push(responseContent); // Agregamos la respuesta del modelo

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const calls = responseContent.parts
        ?.filter((p: any) => p.functionCall)
        ?.map((p: any) => p.functionCall);

      if (!calls || calls.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        finalOutput =
          responseContent.parts?.map((p: any) => p.text).join("\n") || "";
        break;
      }

      const toolResponses = [];
      for (const call of calls) {
        const fnName = call.name;
        const args = call.args;
        const fn = functions[fnName as keyof typeof functions];
        if (fn) {
          onPaso?.(resumirFunctionCall(fnName, args));
          const fnResult = await fn(args, rutaRepo);
          toolResponses.push({
            functionResponse: {
              name: fnName,
              response: { result: fnResult },
            },
          });
        }
      }

      // Pasamos los resultados como "user", ya que "function" da 400 Bad Request en la API nueva.
      history.push({ role: "user", parts: toolResponses });
      maxIterations--;
    }

    if (maxIterations === 0) {
      return {
        ok: false,
        textoResultado: "",
        errorMensaje:
          "El agente Antigravity alcanzó el límite de 20 iteraciones sin finalizar.",
      };
    }

    return {
      ok: true,
      textoResultado: finalOutput,
      tokensInput,
      tokensOutput,
      costoUsd:
        (tokensInput * 0.075) / 1_000_000 + (tokensOutput * 0.3) / 1_000_000,
      sessionId: `antigravity-${Date.now()}`,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      textoResultado: "",
      errorMensaje: error instanceof Error ? error.message : String(error),
    };
  }
}
