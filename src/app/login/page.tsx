"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoginUseCase } from "../../application/casos-de-uso/autenticacion/login.use-case";

export default function LoginPage() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [recordarme, setRecordarme] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo || !contrasena) {
      setErrorMsg("Por favor, completa todos los campos.");
      return;
    }

    setCargando(true);
    setErrorMsg("");

    const loginUseCase = new LoginUseCase();
    const resultado = await loginUseCase.ejecutar({ correo, contrasena });

    if (resultado.ok) {
      router.push("/dashboard");
    } else {
      setErrorMsg(resultado.error?.mensaje || "Error al iniciar sesión.");
      setCargando(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090B] px-4">
      {/* Luces de fondo decorativas */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-500/5 blur-[120px]" />

      <div className="z-10 w-full max-w-md">
        {/* Cabecera / Branding */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3 shadow-xl">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-3xl font-extrabold tracking-wider text-transparent">
              MateCode
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">
            Tomate un mate. La IA hace el code.
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Workspace centralizado para agencias digitales
          </p>
        </div>

        {/* Card de Formulario */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-md">
          <h3 className="mb-6 text-lg font-bold text-zinc-100">
            Iniciar sesión
          </h3>

          {errorMsg && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {errorMsg}
            </div>
          )}

          <form onSubmit={(e) => void handleLogin(e)} className="space-y-4">
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
                placeholder="nombre@agencia.com"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="contrasena"
                  className="block text-xs font-semibold tracking-wider text-zinc-400 uppercase"
                >
                  Contraseña
                </label>
                <Link
                  href="/recuperar-password"
                  className="text-xs text-emerald-400 transition-all hover:text-emerald-300"
                >
                  ¿La olvidaste?
                </Link>
              </div>
              <input
                id="contrasena"
                type="password"
                required
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Checkbox Recordarme */}
            <div className="flex items-center">
              <input
                id="recordarme"
                type="checkbox"
                checked={recordarme}
                onChange={(e) => setRecordarme(e.target.checked)}
                className="border-zinc-850 h-4 w-4 cursor-pointer rounded bg-zinc-950 text-emerald-500 accent-emerald-500 focus:ring-emerald-500"
              />
              <label
                htmlFor="recordarme"
                className="ml-2 cursor-pointer text-xs text-zinc-400 select-none"
              >
                Recordarme en este equipo
              </label>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="mt-2 flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-zinc-950 transition-all hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25 disabled:pointer-events-none disabled:opacity-50"
            >
              {cargando ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
              ) : (
                "Ingresar al espacio"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
