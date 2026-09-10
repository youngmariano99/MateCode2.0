import Dexie, { Table } from "dexie";
import type {
  ProyectoConfigAutomatizacion,
  TaskExecutionCheckpoint,
} from "../../domain/entidades/automatizacion-ia.entity";
import { CATALOGO_ERRORES_SEED } from "../../domain/entidades/automatizacion-ia.entity";
import type {
  EtiquetaCatalogo,
  FichaDigital,
  FichaFisica,
  IntentoContacto,
  PotencialCliente,
} from "../../domain/entidades/contacto-frio.entity";
import {
  ETIQUETAS_DOLOR_DEFAULT,
  ETIQUETAS_RECHAZO_DEFAULT,
} from "../../domain/entidades/contacto-frio.entity";
import type {
  CatalogoKpiContenido,
  CicloSemanal,
  Contenido,
  IdeaContenido,
  PlantillaGuion,
} from "../../domain/entidades/contenido.entity";
import {
  KPIS_CONTENIDO_DEFAULT,
  SECCIONES_GUION_DEFAULT,
} from "../../domain/entidades/contenido.entity";
import type {
  InboxItem,
  TareaDiaria,
  TareaPendiente,
} from "../../domain/entidades/personal.entity";
import type { ObjetivoCuantificable } from "../../domain/entidades/objetivo-cuantificable.entity";
import type {
  HabitoDefinicion,
  HabitoRegistro,
} from "../../domain/entidades/habitos.entity";
import type { CatalogoEjercicio } from "../../domain/entidades/ejercicio.entity";
import { CATALOGO_EJERCICIOS_SEED } from "../../domain/entidades/ejercicio-catalogo-seed";
import type {
  PlantillaRutina,
  BloqueEntrenamiento,
} from "../../domain/entidades/rutina.entity";
import type { RegistroActividad } from "../../domain/entidades/registro-actividad.entity";

export interface CatalogoErrorRow {
  codigo: string;
  categoria: string;
  severidad: "baja" | "media" | "alta" | "critica";
  esRecuperable: boolean;
  accionSugerida?: string;
  creadoEn: number;
}

export interface EventoPendiente {
  id?: number;
  tabla: string;
  accion: "crear" | "editar" | "eliminar";
  registroId: string;
  payload: Record<string, unknown>;
  fecha: number;
  intentos?: number;
  ultimoError?: string;
  ultimoIntentoEn?: number;
}

export interface LogSincronizacion {
  id?: number;
  tipo: "inicio" | "exito" | "error" | "conflicto";
  mensaje: string;
  fecha: number;
}

export class MateCodeDB extends Dexie {
  public clientes!: Table<Record<string, unknown>, string>;
  public contactos!: Table<Record<string, unknown>, string>;
  public contratos!: Table<Record<string, unknown>, string>;
  public pagos!: Table<Record<string, unknown>, string>;
  public proyectos!: Table<Record<string, unknown>, string>;
  public tareas!: Table<Record<string, unknown>, string>;
  public documentos!: Table<Record<string, unknown>, string>;
  public recorridos!: Table<Record<string, unknown>, string>;
  public visitas!: Table<Record<string, unknown>, string>;
  public epicas!: Table<Record<string, unknown>, string>;
  public historias!: Table<Record<string, unknown>, string>;
  public sprints!: Table<Record<string, unknown>, string>;
  public cola_eventos!: Table<EventoPendiente, number>;
  public logs_sincronizacion!: Table<LogSincronizacion, number>;

  public potenciales_clientes!: Table<Record<string, unknown>, string>;

  // Content planner tables (histórico, ver contenido/idea_contenido/ciclo_semanal)
  public planificaciones_contenido!: Table<Record<string, unknown>, string>;
  public contenidos!: Table<Record<string, unknown>, string>;

  // Project support tables
  public comentarios_proyecto!: Table<Record<string, unknown>, string>;
  public archivos_proyecto!: Table<Record<string, unknown>, string>;
  public plantillas_backlog!: Table<Record<string, unknown>, string>;

  // Sprint 14 tables
  public prompt_templates!: Table<Record<string, unknown>, string>;
  public proyecto_contexto!: Table<Record<string, unknown>, string>;
  public proyecto_design_system!: Table<Record<string, unknown>, string>;
  public proyecto_estado_tecnico!: Table<Record<string, unknown>, string>;
  public agencia_config!: Table<Record<string, unknown>, string>;

  // Prompt Workshop / Development Workflows tables (Version 10)
  public workflow_templates!: Table<Record<string, unknown>, string>;
  public workflow_steps!: Table<Record<string, unknown>, string>;
  public task_executions!: Table<Record<string, unknown>, string>;
  public task_step_states!: Table<Record<string, unknown>, string>;
  public task_comments!: Table<Record<string, unknown>, string>;
  public actas_auditoria!: Table<Record<string, unknown>, number>;

  // Automatización de ejecución con IA (Fase 0/1)
  public proyecto_config_automatizacion!: Table<
    ProyectoConfigAutomatizacion,
    string
  >;
  public task_execution_checkpoints!: Table<TaskExecutionCheckpoint, string>;
  public catalogo_errores!: Table<CatalogoErrorRow, string>;

  // Contacto en frío — rediseño (Fase 4.2): reemplaza potenciales_clientes.
  public potencial_cliente!: Table<PotencialCliente, string>;
  public ficha_digital!: Table<FichaDigital, string>;
  public ficha_fisica!: Table<FichaFisica, string>;
  public intento_contacto!: Table<IntentoContacto, string>;
  public catalogo_etiquetas!: Table<EtiquetaCatalogo, string>;

