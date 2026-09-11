/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../../../../offline/dexie/db";

// Markdown de Backlog y Sprints descargables desde PlanificacionIAWorkspace
// — separados del componente porque hacen su propia lectura de Dexie
// (épicas/historias/tareas/sprints), no son funciones puras de string.

export async function generarBacklogMarkdown(
  proyectoId: string,
  proyecto: any
): Promise<string> {
  const projectEpicas = await db.epicas
    .where("proyectoId")
    .equals(proyectoId)
    .toArray();
  const projectStories = await db.historias
    .where("proyectoId")
    .equals(proyectoId)
    .toArray();
  const projectTareas = await db.tareas
    .where("proyectoId")
    .equals(proyectoId)
    .toArray();

  const getEpicNumber = (name: unknown): number => {
    const strName = typeof name === "string" ? name : "";
    const match = strName.match(/(?:Épica|Epic|Epica)\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 999;
  };
  projectEpicas.sort((a, b) => {
    const nameA = a["nombre"];
    const nameB = b["nombre"];
    return getEpicNumber(nameA) - getEpicNumber(nameB);
  });

  let md = `# Backlog Completo de Ingeniería - ${proyecto?.nombre || "Proyecto"}\n\n`;
  md += `Este documento contiene el desglose jerárquico de Épicas, Historias de Usuario y Actividades Técnicas detalladas con sus respectivos archivos, rutas, pasos de checklist y criterios de aceptación.\n\n`;

  if (projectEpicas.length === 0) {
    md += `*No hay épicas ni backlog registrado.*\n`;
    return md;
  }

  for (const ep of projectEpicas) {
    md += `## Épica: ${ep.nombre}\n`;
    if (ep.descripcion) md += `*Descripción:* ${ep.descripcion}\n`;
    md += `\n`;

    const storiesEp = projectStories.filter((h) => h.epicaId === ep.id);
    if (storiesEp.length === 0) {
      md += `*Sin historias registradas en esta épica.*\n\n`;
      continue;
    }

    for (const h of storiesEp) {
      md += `### Historia: ${h.titulo}\n`;
      md += `- **Prioridad:** ${h.prioridad || "Media"}\n`;
      md += `- **Estimación:** ${h.estimacion || 3} SP\n`;
      if (h.descripcion)
        md += `- **Descripción / CA Funcionales:** ${h.descripcion}\n`;
      md += `\n`;

      const tareasStory = projectTareas.filter((t) => t.historiaId === h.id);
      if (tareasStory.length > 0) {
        md += `#### Actividades Técnicas Desglosadas:\n`;
        tareasStory.forEach((t: any, idx: number) => {
          md += `##### ${idx + 1}. ${t.titulo}\n`;
          if (t.rol) md += `- **Rol:** ${t.rol}\n`;
          if (t.componente)
            md += `- **Componente/Archivo:** \`${t.componente}\` en la ruta \`${t.ruta || ""}\`\n`;
          if (t.modulo) md += `- **Módulo:** ${t.modulo}\n`;
          if (Array.isArray(t.etiquetas) && t.etiquetas.length > 0) {
            md += `- **Etiquetas:** ${t.etiquetas.join(", ")}\n`;
          }
          if (Array.isArray(t.pasos) && t.pasos.length > 0) {
            md += `- **Checklist de Implementación:**\n`;
            t.pasos.forEach((p: string) => {
              md += `  - [ ] ${p}\n`;
            });
          }
          if (
            Array.isArray(t.criteriosAceptacion) &&
            t.criteriosAceptacion.length > 0
          ) {
            md += `- **Criterios de Aceptación (BDD):**\n`;
            t.criteriosAceptacion.forEach((crit: string) => {
              md += `  - ${crit}\n`;
            });
          }
          md += `\n`;
        });
      } else {
        md += `*Sin actividades técnicas desglosadas.*\n\n`;
      }
    }
    md += `---\n\n`;
  }

  return md;
}

export async function generarAuditoriaMarkdown(
  proyectoId: string,
  proyecto: any,
  entidades: string
): Promise<string> {
  const epicas = (await db.epicas
    .where("proyectoId")
    .equals(proyectoId)
    .toArray()) as any[];
  const historias = (await db.historias
    .where("proyectoId")
    .equals(proyectoId)
    .toArray()) as any[];
  const tareas = (await db.tareas
    .where("proyectoId")
    .equals(proyectoId)
    .toArray()) as any[];

  const getEpicNumber = (name: string): number => {
    const match = name.match(/(?:Épica|Epic|Epica)\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 999;
  };
  epicas.sort((a, b) => getEpicNumber(a.nombre) - getEpicNumber(b.nombre));

  let md = `# AUDITORÍA DE PLANIFICACIÓN - ${String(proyecto?.nombre || "PROYECTO").toUpperCase()}\n\n`;
  md += `## 1. Información General del Proyecto\n`;
  md += `- **Nombre:** ${proyecto?.nombre || "No especificado"}\n`;
  md += `- **Descripción:** ${proyecto?.descripcion || "No especificado"}\n\n`;

  md += `## 2. Stack Tecnológico Elegido\n`;
  const stackList: string[] = [];
  if (proyecto?.stack) {
    Object.entries(proyecto.stack).forEach(([layer, techs]) => {
      if (layer !== "comandos" && Array.isArray(techs) && techs.length > 0) {
        const catName =
          layer === "baseDatos"
            ? "Base de Datos"
            : layer.charAt(0).toUpperCase() + layer.slice(1);
        stackList.push(`- **${catName}:** ${techs.join(", ")}`);
      }
    });
  }
  md +=
    stackList.length > 0
      ? stackList.join("\n") + "\n\n"
      : "*No configurado*\n\n";

  md += `## 3. Modelo Físico de Base de Datos (SCHEMA.md)\n`;
  md += `\`\`\`sql\n${entidades || "-- No configurado."}\n\`\`\`\n\n`;

  md += `## 4. Desglose del Backlog Completo\n\n`;
  if (epicas.length === 0) {
    md += `*No hay épicas configuradas en el backlog.*\n`;
  } else {
    epicas.forEach((epica) => {
      md += `### Épica: ${epica.nombre}\n`;
      md += `*Descripción:* ${epica.descripcion || "Sin descripción"}\n\n`;

      const epicaStories = historias.filter(
        (h) =>
          h.epicaId === epica.id ||
          String(h.epicNombre || "")
            .toLowerCase()
            .trim() === String(epica.nombre).toLowerCase().trim()
      );

      if (epicaStories.length === 0) {
        md += `  *Sin historias de usuario registradas para esta épica.*\n\n`;
      } else {
        epicaStories.forEach((story) => {
          md += `#### Historia de Usuario: ${story.titulo}\n`;
          md += `- **Descripción:** ${story.descripcion || "Sin descripción"}\n`;
          md += `- **Prioridad:** ${story.prioridad || "Media"}\n`;
          md += `- **Estimación:** ${story.estimacion || 0} pts\n\n`;

          const storyTareas = tareas.filter((t) => t.historiaId === story.id);
          if (storyTareas.length === 0) {
            md += `  *Sin actividades técnicas desglosadas aún.*\n\n`;
          } else {
            md += `##### Actividades Técnicas Desglosadas:\n`;
            storyTareas.forEach((t, idx) => {
              md += `${idx + 1}. **${t.titulo}** (Estado: ${t.estado?.toUpperCase() || "TODO"})\n`;
              if (t.descripcion) {
                md += `   - *Descripción:* ${t.descripcion}\n`;
              }
              if (
                Array.isArray(t.criteriosAceptacion) &&
                t.criteriosAceptacion.length > 0
              ) {
                md += `   - *Criterios de Aceptación (QA/BDD):*\n`;
                t.criteriosAceptacion.forEach((crit: any) => {
                  md += `     * ${crit}\n`;
                });
              }
            });
            md += `\n`;
          }
        });
      }
      md += `---\n\n`;
    });
  }

  return md;
}

export async function generarSprintsMarkdown(
  proyectoId: string,
  proyecto: any
): Promise<string> {
  const projectSprints = (
    await db.sprints.where("proyectoId").equals(proyectoId).toArray()
  ).filter((s: any) => !s.eliminado);
  const projectStories = await db.historias
    .where("proyectoId")
    .equals(proyectoId)
    .toArray();

  let md = `# Planificación de Sprints - ${proyecto?.nombre || "Proyecto"}\n\n`;
  md += `Distribución temporal de Historias de Usuario organizadas en iteraciones de desarrollo.\n\n`;

  if (projectSprints.length === 0) {
    md += `*No hay sprints planificados.*\n`;
    return md;
  }

  projectSprints.forEach((sp) => {
    md += `## ${sp.nombre}\n`;
    md += `- **Objetivo:** ${sp.objetivo || "Sin objetivo definido."}\n`;
    md += `- **Duración:** ${sp.duracionSemanas || 2} semanas\n`;
    md += `- **Capacidad:** ${sp.capacidad || 20} SP\n`;
    md += `\n### Historias asignadas:\n`;

    const storiesSp = projectStories.filter((h) => h.sprintId === sp.id);
    if (storiesSp.length > 0) {
      storiesSp.forEach((h) => {
        md += `- **${h.titulo}** (${h.estimacion || 3} SP) - Prioridad: ${h.prioridad || "Media"}\n`;
        if (h.descripcion) md += `  *Descripción:* ${h.descripcion}\n`;
      });
    } else {
      md += `*Ninguna historia asignada a este sprint.*\n`;
    }
    md += `\n---\n\n`;
  });

  return md;
}
