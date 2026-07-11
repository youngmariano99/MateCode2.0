export interface Pago {
  id: string;
  agenciaId: string;
  clienteId: string;
  proyectoId?: string;
  monto: number;
  moneda: string;
  estado: string;
  fechaVencimiento: Date;
  fechaPago?: Date;
  creadoEn: Date;
  actualizadoEn: Date;
}
