export interface Proyecto {
  id: string;
  agenciaId: string;
  clienteId: string;
  nombre: string;
  descripcion?: string;
  tipo: string;
  estado: string;
  fechaInicio?: Date;
  fechaEntrega?: Date;
  responsableId?: string;
  creadoEn: Date;
  actualizadoEn: Date;
}
