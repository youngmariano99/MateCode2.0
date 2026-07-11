"use client";

import React, { useState, useRef, useEffect } from "react";
import { Icono } from "../icons";
import { FieldWrapper } from "../input";

interface CalendarProps {
  value?: Date;
  onChange?: (date: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ value, onChange }) => {
  const [currentDate, setCurrentDate] = useState(() => value || new Date());

  const ArrowLeft = Icono.ChevronLeft;
  const ArrowRight = Icono.ChevronRight;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const startDayOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDaysInMonth = new Date(year, month, 0).getDate();

  const daysArray = [];

  for (let i = startDayOffset; i > 0; i--) {
    daysArray.push({
      day: prevDaysInMonth - i + 1,
      currentMonth: false,
      date: new Date(year, month - 1, prevDaysInMonth - i + 1),
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push({
      day: i,
      currentMonth: true,
      date: new Date(year, month, i),
    });
  }

  const totalCells = 42;
  const nextMonthFill = totalCells - daysArray.length;
  for (let i = 1; i <= nextMonthFill; i++) {
    daysArray.push({
      day: i,
      currentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  const nombresMeses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const diasSemana = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

  const esMismoDia = (d1?: Date, d2?: Date) => {
    if (!d1 || !d2) return false;
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  return (
    <div className="w-full max-w-[280px] rounded-xl border border-[#2A2A2E] bg-[#18181B] p-3.5 shadow-xl select-none">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-xs font-bold tracking-wide text-zinc-200">
          {nombresMeses[month]} {year}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="rounded-lg p-1 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200 focus:outline-none"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="rounded-lg p-1 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200 focus:outline-none"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center">
        {diasSemana.map((d) => (
          <span
            key={d}
            className="text-[10px] font-bold text-zinc-500 uppercase"
          >
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {daysArray.map((cell, idx) => {
          const seleccionado = esMismoDia(cell.date, value);
          return (
            <div
              key={idx}
              onClick={() =>
                cell.currentMonth && onChange && onChange(cell.date)
              }
              className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-xs transition-all ${
                !cell.currentMonth
                  ? "pointer-events-none text-zinc-700"
                  : seleccionado
                    ? "bg-emerald-500 font-bold text-zinc-950"
                    : "text-zinc-300 hover:bg-zinc-800/80"
              }`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface DatePickerProps {
  label?: string;
  descripcion?: string;
  error?: string;
  value?: Date;
  onChange?: (date: Date) => void;
  placeholder?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  descripcion,
  error,
  value,
  onChange,
  placeholder = "Seleccionar fecha...",
}) => {
  const [open, setOpen] = useState(false);
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

  const formatFecha = (d?: Date) => {
    if (!d) return "";
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getFullYear()}`;
  };

  return (
    <FieldWrapper label={label} descripcion={descripcion} error={error}>
      <div ref={containerRef} className="relative w-full">
        <div
          onClick={() => setOpen(!open)}
          className={`flex w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm ${
            open ? "border-[#10B981] ring-1 ring-[#10B981]/50" : ""
          } ${error ? "border-red-500" : ""}`}
        >
          <span className={value ? "text-zinc-100" : "text-zinc-600"}>
            {formatFecha(value) || placeholder}
          </span>
          <Icono.Calendario className="h-4 w-4 text-zinc-500" />
        </div>

        {open && (
          <div className="absolute top-[calc(105%)] left-0 z-50 mt-1">
            <Calendar
              value={value}
              onChange={(d) => {
                if (onChange) onChange(d);
                setOpen(false);
              }}
            />
          </div>
        )}
      </div>
    </FieldWrapper>
  );
};
