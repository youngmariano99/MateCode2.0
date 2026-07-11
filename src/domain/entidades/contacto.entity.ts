export interface Contacto {
  id: string;
  clienteId: string;
  nombre: string;
  cargo?: string;
  observaciones?: string;
  creadoEn: Date;
  actualizadoEn: Date;
}
