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

  constructor() {
    super("MateCodeLocalDB");

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
  }
}

export const db = new MateCodeDB();
