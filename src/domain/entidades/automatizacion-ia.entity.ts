import { z } from "zod";

// ============================================================================
// Estados del checkpoint de ejecución (task_execution_checkpoints.estadoCheckpoint)
// ============================================================================
export const ESTADOS_CHECKPOINT = [
  "IDLE",
  "IN_PROGRESS_AI",
  "QA_VALIDATING",
  "QA_RETRYING",
  "BLOQUEADO_ACCION_CRITICA", // pausa: no se puede seguir hasta resolver algo manual
  "PAUSED_CHECKPOINT", // corte/error no recuperable automáticamente
  "COMPLETED_HANDOFF",
  "VERIFICADO_HUMANO",
] as const;
export type EstadoCheckpoint = (typeof ESTADOS_CHECKPOINT)[number];

// ============================================================================
// Catálogo de errores — mismo "idioma" entre el sistema y el agente de IA.
// Debe mantenerse en sincronía con el seed de la tabla catalogo_errores.
// ============================================================================
export const CATALOGO_ERRORES_SEED = [
  {
    codigo: "BUILD_FAILED",
    categoria: "verificacion",
    severidad: "alta",
    esRecuperable: true,
    accionSugerida: "Reintentar con el log de build como contexto adicional.",
  },
  {
    codigo: "LINT_FAILED",
    categoria: "verificacion",
    severidad: "media",
    esRecuperable: true,
    accionSugerida: "Reintentar con el log de lint como contexto adicional.",
  },
  {
    codigo: "TEST_FAILED",
    categoria: "verificacion",
    severidad: "alta",
    esRecuperable: true,
    accionSugerida: "Reintentar con el detalle del test fallido como contexto.",
  },
  {
    codigo: "VERIFICACION_INCONCLUSA",
    categoria: "verificacion",
    severidad: "media",
    esRecuperable: false,
    accionSugerida:
      "No hay comando de test configurado para esta capa: requiere revisión manual antes de dar el ticket por bueno.",
  },
  {
    codigo: "HANDOFF_INVALID_JSON",
    categoria: "contrato",
    severidad: "media",
    esRecuperable: true,
    accionSugerida:
      "Reintentar pidiendo el JSON exacto según el schema del contrato.",
  },
  {
    codigo: "SCOPE_BLOCKED_MODERADO",
    categoria: "alcance",
    severidad: "baja",
    esRecuperable: true,
    accionSugerida:
      "Continuar el desarrollo; queda una acción manual moderada pendiente para poder probar end-to-end.",
  },
  {
    codigo: "SCOPE_BLOCKED_CRITICO",
    categoria: "alcance",
    severidad: "critica",
    esRecuperable: false,
    accionSugerida:
      "Pausar el ticket hasta que el humano resuelva la acción manual crítica indicada.",
  },
  {
    codigo: "TOKEN_LIMIT_EXCEEDED",
    categoria: "recursos",
    severidad: "alta",
    esRecuperable: false,
    accionSugerida:
      "Créditos/tokens agotados a mitad de ejecución: el checkpoint queda resumible con el session id guardado.",
  },
  {
    codigo: "CLAUDE_CODE_INVOCATION_FAILED",
    categoria: "infraestructura",
    severidad: "alta",
    esRecuperable: true,
    accionSugerida:
      "No se pudo ejecutar el proceso de Claude Code (binario no encontrado, crash, timeout). Revisar claudeExecutable en runner.config.json y que el proceso pueda correr en esa ruta.",
  },
  {
    codigo: "MERGE_CONFLICT",
    categoria: "git",
    severidad: "alta",
    esRecuperable: false,
    accionSugerida:
      "Requiere resolución manual del conflicto antes de continuar.",
  },
  {
    codigo: "SYNC_FAILED",
    categoria: "infraestructura",
    severidad: "media",
    esRecuperable: true,
    accionSugerida:
      "Reintentar sincronización; no bloquea el desarrollo local.",
  },
] as const;

export type CodigoError = (typeof CATALOGO_ERRORES_SEED)[number]["codigo"];

// ============================================================================
// Acciones fuera del alcance de la IA — clasificadas en 2 niveles:
// moderada = no bloquea el desarrollo, crítica = bloquea hasta resolverse.
// ============================================================================
export const accionManualSchema = z.object({
  nivel: z.enum(["moderada", "critica"]),
  descripcion: z.string().min(1),
});
export type AccionManualRequerida = z.infer<typeof accionManualSchema>;

// ============================================================================
// Guía de pruebas manuales estandarizada — estructurada, no prosa libre, para
// que testear un ticket sea "seguir la receta" en vez de interpretar texto.
// ============================================================================
export const resultadoEsperadoSchema = z.object({
  descripcion: z.string().min(1),
  mensajeVisible: z.string().optional(),
  dondeVerificar: z.string().optional(),
  codigoHttpEsperado: z.number().optional(),
});
export type ResultadoEsperado = z.infer<typeof resultadoEsperadoSchema>;

