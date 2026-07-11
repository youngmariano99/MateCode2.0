import React, { useState } from "react";
import { Icono } from "../icons";

interface FieldWrapperProps {
  label?: string;
  descripcion?: string;
  error?: string;
  children: React.ReactNode;
}

export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  label,
  descripcion,
  error,
  children,
}) => (
  <div className="flex w-full flex-col gap-1.5">
    {label && (
      <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
        {label}
      </label>
    )}
    {children}
    {error && <span className="mt-0.5 text-xs text-red-400">{error}</span>}
    {descripcion && !error && (
      <span className="mt-0.5 text-xs text-zinc-500">{descripcion}</span>
    )}
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  descripcion?: string;
  error?: string;
  icono?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  descripcion,
  error,
  icono,
  className = "",
  ...props
}) => {
  const baseInputStyle =
    "w-full bg-zinc-950 border border-zinc-800 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]/50 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all text-sm disabled:opacity-50 disabled:pointer-events-none";

  return (
    <FieldWrapper label={label} descripcion={descripcion} error={error}>
      <div className="relative w-full">
        {icono && (
          <div className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-500">
            {icono}
          </div>
        )}
        <input
          className={`${baseInputStyle} ${icono ? "pl-10" : ""} ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : ""
          } ${className}`}
          {...props}
        />
      </div>
    </FieldWrapper>
  );
};

export const InputPassword: React.FC<InputProps> = ({
  label,
  descripcion,
  error,
  className = "",
  ...props
}) => {
  const [show, setShow] = useState(false);
  const EyeOpen = Icono.Eye;
  const EyeClosed = Icono.EyeOff;

  return (
    <FieldWrapper label={label} descripcion={descripcion} error={error}>
      <div className="relative w-full">
        <input
          type={show ? "text" : "password"}
          className={`w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pr-10 pl-4 text-sm text-zinc-100 placeholder-zinc-600 transition-all focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]/50 focus:outline-none disabled:opacity-50 ${
            error ? "border-red-500" : ""
          } ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute top-1/2 right-3.5 -translate-y-1/2 text-zinc-500 transition-all hover:text-zinc-300 focus:outline-none"
        >
          {show ? (
            <EyeClosed className="h-4 w-4" />
          ) : (
            <EyeOpen className="h-4 w-4" />
          )}
        </button>
      </div>
    </FieldWrapper>
  );
};

export const InputSearch: React.FC<InputProps> = (props) => {
  const Lupa = Icono.Search;
  return <Input icono={<Lupa className="h-4 w-4" />} {...props} />;
};

interface CurrencyProps extends Omit<InputProps, "onChange"> {
  onChange?: (val: number) => void;
  value?: number;
}

export const InputCurrency: React.FC<CurrencyProps> = ({
  label,
  descripcion,
  error,
  value,
  onChange,
  className = "",
  ...props
}) => {
  const Dollar = Icono.Pagos;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value.replace(/[^0-9.]/g, ""));
    if (onChange) onChange(isNaN(val) ? 0 : val);
  };

  return (
    <Input
      label={label}
      descripcion={descripcion}
      error={error}
      type="text"
      value={value !== undefined ? `$ ${value.toLocaleString()}` : ""}
      onChange={handleChange}
      icono={<Dollar className="h-4 w-4" />}
      className={className}
      {...props}
    />
  );
};

export const PhoneInput: React.FC<InputProps> = (props) => {
  const Tel = Icono.Phone;
  return <Input type="tel" icono={<Tel className="h-4 w-4" />} {...props} />;
};
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  descripcion?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  descripcion,
  error,
  className = "",
  ...props
}) => {
  const baseStyle =
    "w-full bg-zinc-950 border border-zinc-800 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]/50 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all text-sm disabled:opacity-50 disabled:pointer-events-none min-h-[100px] resize-y";

  return (
    <FieldWrapper label={label} descripcion={descripcion} error={error}>
      <textarea
        className={`${baseStyle} ${error ? "border-red-500" : ""} ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
};

interface FileUploadProps {
  label?: string;
  descripcion?: string;
  error?: string;
  onChange?: (files: FileList | null) => void;
  accept?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  descripcion,
  error,
  onChange,
  accept,
}) => {
  const Up = Icono.Upload;
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (onChange) onChange(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (onChange) onChange(e.target.files);
    }
  };

  return (
    <FieldWrapper label={label} descripcion={descripcion} error={error}>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative flex w-full flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-all ${
          dragActive
            ? "border-emerald-500 bg-emerald-500/5"
            : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
        } ${error ? "border-red-500 bg-red-500/5" : ""}`}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <Up className="mb-2 h-8 w-8 text-zinc-500" />
        <span className="text-sm font-semibold text-zinc-300">
          Arrastra tu archivo o haz clic para subir
        </span>
        <span className="mt-1 text-xs text-zinc-500">
          PDF, PNG, JPG, ZIP de hasta 10MB
        </span>
      </div>
    </FieldWrapper>
  );
};
