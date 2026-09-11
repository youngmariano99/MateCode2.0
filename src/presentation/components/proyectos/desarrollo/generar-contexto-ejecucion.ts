/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../../../../offline/dexie/db";

// Arma el markdown de contexto de ejecución descargable desde
// DesarrolloWorkspace — separado del componente porque hace su propia
// lectura de `task_step_states` por ticket (no es una función pura de
// string, necesita ir a la base).
export async function generarMarkdownContextoEjecucion(
  proyecto: any,
  ticketExecutions: any[]
): Promise<string> {
  let md = `# CONTEXTO_EJECUCION_${
    String(proyecto?.nombre || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_") || "PROYECTO"
  }.md\n\n`;

  md += `Este archivo resume el estado exacto de desarrollo y ejecución de la Cinta de Producción. Úsalo como instrucción de inicio para Claude.\n\n`;
  md += `## 1. Stack Tecnológico\n`;
  if (proyecto?.stack) {
    Object.entries(proyecto.stack).forEach(([layer, techs]) => {
      if (Array.isArray(techs) && techs.length > 0) {
        md += `- **${layer}:** ${techs.join(", ")}\n`;
      }
    });
  }

  md += `\n## 2. Historial de Ejecuciones de Tickets (Cinta de Producción)\n\n`;
  for (const t of ticketExecutions) {
    md += `### TICKET: ${t.titulo} (${t.estado})\n`;
    md += `- **Template/Tipo:** ${t.templateId}\n`;
    md += `- **Asignado a:** ${t.usuarioAsignadoId || "Sin asignar"}\n`;
    md += `- **Fecha Inicio:** ${new Date(t.fechaInicio).toLocaleDateString()}\n`;

    const steps = await db.task_step_states
      .where("executionId")
      .equals(t.id)
      .toArray();
    if (steps.length > 0) {
      md += `- **Estaciones/Pasos:**\n`;
      steps.forEach((st) => {
        md += `  * [${st.completado ? "x" : " "}] ${st.titulo}\n`;
      });
    }

    const metadata = t.metadata || {};
    if (metadata.handoffs && Object.keys(metadata.handoffs).length > 0) {
      md += `- **Handoffs Registrados:**\n`;
      Object.entries(metadata.handoffs).forEach(
        ([stName, data]: [string, any]) => {
          md += `  * **Estación: ${stName}**\n`;
          if (data.archivos_creados_o_modificados) {
            const files = Array.isArray(data.archivos_creados_o_modificados)
              ? data.archivos_creados_o_modificados.join(", ")
              : String(data.archivos_creados_o_modificados);
            md += `    - Archivos: ${files}\n`;
          }
          if (data.resumen_tecnico) {
            md += `    - Resumen: ${data.resumen_tecnico}\n`;
          }
        }
      );
    }
    md += `\n---\n\n`;
  }

  return md;
}
