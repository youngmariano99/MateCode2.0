"use client";

import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { useToast } from "../../hooks/useToast";
import { GestionarFasesUseCase } from "../../../application/use-cases/personal/gestionar-fases.use-case";
import {
  calcularDistribucionProgresiva,
  type FasePersonal,
  type DecisionCierreFase,
} from "../../../domain/entidades/fase-personal.entity";
import { calcularNivelLogro } from "../../../domain/entidades/objetivo-cuantificable.entity";

const fasesUseCase = new GestionarFasesUseCase();
const SIN_FASES: FasePersonal[] = [];

const ETIQUETA_DECISION: Record<DecisionCierreFase, string> = {
  trasladar_siguiente: "Trasladar todo a la próxima fase",
  repartir_restantes: "Repartir entre las fases que quedan",
  descartar: "Descartar — no arrastrar nada",
  parcial: "Elegir manualmente cuánto y a dónde",
  reestructurar_restantes: "Reestructurar las fases restantes",
};

function diasEntre(diaInicio: string, diaLimite: string): number {
  return (
    Math.round(
      (new Date(`${diaLimite}T00:00:00Z`).getTime() -
        new Date(`${diaInicio}T00:00:00Z`).getTime()) /
        86400000
    ) + 1
  );
}

interface CerrarFaseModalProps {
  abierto: boolean;
  onCerrar: () => void;
  fase: FasePersonal;
  onCerrado: () => void;
}

/**
 * Cierre de Fase — nunca automático. Si el nivel de logro (bandas de
 * aceptación) quedó "mejorable"/"bajo", las 4 decisiones de arrastre chico
 * se ocultan y solo queda "Reestructurar restantes" o "Descartar" — mismo
 * gate que aplica gestionar-fases.use-case.ts, acá solo se refleja en la UI
 * para no dejar elegir algo que el use-case va a rechazar igual.
 */
