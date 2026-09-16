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
import { ajustesIAJsonSchema } from "../../../domain/entidades/ajuste-ia.entity";

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