export const guiaPruebasManualSchema = z.object({
  prerequisitos: z.array(z.string()).default([]),
  pasos: z.array(z.string().min(1)).min(1),
  datosPrueba: z.string().optional(),
  resultadoEsperado: resultadoEsperadoSchema,
});
export type GuiaPruebasManual = z.infer<typeof guiaPruebasManualSchema>;

// ============================================================================
// Desvíos del plan — cuando el agente hace algo distinto de lo que pedía el
// ticket porque considera que es mejor. Separado de la prosa del resumen
// técnico para que sea imposible que pase desapercibido en la revisión.
// ============================================================================
export const desvioPlanSchema = z.object({
  loQuePediaElTicket: z.string().min(1),
  loQueSeHizo: z.string().min(1),
  motivo: z.string().min(1),
});
export type DesvioPlan = z.infer<typeof desvioPlanSchema>;

// ============================================================================
// Contrato de Handoff — lo que el runner exige a Claude Code al cerrar un ticket.
// Reemplaza el JSON.parse libre anterior: valida forma antes de persistir.
// ============================================================================
export const handoffIASchema = z.object({
  archivos_creados_o_modificados: z.array(z.string().min(1)).min(1),
  firmas_o_contratos_exportados: z.array(z.string()).default([]),
  resumen_tecnico: z.string().min(1),
  resumen_negocio: z
    .string()
    .min(1, "Falta el resumen en lenguaje no técnico (Product Owner)."),
  guia_pruebas_manual: guiaPruebasManualSchema,
  acciones_manuales_requeridas: z.array(accionManualSchema).default([]),
  desvios_del_plan: z.array(desvioPlanSchema).default([]),
  /** Ruta del archivo creado en docs/pruebas_testeos/, si aplicaba crear uno. */
  archivo_prueba_creado: z.string().optional(),
  update_docs: z
    .object({
      schema: z.string().optional(),
      sitemap: z.string().optional(),
      roles: z.string().optional(),
      errors: z.string().optional(),
      seed: z.string().optional(),
      design: z.string().optional(),
    })
    .optional(),
});
export type HandoffIA = z.infer<typeof handoffIASchema>;

/**
 * Parsea y valida un handoff devuelto por la IA. No lanza: devuelve un
 * resultado discriminado para que el llamador decida cómo reaccionar
 * (reintentar con el detalle del error como contexto, marcar checkpoint, etc.)
 * en vez de un throw genérico como el JSON.parse crudo anterior.
 */
export function parseHandoffIA(
  raw: string
):
  | { ok: true; data: HandoffIA }
  | { ok: false; codigoError: "HANDOFF_INVALID_JSON"; detalle: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      ok: false,
      codigoError: "HANDOFF_INVALID_JSON",
      detalle: err instanceof Error ? err.message : "JSON malformado.",
    };
  }
  const result = handoffIASchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      codigoError: "HANDOFF_INVALID_JSON",
      detalle: result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  }
  return { ok: true, data: result.data };
}

// ============================================================================
// Checkpoint tipado (task_execution_checkpoints)
// ============================================================================
export interface TaskExecutionCheckpoint {
  id: string;
  taskExecutionId: string;
  actividadId: string;
  proyectoId: string;
  estadoCheckpoint: EstadoCheckpoint;
  ultimoErrorLogs?: string;
  ultimoPromptRefinamiento?: string;
  reintentosFallidos: number;
  commitShaBase?: string;
  commitShaError?: string;
  tokensInput?: number;
  tokensOutput?: number;
  costoUsd?: number;
  tiempoInicio?: number; // epoch ms (lado cliente)
  tiempoFin?: number; // epoch ms (lado cliente)
  claudeSessionId?: string;
  codigoError?: CodigoError;
  accionesManualesModeradas: AccionManualRequerida[];
  accionesManualesCriticas: AccionManualRequerida[];
  resumenNegocio?: string;
  guiaPruebasManual?: GuiaPruebasManual;
  // Fase 4: commit + push + PR automático al terminar el ticket.
  prUrl?: string;
  prEstado?: "creado" | "fallido";
  prError?: string;
  // Fase 4.1: desvíos del plan, archivo de pruebas, y gate de CI post-PR.
  desviosDelPlan?: DesvioPlan[];
  archivoPruebaPath?: string;
  ciEstado?: "paso" | "fallo" | "sin_ci";
  ciDetalle?: string;
  actualizadoEn: number;
}

// ============================================================================
// Config de automatización por proyecto (proyecto_config_automatizacion)
// ============================================================================
export interface ProyectoConfigAutomatizacion {
  proyectoId: string;
  buildCmd: string;
  lintCmd: string;
  testCmd: string;
  testUnitCmd?: string;
  testIntegrationCmd?: string;
  testE2eCmd?: string;
  maxRetriesLinter: number;
  maxLineasPorArchivo: number;
  allowedTools?: string[];
  deniedPaths?: string[];
  creadoEn: number;
  actualizadoEn: number;
}