export const CerrarFaseModal: React.FC<CerrarFaseModalProps> = ({
  abierto,
  onCerrar,
  fase,
  onCerrado,
}) => {
  const { mostrarToast } = useToast();
  const nivelLogro = calcularNivelLogro(
    fase.cantidadObjetivo,
    fase.progresoActual,
    fase.bandaAceptable,
    fase.bandaMejorable
  );
  const bajoElMinimo = nivelLogro === "mejorable" || nivelLogro === "bajo";
  const faltante = Math.max(0, fase.cantidadObjetivo - fase.progresoActual);

  const [decision, setDecision] = useState<DecisionCierreFase>(
    bajoElMinimo ? "reestructurar_restantes" : "trasladar_siguiente"
  );
  const [distribucionManual, setDistribucionManual] = useState<
    Record<string, string>
  >({});
  const [cantidadInicial, setCantidadInicial] = useState("1");
  const [incremento, setIncremento] = useState("0");
  const [tope, setTope] = useState("");
  const [diasSemana] = useState<number[]>([1, 2, 3, 4, 5]);
  const [guardando, setGuardando] = useState(false);

  const futuras =
    useLiveQuery(
      () =>
        db.fase_personal
          .where("entregableId")
          .equals(fase.entregableId)
          .and((f) => f.estado === "abierta" && f.orden > fase.orden)
          .sortBy("orden"),
      [fase.entregableId, fase.orden]
    ) || SIN_FASES;

  const opcionesDisponibles: DecisionCierreFase[] = bajoElMinimo
    ? ["reestructurar_restantes", "descartar"]
    : [
        "trasladar_siguiente",
        "repartir_restantes",
        "descartar",
        "parcial",
        "reestructurar_restantes",
      ];

  const totalManual = Object.values(distribucionManual).reduce(
    (s, v) => s + (Number(v) || 0),
    0
  );

  const distribucionReestructurada = useMemo(() => {
    if (decision !== "reestructurar_restantes" || futuras.length === 0)
      return null;
    const diaInicio = futuras[0].diaInicio;
    const diaLimite = futuras[futuras.length - 1].diaLimite;
    const duracionFaseDias = diasEntre(
      futuras[0].diaInicio,
      futuras[0].diaLimite
    );
    const totalARepartir =
      faltante + futuras.reduce((s, f) => s + f.cantidadObjetivo, 0);
    return calcularDistribucionProgresiva({
      diaInicio,
      diaLimite,
      diasSemana,
      duracionFaseDias,
      cantidadPorDiaInicial: Number(cantidadInicial) || 0,
      incrementoPorFase: Number(incremento) || 0,
      topePorDia: tope ? Number(tope) : undefined,
      cantidadObjetivoTotal: totalARepartir,
    });
  }, [
    decision,
    futuras,
    faltante,
    cantidadInicial,
    incremento,
    tope,
    diasSemana,
  ]);

  const confirmar = async () => {
    setGuardando(true);
    const res = await fasesUseCase.cerrarFase({
      id: fase.id,
      decision,
      distribucionManual:
        decision === "parcial"
          ? futuras
              .filter((f) => Number(distribucionManual[f.id]) > 0)
              .map((f) => ({
                faseId: f.id,
                cantidad: Number(distribucionManual[f.id]),
              }))
          : undefined,
      nuevasCantidadesRestantes:
        decision === "reestructurar_restantes" && distribucionReestructurada
          ? futuras.map((f, i) => ({
              faseId: f.id,
              cantidadObjetivo:
                distribucionReestructurada.fases[i]?.cantidadObjetivo ??
                f.cantidadObjetivo,
            }))
          : undefined,
    });
    setGuardando(false);
    if (res.ok) {
      mostrarToast("Fase cerrada.", "exito");
      onCerrado();
      onCerrar();
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo={`Cerrar fase "${fase.titulo}"`}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-3 text-sm">
          <span className="text-zinc-300">
            Lograste {fase.progresoActual} de {fase.cantidadObjetivo}{" "}
            {fase.unidad}
          </span>
          <span
            className={`font-bold ${bajoElMinimo ? "text-red-400" : "text-emerald-400"}`}
          >
            {nivelLogro
              ? nivelLogro[0].toUpperCase() + nivelLogro.slice(1)
              : `Faltan ${faltante}`}
          </span>
        </div>
        {bajoElMinimo && (
          <p className="text-xs text-red-400">
            No llegaste al mínimo aceptable de esta fase — para seguir adelante
            hace falta reestructurar lo que queda (o descartar el faltante
            directamente).
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          {opcionesDisponibles.map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={decision === d}
                onChange={() => setDecision(d)}
              />
              <span className="text-zinc-300">{ETIQUETA_DECISION[d]}</span>
            </label>
          ))}
        </div>

        {decision === "parcial" && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-3">
            {futuras.length === 0 && (
              <span className="text-xs text-zinc-500">
                No hay fases futuras abiertas para repartir.
              </span>
            )}
            {futuras.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-xs text-zinc-400">{f.titulo}</span>
                <input
                  type="number"
                  min={0}
                  value={distribucionManual[f.id] || ""}
                  onChange={(e) =>
                    setDistribucionManual((prev) => ({
                      ...prev,
                      [f.id]: e.target.value,
                    }))
                  }
                  className="w-24 rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2 py-1 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
                />
              </div>
            ))}
            <span
              className={`text-[11px] ${totalManual > faltante ? "text-red-400" : "text-zinc-500"}`}
            >
              {totalManual} / {faltante} repartido
            </span>
          </div>
        )}

        {decision === "reestructurar_restantes" && (
          <div className="flex flex-col gap-2 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-3">
            {futuras.length === 0 ? (
              <span className="text-xs text-zinc-500">
                No hay fases futuras abiertas para reestructurar — creá la
                próxima fase primero.
              </span>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="number"
                    min={0}
                    value={cantidadInicial}
                    onChange={(e) => setCantidadInicial(e.target.value)}
                    placeholder="Cuota inicial/día"
                    className="w-32 rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
                  />
                  <input
                    type="number"
                    value={incremento}
                    onChange={(e) => setIncremento(e.target.value)}
                    placeholder="Incremento/fase"
                    className="w-32 rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
                  />
                  <input
                    type="number"
                    min={0}
                    value={tope}
                    onChange={(e) => setTope(e.target.value)}
                    placeholder="Tope/día (opcional)"
                    className="w-32 rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
                  />
                </div>
                {distribucionReestructurada && (
                  <div className="flex flex-col gap-1">
                    {futuras.map((f, i) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-zinc-400">{f.titulo}</span>
                        <span className="text-zinc-300">
                          {f.cantidadObjetivo} →{" "}
                          <span className="font-bold text-emerald-400">
                            {distribucionReestructurada.fases[i]
                              ?.cantidadObjetivo ?? f.cantidadObjetivo}
                          </span>
                        </span>
                      </div>
                    ))}
                    <span className="text-[11px] text-zinc-500">
                      Total proyectado:{" "}
                      {distribucionReestructurada.totalProyectado}
                      {distribucionReestructurada.diferencia !== 0 &&
                        ` (${distribucionReestructurada.diferencia > 0 ? "faltan" : "sobran"} ${Math.abs(distribucionReestructurada.diferencia)})`}
                    </span>
                  </div>
                )}
              </>
            )}
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
            disabled={
              (decision === "parcial" &&
                (totalManual === 0 || totalManual > faltante)) ||
              (decision === "reestructurar_restantes" &&
                futuras.length === 0) ||
              ((decision === "trasladar_siguiente" ||
                decision === "repartir_restantes") &&
                futuras.length === 0)
            }
          >
            Confirmar cierre
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
