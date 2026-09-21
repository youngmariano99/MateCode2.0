import React from "react";
import {
  importarArbolPersonalSchema,
  importarProyectoBajoObjetivoSchema,
  importarEntregableBajoProyectoSchema,
  importarActividadesBajoEntregableSchema,
  importarFasesBajoEntregableSchema,
  type ItemObjetivoJson,
  type ItemProyectoJson,
  type ItemEntregableJson,
  type ItemActividadJson,
} from "../../../domain/entidades/planificacion-jerarquica.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";
import { ajustesIAJsonSchema } from "../../../domain/entidades/ajuste-ia.entity";
import {
  expandirReparto,
  type ContextoReparto,
  type RepartoJson,
} from "../../../domain/entidades/distribucion-personal.entity";

/**
 * Resúmenes legibles del JSON de jerarquía Personal — se usan como
 * `renderResumen` de `ModalImportarJson` para poder revisar qué se va a
 * crear ANTES de tocar la base (pedido del usuario tras encontrar Entregables
 * mal armados por una IA — ver Sprint 21). Reusan los mismos zod schemas que
 * `ImportarArbolPersonalUseCase`, así que un JSON con forma inválida se
 * rechaza acá con el mismo mensaje, antes incluso de llegar al use-case.
 */

function mensajeDeIssues(
  issues: { path: PropertyKey[]; message: string }[]
): string {
  return issues
    .map((i) => `${i.path.map(String).join(".") || "(raíz)"}: ${i.message}`)
    .join(" — ");
}

const DIAS_SEMANA_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function textoRecurrencia(r?: {
  frecuencia: string;
  diasSemana?: number[];
}): string {
  if (!r) return "";
  if (r.frecuencia === "diaria") return " · recurrente todos los días";
  return ` · recurrente ${(r.diasSemana || []).map((d) => DIAS_SEMANA_CORTO[d]).join("/")}`;
}

const Fila: React.FC<{ nivel: number; children: React.ReactNode }> = ({
  nivel,
  children,
}) => (
  <div
    style={{ marginLeft: nivel * 16 }}
    className="border-l border-[#2A2A2E] py-0.5 pl-2 text-xs text-zinc-300"
  >
    {children}
  </div>
);

const ResumenActividad: React.FC<{ a: ItemActividadJson; nivel: number }> = ({
  a,
  nivel,
}) => (
  <Fila nivel={nivel}>
    • [{a.tipo}] {a.descripcion}
    {a.diaTarea && ` — ${a.diaTarea}`}
  </Fila>
);

/** Cuenta real de lo que va a generar un reparto: cuántas actividades, cuánto por día — para revisar antes de crear. */
const ResumenReparto: React.FC<{
  r: RepartoJson;
  contexto: ContextoReparto;
  nivel: number;
}> = ({ r, contexto, nivel }) => {
  const sinFechas =
    !(r.diaInicio ?? contexto.diaInicio) ||
    !(r.diaLimite ?? contexto.diaLimite);
  if (sinFechas) {
    return (
      <Fila nivel={nivel}>
        <span className="text-sky-400">▦ Reparto:</span> {r.descripcion} — se
        reparte con las fechas y el total del entregable donde se cree
      </Fila>
    );
  }
  const exp = expandirReparto(r, contexto);
  const total = exp.porDia.reduce((s, d) => s + d.cantidad, 0);
  const cantidades = exp.porDia.map((d) => d.cantidad);
  const min = Math.min(...cantidades);
  const max = Math.max(...cantidades);
  return (
    <Fila nivel={nivel}>
      <span className="text-sky-400">▦ Reparto:</span> {r.descripcion} —{" "}
      {exp.porDia.length === 0 ? (
        <span className="text-red-400">
          sin días o sin cantidad (revisá fechas, días y total)
        </span>
      ) : (
        <>
          {exp.porDia.length} actividades ({total} {exp.unidad || ""} en total,
          {min === max
            ? ` ${min} por día`
            : ` entre ${min} y ${max} por día`}),{" "}
          {(r.diasSemana || []).map((d) => DIAS_SEMANA_CORTO[d]).join("/")}
        </>
      )}
    </Fila>
  );
};

