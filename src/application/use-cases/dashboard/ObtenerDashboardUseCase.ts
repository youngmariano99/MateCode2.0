import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorInfraestructura } from "../../../domain/errores/error-base";

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
    try {
      const clientes = await db.clientes.toArray();
      const proyectos = await db.proyectos.toArray();
      const contratos = await db.contratos.toArray();
      const pagos = await db.pagos.toArray();

      // Calculate dynamic KPIs from DB
      const countClientesActivos = clientes.filter(
        (c) => c.estado === "Cliente Activo" || c.estado === "Negociación"
      ).length;

      const countLeads = clientes.filter(
        (c) => c.estado === "Lead" || c.estado === "Contacto Detectado"
      ).length;

      const countPropuestas = clientes.filter(
        (c) => c.estado === "Propuesta Presentada"
      ).length;

      const countProyectos = proyectos.length;

      const countPagosPendientes = pagos.filter(
        (p) => p.estado === "Pendiente"
      ).length;

      const countContratosPendientes = contratos.filter(
        (c) => c.estado === "Pendiente" || c.estado === "Borrador"
      ).length;

      // Build dynamic agenda from client follow-ups
      const agenda: AgendaItem[] = clientes
        .filter((c) => c.fechaSeguimiento)
        .map((c) => {
          const nombreVal = (c.nombre || c.empresa) as string;
          const notaVal = (c.notaSeguimiento || "") as string;
          return {
            id: `ag_${c.id as string}`,
            tipo: "seguimiento" as const,
            titulo: notaVal || `Contacto con ${nombreVal}`,
            hora: "10:00", // Standard default contact hour
            cliente: nombreVal,
            fechaSort: c.fechaSeguimiento as string,
          };
        })
        .sort((a, b) => a.fechaSort.localeCompare(b.fechaSort))
        .slice(0, 5)
        .map((x) => ({
          id: x.id,
          tipo: x.tipo,
          titulo: x.titulo,
          hora: x.hora,
          cliente: x.cliente,
        }));

      if (agenda.length === 0) {
        agenda.push({
          id: "empty_agenda",
          tipo: "seguimiento",
          titulo: "Sin seguimientos programados",
          hora: "--:--",
          cliente: "Establece uno en el CRM",
        });
      }

      // Build dynamic upcoming payments
      const proximosPagos: ProximoPago[] = pagos
        .filter((p) => p.estado === "Pendiente")
        .map((p) => {
          const clientMatch = clientes.find((c) => c.id === p.clienteId);
          return {
            id: p.id as string,
            cliente: clientMatch
              ? ((clientMatch.nombre || clientMatch.empresa) as string)
              : "Cliente",
            monto: Number(p.monto || 0),
            fecha: (p.fechaVencimiento || "Sin fecha") as string,
            estado: "Pendiente",
          };
        })
        .slice(0, 5);

      // Build dynamic upcoming followups
      const proximosSeguimientos: ProximoSeguimiento[] = clientes
        .filter((c) => c.fechaSeguimiento)
        .map((c) => {
          const nombreVal = (c.nombre || c.empresa) as string;
          const notaVal = (c.notaSeguimiento || "") as string;
          return {
            id: c.id as string,
            cliente: nombreVal,
            estado: c.estado as string,
            ultimoContacto: "Reciente",
            accionRecomendada: notaVal || "Llamar por nueva propuesta",
          };
        })
        .slice(0, 5);

      const data: DashboardData = {
        kpis: {
          clientesActivos: countClientesActivos,
          leads: countLeads,
          propuestas: countPropuestas,
          proyectos: countProyectos,
          pagosPendientes: countPagosPendientes,
          contratosPendientes: countContratosPendientes,
        },
        agenda,
        proximosPagos,
        proximosSeguimientos,
      };

      return Resultado.exito(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error del dashboard";
      return Resultado.falla(new ErrorInfraestructura(msg));
    }
  }
}
