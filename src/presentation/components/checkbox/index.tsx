import React from "react";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  descripcion?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  descripcion,
  className = "",
  ...props
}) => (
  <label className="inline-flex cursor-pointer items-start gap-2.5 select-none">
    <input
      type="checkbox"
      className={`mt-0.5 h-4.5 w-4.5 cursor-pointer rounded border border-zinc-800 bg-zinc-950 text-emerald-500 accent-emerald-500 focus:ring-0 ${className}`}
      {...props}
    />
    <div className="flex flex-col">
      <span className="text-sm font-medium text-zinc-200">{label}</span>
      {descripcion && (
        <span className="mt-0.5 text-xs text-zinc-500">{descripcion}</span>
      )}
    </div>
  </label>
);

interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  descripcion?: string;
}

export const Radio: React.FC<RadioProps> = ({
  label,
  descripcion,
  className = "",
  ...props
}) => (
  <label className="inline-flex cursor-pointer items-start gap-2.5 select-none">
    <input
      type="radio"
      className={`mt-0.5 h-4.5 w-4.5 cursor-pointer rounded-full border border-zinc-800 bg-zinc-950 text-emerald-500 accent-emerald-500 focus:ring-0 ${className}`}
      {...props}
    />
    <div className="flex flex-col">
      <span className="text-sm font-medium text-zinc-200">{label}</span>
      {descripcion && (
        <span className="mt-0.5 text-xs text-zinc-500">{descripcion}</span>
      )}
    </div>
  </label>
);

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  descripcion?: string;
  checked?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  descripcion,
  checked,
  onChange,
  className = "",
  ...props
}) => (
  <label
    className={`inline-flex cursor-pointer items-start gap-3 select-none ${className}`}
  >
    <div className="relative mt-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
        {...props}
      />
      <div
        className={`h-6 w-10 rounded-full transition-all duration-200 ${
          checked ? "bg-emerald-500" : "border border-zinc-800 bg-zinc-900"
        }`}
      />
      <div
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-zinc-100 transition-all duration-200 ${
          checked ? "translate-x-4 bg-zinc-950" : "translate-x-0"
        }`}
      />
    </div>
    {label && (
      <div className="flex flex-col">
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        {descripcion && (
          <span className="mt-0.5 text-xs text-zinc-500">{descripcion}</span>
        )}
      </div>
    )}
  </label>
);
