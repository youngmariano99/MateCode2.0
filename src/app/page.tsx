import {
  Coffee,
  Terminal,
  CheckCircle2,
  ShieldCheck,
  Settings,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#09090B] text-zinc-100 selection:bg-emerald-500 selection:text-black">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute right-[-10%] bottom-[-10%] h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[120px]" />

      <main className="relative z-10 flex w-full max-w-2xl flex-col items-center px-6 text-center">
        {/* Header Logo & Icon */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl shadow-emerald-500/5 transition-transform duration-300 hover:scale-105">
          <Coffee className="h-10 w-10 animate-pulse text-emerald-500" />
        </div>

        {/* Brand */}
        <h1 className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
          MateCode
        </h1>

        {/* Slogan */}
        <p className="mt-4 text-lg font-medium text-zinc-400 sm:text-xl">
          {'"Tomate un mate. La IA hace el code."'}
        </p>

        {/* Status Badge */}
        <div className="mt-8 flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-sm font-semibold text-emerald-400 backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4" />
          <span>Sprint 00 finalizado correctamente</span>
        </div>

        {/* Enter Dashboard Button */}
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 font-mono text-sm font-extrabold text-zinc-950 shadow-lg transition-all hover:bg-emerald-600"
          >
            Ingresar al Dashboard
          </Link>
        </div>

        {/* Project Setup Card */}
        <div className="mt-12 w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-left shadow-2xl backdrop-blur-xl">
          <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-100">
            <Terminal className="h-5 w-5 text-emerald-400" />
            Infraestructura Inicial
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            La base del proyecto ha sido configurada siguiendo las pautas de
            arquitectura y calidad de código del equipo.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-zinc-800/50 bg-zinc-950/40 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  Calidad y Formato
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  ESLint, Prettier, Husky & lint-staged configurados.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-zinc-800/50 bg-zinc-950/40 p-4">
              <Settings className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  Estructura Clean
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Directorios de dominio, aplicación e infraestructura listos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-xs text-zinc-600">
          MateCode v2.0 • Diseñado para Agencias Digitales
        </footer>
      </main>
    </div>
  );
}
