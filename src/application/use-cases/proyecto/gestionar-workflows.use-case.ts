/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";

export class GestionarWorkflowsUseCase {
  /**
   * Inicia la ejecución de un nuevo procedimiento a partir de una plantilla
   */
  public async iniciarEjecucion(
    proyectoId: string,
    templateId: string,
    titulo: string,
    usuarioAsignadoId: string
  ): Promise<Resultado<string>> {
    const executionId = `exe_${Date.now()}`;
    try {
      // 1. Crear el registro de ejecución de tarea
      await db.task_executions.add({
        id: executionId,
        proyectoId,
        templateId,
        titulo,
        estado: "NOT_STARTED",
        usuarioAsignadoId,
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      });

      // 2. Traer todos los pasos asociados a la plantilla
      const steps = await db.workflow_steps
        .where("templateId")
        .equals(templateId)
        .toArray();

      // 3. Inicializar el estado de cada paso para esta ejecución
      for (const step of steps) {
        const stepId = step.id as string;
        await db.task_step_states.add({
          id: `${executionId}_${stepId}`,
          executionId,
          stepId,
          completado: false,
          fechaCompletado: 0,
          inputs: "",
          outputs: "",
        });
      }

      // 4. Escribir log en acta de auditoría
      await db.actas_auditoria.add({
        executionId,
        tipoEvento: "ACTIVITY_STARTED",
        mensaje: `Se inició el procedimiento "${titulo}"`,
        usuarioId: usuarioAsignadoId,
        fecha: Date.now(),
        payload: JSON.stringify({ proyectoId, templateId }),
      });

      return Resultado.exito(executionId);
    } catch (error) {
      return Resultado.falla(
        new ErrorDominio(
          error instanceof Error
            ? error.message
            : "Error desconocido al iniciar ejecución."
        )
      );
    }
  }

