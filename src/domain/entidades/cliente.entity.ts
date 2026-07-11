export interface Cliente {
  id: string;
  agenciaId: string;
  nombreComercial: string;
  razonSocial?: string;
  cuit?: string;
  sitioWeb?: string;
  estado: string;
  creadoEn: Date;
  actualizadoEn: Date;
}
