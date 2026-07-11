import { Agencia } from "./agencia.entity";

export interface AgenciaBranding {
  logoUrl?: string;
  isotipoUrl?: string;
  colorPrincipal: string;
  colorSecundario: string;
  colorExito: string;
  colorAdvertencia: string;
  colorError: string;
  portadaUrl?: string;
}

export interface AgenciaDatosComerciales {
  razonSocial: string;
  cuit: string;
  condicionIva: string;
  direccionFiscal: string;
  ciudad: string;
  provincia: string;
  pais: string;
  codigoPostal: string;
  redesSociales?: Record<string, string>;
  correoComercial?: string;
  telefonoComercial?: string;
}

export interface AgenciaFirmaComercial {
  nombreResponsable: string;
  cargo: string;
  firmaDigitalBase64?: string;
  pieCorreo?: string;
  infoContratos?: string;
}

export interface AgenciaRegional {
  idioma: string;
  zonaHoraria: string;
  formatoFecha: string;
  formatoMoneda: string;
  moneda: string;
  separadorDecimal: string;
}

export interface AgenciaIA {
  proveedor: string;
  modelo: string;
  promptInstitucional: string;
  temperatura: number;
  contextoPermanente: string;
}

export interface AgenciaWorkspace extends Agencia {
  branding: AgenciaBranding;
  comercial: AgenciaDatosComerciales;
  firma: AgenciaFirmaComercial;
  regional: AgenciaRegional;
  ia: AgenciaIA;
  designMd?: string;
}