  /**
   * Cambia el estado de una ejecución (NOT_STARTED, IN_PROGRESS, PAUSED, COMPLETED)
   */
  public async cambiarEstado(
    executionId: string,
    nuevoEstado: "NOT_STARTED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED",
    usuarioId: string
  ): Promise<Resultado<void>> {
    try {
      const exe = await db.task_executions.get(executionId);
      if (!exe)
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró la ejecución.")
        );

      // Strict immutability constraint
      if (exe.estado === "COMPLETED") {
        return Resultado.falla(
          new ErrorDominio(
            "No se puede modificar un flujo de trabajo que ya ha sido completado."
          )
        );
      }

      await db.task_executions.update(executionId, {
        estado: nuevoEstado,
        actualizadoEn: Date.now(),
      });

      // Registrar en acta de auditoría
      await db.actas_auditoria.add({
        executionId,
        tipoEvento: "ASSIGNMENT_CHANGED",
        mensaje: `Estado del flujo cambiado a ${nuevoEstado}`,
        usuarioId,
        fecha: Date.now(),
        payload: JSON.stringify({ nuevoEstado }),
      });

      return Resultado.exito(undefined);
    } catch (error) {
      return Resultado.falla(
        new ErrorDominio(
          error instanceof Error ? error.message : "Error al cambiar estado."
        )
      );
    }
  }

  /**
   * Asigna un responsable a la ejecución de la tarea
   */
  public async asignarResponsable(
    executionId: string,
    nuevoResponsableId: string,
    usuarioId: string
  ): Promise<Resultado<void>> {
    try {
      const exe = await db.task_executions.get(executionId);
      if (!exe)
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró la ejecución.")
        );

      // Strict immutability constraint
      if (exe.estado === "COMPLETED") {
        return Resultado.falla(
          new ErrorDominio(
            "No se pueden reasignar responsables de un flujo de trabajo completado."
          )
        );
      }

      await db.task_executions.update(executionId, {
        usuarioAsignadoId: nuevoResponsableId,
        actualizadoEn: Date.now(),
      });

      // Registrar en acta de auditoría
      await db.actas_auditoria.add({
        executionId,
        tipoEvento: "ASSIGNMENT_CHANGED",
        mensaje: `Relevo: Tarea reasignada al desarrollador ${nuevoResponsableId}`,
        usuarioId,
        fecha: Date.now(),
        payload: JSON.stringify({ nuevoResponsableId }),
      });

      return Resultado.exito(undefined);
    } catch (error) {
      return Resultado.falla(
        new ErrorDominio(
          error instanceof Error
            ? error.message
            : "Error al reasignar responsable."
        )
      );
    }
  }

  /**
   * Guarda un comentario/nota de traspaso en un paso específico o ticket general
   */
  public async agregarComentario(
    executionId: string,
    stepId: string | null,
    comentario: string,
    usuarioId: string
  ): Promise<Resultado<void>> {
    if (!comentario.trim()) {
      return Resultado.falla(
        new ErrorDominio("El comentario no puede estar vacío.")
      );
    }
    try {
      const exe = await db.task_executions.get(executionId);
      if (!exe)
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró la ejecución.")
        );

      // Strict immutability constraint
      if (exe.estado === "COMPLETED") {
        return Resultado.falla(
          new ErrorDominio(
            "No se pueden agregar comentarios a un flujo de trabajo completado."
          )
        );
      }

      const commentId = `com_${Date.now()}`;
      await db.task_comments.add({
        id: commentId,
        executionId,
        stepId: stepId || "",
        comentario,
        usuarioId,
        creadoEn: Date.now(),
      });

      // Registrar en acta de auditoría
      await db.actas_auditoria.add({
        executionId,
        tipoEvento: "COMMENT_ADDED",
        mensaje: stepId
          ? `Nota de traspaso agregada al paso ${stepId}`
          : "Nota de traspaso agregada al ticket general",
        usuarioId,
        fecha: Date.now(),
        payload: JSON.stringify({ commentId, stepId }),
      });

      return Resultado.exito(undefined);
    } catch (error) {
      return Resultado.falla(
        new ErrorDominio(
          error instanceof Error
            ? error.message
            : "Error al agregar comentario."
        )
      );
    }
  }

  /**
   * Actualiza el estado de completado, inputs y outputs de un paso individual
   */
  public async actualizarEstadoPaso(
    executionId: string,
    stepId: string,
    completado: boolean,
    inputs: string,
    outputs: string,
    usuarioId: string
  ): Promise<Resultado<void>> {
    const stateId = `${executionId}_${stepId}`;
    try {
      const exe = await db.task_executions.get(executionId);
      if (!exe)
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró la ejecución.")
        );

      // Strict immutability constraint
      if (exe.estado === "COMPLETED") {
        return Resultado.falla(
          new ErrorDominio(
            "No se pueden modificar los pasos de un flujo de trabajo completado."
          )
        );
      }

      await db.task_step_states.update(stateId, {
        completado,
        fechaCompletado: completado ? Date.now() : 0,
        inputs,
        outputs,
      });

      // Registrar en acta de auditoría
      await db.actas_auditoria.add({
        executionId,
        tipoEvento: "STEP_COMPLETED",
        mensaje: completado
          ? `Paso ${stepId} completado exitosamente.`
          : `Paso ${stepId} revertido a pendiente.`,
        usuarioId,
        fecha: Date.now(),
        payload: JSON.stringify({ stepId, completado }),
      });

      return Resultado.exito(undefined);
    } catch (error) {
      return Resultado.falla(
        new ErrorDominio(
          error instanceof Error
            ? error.message
            : "Error al actualizar estado del paso."
        )
      );
    }
  }

  /**
   * Compila el Prompt Inicial para enviar a la IA inyectando todo el contexto del proyecto
   */
  public async compilarPromptInicial(
    executionId: string,
    stepId: string,
    especificacionTarea: string
  ): Promise<Resultado<string>> {
    try {
      const exe = await db.task_executions.get(executionId);
      if (!exe)
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró la ejecución de la tarea.")
        );

      const step = await db.workflow_steps.get(stepId);
      if (!step)
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró el paso del flujo.")
        );

      const promptTemplate = (step as Record<string, unknown>)
        .promptTemplate as string;
      if (!promptTemplate) {
        return Resultado.falla(
          new ErrorDominio("Este paso no cuenta con una plantilla de prompt.")
        );
      }

      // Load context tables
      const contexto = await db.proyecto_contexto.get(exe.proyectoId as string);
      const ds = await db.proyecto_design_system.get(exe.proyectoId as string);
      const proj = await db.proyectos.get(exe.proyectoId as string);

      const stack_frontend = (proj as any)?.stack?.frontend?.join(", ") || "";
      const stack_backend = (proj as any)?.stack?.backend?.join(", ") || "";
      const stack_base_datos =
        (proj as any)?.stack?.baseDatos?.join(", ") || "";
      let estandares_codigo = "Limpieza y tipado estricto.";
      if (proj && (proj as any).estandares) {
        const estObj = (proj as any).estandares;
        if (Array.isArray(estObj)) {
          estandares_codigo = estObj.join("\n- ");
        } else if (typeof estObj === "object") {
          const list: string[] = [];
          Object.entries(estObj).forEach(([cat, items]) => {
            if (Array.isArray(items) && items.length > 0) {
              list.push(`${cat.toUpperCase()}:`);
              items.forEach((item) => list.push(`  - ${item}`));
            }
          });
          if (list.length > 0) {
            estandares_codigo = list.join("\n");
          }
        }
      }

      // Reemplazar placeholders en el template
      const variables: Record<string, string> = {
        especificacion_tarea: especificacionTarea,
        dolores_cliente:
          (contexto as any)?.doloresCliente ||
          (contexto as any)?.relevamientoMarkdown ||
          "",
        reglas_negocio:
          (contexto as any)?.reglasNegocio ||
          (contexto as any)?.relevamientoMarkdown ||
          "",
        publico_objetivo:
          (contexto as any)?.publicoObjetivo ||
          (contexto as any)?.relevamientoMarkdown ||
          "",
        relevamiento_markdown: (contexto as any)?.relevamientoMarkdown || "",
        stack_frontend,
        stack_backend,
        stack_base_datos,
        arquetipo:
          (ds as any)?.arquetipo || (ds as any)?.designSystemMarkdown || "",
        metafora:
          (ds as any)?.metafora || (ds as any)?.designSystemMarkdown || "",
        radio_bordes: (ds as any)?.radioBordes || "",
        sombras: (ds as any)?.sombras || "",
        directrices_diseno:
          (ds as any)?.directrizNegacion ||
          (ds as any)?.designSystemMarkdown ||
          "",
        tipografias: (ds as any)?.parejaTipografica || "",
        escala_espaciado: (ds as any)?.escalaEspaciado || "",
        reglas_color:
          (ds as any)?.reglaColor || (ds as any)?.designSystemMarkdown || "",
        animaciones: (ds as any)?.estiloAnimaciones || "",
        design_system_markdown: (ds as any)?.designSystemMarkdown || "",
        estandares_codigo,
      };

      const promptCompilado = this.reemplazarPlaceholders(
        promptTemplate,
        variables
      );

      // Registrar acción en actas de auditoría
      await db.actas_auditoria.add({
        executionId,
        tipoEvento: "PROMPT_EXPORTED",
        mensaje: `Prompt inicial exportado para el paso ${stepId}`,
        usuarioId: exe.usuarioAsignadoId,
        fecha: Date.now(),
        payload: JSON.stringify({ stepId }),
      });

      return Resultado.exito(promptCompilado);
    } catch (error) {
      return Resultado.falla(
        new ErrorDominio(
          error instanceof Error
            ? error.message
            : "Error al compilar el prompt inicial."
        )
      );
    }
  }

  /**
   * Compila el Prompt de Continuación/Reanudación para Claude a partir del estado actual y notas de traspaso
   */
  public async compilarPromptReanudacion(
    executionId: string
  ): Promise<Resultado<string>> {
    try {
      const exe = await db.task_executions.get(executionId);
      if (!exe)
        return Resultado.falla(
          new ErrorNoEncontrado("No se encontró la ejecución.")
        );

      const proj = await db.proyectos.get(exe.proyectoId as string);
      const contexto = await db.proyecto_contexto.get(exe.proyectoId as string);
      const ds = await db.proyecto_design_system.get(exe.proyectoId as string);

      const steps = await db.workflow_steps
        .where("templateId")
        .equals(exe.templateId as string)
        .sortBy("orden");

      const states = await db.task_step_states
        .where("executionId")
        .equals(executionId)
        .toArray();
      const comments = await db.task_comments
        .where("executionId")
        .equals(executionId)
        .toArray();

      const commentsSection =
        comments.length === 0
          ? "- No se registraron comentarios de traspaso."
          : comments
              .map(
                (c) =>
                  `- [${new Date(c.creadoEn as number).toLocaleDateString()}] Desarrollador ${
                    c.usuarioId || "Anon"
                  }: "${c.comentario}"`
              )
              .join("\n");

      const stepsSection = steps
        .map((s) => {
          const state = states.find((st) => st.stepId === s.id);
          const checked = state?.completado
            ? "[X] COMPLETADO"
            : "[ ] PENDIENTE";
          let detail = `- **${s.titulo}** (${checked})`;
          if (state?.completado && state.outputs) {
            detail += `\n   *Resultado:* \`\`\`\n${state.outputs}\n\`\`\``;
          }
          return detail;
        })
        .join("\n");

      const promptContinuation = `# PROMPT DE REANUDACIÓN DE TAREA (ROLLOVER / TRASPASO)

Eres un desarrollador Fullstack Senior. Estás tomando relevo de una tarea que fue pausada por un compañero. Tu objetivo es continuar la implementación sin perder contexto técnico.

## 1. CONTEXTO GENERAL DEL PROYECTO
- **Proyecto:** ${(proj as any)?.nombre || "N/A"}
- **Fase de Ejecución:** ${exe.titulo}
- **Stack Técnico:** Frontend: ${(proj as any)?.stack?.frontend?.join(", ")}, Backend: ${(proj as any)?.stack?.backend?.join(", ")}, BD: ${(proj as any)?.stack?.baseDatos?.join(", ")}
- **Dolores del Cliente:** ${(contexto as any)?.doloresCliente || ""}
- **Reglas de Negocio:** ${(contexto as any)?.reglasNegocio || ""}
- **Relevamiento General (Markdown):** ${(contexto as any)?.relevamientoMarkdown || ""}
- **Sistema de Diseño (Markdown):** ${(ds as any)?.designSystemMarkdown || ""}

## 2. HISTORIAL DE BITÁCORA Y COMENTARIOS DE TRASPASO
Aquí están las notas que dejaron tus compañeros sobre el estado de la implementación:
${commentsSection}

## 3. CHECKLIST DE PASOS Y AVANCE
Revisa qué se ha completado y qué queda pendiente en el procedimiento:
${stepsSection}

## 4. INSTRUCCIONES DE ACCIÓN
Analiza el estado actual, el código que ya fue aplicado en los pasos completados y las notas del desarrollador anterior. Continúa con los pasos pendientes asegurando el estándar del proyecto.`;

      // Registrar acción en actas de auditoría
      await db.actas_auditoria.add({
        executionId,
        tipoEvento: "PROMPT_EXPORTED",
        mensaje: `Prompt de reanudación consolidado para la ejecución ${executionId}`,
        usuarioId: exe.usuarioAsignadoId,
        fecha: Date.now(),
        payload: JSON.stringify({ executionId }),
      });

      return Resultado.exito(promptContinuation);
    } catch (error) {
      return Resultado.falla(
        new ErrorDominio(
          error instanceof Error
            ? error.message
            : "Error al compilar el prompt de reanudación."
        )
      );
    }
  }

  /**
   * Obtiene la bitácora histórica (Actas de Auditoría) de una ejecución
   */
  public async obtenerActasAuditoria(
    executionId: string
  ): Promise<Resultado<any[]>> {
    try {
      const logs = await db.actas_auditoria
        .where("executionId")
        .equals(executionId)
        .toArray();
      return Resultado.exito(logs);
    } catch (error) {
      return Resultado.falla(
        new ErrorDominio(
          error instanceof Error ? error.message : "Error al obtener actas."
        )
      );
    }
  }

  /**
   * Obtiene el listado de estados de pasos asociados a una ejecución
   */
  public async obtenerEstadosPasos(
    executionId: string
  ): Promise<Resultado<any[]>> {
    try {
      const states = await db.task_step_states
        .where("executionId")
        .equals(executionId)
        .toArray();
      return Resultado.exito(states);
    } catch (error) {
      return Resultado.falla(
        new ErrorDominio(
          error instanceof Error
            ? error.message
            : "Error al obtener estados de pasos."
        )
      );
    }
  }

  private reemplazarPlaceholders(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template;
    for (const key in variables) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
      result = result.replace(regex, variables[key]);
    }
    return result;
  }
}
