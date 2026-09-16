"use client";

import React, { useMemo, useState } from "react";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { useToast } from "../../hooks/useToast";
import { GestionarFasesUseCase } from "../../../application/use-cases/personal/gestionar-fases.use-case";
import { calcularDistribucionProgresiva } from "../../../domain/entidades/fase-personal.entity";

const fasesUseCase = new GestionarFasesUseCase();

const DIAS_SEMANA = [
  { valor: 1, corto: "Lun" },
  { valor: 2, corto: "Mar" },
  { valor: 3, corto: "Mié" },
  { valor: 4, corto: "Jue" },
  { valor: 5, corto: "Vie" },
  { valor: 6, corto: "Sáb" },
  { valor: 0, corto: "Dom" },
];

interface GenerarFasesModalProps {
  abierto: boolean;
  onCerrar: () => void;
  entregableId: string;
  tituloEntregable: string;
  unidad: string;
  diaInicioSugerido: string;
  diaLimiteSugerido: string;
  cantidadSugerida: number;
  onGenerado: () => void;
}

/**
 * "Generar Fases automáticamente" — arma el reparto por vos cuando la cuota
 * cambia con el tiempo (pirámide) o es simplemente pareja (incremento=0).
 * Vista previa obligatoria antes de crear nada, y si el total proyectado no
 * coincide con el pedido, se avisa en vez de forzarlo — mismo criterio que
 * el resto de la app.
 */
export const GenerarFasesModal: React.FC<GenerarFasesModalProps> = ({
  abierto,
  onCerrar,
  entregableId,
  tituloEntregable,
  unidad,
  diaInicioSugerido,
  diaLimiteSugerido,
  cantidadSugerida,
  onGenerado,
}) => {
  const { mostrarToast } = useToast();
  const [diaInicio, setDiaInicio] = useState(diaInicioSugerido);
  const [diaLimite, setDiaLimite] = useState(diaLimiteSugerido);
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]);
  const [duracionFaseDias, setDuracionFaseDias] = useState("7");
  const [cantidadInicial, setCantidadInicial] = useState("1");
  const [incremento, setIncremento] = useState("0");
  const [tope, setTope] = useState("");
  const [cantidadTotal, setCantidadTotal] = useState(String(cantidadSugerida));
  const [guardando, setGuardando] = useState(false);

  const toggleDia = (dia: number) => {
    setDiasSemana((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort()
    );
  };

  const resultado = useMemo(() => {
    if (
      !diaInicio ||
      !diaLimite ||
      diasSemana.length === 0 ||
      !duracionFaseDias ||
      !cantidadInicial ||
      !cantidadTotal
    ) {
      return null;
    }
    return calcularDistribucionProgresiva({
      diaInicio,
      diaLimite,
      diasSemana,
      duracionFaseDias: Number(duracionFaseDias),
      cantidadPorDiaInicial: Number(cantidadInicial),
      incrementoPorFase: Number(incremento) || 0,
      topePorDia: tope ? Number(tope) : undefined,
      cantidadObjetivoTotal: Number(cantidadTotal),
    });
  }, [
    diaInicio,
    diaLimite,
    diasSemana,
    duracionFaseDias,
    cantidadInicial,
    incremento,
    tope,
    cantidadTotal,
  ]);

  const confirmar = async () => {
    if (!resultado || resultado.fases.length === 0) return;
    setGuardando(true);
    const res = await fasesUseCase.crearFasesDesdeDistribucion(
      entregableId,
      resultado.fases,
      unidad,
      tituloEntregable
    );
    setGuardando(false);
    if (res.ok) {
      mostrarToast(`${res.valor} fase(s) creada(s).`, "exito");
      onGenerado();
      onCerrar();
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo="Generar Fases automáticamente"
      maxWidth="lg"
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-zinc-500">
          Repartí la meta total en Fases (semanales, mensuales, lo que elijas) —
          con incremento en 0 queda parejo, con un incremento queda una
          progresión tipo pirámide (ej. empezar en 2 por día e ir subiendo).
        </p>
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-zinc-500 uppercase">
            Desde
            <input
              type="date"
              value={diaInicio}
              onChange={(e) => setDiaInicio(e.target.value)}
              className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-zinc-500 uppercase">
            Hasta
            <input
              type="date"
              value={diaLimite}
              onChange={(e) => setDiaLimite(e.target.value)}
              className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-zinc-500 uppercase">
            Duración de c/fase (días)
            <input
              type="number"
              min={1}
              value={duracionFaseDias}
              onChange={(e) => setDuracionFaseDias(e.target.value)}
              className="w-32 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-zinc-500 uppercase">
            Días hábiles
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DIAS_SEMANA.map((d) => (
              <button
                key={d.valor}
                type="button"
                onClick={() => toggleDia(d.valor)}
                className={`rounded-lg border px-2 py-1 text-xs font-bold ${
                  diasSemana.includes(d.valor)
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-[#2A2A2E] text-zinc-500"
                }`}
              >
                {d.corto}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col gap-1 text-[10px] text-zinc-500 uppercase">
            Cuota inicial / día
            <input
              type="number"
              min={0}
              value={cantidadInicial}
              onChange={(e) => setCantidadInicial(e.target.value)}
              className="w-28 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-zinc-500 uppercase">
            Incremento por fase
            <input
              type="number"
              value={incremento}
              onChange={(e) => setIncremento(e.target.value)}
              placeholder="0 = parejo"
              className="w-28 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-zinc-500 uppercase">
            Tope / día (opcional)
            <input
              type="number"
              min={0}
              value={tope}
              onChange={(e) => setTope(e.target.value)}
              className="w-28 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] text-zinc-500 uppercase">
            Total a repartir ({unidad})
            <input
              type="number"
              min={1}
              value={cantidadTotal}
              onChange={(e) => setCantidadTotal(e.target.value)}
              className="w-32 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
          </label>
        </div>

        {resultado && resultado.fases.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-3">
            <div className="max-h-56 overflow-y-auto">
              {resultado.fases.map((f) => (
                <div
                  key={f.orden}
                  className="flex items-center justify-between gap-2 border-b border-[#2A2A2E] py-1.5 text-xs last:border-0"
                >
                  <span className="text-zinc-300">
                    {f.diaInicio} → {f.diaLimite}
                  </span>
                  <span className="text-zinc-500">
                    {f.diasHabiles} días × {f.cantidadPorDia}/día
                  </span>
                  <span className="font-bold text-zinc-200">
                    {f.cantidadObjetivo} {unidad}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">
                Total proyectado: {resultado.totalProyectado} {unidad}
              </span>
              {resultado.diferencia !== 0 && (
                <span className="font-bold text-amber-400">
                  {resultado.diferencia > 0
                    ? `Te faltan ${resultado.diferencia} — ajustá un parámetro`
                    : `Te pasás por ${-resultado.diferencia} — ajustá un parámetro`}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCerrar}
            className="text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Cancelar
          </button>
          <Button
            onClick={confirmar}
            cargando={guardando}
            disabled={!resultado || resultado.fases.length === 0}
          >
            Crear {resultado?.fases.length ?? 0} fase(s)
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
