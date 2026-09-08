import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONFIG_PATH = path.resolve(process.cwd(), "runner.config.json");

export async function GET() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return NextResponse.json({ proyectos: {} });
    }
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { proyectoId, rutaLocalRepo } = await req.json();
    let config: { proyectos: Record<string, { rutaLocalRepo?: string }> } = {
      proyectos: {},
    };

    if (fs.existsSync(CONFIG_PATH)) {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }

    if (!config.proyectos) {
      config.proyectos = {};
    }

    config.proyectos[proyectoId] = {
      ...(config.proyectos[proyectoId] || {}),
      rutaLocalRepo,
    };

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
    return NextResponse.json({ success: true, config });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
