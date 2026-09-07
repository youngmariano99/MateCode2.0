import { NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  SchemaType,
  type Tool,
} from "@google/generative-ai";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

const tools = [
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
] as unknown;

const functions: Record<string, (args: Record<string, string>) => unknown> = {
  readFile: ({ path: filepath }: Record<string, string>) => {
    try {
      return fs.readFileSync(path.resolve(process.cwd(), filepath), "utf8");
    } catch (e: unknown) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
  writeFile: ({ path: filepath, content }: Record<string, string>) => {
    try {
      const absPath = path.resolve(process.cwd(), filepath);
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, content, "utf8");
      return `Success: File ${filepath} written successfully.`;
    } catch (e: unknown) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
  runCommand: async ({ command }: Record<string, string>) => {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "La variable de entorno GEMINI_API_KEY no está configurada.",
        },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: tools as unknown as Tool[],
      systemInstruction:
        "Eres un agente desarrollador experto (Antigravity). Tu misión es resolver el ticket. Tienes herramientas para leer archivos, escribir archivos y ejecutar comandos. Utiliza las herramientas para inspeccionar el código, hacer los cambios necesarios, y verificar que no hay errores corriendo linters o pruebas. IMPORTANTE: Cuando hayas terminado con los cambios y las pruebas, y el ticket esté resuelto, tu ULTIMO mensaje debe ser UNICAMENTE un bloque JSON válido (Handoff JSON) que comience con { y termine con }.",
    });

    const chat = model.startChat();
    let result = await chat.sendMessage(prompt);

    // Agent Loop (Max 15 iteraciones para evitar bucles infinitos)
    let maxIterations = 15;
    let finalOutput = "";

    while (maxIterations > 0) {
      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) {
        // No hay más llamadas a herramientas, la IA terminó
        finalOutput = result.response.text();
        break;
      }

      // Procesar todas las llamadas a herramientas en este turno
      const toolResponses = [];
      for (const call of calls) {
        const fn = functions[call.name];
        if (fn) {
          const fnResult = await fn(call.args as Record<string, string>);
          toolResponses.push({
            functionResponse: {
              name: call.name,
              response: { result: fnResult },
            },
          });
        }
      }

      // Devolver los resultados a la IA
      result = await chat.sendMessage(toolResponses);
      maxIterations--;
    }

    if (maxIterations === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El agente alcanzó el límite máximo de iteraciones sin finalizar.",
        },
        { status: 500 }
      );
    }

    // Extraer el JSON del resultado final
    let jsonString = finalOutput;
    const jsonStart = finalOutput.indexOf("{");
    const jsonEnd = finalOutput.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonString = finalOutput.substring(jsonStart, jsonEnd + 1);
    }

    return NextResponse.json(JSON.parse(jsonString));
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
