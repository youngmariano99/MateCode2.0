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

    this.on("populate", async () => {
      await this.table("prompt_templates").bulkPut(defaultTemplates);
    });
  }
}

export const db = new MateCodeDB();
