import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  cargando?: boolean;
  icono?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  variant = "primary",
  cargando = false,
  icono,
  disabled,
  ...props
}) => {
  const baseStyle =
    "inline-flex items-center justify-center font-bold px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary:
      "bg-[#10B981] hover:bg-[#059669] text-zinc-950 hover:shadow-lg hover:shadow-emerald-500/10",
    secondary:
      "bg-[#18181B] hover:bg-[#232326] text-zinc-100 border border-[#2A2A2E]",
    outline:
      "border border-[#2A2A2E] hover:border-zinc-700 text-zinc-300 hover:bg-[#111113]",
    ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-[#18181B]",
    destructive:
      "bg-[#EF4444] hover:bg-[#DC2626] text-zinc-950 hover:shadow-lg hover:shadow-red-500/10",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={disabled || cargando}
      {...props}
    >
      {cargando ? (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : icono ? (
        <span className="mr-2 inline-flex items-center justify-center">
          {icono}
        </span>
      ) : null}
      {children}
    </button>
  );
};

export const IconButton: React.FC<ButtonProps> = ({
  className = "",
  variant = "primary",
  cargando = false,
  icono,
  disabled,
  ...props
}) => {
  const baseStyle =
    "inline-flex items-center justify-center p-2.5 rounded-xl transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary:
      "bg-[#10B981] hover:bg-[#059669] text-zinc-950 hover:shadow-lg hover:shadow-emerald-500/10",
    secondary:
      "bg-[#18181B] hover:bg-[#232326] text-zinc-100 border border-[#2A2A2E]",
    outline:
      "border border-[#2A2A2E] hover:border-zinc-700 text-zinc-300 hover:bg-[#111113]",
    ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-[#18181B]",
    destructive:
      "bg-[#EF4444] hover:bg-[#DC2626] text-zinc-950 hover:shadow-lg hover:shadow-red-500/10",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={disabled || cargando}
      {...props}
    >
      {cargando ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icono
      )}
    </button>
  );
};
