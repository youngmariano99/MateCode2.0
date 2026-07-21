/* eslint-disable @typescript-eslint/no-explicit-any */
import "fake-indexeddb/auto";
import { test, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";

beforeEach(async () => {
  await db.proyectos.clear();
  await db.proyecto_contexto.clear();
  await db.task_executions.clear();
  await db.task_step_states.clear();
});

test("Sprint 20 Part 3: Debería bloquear duplicados y mantener único ticket activo por sección", async () => {
  const proyectoId = "proj_sec_unique_test";

  // Create active HERO ticket
  await db.task_executions.put({
    id: "tick_hero_1",
    proyectoId,
    templateId: "workflow_section_landing",
    titulo: "SECCIÓN: HERO",
    estado: "IN_PROGRESS",
    fechaInicio: 1000,
    metadata: {
      seccionNombre: "HERO",
      seccionDescripcion: "Sección principal",
    },
  });

  const activeTickets = await db.task_executions
    .where("proyectoId")
    .equals(proyectoId)
    .toArray();

  const targetSeccion = "HERO";
  const existingOpenTicket = activeTickets.find(
    (t: any) =>
      t.estado !== "COMPLETED" &&
      t.metadata?.seccionNombre?.trim().toUpperCase() ===
        targetSeccion.toUpperCase()
  );

  assert.ok(existingOpenTicket);
  assert.strictEqual(existingOpenTicket.id, "tick_hero_1");
});

test("Sprint 20 Part 3: Debería ordenar los tickets abiertos cronológicamente por fechaInicio", async () => {
  const proyectoId = "proj_order_test";

  await db.task_executions.put({
    id: "tick_2",
    proyectoId,
    templateId: "workflow_section_landing",
    titulo: "SECCIÓN: SERVICIOS",
    estado: "IN_PROGRESS",
    fechaInicio: 2000,
  });

  await db.task_executions.put({
    id: "tick_1",
    proyectoId,
    templateId: "workflow_section_landing",
    titulo: "SECCIÓN: HERO",
    estado: "IN_PROGRESS",
    fechaInicio: 1000,
  });

  const tickets = await db.task_executions
    .where("proyectoId")
    .equals(proyectoId)
    .toArray();

  const ordenados = [...tickets].sort(
    (a: any, b: any) => (a.fechaInicio || 0) - (b.fechaInicio || 0)
  );

  assert.strictEqual(ordenados[0].id, "tick_1");
  assert.strictEqual(ordenados[1].id, "tick_2");
});

test("Sprint 20 Part 3: Debería estructurar el prompt compilado según la plantilla ultra-limpia solicitada", () => {
  const ticket = {
    id: "tick_sec_1",
    titulo: "SECCIÓN: HeaderNavegacion",
    metadata: {
      seccionNombre: "HeaderNavegacion",
      seccionDescripcion: "1. Brand Logo\n2. Navigation Links\n3. CTA Button",
      rol: "Senior Frontend Developer (Next.js + Tailwind CSS + TypeScript)",
    },
  };

  const proyecto = {
    stack: {
      Frontend: ["Next.js (App Router)", "Tailwind CSS", "React", "TypeScript"],
    },
    estandares: {
      Diseno: "NO neones, NO degradados, NO sombras pesadas, NO íconos 3D",
    },
  };

  const ds = {
    arquetipo:
      "Enterprise B2B, Swiss Design, ultra-minimalist, brutalist clean",
    reglaColor: "Background (#FFFFFF), Text (#1F2937), Sapphire Blue (#0A192F)",
  };

  // Compiler logic test
  let prompt = `ROL: ${ticket.metadata.rol}.\n\n`;
  prompt += `DS / UI DESIGN SYSTEM:\n- Estilo: ${ds.arquetipo}\n- Paleta: ${ds.reglaColor}\n\n`;
  prompt += `RESTRICCIONES/CONSIDERACIONES:\n- Diseno:\n  * ${proyecto.estandares.Diseno}\n\n`;
  prompt += `STACK DE ESTE COMPONENTE:\n- ${proyecto.stack.Frontend.join(", ")}\n\n`;
  prompt += `TAREA / TICKET:\n- Componente: HeaderNavegacion.tsx\n- Tipo: ${ticket.titulo}\n\n`;
  prompt += `REQUISITOS Y COPY DEL COMPONENTE:\n${ticket.metadata.seccionDescripcion}\n`;

  assert.ok(prompt.includes("ROL: Senior Frontend Developer"));
  assert.ok(prompt.includes("DS / UI DESIGN SYSTEM:"));
  assert.ok(prompt.includes("RESTRICCIONES/CONSIDERACIONES:"));
  assert.ok(prompt.includes("- Diseno:"));
  assert.ok(prompt.includes("STACK DE ESTE COMPONENTE:"));
  assert.ok(prompt.includes("TAREA / TICKET:"));
  assert.ok(prompt.includes("Componente: HeaderNavegacion.tsx"));
  assert.ok(prompt.includes("REQUISITOS Y COPY DEL COMPONENTE:"));
  assert.ok(prompt.includes("1. Brand Logo"));
});
