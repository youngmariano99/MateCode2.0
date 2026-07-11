import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";

export interface DashboardKPIs {
  clientesActivos: number;
  leads: number;
  propuestas: number;
  proyectos: number;
  pagosPendientes: number;
  contratosPendientes: number;
}

export interface AgendaItem {
  id: string;
  tipo: "llamada" | "visita" | "seguimiento" | "pago" | "reunion";
  titulo: string;
  hora: string;
  cliente: string;
}

export interface ProximoPago {
  id: string;
  cliente: string;
  monto: number;
  fecha: string;
  estado: string;
}

export interface ProximoSeguimiento {
  id: string;
  cliente: string;
  estado: string;
  ultimoContacto: string;
  accionRecomendada: string;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  agenda: AgendaItem[];
  proximosPagos: ProximoPago[];
  proximosSeguimientos: ProximoSeguimiento[];
}

export class ObtenerDashboardUseCase {
  public async ejecutar(): Promise<Resultado<DashboardData>> {
    const countClientes = await db.clientes.count();
    const countContactos = await db.contactos.count();
    const countContratos = await db.contratos.count();
    const countPagos = await db.pagos.count();

    const data: DashboardData = {
      kpis: {
        clientesActivos: countClientes || 12,
        leads: countContactos || 8,
        propuestas: 4,
        proyectos: countContratos || 6,
        pagosPendientes: countPagos || 3,
        contratosPendientes: 2,
      },
      agenda: [
        {
          id: "1",
          tipo: "reunion",
          titulo: "Reunión de requerimientos",
          hora: "09:30",
          cliente: "Acme Corp",
        },
        {
          id: "2",
          tipo: "llamada",
          titulo: "Seguimiento técnico",
          hora: "11:00",
          cliente: "Globex Inc",
        },
        {
          id: "3",
          tipo: "visita",
          titulo: "Presentación comercial",
          hora: "15:00",
          cliente: "Stark Ind",
        },
      ],
      proximosPagos: [
        {
          id: "1",
          cliente: "Initech",
          monto: 150000,
          fecha: "15/07/2026",
          estado: "Pendiente",
        },
        {
          id: "2",
          cliente: "Umbrella Corp",
          monto: 320000,
          fecha: "20/07/2026",
          estado: "Pendiente",
        },
      ],
      proximosSeguimientos: [
        {
          id: "1",
          cliente: "Cyberdyne",
          estado: "Interesado",
          ultimoContacto: "05/07/2026",
          accionRecomendada: "Enviar cotización",
        },
        {
          id: "2",
          cliente: "Tyrell Corp",
          estado: "Negociando",
          ultimoContacto: "08/07/2026",
          accionRecomendada: "Llamar para coordinar demo",
        },
      ],
    };

    return Resultado.exito(data);
  }
}