const ResumenEntregable: React.FC<{ e: ItemEntregableJson; nivel: number }> = ({
  e,
  nivel,
}) => (
  <>
    <Fila nivel={nivel}>
      <span className="font-bold text-zinc-100">{e.titulo}</span> — hasta{" "}
      {e.diaLimite}
      {e.cantidadObjetivo !== undefined &&
        ` · ${e.cantidadObjetivo} ${e.unidad}`}
      {textoRecurrencia(e.recurrencia)}
    </Fila>
    {e.actividades.map((a, i) => (
      <ResumenActividad key={i} a={a} nivel={nivel + 1} />
    ))}
    {e.fases.map((f, i) => (
      <Fila key={`fase-${i}`} nivel={nivel + 1}>
        <span className="text-violet-400">◆ Fase:</span>{" "}
        <span className="font-bold text-zinc-100">{f.titulo}</span> —{" "}
        {f.diaInicio} → {f.diaLimite} · {f.cantidadObjetivo} {f.unidad}
      </Fila>
    ))}
    {e.fases.map(
      (f, i) =>
        f.reparto && (
          <ResumenReparto
            key={`fr-${i}`}
            r={f.reparto}
            contexto={{
              diaInicio: f.diaInicio,
              diaLimite: f.diaLimite,
              total: f.cantidadObjetivo,
              unidad: f.unidad,
            }}
            nivel={nivel + 2}
          />
        )
    )}
    {e.reparto && (
      <ResumenReparto
        r={e.reparto}
        contexto={{
          diaInicio: e.diaInicio ?? obtenerDiaTareaHoy(),
          diaLimite: e.diaLimite,
          total: e.cantidadObjetivo,
          unidad: e.unidad,
        }}
        nivel={nivel + 1}
      />
    )}
  </>
);

const ResumenProyecto: React.FC<{ p: ItemProyectoJson; nivel: number }> = ({
  p,
  nivel,
}) => (
  <>
    <Fila nivel={nivel}>
      <span className="font-bold text-zinc-100">{p.titulo}</span> — hasta{" "}
      {p.diaLimite}
      {p.cantidadObjetivo !== undefined &&
        ` · ${p.cantidadObjetivo} ${p.unidad}`}
    </Fila>
    {p.entregables.map((e, i) => (
      <ResumenEntregable key={i} e={e} nivel={nivel + 1} />
    ))}
  </>
);

const ResumenObjetivo: React.FC<{ o: ItemObjetivoJson; nivel: number }> = ({
  o,
  nivel,
}) => (
  <>
    <Fila nivel={nivel}>
      <span className="font-bold text-zinc-100">{o.titulo}</span> —{" "}
      {o.cantidadObjetivo} {o.unidad} hasta {o.diaLimite}
    </Fila>
    {o.proyectos.map((p, i) => (
      <ResumenProyecto key={i} p={p} nivel={nivel + 1} />
    ))}
  </>
);

/** Árbol completo Y "solo Objetivo" (misma estructura, proyectos puede venir vacío). */
export function resumenArbolCompleto(items: unknown[]): React.ReactNode {
  const parsed = importarArbolPersonalSchema.safeParse(items[0] ?? {});
  if (!parsed.success) throw new Error(mensajeDeIssues(parsed.error.issues));
  return (
    <div className="flex flex-col gap-0.5">
      <Fila nivel={0}>
        <span className="font-bold text-emerald-400">
          Área: {parsed.data.areaTitulo}
        </span>
      </Fila>
      {parsed.data.objetivosNuevos.map((o, i) => (
        <ResumenObjetivo key={i} o={o} nivel={1} />
      ))}
    </div>
  );
}

