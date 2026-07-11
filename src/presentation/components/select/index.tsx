import React, { useState, useRef, useEffect } from "react";
import { FieldWrapper } from "../input";
import { Icono } from "../icons";

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "value"
> {
  label?: string;
  descripcion?: string;
  error?: string;
  options: Option[];
  onChange?: (value: string) => void;
  value?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  descripcion,
  error,
  options,
  onChange,
  value,
  className = "",
  ...props
}) => {
  const Down = Icono.ChevronDown;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) onChange(e.target.value);
  };

  return (
    <FieldWrapper label={label} descripcion={descripcion} error={error}>
      <div className="relative w-full">
        <select
          value={value}
          onChange={handleChange}
          className={`w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 pr-10 text-sm text-zinc-100 placeholder-zinc-600 transition-all focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]/50 focus:outline-none disabled:opacity-50 ${
            error ? "border-red-500" : ""
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-zinc-950 text-zinc-100"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-zinc-500">
          <Down className="h-4 w-4" />
        </div>
      </div>
    </FieldWrapper>
  );
};

interface MultiSelectProps {
  label?: string;
  descripcion?: string;
  error?: string;
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  descripcion,
  error,
  options,
  value,
  onChange,
  placeholder = "Seleccionar opciones...",
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const CloseIcon = Icono.Close;
  const DownIcon = Icono.ChevronDown;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleToggleOption = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  return (
    <FieldWrapper label={label} descripcion={descripcion} error={error}>
      <div ref={containerRef} className="relative w-full">
        <div
          onClick={() => setOpen(!open)}
          className={`flex min-h-[42px] w-full cursor-pointer flex-wrap items-center justify-between gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 ${
            open ? "border-[#10B981] ring-1 ring-[#10B981]/50" : ""
          } ${error ? "border-red-500" : ""}`}
        >
          {value.length === 0 ? (
            <span className="text-sm text-zinc-600">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {value.map((val) => {
                const optLabel =
                  options.find((o) => o.value === val)?.label || val;
                return (
                  <span
                    key={val}
                    className="inline-flex items-center gap-1 rounded border border-[#2A2A2E] bg-[#18181B] px-2 py-0.5 text-xs font-bold text-zinc-300"
                  >
                    {optLabel}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleOption(val);
                      }}
                      className="text-zinc-500 hover:text-zinc-300 focus:outline-none"
                    >
                      <CloseIcon className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <DownIcon className="h-4 w-4 text-zinc-500" />
        </div>

        {open && (
          <div className="absolute top-[calc(105%)] left-0 z-50 max-h-60 w-full overflow-y-auto rounded-xl border border-[#2A2A2E] bg-zinc-950 p-1 shadow-2xl">
            {options.map((opt) => {
              const selected = value.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => handleToggleOption(opt.value)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                    selected
                      ? "bg-emerald-500/10 font-bold text-emerald-400"
                      : "text-zinc-300 hover:bg-[#18181B]"
                  }`}
                >
                  {opt.label}
                  {selected && <Icono.Check className="h-4 w-4" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FieldWrapper>
  );
};

interface ComboboxProps {
  label?: string;
  descripcion?: string;
  error?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const Combobox: React.FC<ComboboxProps> = ({
  label,
  descripcion,
  error,
  options,
  value,
  onChange,
  placeholder = "Seleccionar opción...",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label || "";

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <FieldWrapper label={label} descripcion={descripcion} error={error}>
      <div ref={containerRef} className="relative w-full">
        <div
          onClick={() => setOpen(!open)}
          className={`flex w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm ${
            open ? "border-[#10B981] ring-1 ring-[#10B981]/50" : ""
          } ${error ? "border-red-500" : ""}`}
        >
          <span className={selectedLabel ? "text-zinc-100" : "text-zinc-600"}>
            {selectedLabel || placeholder}
          </span>
          <Icono.ChevronDown className="h-4 w-4 text-zinc-500" />
        </div>

        {open && (
          <div className="absolute top-[calc(105%)] left-0 z-50 flex w-full flex-col gap-1.5 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-2 shadow-2xl">
            <div className="relative">
              <Icono.Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-1.5 pr-4 pl-9 text-xs text-zinc-100 placeholder-zinc-500 transition-all focus:border-[#10B981] focus:outline-none"
              />
            </div>
            <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto p-0.5">
              {filteredOptions.length === 0 ? (
                <div className="py-2 text-center text-xs text-zinc-600">
                  Sin resultados
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition-all ${
                      opt.value === value
                        ? "bg-emerald-500/10 font-bold text-emerald-400"
                        : "text-zinc-300 hover:bg-[#18181B]"
                    }`}
                  >
                    {opt.label}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </FieldWrapper>
  );
};
