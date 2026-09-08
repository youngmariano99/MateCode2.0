import {
  GoogleGenerativeAI,
  SchemaType,
  type Tool,
} from "@google/generative-ai";
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
  modelo = "gemini-2.5-flash",
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const aiModel = genAI.getGenerativeModel({
      model: modelo,
      tools: tools,
      systemInstruction:
        "Eres un agente desarrollador experto (Antigravity). Tu misión es resolver el ticket. Tienes herramientas para leer archivos, escribir archivos y ejecutar comandos. Utiliza las herramientas para inspeccionar el código, hacer los cambios necesarios, y verificar que no hay errores corriendo linters o pruebas. IMPORTANTE: Cuando hayas terminado con los cambios y las pruebas, y el ticket esté resuelto, tu ULTIMO mensaje debe ser UNICAMENTE un bloque JSON válido (Handoff JSON) que comience con { y termine con }.",
    });

    const chat = aiModel.startChat();
    let result = await chat.sendMessage(prompt);

    let maxIterations = 20;
    let finalOutput = "";

    // Simplistic token tracking mapping per iteration
    let tokensInput = 0;
    let tokensOutput = 0;

    while (maxIterations > 0) {
      tokensInput += result.response.usageMetadata?.promptTokenCount || 0;
      tokensOutput += result.response.usageMetadata?.candidatesTokenCount || 0;

      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) {
        finalOutput = result.response.text();
        break;
      }

      const toolResponses = [];
      for (const call of calls) {
        const fn = functions[call.name];
        if (fn) {
          onPaso?.(
            resumirFunctionCall(call.name, call.args as Record<string, string>)
          );
          const fnResult = await fn(
            call.args as Record<string, string>,
            rutaRepo
          );
          toolResponses.push({
            functionResponse: {
              name: call.name,
              response: { result: fnResult },
            },
          });
        }
      }

      result = await chat.sendMessage(toolResponses);
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
        (tokensInput * 0.075) / 1_000_000 + (tokensOutput * 0.3) / 1_000_000, // Approx pricing for flash
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
