"use client";

import React from "react";
import { Card } from "../card";

interface SelectorPlantillaProps {
  onSeleccionar: (plantilla: { titulo: string; contenido: string }) => void;
}

const PLANTILLAS_PREDEFINIDAS = [
  {
    titulo: "Contrato SaaS de Servicios",
    desc: "Modelo estándar para provisión de software y hosting en la nube.",
    contenido: `# CONTRATO DE PRESTACIÓN DE SERVICIOS SAAS

Conste por el presente documento que se celebra entre **{{agencia.nombre}}** con email de contacto **{{agencia.email}}**, y por otra parte el cliente **{{cliente.nombre}}** de la compañía **{{cliente.empresa}}** con CUIT **{{cliente.cuit}}**.

## OBJETO DEL CONTRATO
La agencia proveerá el servicio de desarrollo para el proyecto **{{proyecto.nombre}}**, con fecha objetivo de entrega programada para **{{proyecto.fecha_entrega}}**.

## MONTO Y FORMA DE PAGO
El monto total acordado asciende a **{{monto.total}}**, el cual será abonado mediante la modalidad de **{{forma_pago}}**.

Firma Agencia: _________________________
Firma Cliente: _________________________`,
  },
  {
    titulo: "Acuerdo de Confidencialidad (NDA)",
    desc: "Acuerdo bilateral para resguardo de propiedad intelectual y datos.",
    contenido: `# ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN (NDA)

Reunidos por una parte **{{agencia.nombre}}** y por otra **{{cliente.nombre}}** en representación de **{{cliente.empresa}}**.

Ambas partes acuerdan mantener bajo estricto secreto toda la información técnica, comercial o de desarrollo vinculada al proyecto **{{proyecto.nombre}}** iniciada en la fecha **{{fecha_actual}}**.

El incumplimiento dará lugar a penalidades acordadas en la jurisdicción correspondiente.`,
  },
  {
    titulo: "Propuesta Comercial de Desarrollo",
    desc: "Presupuesto detallado para landings o integraciones.",
    contenido: `# PROPUESTA COMERCIAL - MATECODE

## Estimado cliente {{cliente.nombre}},

Agradecemos el interés en nuestros servicios para **{{cliente.empresa}}**. A continuación, detallamos la cotización de los servicios de diseño y programación para **{{proyecto.nombre}}**:

* **Monto Estimado:** {{monto.total}}
* **Forma de Pago:** {{forma_pago}}
* **Fecha de Entrega:** {{proyecto.fecha_entrega}}

Quedamos a su disposición para cualquier modificación.`,
  },
];

export const SelectorPlantilla: React.FC<SelectorPlantillaProps> = ({
  onSeleccionar,
}) => {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      {PLANTILLAS_PREDEFINIDAS.map((p) => (
        <Card key={p.titulo}>
          <h4 className="mb-1 font-mono text-xs font-extrabold text-white">
            {p.titulo}
          </h4>
          <p className="mb-4 font-mono text-[10px] text-zinc-500">{p.desc}</p>
          <button
            onClick={() => onSeleccionar(p)}
            className="w-full rounded-xl border border-[#2A2A2E] bg-[#18181B] py-2 font-mono text-[10px] font-bold text-emerald-400 transition-all hover:bg-[#2A2A2E]"
          >
            Usar esta Plantilla
          </button>
        </Card>
      ))}
    </div>
  );
};
