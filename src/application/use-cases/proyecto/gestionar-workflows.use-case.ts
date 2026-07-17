import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorDominio } from "../../../domain/errores/error-base";

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
    const commentId = `com_${Date.now()}`;
    try {
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
}
