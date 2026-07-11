"use client";

import React, { useState } from "react";
import { Card } from "../card";
import { Button } from "../button";

interface MarkdownEditorProps {
  initialValues?: {
    problema?: string;
    dolor?: string;
    objetivos?: string;
    usuarios?: string;
    restricciones?: string;
    competencia?: string;
    notas?: string;
  };
  onSave: (payload: Record<string, string>) => void;
}

type TabPO =
  | "problema"
  | "dolor"
  | "objetivos"
  | "restricciones"
  | "competencia"
  | "notas";

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialValues = {},
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<TabPO>("problema");

  const [values, setValues] = useState({
    problema: initialValues.problema || "",
    dolor: initialValues.dolor || "",
    objetivos: initialValues.objetivos || "",
    usuarios: initialValues.usuarios || "",
    restricciones: initialValues.restricciones || "",
    competencia: initialValues.competencia || "",
    notas: initialValues.notas || "",
  });

  const handleTextChange = (txt: string) => {
    setValues({
      ...values,
      [activeTab]: txt,
    });
  };

  const handleSave = () => {
    onSave(values);
  };

  const tabs: { id: TabPO; label: string }[] = [
    { id: "problema", label: "Problema" },
    { id: "dolor", label: "Dolor del Usuario" },
    { id: "objetivos", label: "Objetivos" },
    { id: "restricciones", label: "Restricciones" },
    { id: "competencia", label: "Competencia" },
    { id: "notas", label: "Notas" },
  ];

  return (
    <Card>
      <div className="mb-4 border-b border-[#2A2A2E] pb-3">
        <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
          Contexto del Product Owner
        </h3>
        <p className="font-mono text-[10px] text-zinc-500">
          Define el alcance funcional y de negocio del proyecto
        </p>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto border-b border-[#2A2A2E]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`border-b-2 px-3 py-2 font-mono text-[9px] font-bold whitespace-nowrap transition-all ${
              activeTab === t.id
                ? "border-emerald-500 bg-emerald-500/5 font-bold text-emerald-400"
                : "border-transparent text-zinc-400 hover:bg-zinc-800/20 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <textarea
          value={values[activeTab]}
          onChange={(e) => handleTextChange(e.target.value)}
          className="h-[220px] w-full rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4 font-mono text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          placeholder={`Describe aquí los detalles sobre: ${activeTab}...`}
        />

        <div className="flex justify-end border-t border-[#2A2A2E] pt-2">
          <Button onClick={handleSave}>Guardar Contexto PO</Button>
        </div>
      </div>
    </Card>
  );
};
