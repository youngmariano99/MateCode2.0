"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { useToast } from "../../hooks/useToast";
import { DistribuirPlanUseCase } from "../../../application/use-cases/personal/distribuir-plan.use-case";
import {
  DIAS_HABILES,
  diasDelRango,
  repartirEnListaDeDias,
  sugerirEntregables,
  type ModoDivision,
} from "../../../domain/entidades/distribucion-personal.entity";
import type { ProyectoPersonal } from "../../../domain/entidades/proyecto-personal.entity";
import type { Entregable } from "../../../domain/entidades/entregable.entity";
import type { FasePersonal } from "../../../domain/entidades/fase-personal.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";
import { formatoDiaCorto } from "./calendario-utils";

const useCase = new DistribuirPlanUseCase();

const DIAS_SEMANA = [
  { valor: 1, corto: "L" },
  { valor: 2, corto: "M" },
  { valor: 3, corto: "M" },
  { valor: 4, corto: "J" },
  { valor: 5, corto: "V" },
  { valor: 6, corto: "S" },
  { valor: 0, corto: "D" },
];

const claseInput =
  "rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40";

const Campo: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <label className="flex flex-col gap-1 text-xs text-zinc-400">
    {label}
    {children}
  </label>
);

const SelectorDias: React.FC<{
  valor: number[];
  onChange: (v: number[]) => void;
}> = ({ valor, onChange }) => (
  <div className="flex gap-1">
    {DIAS_SEMANA.map((d) => {
      const activo = valor.includes(d.valor);
      return (
        <button
          key={d.valor}
          type="button"
          onClick={() =>
            onChange(
              activo ? valor.filter((x) => x !== d.valor) : [...valor, d.valor]
            )
          }
          className={`h-8 w-8 rounded-md border text-xs font-bold ${
            activo
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-[#2A2A2E] text-zinc-500"
          }`}
        >
          {d.corto}
        </button>
      );
    })}
  </div>
);