export function resumenProyectoBajoObjetivo(items: unknown[]): React.ReactNode {
  const parsed = importarProyectoBajoObjetivoSchema.safeParse(items[0] ?? {});
  if (!parsed.success) throw new Error(mensajeDeIssues(parsed.error.issues));
  return (
    <div className="flex flex-col gap-0.5">
      <Fila nivel={0}>
        <span className="text-zinc-500">
          Bajo el objetivo &quot;{parsed.data.objetivoTitulo}&quot;
        </span>
      </Fila>
      {parsed.data.proyectosNuevos.map((p, i) => (
        <ResumenProyecto key={i} p={p} nivel={1} />
      ))}
    </div>
  );
}

export function resumenEntregableBajoProyecto(
  items: unknown[]
): React.ReactNode {
  const parsed = importarEntregableBajoProyectoSchema.safeParse(items[0] ?? {});
  if (!parsed.success) throw new Error(mensajeDeIssues(parsed.error.issues));
  return (
    <div className="flex flex-col gap-0.5">
      <Fila nivel={0}>
        <span className="text-zinc-500">
          Bajo el proyecto &quot;{parsed.data.proyectoTitulo}&quot;
        </span>
      </Fila>
      {parsed.data.entregablesNuevos.map((e, i) => (
        <ResumenEntregable key={i} e={e} nivel={1} />
      ))}
    </div>
  );
}

export function resumenActividadesBajoEntregable(
  items: unknown[]
): React.ReactNode {
  const parsed = importarActividadesBajoEntregableSchema.safeParse(
    items[0] ?? {}
  );
  if (!parsed.success) throw new Error(mensajeDeIssues(parsed.error.issues));
  return (
    <div className="flex flex-col gap-0.5">
      <Fila nivel={0}>
        <span className="text-zinc-500">
          Bajo el entregable &quot;{parsed.data.entregableTitulo}&quot;
        </span>
      </Fila>
      {parsed.data.actividadesNuevas.map((a, i) => (
        <ResumenActividad key={i} a={a} nivel={1} />
      ))}
      {parsed.data.repartos.map((r, i) => (
        <ResumenReparto
          key={`rep-${i}`}
          r={r}
          contexto={{
            diaInicio: r.diaInicio ?? "",
            diaLimite: r.diaLimite ?? "",
            total: r.cantidadTotal,
            unidad: r.unidad,
          }}
          nivel={1}
        />
      ))}
    </div>
  );
}

export function resumenAjustesIA(items: unknown[]): React.ReactNode {
  const parsed = ajustesIAJsonSchema.safeParse(items[0] ?? {});
  if (!parsed.success) throw new Error(mensajeDeIssues(parsed.error.issues));
  return (
    <div className="flex flex-col gap-1.5">
      {parsed.data.ajustes.map((a, i) => (
        <Fila key={i} nivel={0}>
          <span className="rounded border border-zinc-800 px-1 py-0.5 text-[9px] font-bold text-zinc-500 uppercase">
            {a.nivel}
          </span>{" "}
          <span className="font-bold text-zinc-100">{a.titulo}</span>
          {a.cantidadObjetivo !== undefined &&
            ` · nueva cantidad: ${a.cantidadObjetivo}`}
          {a.diaLimite && ` · nueva fecha: ${a.diaLimite}`}
          <div className="text-[11px] text-zinc-500">{a.motivo}</div>
        </Fila>
      ))}
    </div>
  );
}

export function resumenFasesBajoEntregable(items: unknown[]): React.ReactNode {
  const parsed = importarFasesBajoEntregableSchema.safeParse(items[0] ?? {});
  if (!parsed.success) throw new Error(mensajeDeIssues(parsed.error.issues));
  return (
    <div className="flex flex-col gap-0.5">
      <Fila nivel={0}>
        <span className="text-zinc-500">
          Bajo el entregable &quot;{parsed.data.entregableTitulo}&quot;
        </span>
      </Fila>
      {parsed.data.fasesNuevas.map((f, i) => (
        <Fila key={i} nivel={1}>
          <span className="font-bold text-zinc-100">{f.titulo}</span> —{" "}
          {f.diaInicio} → {f.diaLimite} · {f.cantidadObjetivo} {f.unidad}
          {f.bandaAceptable !== undefined &&
            ` · aceptable ≥${f.bandaAceptable}%`}
        </Fila>
      ))}
    </div>
  );
}
