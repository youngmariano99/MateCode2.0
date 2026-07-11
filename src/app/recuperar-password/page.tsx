"use client";

import React, { useState } from "react";
import Link from "next/link";
import { crearClienteBrowser } from "../../infrastructure/auth/client";

export default function RecuperarPasswordPage() {
  const [correo, setCorreo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo) {
      setErrorMsg("Por favor, ingresa tu correo electrónico.");
      return;
    }

    setCargando(true);
    setErrorMsg("");
    setMensajeExito("");

    try {
      const supabase = crearClienteBrowser();
      const { error } = await supabase.auth.resetPasswordForEmail(correo, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setMensajeExito(
          "Si el correo está registrado, recibirás un enlace de restablecimiento pronto."
        );
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error al procesar la solicitud."
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090B] px-4">
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[100px]" />

      <div className="z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3 shadow-xl">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-3xl font-extrabold tracking-wider text-transparent">
              MateCode
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">
            Recuperar Contraseña
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Te enviaremos las instrucciones de restablecimiento
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-md">
          {errorMsg && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {errorMsg}
            </div>
          )}

          {mensajeExito && (
            <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              {mensajeExito}
            </div>
          )}

          {!mensajeExito ? (
            <form
              onSubmit={(e) => void handleRecuperar(e)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="correo"
                  className="mb-2 block text-xs font-semibold tracking-wider text-zinc-400 uppercase"
                >
                  Correo Electrónico
                </label>
                <input
                  id="correo"
                  type="email"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="tu-correo@agencia.com"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="mt-2 flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-zinc-950 transition-all hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25 disabled:pointer-events-none disabled:opacity-50"
              >
                {cargando ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                ) : (
                  "Enviar enlace"
                )}
              </button>
            </form>
          ) : null}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-xs text-zinc-400 transition-all hover:text-emerald-400"
            >
              Volver al Inicio de Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