  // Planificador de Contenido — rediseño (Fase 5.1): reemplaza
  // planificaciones_contenido/contenidos.
  public ciclo_semanal!: Table<CicloSemanal, string>;
  public idea_contenido!: Table<IdeaContenido, string>;
  public plantilla_guion!: Table<PlantillaGuion, string>;
  public contenido!: Table<Contenido, string>;
  public catalogo_kpi_contenido!: Table<CatalogoKpiContenido, string>;

  // Segundo Cerebro (área Personal) — Bloque A
  public inbox_item!: Table<InboxItem, string>;
  public tarea_diaria!: Table<TareaDiaria, string>;
  public tarea_pendiente!: Table<TareaPendiente, string>;
  public objetivo_cuantificable!: Table<ObjetivoCuantificable, string>;
  public habito_definicion!: Table<HabitoDefinicion, string>;
  public habito_registro!: Table<HabitoRegistro, string>;
  public catalogo_ejercicio!: Table<CatalogoEjercicio, string>;
  public plantilla_rutina!: Table<PlantillaRutina, string>;
  public bloque_entrenamiento!: Table<BloqueEntrenamiento, string>;
  public registro_actividad!: Table<RegistroActividad, string>;

  constructor() {
    super("MateCodeLocalDB");

    const defaultTemplates = [
      {
        id: "pt_arquetipo_frontend",
        fase: "Arquitectura",
        titulo: "Generador de UI y Componentes Frontend",
        contenido:
          "Actúa como un Diseñador UI/UX y Desarrollador Frontend Senior. Necesito que diseñes los componentes visuales para un proyecto que resuelve los dolores: {{dolores_cliente}}.\n\nESTILO VISUAL (DESIGN SYSTEM):\n- Arquetipo: {{arquetipo}}\n- Metáfora: {{metafora}}\n- Radio de Bordes: {{radio_bordes}}\n- Uso de Sombras: {{sombras}}\n- Directrices estrictas: {{directrices_diseno}}\n- Escala de Espaciado: {{escala_espaciado}}\n- Reglas de Color: {{reglas_color}}\n- Tipografía recomendada: {{tipografias}}\n- Animaciones: {{animaciones}}\n\nSTACK DE DESARROLLO:\n- Frontend: {{stack_frontend}}\n\nImplementa código React limpio y accesible, evitando estilos genéricos.",
        variables_requeridas: [
          "dolores_cliente",
          "arquetipo",
          "metafora",
          "radio_bordes",
          "sombras",
          "directrices_diseno",
          "escala_espaciado",
          "reglas_color",
          "tipografias",
          "animaciones",
          "stack_frontend",
        ],
      },
      {
        id: "pt_arquitectura_backend",
        fase: "Arquitectura",
        titulo: "Definición del Schema y Reglas del Backend",
        contenido:
          "Actúa como un Arquitecto de Software Principal. Diseña la estructura del backend y base de datos para resolver el problema del proyecto con las reglas de negocio:\n{{reglas_negocio}}\n\nESTADO TÉCNICO:\n- Stack Backend: {{stack_backend}}\n- Base de Datos: {{stack_base_datos}}\n- Patrones y Arquitectura: {{arquitectura_patrones}}\n\nGenera el esquema SQL, estructura de carpetas y middleware de seguridad.",
        variables_requeridas: [
          "reglas_negocio",
          "stack_backend",
          "stack_base_datos",
          "arquitectura_patrones",
        ],
      },
      {
        id: "pt_planificacion_backlog",
        fase: "Planificacion",
        titulo: "Autocompletar Backlog de Tareas Técnicas",
        contenido:
          "Actúa como Product Owner y Scrum Master. Analiza los dolores del cliente: {{dolores_cliente}} y las siguientes reglas de negocio: {{reglas_negocio}}.\n\nGenera la lista de historias técnicas y tareas para el backlog basándote en el stack: {{stack_frontend}}, {{stack_backend}}, {{stack_base_datos}}.",
        variables_requeridas: [
          "dolores_cliente",
          "reglas_negocio",
          "stack_frontend",
          "stack_backend",
          "stack_base_datos",
        ],
      },
    ];

    const defaultWorkflows = [
      {
        id: "wt_feature",
        nombre: "Desarrollo de Feature Nueva",
        descripcion:
          "Flujo estándar para implementar nuevas características de software.",
        fase: "Desarrollo",
      },
      {
        id: "wt_fix",
        nombre: "Corrección de Bug (Bugfix)",
        descripcion:
          "Procedimiento estructurado para diagnosticar y solucionar errores.",
        fase: "Desarrollo",
      },
      {
        id: "wt_testing",
        nombre: "Aseguramiento de Calidad (Testing)",
        descripcion:
          "Procedimientos de pruebas unitarias, de integración y extremo a extremo.",
        fase: "Testing",
      },
    ];

    const defaultSteps = [
      // Feature Steps
      {
        id: "ws_feat_1",
        templateId: "wt_feature",
        titulo: "Crear rama local",
        descripcion:
          "Crea una rama git local siguiendo la convención: feature/nombre-de-feature.",
        tipo: "manual",
        orden: 1,
      },
      {
        id: "ws_feat_2",
        templateId: "wt_feature",
        titulo: "Compilar y Exportar Prompt de Código",
        descripcion:
          "Genera el prompt consolidado con el briefing, estándares y directrices para enviarle a Claude.",
        tipo: "prompt",
        promptTemplate:
          "Eres un desarrollador Fullstack Senior. Tu tarea es implementar la siguiente feature:\n\n{{especificacion_tarea}}\n\nCONTEXTO GENERAL DEL PROYECTO:\n- Briefing: {{dolores_cliente}}\n- Stack: {{stack_frontend}}, {{stack_backend}}, {{stack_base_datos}}\n- Reglas de negocio: {{reglas_negocio}}\n- Estética: {{arquetipo}} (Metáfora: {{metafora}})\n\nEstándares y restricciones:\n{{estandares_codigo}}\n\nGenera el código production-ready limpio y tipado.",
        orden: 2,
      },
      {
        id: "ws_feat_3",
        templateId: "wt_feature",
        titulo: "Aplicar e integrar código",
        descripcion:
          "Aplica el código generado por la IA en tu editor de código local.",
        tipo: "manual",
        orden: 3,
      },
      {
        id: "ws_feat_4",
        templateId: "wt_feature",
        titulo: "Pruebas unitarias de feature",
        descripcion:
          "Escribe y ejecuta pruebas unitarias asegurando cobertura de código adecuada.",
        tipo: "manual",
        orden: 4,
      },
      {
        id: "ws_feat_5",
        templateId: "wt_feature",
        titulo: "Crear Pull Request",
        descripcion:
          "Crea la solicitud de PR describiendo los cambios y vinculando la historia correspondiente.",
        tipo: "manual",
        orden: 5,
      },

      // Fix Steps
      {
        id: "ws_fix_1",
        templateId: "wt_fix",
        titulo: "Crear rama bugfix local",
        descripcion:
          "Crea una rama git local siguiendo la convención: bugfix/nombre-de-error.",
        tipo: "manual",
        orden: 1,
      },
      {
        id: "ws_fix_2",
        templateId: "wt_fix",
        titulo: "Recopilar logs y reproducir error",
        descripcion:
          "Obtén los logs de consola o trazas del error en tu entorno local.",
        tipo: "manual",
        orden: 2,
      },
      {
        id: "ws_fix_3",
        templateId: "wt_fix",
        titulo: "Exportar Prompt de Solución de Bug",
        tipo: "prompt",
        promptTemplate:
          "Eres un Ingeniero de Confiabilidad de Software. Corrige el siguiente bug:\n\nDETALLES DEL ERROR:\n{{especificacion_tarea}}\n\nCONTEXTO:\n- Stack: {{stack_frontend}}, {{stack_backend}}\n- Base de datos: {{stack_base_datos}}\n\nAnaliza la causa raíz y provee una solución elegante sin efectos colaterales.",
        descripcion:
          "Genera el prompt consolidado con los detalles del error e inyección de contexto para Claude.",
        orden: 3,
      },
      {
        id: "ws_fix_4",
        templateId: "wt_fix",
        titulo: "Pruebas de regresión",
        descripcion:
          "Prueba la corrección de forma local asegurando que el error no se repita y no rompa otras partes del sistema.",
        tipo: "manual",
        orden: 4,
      },
      {
        id: "ws_fix_5",
        templateId: "wt_fix",
        titulo: "Consolidar corrección",
        descripcion:
          "Sube tu rama y documenta brevemente la solución en tu bitácora.",
        tipo: "manual",
        orden: 5,
      },

      // Testing Steps
      {
        id: "ws_test_1",
        templateId: "wt_testing",
        titulo: "Generar Unit Tests",
        descripcion:
          "Genera pruebas unitarias automatizadas para los componentes React o controladores backend.",
        tipo: "prompt",
        promptTemplate:
          "Genera unit tests exhaustivos usando Jest/Node-Test para la siguiente implementación:\n\n{{especificacion_tarea}}\n\nStack: {{stack_frontend}}, {{stack_backend}}",
        orden: 1,
      },
      {
        id: "ws_test_2",
        templateId: "wt_testing",
        titulo: "Generar Integration Tests",
        descripcion:
          "Genera pruebas de integración para flujos o servicios que involucren base de datos.",
        tipo: "prompt",
        promptTemplate:
          "Genera pruebas de integración conectándose a la base de datos ({{stack_base_datos}}):\n\n{{especificacion_tarea}}",
        orden: 2,
      },
      {
        id: "ws_test_3",
        templateId: "wt_testing",
        titulo: "Pruebas E2E manuales o automatizadas",
        descripcion:
          "Valida de punta a punta que la funcionalidad se comporte correctamente desde la perspectiva del usuario final.",
        tipo: "manual",
        orden: 3,
      },
    ];

    // Previous versions kept for backward migrations
    this.version(6).stores({
      clientes: "id, nombre, correo",
      contactos: "id, nombre, clienteId",
      contratos: "id, codigo, clienteId",
      pagos: "id, codigo, contratoId",
      proyectos: "id, nombre, clienteId",
      tareas: "id, proyectoId, estado",
      documentos: "id, titulo, tipo, clienteId",
      recorridos: "id, fecha",
      visitas: "id, clienteId, recorridoId",
      epicas: "id, proyectoId",
      historias: "id, proyectoId, epicaId, sprintId, estado",
      sprints: "id, proyectoId, estado",
      cola_eventos: "++id, tabla, accion, registroId",
      logs_sincronizacion: "++id, tipo, fecha",
      potenciales_clientes: "id, nombre, visitado, convertido, creadoEn",
    });

    this.version(7).stores({
      clientes: "id, nombre, correo",
      contactos: "id, nombre, clienteId",
      contratos: "id, codigo, clienteId",
      pagos: "id, codigo, contratoId",
      proyectos: "id, nombre, clienteId",
      tareas: "id, proyectoId, estado",
      documentos: "id, titulo, tipo, clienteId",
      recorridos: "id, fecha",
      visitas: "id, clienteId, recorridoId",
      epicas: "id, proyectoId",
      historias: "id, proyectoId, epicaId, sprintId, estado",
      sprints: "id, proyectoId, estado",
      cola_eventos: "++id, tabla, accion, registroId",
      logs_sincronizacion: "++id, tipo, fecha",
      potenciales_clientes: "id, nombre, visitado, convertido, creadoEn",
      comentarios_proyecto: "id, proyectoId, creadoEn",
      archivos_proyecto: "id, proyectoId, creadoEn",
      plantillas_backlog: "id, nombre",
    });

    this.version(8)
      .stores({
        clientes: "id, nombre, correo",
        contactos: "id, nombre, clienteId",
        contratos: "id, codigo, clienteId",
        pagos: "id, codigo, contratoId",
        proyectos: "id, nombre, clienteId",
        tareas: "id, proyectoId, estado",
        documentos: "id, titulo, tipo, clienteId",
        recorridos: "id, fecha",
        visitas: "id, clienteId, recorridoId",
        epicas: "id, proyectoId",
        historias: "id, proyectoId, epicaId, sprintId, estado",
        sprints: "id, proyectoId, estado",
        cola_eventos: "++id, tabla, accion, registroId",
        logs_sincronizacion: "++id, tipo, fecha",
        potenciales_clientes: "id, nombre, visitado, convertido, creadoEn",
        comentarios_proyecto: "id, proyectoId, creadoEn",
        archivos_proyecto: "id, proyectoId, creadoEn",
        plantillas_backlog: "id, nombre",
        prompt_templates: "id, fase",
        proyecto_contexto: "proyectoId",
        proyecto_design_system: "proyectoId",
        proyecto_estado_tecnico: "proyectoId",
      })
      .upgrade(async (tx) => {
        await tx.table("prompt_templates").bulkPut(defaultTemplates);
      });

    this.version(9).stores({
      clientes: "id, nombre, correo",
      contactos: "id, nombre, clienteId",
      contratos: "id, codigo, clienteId",
      pagos: "id, codigo, contratoId",
      proyectos: "id, nombre, clienteId",
      tareas: "id, proyectoId, estado",
      documentos: "id, titulo, tipo, clienteId",
      recorridos: "id, fecha",
      visitas: "id, clienteId, recorridoId",
      epicas: "id, proyectoId",
      historias: "id, proyectoId, epicaId, sprintId, estado",
      sprints: "id, proyectoId, estado",
      cola_eventos: "++id, tabla, accion, registroId",
      logs_sincronizacion: "++id, tipo, fecha",
      potenciales_clientes: "id, nombre, visitado, convertido, creadoEn",
      comentarios_proyecto: "id, proyectoId, creadoEn",
      archivos_proyecto: "id, proyectoId, creadoEn",
      plantillas_backlog: "id, nombre",
      prompt_templates: "id, fase",
      proyecto_contexto: "proyectoId",
      proyecto_design_system: "proyectoId",
      proyecto_estado_tecnico: "proyectoId",
      agencia_config: "id",
    });

    // Version 10 stores
    this.version(10)
      .stores({
        clientes: "id, nombre, correo",
        contactos: "id, nombre, clienteId",
        contratos: "id, codigo, clienteId",
        pagos: "id, codigo, contratoId",
        proyectos: "id, nombre, clienteId",
        tareas: "id, proyectoId, estado",
        documentos: "id, titulo, tipo, clienteId",
        recorridos: "id, fecha",
        visitas: "id, clienteId, recorridoId",
        epicas: "id, proyectoId",
        historias: "id, proyectoId, epicaId, sprintId, estado",
        sprints: "id, proyectoId, estado",
        cola_eventos: "++id, tabla, accion, registroId",
        logs_sincronizacion: "++id, tipo, fecha",
        potenciales_clientes: "id, nombre, visitado, convertido, creadoEn",
        comentarios_proyecto: "id, proyectoId, creadoEn",
        archivos_proyecto: "id, proyectoId, creadoEn",
        plantillas_backlog: "id, nombre",
        prompt_templates: "id, fase",
        proyecto_contexto: "proyectoId",
        proyecto_design_system: "proyectoId",
        proyecto_estado_tecnico: "proyectoId",
        agencia_config: "id",
        workflow_templates: "id, nombre, fase",
        workflow_steps: "id, templateId, orden",
        task_executions:
          "id, proyectoId, templateId, estado, usuarioAsignadoId",
        task_step_states: "id, executionId, stepId",
        task_comments: "id, executionId, stepId, creadoEn",
        actas_auditoria: "++id, executionId, tipoEvento, fecha",
      })
      .upgrade(async (tx) => {
        await tx.table("workflow_templates").bulkPut(defaultWorkflows);
        await tx.table("workflow_steps").bulkPut(defaultSteps);
      });

    // Version 11 stores
    this.version(11)
      .stores({
        clientes: "id, nombre, correo",
        contactos: "id, nombre, clienteId",
        contratos: "id, codigo, clienteId",
        pagos: "id, codigo, contratoId",
        proyectos: "id, nombre, clienteId",
        tareas: "id, proyectoId, estado",
        documentos: "id, titulo, tipo, clienteId",
        recorridos: "id, fecha",
        visitas: "id, clienteId, recorridoId",
        epicas: "id, proyectoId",
        historias: "id, proyectoId, epicaId, sprintId, estado",
        sprints: "id, proyectoId, estado",
        cola_eventos: "++id, tabla, accion, registroId",
        logs_sincronizacion: "++id, tipo, fecha",
        potenciales_clientes:
          "id, nombre, visitado, convertido, creadoEn, sesionId, estadoOutbound",
        comentarios_proyecto: "id, proyectoId, creadoEn",
        archivos_proyecto: "id, proyectoId, creadoEn",
        plantillas_backlog: "id, nombre",
        prompt_templates: "id, fase",
        proyecto_contexto: "proyectoId",
        proyecto_design_system: "proyectoId",
        proyecto_estado_tecnico: "proyectoId",
        agencia_config: "id",
        workflow_templates: "id, nombre, fase",
        workflow_steps: "id, templateId, orden",
        task_executions:
          "id, proyectoId, templateId, estado, usuarioAsignadoId",
        task_step_states: "id, executionId, stepId",
        task_comments: "id, executionId, stepId, creadoEn",
        actas_auditoria: "++id, executionId, tipoEvento, fecha",
        // New CRM tables for cold outreach
        contacto_sesiones: "id, nombre, creadoEn, estado",
        servicios_agencia: "id, nombre",
        reuniones_contacto: "id, prospectoId, tipo, fecha, completado",
      })
      .upgrade(async (tx) => {
        const defaultServices = [
          {
            id: "serv_web_corp",
            nombre: "Sitio Web Corporativo",
            precio: 1200,
            descripcion: "Sitio institucional premium",
          },
          {
            id: "serv_ecommerce",
            nombre: "Tienda Online / E-Commerce",
            precio: 2200,
            descripcion: "Tienda integrada con pasarela de pagos",
          },
          {
            id: "serv_pwa",
            nombre: "PWA Custom App",
            precio: 3500,
            descripcion: "Aplicación Web Progresiva a medida",
          },
          {
            id: "serv_landing",
            nombre: "Landing Page de Alta Conversión",
            precio: 600,
            descripcion: "Diseño brutalista enfocado a ventas",
          },
        ];
        await tx.table("servicios_agencia").bulkPut(defaultServices);
      });

    // Version 12 stores (Indexed tipo in agencia_config)
    this.version(12).stores({
      clientes: "id, nombre, correo",
      contactos: "id, nombre, clienteId",
      contratos: "id, codigo, clienteId",
      pagos: "id, codigo, contratoId",
      proyectos: "id, nombre, clienteId",
      tareas: "id, proyectoId, estado",
      documentos: "id, titulo, tipo, clienteId",
      recorridos: "id, fecha",
      visitas: "id, clienteId, recorridoId",
      epicas: "id, proyectoId",
      historias: "id, proyectoId, epicaId, sprintId, estado",
      sprints: "id, proyectoId, estado",
      cola_eventos: "++id, tabla, accion, registroId",
      logs_sincronizacion: "++id, tipo, fecha",
      potenciales_clientes:
        "id, nombre, visitado, convertido, creadoEn, sesionId, estadoOutbound",
      comentarios_proyecto: "id, proyectoId, creadoEn",
      archivos_proyecto: "id, proyectoId, creadoEn",
      plantillas_backlog: "id, nombre",
      prompt_templates: "id, fase",
      proyecto_contexto: "proyectoId",
      proyecto_design_system: "proyectoId",
      proyecto_estado_tecnico: "proyectoId",
      agencia_config: "id, tipo",
      workflow_templates: "id, nombre, fase",
      workflow_steps: "id, templateId, orden",
      task_executions: "id, proyectoId, templateId, estado, usuarioAsignadoId",
      task_step_states: "id, executionId, stepId",
      task_comments: "id, executionId, stepId, creadoEn",
      actas_auditoria: "++id, executionId, tipoEvento, fecha",
      contacto_sesiones: "id, nombre, creadoEn, estado",
      servicios_agencia: "id, nombre",
      reuniones_contacto: "id, prospectoId, tipo, fecha, completado",
    });

    // Version 13 stores (Content Planner tables)
    this.version(13).stores({
      clientes: "id, nombre, correo",
      contactos: "id, nombre, clienteId",
      contratos: "id, codigo, clienteId",
      pagos: "id, codigo, contratoId",
      proyectos: "id, nombre, clienteId",
      tareas: "id, proyectoId, estado",
      documentos: "id, titulo, tipo, clienteId",
      recorridos: "id, fecha",
      visitas: "id, clienteId, recorridoId",
      epicas: "id, proyectoId",
      historias: "id, proyectoId, epicaId, sprintId, estado",
      sprints: "id, proyectoId, estado",
      cola_eventos: "++id, tabla, accion, registroId",
      logs_sincronizacion: "++id, tipo, fecha",
      potenciales_clientes:
        "id, nombre, visitado, convertido, creadoEn, sesionId, estadoOutbound",
      comentarios_proyecto: "id, proyectoId, creadoEn",
      archivos_proyecto: "id, proyectoId, creadoEn",
      plantillas_backlog: "id, nombre",
      prompt_templates: "id, fase",
      proyecto_contexto: "proyectoId",
      proyecto_design_system: "proyectoId",
      proyecto_estado_tecnico: "proyectoId",
      agencia_config: "id, tipo",
      workflow_templates: "id, nombre, fase",
      workflow_steps: "id, templateId, orden",
      task_executions: "id, proyectoId, templateId, estado, usuarioAsignadoId",
      task_step_states: "id, executionId, stepId",
      task_comments: "id, executionId, stepId, creadoEn",
      actas_auditoria: "++id, executionId, tipoEvento, fecha",
      contacto_sesiones: "id, nombre, creadoEn, estado",
      servicios_agencia: "id, nombre",
      planificaciones_contenido: "id, fechaInicio, fechaFin",
      contenidos: "id, planificacionId, estado, fecha",
    });

    // Version 14 stores (Automation and checkpoint support)
    this.version(14).stores({
      clientes: "id, nombre, correo",
      contactos: "id, nombre, clienteId",
      contratos: "id, codigo, clienteId",
      pagos: "id, codigo, contratoId",
      proyectos: "id, nombre, clienteId",
      tareas: "id, proyectoId, estado",
      documentos: "id, titulo, tipo, clienteId",
      recorridos: "id, fecha",
      visitas: "id, clienteId, recorridoId",
      epicas: "id, proyectoId",
      historias: "id, proyectoId, epicaId, sprintId, estado",
      sprints: "id, proyectoId, estado",
      cola_eventos: "++id, tabla, accion, registroId",
      logs_sincronizacion: "++id, tipo, fecha",
      potenciales_clientes:
        "id, nombre, visitado, convertido, creadoEn, sesionId, estadoOutbound",
      comentarios_proyecto: "id, proyectoId, creadoEn",
      archivos_proyecto: "id, proyectoId, creadoEn",
      plantillas_backlog: "id, nombre",
      prompt_templates: "id, fase",
      proyecto_contexto: "proyectoId",
      proyecto_design_system: "proyectoId",
      proyecto_estado_tecnico: "proyectoId",
      agencia_config: "id, tipo",
      workflow_templates: "id, nombre, fase",
      workflow_steps: "id, templateId, orden",
      task_executions: "id, proyectoId, templateId, estado, usuarioAsignadoId",
      task_step_states: "id, executionId, stepId",
      task_comments: "id, executionId, stepId, creadoEn",
      actas_auditoria: "++id, executionId, tipoEvento, fecha",
      contacto_sesiones: "id, nombre, creadoEn, estado",
      servicios_agencia: "id, nombre",
      reuniones_contacto: "id, prospectoId, tipo, fecha, completado",
      planificaciones_contenido: "id, fechaInicio, fechaFin",
      contenidos: "id, planificacionId, estado, fecha",
      proyecto_config_automatizacion: "proyectoId",
      task_execution_checkpoints:
        "id, taskExecutionId, actividadId, proyectoId, estadoCheckpoint",
    });

    // Version 15: catálogo de errores compartido (Fase 1 de automatización IA)
    this.version(15).stores({
      catalogo_errores: "codigo, categoria, severidad",
    });

    // Version 16: rediseño de Contacto en Frío (Fase 4.2). Reemplaza el
    // "cajón de sastre" potenciales_clientes (~40 campos sin schema, 3
    // sistemas paralelos con vocabularios de estado distintos) por un modelo
    // único: núcleo mínimo + fichas opcionales (digital/física) + historial
    // real de intentos de contacto. potenciales_clientes se conserva sin
    // tocar hasta confirmar que la migración salió bien.
    this.version(16)
      .stores({
        potencial_cliente: "id, estado, rubro, fechaUltimoContacto, creadoEn",
        ficha_digital: "potencialClienteId",
        ficha_fisica: "potencialClienteId, visitado",
        intento_contacto: "id, potencialClienteId, fecha",
        catalogo_etiquetas: "id, categoria",
      })
      .upgrade(async (tx) => {
        const ahora = Date.now();
        const etiquetasSeed = [
          ...ETIQUETAS_DOLOR_DEFAULT,
          ...ETIQUETAS_RECHAZO_DEFAULT,
        ].map((e) => ({ ...e, creadoEn: ahora }));
        await tx.table("catalogo_etiquetas").bulkPut(etiquetasSeed);

        const canalesValidos = [
          "Instagram",
          "WhatsApp",
          "Email",
          "Facebook",
          "Presencial",
        ];
        /* eslint-disable @typescript-eslint/no-explicit-any -- migración
           lee la tabla vieja sin schema (Record<string, unknown>), tipar
           cada campo acá sería más ruido que valor para código que corre
           una sola vez por instalación. */
        const viejos = (await tx
          .table("potenciales_clientes")
          .toArray()) as any[];
        const nuevosPotenciales: any[] = [];
        const nuevasFichasDigitales: any[] = [];
        const nuevasFichasFisicas: any[] = [];
        const nuevosIntentos: any[] = [];
        /* eslint-enable @typescript-eslint/no-explicit-any */

        for (const p of viejos) {
          const fueContactadoDigital =
            !!p.estadoOutbound && p.estadoOutbound !== "Por Contactar";
          const fueContactadoTerritorio =
            !!p.estadoContacto && p.estadoContacto !== "Pendiente";
          const esHistoricoLegacy =
            fueContactadoDigital || fueContactadoTerritorio;

          let estado = "Nuevo";
          if (
            p.estadoOutbound === "Rechazado" ||
            p.estadoContacto === "Sin Interés"
          ) {
            estado = "Rechazado";
          } else if (p.estadoOutbound === "Aceptado") {
            estado = "Cliente Cerrado";
          } else if (p.estadoOutbound === "Reunión / Loom") {
            estado = "Demo Enviada";
          } else if (esHistoricoLegacy) {
            estado = "Contactado";
          }

          nuevosPotenciales.push({
            id: p.id,
            nombre: p.nombre,
            rubro: p.rubro || p.nombreNegocio || undefined,
            prioridad: p.prioridad || "Media",
            estado,
            fechaUltimoContacto: p.fechaUltimoContacto || undefined,
            esHistoricoLegacy,
            creadoEn: p.creadoEn || ahora,
            actualizadoEn: p.actualizadoEn || ahora,
          });

          if (
            p.instagram ||
            p.whatsapp ||
            p.email ||
            p.facebook ||
            p.dolorDetectado ||
            p.ganchoEmpatico
          ) {
            nuevasFichasDigitales.push({
              potencialClienteId: p.id,
              instagram: p.instagram || "",
              whatsapp: p.whatsapp || "",
              email: p.email || "",
              facebook: p.facebook || "",
              nombreDueño: "",
              dolorTags: [],
              tieneWeb: "no",
              usaCatalogoNativoWhatsapp: false,
              notasExtra: [
                p.dolorDetectado,
                p.ganchoEmpatico,
                p.canalVentaActual,
              ]
                .filter(Boolean)
                .join(" | "),
              referenciaPosteo: "",
              actualizadoEn: p.actualizadoEn || ahora,
            });
          }

          if (p.direccionCalle || p.latitud || p.visitado) {
            nuevasFichasFisicas.push({
              potencialClienteId: p.id,
              direccionCalle: p.direccionCalle || "",
              direccionCiudad: p.direccionCiudad || "",
              direccionProvincia: p.direccionProvincia || "",
              latitud: p.latitud,
              longitud: p.longitud,
              visitado: !!p.visitado,
              motivoNoVisita: p.motivoNoVisita || "",
              volverFecha: p.volverFecha || undefined,
              actualizadoEn: p.actualizadoEn || ahora,
            });
          }

          if (esHistoricoLegacy) {
            nuevosIntentos.push({
              id: `int_legacy_${p.id}`,
              potencialClienteId: p.id,
              fecha: p.fechaUltimoContacto || p.actualizadoEn || ahora,
              canal: canalesValidos.includes(p.ultimoCanalContacto)
                ? p.ultimoCanalContacto
                : "Instagram",
              mensajeEnviado: p.pitch || "",
              resultado: estado === "Rechazado" ? "Rechazó" : "Sin respuesta",
              respuestaTexto: p.notasContacto || p.motivoRechazo || "",
              tagsResultado: [],
              creadoEn: ahora,
            });
          }
        }

        if (nuevosPotenciales.length)
          await tx.table("potencial_cliente").bulkPut(nuevosPotenciales);
        if (nuevasFichasDigitales.length)
          await tx.table("ficha_digital").bulkPut(nuevasFichasDigitales);
        if (nuevasFichasFisicas.length)
          await tx.table("ficha_fisica").bulkPut(nuevasFichasFisicas);
        if (nuevosIntentos.length)
          await tx.table("intento_contacto").bulkPut(nuevosIntentos);
      });

    // Version 17: rediseño del Planificador de Contenido (Fase 5.1).
    // Reemplaza planificaciones_contenido/contenidos (ideas embebidas en un
    // array del plan, sin capa de dominio) por: ciclo_semanal, idea_contenido
    // (tabla propia, ya no huérfana si el plan se cierra), plantilla_guion
    // (estructura de secciones dinámica vía JSON/JSONB) y contenido.
    this.version(17)
      .stores({
        ciclo_semanal: "id, fechaInicio, estado",
        idea_contenido: "id, estado, cicloId",
        plantilla_guion: "id, activa",
        contenido: "id, cicloId, estado, tipoContenido",
        catalogo_kpi_contenido: "id, esDelUsuario",
      })
      .upgrade(async (tx) => {
        const ahora = Date.now();

        await tx.table("plantilla_guion").add({
          id: "plantilla_default",
          nombre: "Estructura estándar",
          secciones: SECCIONES_GUION_DEFAULT,
          activa: true,
          creadoEn: ahora,
        });
        await tx
          .table("catalogo_kpi_contenido")
          .bulkPut(
            KPIS_CONTENIDO_DEFAULT.map((k) => ({ ...k, creadoEn: ahora }))
          );

        const tipoValido = (t: string): string =>
          ["Video", "Post", "Carrusel", "Historia"].includes(t) ? t : "Video";
        const estadoNuevo = (e: string): string =>
          e === "Subido"
            ? "Publicado"
            : e === "Grabado" || e === "Editado"
              ? "Producción"
              : "Guion";
        const aEpoch = (fecha: string): number | undefined => {
          if (!fecha) return undefined;
          const t = new Date(fecha).getTime();
          return isNaN(t) ? undefined : t;
        };

        /* eslint-disable @typescript-eslint/no-explicit-any -- migración lee
           las tablas viejas sin schema (Record<string, unknown>). */
        const planesViejos = (await tx
          .table("planificaciones_contenido")
          .toArray()) as any[];
        const contenidosViejos = (await tx
          .table("contenidos")
          .toArray()) as any[];

        const nuevosCiclos: any[] = [];
        const nuevasIdeas: any[] = [];
        for (const plan of planesViejos) {
          nuevosCiclos.push({
            id: plan.id,
            fechaInicio: aEpoch(plan.fechaInicio) || ahora,
            objetivoVideos: 6,
            estado: "cerrado",
            creadoEn: plan.creadoEn || ahora,
          });
          for (const idea of plan.ideas || []) {
            nuevasIdeas.push({
              id: idea.id,
              texto: idea.texto || "",
              estado: "Backlog",
              cicloId: plan.id,
              creadoEn: plan.creadoEn || ahora,
            });
          }
        }

        const nuevosContenidos: any[] = (contenidosViejos as any[]).map(
          (c) => ({
            id: c.id,
            ideaId: c.ideaId || undefined,
            cicloId:
              c.planificacionId && c.planificacionId !== "backlog"
                ? c.planificacionId
                : undefined,
            titulo: c.titulo || "",
            tipoContenido: tipoValido((c.tipos && c.tipos[0]) || "Video"),
            canales: c.canales || [],
            estado: estadoNuevo(c.estado || "Planificado"),
            guion: {
              gancho: c.gancho || "",
              desarrollo: c.desarrollo || "",
              cierre_cta: c.cta || "",
              descripcion: c.descripcionVideo || "",
              gancho_visual: c.ganchoVisual || "",
            },
            plantillaGuionId: "plantilla_default",
            tareasPendientes: (c.pasos || []).map(
              (texto: string, i: number) => ({
                id: `tarea_legacy_${c.id}_${i}`,
                texto,
                hecha: false,
              })
            ),
            fechaPublicacion:
              c.estado === "Subido" ? aEpoch(c.fecha) : undefined,
            metricas: {},
            creadoEn: c.creadoEn || ahora,
            actualizadoEn: c.creadoEn || ahora,
          })
        );
        /* eslint-enable @typescript-eslint/no-explicit-any */

        if (nuevosCiclos.length)
          await tx.table("ciclo_semanal").bulkPut(nuevosCiclos);
        if (nuevasIdeas.length)
          await tx.table("idea_contenido").bulkPut(nuevasIdeas);
        if (nuevosContenidos.length)
          await tx.table("contenido").bulkPut(nuevosContenidos);

        // Config del planificador viejo, ahora reemplazada por tablas tipadas.
        const tiposViejosAgenciaConfig = [
          "historico_objetivos",
          "historico_kpis",
          "canales_contenido",
          "tipos_contenido",
          "pasos_contenido_default",
        ];
        const configVieja = (await tx
          .table("agencia_config")
          .where("tipo")
          .anyOf(tiposViejosAgenciaConfig)
          .toArray()) as { id: string }[];
        for (const row of configVieja) {
          await tx.table("agencia_config").delete(row.id);
        }
      });

    // Version 18: Segundo Cerebro (área Personal) — Bloque A. Tablas nuevas,
    // sin datos previos que migrar.
    this.version(18).stores({
      inbox_item: "id, estado, creadoEn",
      tarea_diaria: "id, diaTarea, tipo, estado",
      tarea_pendiente: "id, estado, prioridad, area",
    });

    // Version 19: Segundo Cerebro — Bloque B (objetivos cuantitativos).
    this.version(19).stores({
      objetivo_cuantificable: "id, estado, area, origenModulo",
    });

    // Version 20: Segundo Cerebro — Bloque C (Hábitos, El Acordeón).
    // "activo" no se indexa: es boolean, y boolean no es una clave válida
    // de IndexedDB — se filtra en memoria (el listado de hábitos es chico).
    this.version(20).stores({
      habito_definicion: "id",
      habito_registro: "id, habitoId, diaTarea",
    });

    // Version 21: Segundo Cerebro — Bienestar y Entrenamiento. "eliminado" no
    // se indexa por el mismo motivo que "activo" en hábitos (boolean).
    this.version(21)
      .stores({
        catalogo_ejercicio: "id, patron",
        plantilla_rutina: "id",
        bloque_entrenamiento: "id, estado",
        registro_actividad: "id, plantillaId, bloqueId, diaTarea",
      })
      .upgrade(async (tx) => {
        await tx
          .table("catalogo_ejercicio")
          .bulkPut(
            CATALOGO_EJERCICIOS_SEED.map((e) => ({
              ...e,
              creadoEn: Date.now(),
            }))
          );
      });

    this.on("populate", async () => {
      const ahoraPopulate = Date.now();
      await this.table("catalogo_etiquetas").bulkPut(
        [...ETIQUETAS_DOLOR_DEFAULT, ...ETIQUETAS_RECHAZO_DEFAULT].map((e) => ({
          ...e,
          creadoEn: ahoraPopulate,
        }))
      );
      await this.table("prompt_templates").bulkPut(defaultTemplates);
      await this.table("workflow_templates").bulkPut(defaultWorkflows);
      await this.table("workflow_steps").bulkPut(defaultSteps);
      await this.table("plantilla_guion").add({
        id: "plantilla_default",
        nombre: "Estructura estándar",
        secciones: SECCIONES_GUION_DEFAULT,
        activa: true,
        creadoEn: ahoraPopulate,
      });
      await this.table("catalogo_kpi_contenido").bulkPut(
        KPIS_CONTENIDO_DEFAULT.map((k) => ({ ...k, creadoEn: ahoraPopulate }))
      );
      await this.table("catalogo_ejercicio").bulkPut(
        CATALOGO_EJERCICIOS_SEED.map((e) => ({ ...e, creadoEn: ahoraPopulate }))
      );
    });

    // Corre en cada apertura (nuevas instalaciones y upgrades de usuarios
    // existentes), a diferencia de "populate" que solo corre en DB nueva.
    // Import estático de CATALOGO_ERRORES_SEED (no dinámico): un `await
    // import()` en medio de este hook le hace perder a Dexie el contexto
    // interno que usa para saber que la operación siguiente todavía
    // pertenece a la secuencia de apertura — la deja esperando a que la
    // base termine de abrirse mientras la base espera a que este hook
    // termine, y se traba para siempre (confirmado con logs de diagnóstico).
    this.on("ready", async () => {
      const count = await this.table("catalogo_errores").count();
      if (count === 0) {
        await this.table("catalogo_errores").bulkPut(
          CATALOGO_ERRORES_SEED.map((e) => ({ ...e, creadoEn: Date.now() }))
        );
      }
    });
  }
}

export const db = new MateCodeDB();
