import React from "react";

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  as?: React.ElementType;
}

export const TituloPrincipal: React.FC<TypographyProps> = ({
  children,
  className = "",
  as: Component = "h1",
  ...props
}) => (
  <Component
    className={`text-4xl font-extrabold tracking-tight text-zinc-100 ${className}`}
    {...props}
  >
    {children}
  </Component>
);

export const Titulo: React.FC<TypographyProps> = ({
  children,
  className = "",
  as: Component = "h2",
  ...props
}) => (
  <Component
    className={`text-3xl font-bold tracking-tight text-zinc-100 ${className}`}
    {...props}
  >
    {children}
  </Component>
);

export const Subtitulo: React.FC<TypographyProps> = ({
  children,
  className = "",
  as: Component = "h3",
  ...props
}) => (
  <Component
    className={`text-2xl font-semibold tracking-tight text-zinc-100 ${className}`}
    {...props}
  >
    {children}
  </Component>
);

export const TituloTarjeta: React.FC<TypographyProps> = ({
  children,
  className = "",
  as: Component = "h4",
  ...props
}) => (
  <Component
    className={`text-xl font-semibold tracking-tight text-zinc-100 ${className}`}
    {...props}
  >
    {children}
  </Component>
);

export const TextoNormal: React.FC<TypographyProps> = ({
  children,
  className = "",
  as: Component = "p",
  ...props
}) => (
  <Component
    className={`text-base leading-relaxed text-zinc-300 ${className}`}
    {...props}
  >
    {children}
  </Component>
);

export const TextoSecundario: React.FC<TypographyProps> = ({
  children,
  className = "",
  as: Component = "p",
  ...props
}) => (
  <Component
    className={`text-sm leading-relaxed text-zinc-400 ${className}`}
    {...props}
  >
    {children}
  </Component>
);

export const TextoAyuda: React.FC<TypographyProps> = ({
  children,
  className = "",
  as: Component = "span",
  ...props
}) => (
  <Component
    className={`text-xs leading-relaxed text-zinc-500 ${className}`}
    {...props}
  >
    {children}
  </Component>
);
