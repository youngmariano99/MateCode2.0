export interface Agencia {
  id: string;
  nombreComercial: string;
  tipoAgencia: string;
  nombreLegal?: string;
  descripcion?: string;
  sitioWeb?: string;
  emailPrincipal?: string;
  telefono?: string;
  estado: string;
  creadoEn: Date;
  actualizadoEn: Date;
}
