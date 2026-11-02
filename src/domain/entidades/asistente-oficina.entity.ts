export type IntencionAsistente =
  "resumen_hoy" | "resumen_semana" | "ajuste_planificacion" | "consulta_libre";

export type TipoErrorAsistente =
  | "API_KEY_FALTANTE"
  | "API_KEY_INVALIDA"
  | "LIMITE_CUOTA_EXCEDIDO"
  | "TIMEOUT_RED"
  | "ERROR_INTERNO";

export interface LogErrorAPI {
  tipo: TipoErrorAsistente;
  mensaje: string;
  detalle?: string;
  codigoHttp?: number;
  origen: "cliente" | "servidor" | "gemini";
}

export interface RespuestaAsistenteOficina {
  contenido: string;
  modoUsado: "ahorro" | "ia";
  timestamp: number;
  errorAPI?: LogErrorAPI;
  advertenciaFallback?: string;
}

export interface DatosPreprocesadosHoy {
  fecha: string;
  totalActividades: number;
  completadasCount: number;
  pendientesCount: number;
  porcentajeCumplimiento: number;
  minutosTrabajadosHoy: number;
  tareasHechas: {
    descripcion: string;
    progreso?: number;
    meta?: number;
    unidad?: string;
  }[];
  tareasPendientes: {
    descripcion: string;
    progreso?: number;
    meta?: number;
    unidad?: string;
    pisoMinimo?: number;
  }[];
  hitosProximos: {
    titulo: string;
    mensajeAlerta: string;
  }[];
}

export interface DatosPreprocesadosSemana {
  semanaInicio: string;
  semanaFin: string;
  totalActividadesSemana: number;
  completadasSemana: number;
  porcentajeSemana: number;
  minutosTrabajadosSemana: number;
  entregablesActivos: {
    titulo: string;
    progreso: number;
    meta?: number;
    unidad?: string;
  }[];
}

export interface EntregablePisoAnalisis {
  id: string;
  titulo: string;
  proyectoTitulo?: string;
  progresoActual: number;
  cantidadObjetivo: number;
  unidad: string;
  bandaAceptable: number;
  pisoMinimo: number;
  distanciaAlPiso: number;
  alcanzoPiso: boolean;
  porcentajeObjetivo: number;
  diaLimite: string;
  diasRestantes: number;
}

export interface DatosPreprocesadosPlanificacion {
  fecha: string;
  totalEntregablesActivos: number;
  entregablesQueAlcanzaronPiso: number;
  entregablesEnRiesgo: EntregablePisoAnalisis[];
  entregablesAlDia: EntregablePisoAnalisis[];
}

export interface ContextoAsistentePayload {
  intencion: IntencionAsistente;
  consultaUsuario?: string;
  datosHoy?: DatosPreprocesadosHoy;
  datosSemana?: DatosPreprocesadosSemana;
  datosPlanificacion?: DatosPreprocesadosPlanificacion;
}
