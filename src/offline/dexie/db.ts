import Dexie, { Table } from "dexie";

export interface EventoPendiente {
  id?: number;
  tabla: string;
  accion: "crear" | "editar" | "eliminar";
  registroId: string;
  payload: Record<string, unknown>;
  fecha: number;
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

  // Outbound CRM tables (Version 11)
  public contacto_sesiones!: Table<Record<string, unknown>, string>;
  public servicios_agencia!: Table<Record<string, unknown>, string>;
  public reuniones_contacto!: Table<Record<string, unknown>, string>;

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

    this.on("populate", async () => {
      await this.table("prompt_templates").bulkPut(defaultTemplates);
      await this.table("workflow_templates").bulkPut(defaultWorkflows);
      await this.table("workflow_steps").bulkPut(defaultSteps);
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
      await this.table("servicios_agencia").bulkPut(defaultServices);
    });
  }
}

export const db = new MateCodeDB();