const TipoTarea: React.FC<{
  valor: "enfoque" | "mantenimiento";
  onChange: (v: "enfoque" | "mantenimiento") => void;
}> = ({ valor, onChange }) => (
  <div className="flex gap-1.5">
    {(["mantenimiento", "enfoque"] as const).map((t) => (
      <button
        key={t}
        type="button"
        onClick={() => onChange(t)}
        className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold uppercase ${
          valor === t
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            : "border-[#2A2A2E] text-zinc-500"
        }`}
      >
        {t}
      </button>
    ))}
  </div>
);

const PiePie: React.FC<{
  onCerrar: () => void;
  onConfirmar: () => void;
  guardando: boolean;
  deshabilitado: boolean;
  etiqueta: string;
}> = ({ onCerrar, onConfirmar, guardando, deshabilitado, etiqueta }) => (
  <>
    <button
      onClick={onCerrar}
      className="rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
    >
      Cancelar
    </button>
    <Button onClick={onConfirmar} cargando={guardando} disabled={deshabilitado}>
      {etiqueta}
    </Button>
  </>
);

// ============================================================================
// Paso 1 — Proyecto → Entregables (y, si se quiere, sus Actividades diarias)
// ============================================================================

interface DistribuirProyectoModalProps {
  abierto: boolean;
  onCerrar: () => void;
  proyecto: ProyectoPersonal;
}

const FormularioProyecto: React.FC<{
  proyecto: ProyectoPersonal;
  onCerrar: () => void;
}> = ({ proyecto, onCerrar }) => {
  const { mostrarToast } = useToast();
  const hoy = obtenerDiaTareaHoy();
  const tituloBase = proyecto.titulo;
  const [total, setTotal] = useState(String(proyecto.cantidadObjetivo ?? ""));
  const [unidad, setUnidad] = useState(proyecto.unidad ?? "");
  // Si el proyecto ya arrancó, las partes empiezan hoy (no tiene sentido
  // armar semanas en el pasado).
  const [diaInicio, setDiaInicio] = useState(
    proyecto.diaInicio < hoy && proyecto.diaLimite >= hoy
      ? hoy
      : proyecto.diaInicio
  );
  const [diaLimite, setDiaLimite] = useState(proyecto.diaLimite);
  const [modo, setModo] = useState<ModoDivision>("semanas");
  const [n, setN] = useState("4");
  const [aMedida, setAMedida] = useState(false);
  const [montos, setMontos] = useState<Record<number, string>>({});
  const [conActividades, setConActividades] = useState(true);
  const [descripcion, setDescripcion] = useState(proyecto.titulo);
  const [tipo, setTipo] = useState<"enfoque" | "mantenimiento">(
    "mantenimiento"
  );
  const [diasSemana, setDiasSemana] = useState<number[]>(DIAS_HABILES);
  const [guardando, setGuardando] = useState(false);

  const existentes =
    useLiveQuery(
      () =>
        db.entregable
          .where("proyectoId")
          .equals(proyecto.id)
          .filter((e) => e.estado !== "archivado")
          .count(),
      [proyecto.id]
    ) ?? 0;

  const totalNum = Number(total) || 0;
  const iguales = sugerirEntregables({
    diaInicio,
    diaLimite,
    total: totalNum,
    modo,
    n: Number(n) || 1,
    tituloBase,
  });
  const montoDe = (i: number, porDefecto: number) =>
    aMedida && montos[i] !== undefined ? Number(montos[i]) || 0 : porDefecto;
  const resultado = aMedida
    ? sugerirEntregables({
        diaInicio,
        diaLimite,
        total: totalNum,
        modo,
        n: Number(n) || 1,
        tituloBase,
        montos: iguales.entregables.map((e, i) => montoDe(i, e.cantidad)),
      })
    : iguales;
  const partes = resultado.entregables;

  const actividadesPorParte = partes.map((p) => {
    const dias = diasDelRango(p.diaInicio, p.diaLimite, diasSemana);
    return repartirEnListaDeDias(p.cantidad, dias);
  });
  const totalActividades = actividadesPorParte.reduce(
    (s, a) => s + a.length,
    0
  );
  const sinDias =
    conActividades && actividadesPorParte.some((a) => a.length === 0);

  const valido =
    totalNum > 0 &&
    unidad.trim() !== "" &&
    partes.length > 0 &&
    diaLimite >= diaInicio &&
    (!aMedida || resultado.diferencia === 0) &&
    (!conActividades || (!sinDias && descripcion.trim() !== ""));

  const crear = async () => {
    setGuardando(true);
    const res = await useCase.crearEntregablesDesdeProyecto({
      proyectoId: proyecto.id,
      partes,
      unidad: unidad.trim(),
      reparto: conActividades
        ? { descripcion: descripcion.trim(), tipo, diasSemana }
        : undefined,
    });
    setGuardando(false);
    if (res.ok) {
      mostrarToast(res.valor, "exito");
      onCerrar();
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  return (
    <Dialog
      abierto
      onClose={onCerrar}
      titulo={`Dividir "${proyecto.titulo}" en entregables`}
      maxWidth="lg"
      footer={
        <PiePie
          onCerrar={onCerrar}
          onConfirmar={() => void crear()}
          guardando={guardando}
          deshabilitado={!valido}
          etiqueta={
            conActividades
              ? `Crear ${partes.length} entregables y ${totalActividades} actividades`
              : `Crear ${partes.length} entregables`
          }
        />
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-zinc-500">
          Partí la meta total en entregables (por ejemplo uno por semana) y, si
          querés, generá también las actividades de cada día con su cantidad.
          Ves todo antes de crear nada.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Campo label="Total a lograr">
            <input
              type="number"
              min={1}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className={claseInput}
            />
          </Campo>
          <Campo label="Unidad">
            <input
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              placeholder="contactos"
              className={claseInput}
            />
          </Campo>
          <Campo label="Desde">
            <input
              type="date"
              value={diaInicio}
              onChange={(e) => setDiaInicio(e.target.value)}
              className={claseInput}
            />
          </Campo>
          <Campo label="Hasta">
            <input
              type="date"
              value={diaLimite}
              onChange={(e) => setDiaLimite(e.target.value)}
              className={claseInput}
            />
          </Campo>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Campo label="Dividir en">
            <div className="flex gap-1.5">
              {(
                [
                  ["semanas", "Semanas"],
                  ["partes", "N partes"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold uppercase ${
                    modo === m
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-[#2A2A2E] text-zinc-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Campo>
          {modo === "partes" && (
            <Campo label="Cuántas partes">
              <input
                type="number"
                min={1}
                value={n}
                onChange={(e) => setN(e.target.value)}
                className={`${claseInput} w-20`}
              />
            </Campo>
          )}
          <Campo label="Cantidad por parte">
            <div className="flex gap-1.5">
              {(
                [
                  [false, "Iguales"],
                  [true, "A medida"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setAMedida(v)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold uppercase ${
                    aMedida === v
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-[#2A2A2E] text-zinc-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Campo>
        </div>

        <div className="flex flex-col gap-1.5 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Entregables que se van a crear ({partes.length})
          </span>
          {partes.length === 0 && (
            <span className="text-xs text-zinc-600">
              Completá el total y las fechas para ver el reparto.
            </span>
          )}
          {partes.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 text-xs text-zinc-300"
            >
              <span>
                {p.titulo}{" "}
                <span className="text-zinc-600">
                  ({formatoDiaCorto(p.diaInicio)} →{" "}
                  {formatoDiaCorto(p.diaLimite)})
                </span>
              </span>
              {aMedida ? (
                <input
                  type="number"
                  min={0}
                  value={montos[i] ?? String(p.cantidad)}
                  onChange={(e) =>
                    setMontos((m) => ({ ...m, [i]: e.target.value }))
                  }
                  className={`${claseInput} w-20 py-1`}
                />
              ) : (
                <span className="font-bold text-zinc-100">
                  {p.cantidad} {unidad}
                </span>
              )}
            </div>
          ))}
          {aMedida && resultado.diferencia !== 0 && (
            <span className="text-xs text-amber-400">
              {resultado.diferencia > 0
                ? `Faltan ${resultado.diferencia} para llegar a ${totalNum}.`
                : `Te pasaste por ${-resultado.diferencia} del total (${totalNum}).`}
            </span>
          )}
          {existentes > 0 && (
            <span className="text-[11px] text-zinc-600">
              Este proyecto ya tiene {existentes} entregable(s); estos se
              agregan a los que hay.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={conActividades}
              onChange={(e) => setConActividades(e.target.checked)}
            />
            También armar las actividades de cada día
          </label>
          {conActividades && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Campo label="¿Qué se hace cada día?">
                  <input
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className={claseInput}
                  />
                </Campo>
                <Campo label="Tipo">
                  <TipoTarea valor={tipo} onChange={setTipo} />
                </Campo>
              </div>
              <Campo label="Días de la semana">
                <SelectorDias valor={diasSemana} onChange={setDiasSemana} />
              </Campo>
              <span className="text-xs text-zinc-500">
                {sinDias
                  ? "Alguna parte no tiene ningún día de los elegidos — revisá los días."
                  : `Se generan ${totalActividades} actividades, cada una con su cantidad (el total de cada semana se reparte parejo entre los días).`}
              </span>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export const DistribuirProyectoModal: React.FC<
  DistribuirProyectoModalProps
> = ({ abierto, onCerrar, proyecto }) => {
  if (!abierto) return null;
  return <FormularioProyecto proyecto={proyecto} onCerrar={onCerrar} />;
};

// ============================================================================
// Paso 2 — Entregable (o Fase) → Actividades diarias con cantidad
// ============================================================================

interface RepartirEnDiasModalProps {
  abierto: boolean;
  onCerrar: () => void;
  entregable: Entregable;
  /** Si viene, se reparte la meta y el rango de ESA fase. */
  fase?: FasePersonal;
}

const FormularioRepartir: React.FC<{
  entregable: Entregable;
  fase?: FasePersonal;
  onCerrar: () => void;
}> = ({ entregable, fase, onCerrar }) => {
  const { mostrarToast } = useToast();
  const hoy = obtenerDiaTareaHoy();
  const inicioBase = fase?.diaInicio ?? entregable.diaInicio;
  const limiteBase = fase?.diaLimite ?? entregable.diaLimite;
  const totalBase = fase?.cantidadObjetivo ?? entregable.cantidadObjetivo;
  const unidadBase = fase?.unidad ?? entregable.unidad ?? "";

  const [descripcion, setDescripcion] = useState(entregable.titulo);
  const [tipo, setTipo] = useState<"enfoque" | "mantenimiento">(
    "mantenimiento"
  );
  const [total, setTotal] = useState(
    totalBase !== undefined ? String(totalBase) : ""
  );
  const [unidad, setUnidad] = useState(unidadBase);
  const [diaInicio, setDiaInicio] = useState(
    inicioBase < hoy && limiteBase >= hoy ? hoy : inicioBase
  );
  const [diaLimite, setDiaLimite] = useState(limiteBase);
  const [diasSemana, setDiasSemana] = useState<number[]>(DIAS_HABILES);
  const [guardando, setGuardando] = useState(false);

  const yaHay =
    useLiveQuery(
      () =>
        db.actividad
          .where("entregableId")
          .equals(entregable.id)
          .filter(
            (a) =>
              a.estado !== "cancelada" &&
              a.estado !== "descartada" &&
              a.tipo !== "backlog" &&
              a.diaTarea !== undefined &&
              a.diaTarea >= diaInicio &&
              a.diaTarea <= diaLimite
          )
          .count(),
      [entregable.id, diaInicio, diaLimite]
    ) ?? 0;

  const totalNum = Number(total) || 0;
  const dias = diasDelRango(diaInicio, diaLimite, diasSemana);
  const porDia = repartirEnListaDeDias(totalNum, dias);
  const valido = totalNum > 0 && porDia.length > 0 && descripcion.trim() !== "";

  const crear = async () => {
    setGuardando(true);
    const res = await useCase.repartirEnDias({
      entregableId: entregable.id,
      descripcion: descripcion.trim(),
      tipo,
      unidad: unidad.trim() || undefined,
      diaInicio,
      diaLimite,
      diasSemana,
      total: totalNum,
    });
    setGuardando(false);
    if (res.ok) {
      mostrarToast(res.valor, "exito");
      onCerrar();
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  const MAX_CHIPS = 16;

  return (
    <Dialog
      abierto
      onClose={onCerrar}
      titulo={
        fase
          ? `Repartir "${fase.titulo}" en días`
          : `Repartir "${entregable.titulo}" en días`
      }
      maxWidth="lg"
      footer={
        <PiePie
          onCerrar={onCerrar}
          onConfirmar={() => void crear()}
          guardando={guardando}
          deshabilitado={!valido}
          etiqueta={`Crear ${porDia.length} actividades`}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-zinc-500">
          Genera una actividad por día con su cantidad, de tal día a tal día,
          repartiendo el total parejo. Después cada día aparece en tu agenda con
          lo que toca hacer.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="¿Qué se hace cada día?">
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className={claseInput}
            />
          </Campo>
          <Campo label="Tipo">
            <TipoTarea valor={tipo} onChange={setTipo} />
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Campo label="Total a repartir">
            <input
              type="number"
              min={1}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className={claseInput}
            />
          </Campo>
          <Campo label="Unidad">
            <input
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              className={claseInput}
            />
          </Campo>
          <Campo label="Desde">
            <input
              type="date"
              value={diaInicio}
              onChange={(e) => setDiaInicio(e.target.value)}
              className={claseInput}
            />
          </Campo>
          <Campo label="Hasta">
            <input
              type="date"
              value={diaLimite}
              onChange={(e) => setDiaLimite(e.target.value)}
              className={claseInput}
            />
          </Campo>
        </div>
        <Campo label="Días de la semana">
          <SelectorDias valor={diasSemana} onChange={setDiasSemana} />
        </Campo>

        <div className="flex flex-col gap-1.5 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Vista previa — {porDia.length} días
          </span>
          {porDia.length === 0 ? (
            <span className="text-xs text-amber-400">
              No hay ningún día que coincida (revisá fechas, días y total).
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {porDia.slice(0, MAX_CHIPS).map((r) => (
                <span
                  key={r.dia}
                  className="rounded-full border border-[#2A2A2E] px-2 py-0.5 text-[11px] text-zinc-300"
                >
                  {formatoDiaCorto(r.dia)}: {r.cantidad}
                </span>
              ))}
              {porDia.length > MAX_CHIPS && (
                <span className="text-[11px] text-zinc-600">
                  … y {porDia.length - MAX_CHIPS} días más
                </span>
              )}
            </div>
          )}
          {yaHay > 0 && (
            <span className="text-[11px] text-amber-400">
              Ojo: en ese rango este entregable ya tiene {yaHay} actividad(es).
              Los días que ya tengan esta misma actividad se omiten (no se
              duplica).
            </span>
          )}
          {entregable.recurrencia && (
            <span className="text-[11px] text-amber-400">
              Este entregable es recurrente y ya genera una actividad por día
              sin cantidad — conviene quitarle la recurrencia para no duplicar.
            </span>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export const RepartirEnDiasModal: React.FC<RepartirEnDiasModalProps> = ({
  abierto,
  onCerrar,
  entregable,
  fase,
}) => {
  if (!abierto) return null;
  return (
    <FormularioRepartir
      key={fase?.id ?? entregable.id}
      entregable={entregable}
      fase={fase}
      onCerrar={onCerrar}
    />
  );
};
