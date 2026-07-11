export interface Contrato {
  id: string;
  agenciaId: string;
  clienteId: string;
  proyectoId?: string;
  titulo: string;
  contenido: string;
  estado: string;
  creadoEn: Date;
  actualizadoEn: Date;
}
