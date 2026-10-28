import { test, describe } from "node:test";
import assert from "node:assert";
import {
  generarPromptActividades,
  generarPromptArbolCompleto,
  generarPromptAjusteIA,
  generarPromptEntregable,
  generarPromptFases,
  generarPromptObjetivo,
  generarPromptPlanificacionEnFases,
  generarPromptProyecto,
  generarPromptEtapa1Objetivos,
  generarPromptEtapa2Proyectos,
  generarPromptEtapa3EntregablesYSOPs,
  generarPromptEtapa4Actividades,
} from "../../domain/prompts/generar-prompt-jerarquia-personal";
import { obtenerDiaTareaHoy } from "../../domain/entidades/personal.entity";

const prompts: { nombre: string; texto: string; clavesRaiz: string[] }[] = [
  {
    nombre: "árbol completo",
    texto: generarPromptArbolCompleto("sin historia", ["Salud"]),
    clavesRaiz: ["areaTitulo", "objetivosNuevos"],
  },
  {
    nombre: "solo objetivo",
    texto: generarPromptObjetivo("sin historia", ["Salud"]),
    clavesRaiz: ["areaTitulo", "objetivosNuevos"],
  },
  {
    nombre: "proyecto bajo objetivo",
    texto: generarPromptProyecto("Mi objetivo", "vence 2027-01-01"),
    clavesRaiz: ["objetivoTitulo", "proyectosNuevos"],
  },
  {
    nombre: "entregable bajo proyecto",
    texto: generarPromptEntregable("Mi proyecto", "vence 2027-01-01"),
    clavesRaiz: ["proyectoTitulo", "entregablesNuevos"],
  },
  {
    nombre: "fases bajo entregable",
    texto: generarPromptFases("Mi entregable", "vence 2027-01-01"),
    clavesRaiz: ["entregableTitulo", "fasesNuevas"],
  },
  {
    nombre: "actividades bajo entregable",
    texto: generarPromptActividades("Mi entregable", "vence 2027-01-01"),
    clavesRaiz: ["entregableTitulo", "actividadesNuevas", "repartos"],
  },
  {
    nombre: "planificación en etapas",
    texto: generarPromptPlanificacionEnFases("sin historia", ["Salud"], ""),
    clavesRaiz: ["areaTitulo", "objetivosNuevos"],
  },
  {
    nombre: "ajuste con IA",
    texto: generarPromptAjusteIA("Objetivo: X"),
    clavesRaiz: ["ajustes"],
  },
  {
    nombre: "etapa 1: objetivos",
    texto: generarPromptEtapa1Objetivos("sin historia", ["Salud"]),
    clavesRaiz: ["areaTitulo", "objetivosNuevos"],
  },
  {
    nombre: "etapa 2: proyectos",
    texto: generarPromptEtapa2Proyectos("Mi objetivo", "vence 2027-01-01"),
    clavesRaiz: ["objetivoTitulo", "proyectosNuevos"],
  },
  {
    nombre: "etapa 3: entregables y SOPs",
    texto: generarPromptEtapa3EntregablesYSOPs(
      "Mi proyecto",
      "vence 2027-01-01"
    ),
    clavesRaiz: ["proyectoTitulo", "entregablesNuevos"],
  },
  {
    nombre: "etapa 4: actividades",
    texto: generarPromptEtapa4Actividades("Mi entregable", "vence 2027-01-01"),
    clavesRaiz: ["entregableTitulo", "actividadesNuevas", "repartos"],
  },
];

describe("Prompts de la jerarquía Personal: contexto y reglas comunes", () => {
  for (const p of prompts) {
    test(`"${p.nombre}" trae la fecha de hoy, la numeración de días y las reglas del JSON`, () => {
      assert.ok(p.texto.includes("<fecha_actual>"));
      assert.ok(p.texto.includes(obtenerDiaTareaHoy()), "la fecha real de hoy");
      assert.ok(p.texto.includes("0=domingo"));
      assert.ok(p.texto.includes("<reglas_del_json>"));
      assert.ok(p.texto.includes("EXACTO"), "regla de títulos exactos");
      if (p.nombre === "ajuste con IA") {
        assert.ok(p.texto.includes("solo AJUSTA"));
        assert.ok(!p.texto.includes("solo CREA"), "el ajuste no crea nada");
      } else {
        assert.ok(
          p.texto.includes("no lo duplica"),
          "aviso de que repetir algo existente no lo duplica"
        );
        assert.ok(p.texto.includes("solo CREA"));
      }
    });

    test(`"${p.nombre}" describe su propia estructura de salida (claves raíz)`, () => {
      const salida = p.texto.slice(p.texto.indexOf("<output_requerido>"));
      for (const clave of p.clavesRaiz) {
        assert.ok(
          salida.includes(`"${clave}"`),
          `falta "${clave}" en el output`
        );
      }
    });
  }

  test("los prompts que arman estructura explican el 'reparto' (y no la recurrencia para metas numéricas)", () => {
    for (const nombre of [
      "árbol completo",
      "proyecto bajo objetivo",
      "entregable bajo proyecto",
      "fases bajo entregable",
      "actividades bajo entregable",
      "planificación en etapas",
    ]) {
      const p = prompts.find((x) => x.nombre === nombre)!;
      assert.ok(
        p.texto.includes('"reparto"'),
        `${nombre} debería mencionar reparto`
      );
    }
    const entregable = prompts.find(
      (x) => x.nombre === "entregable bajo proyecto"
    )!;
    assert.ok(entregable.texto.includes('NO uses "recurrencia"'));
  });

  test("la fecha de hoy cae en el día de la semana correcto", () => {
    const hoy = obtenerDiaTareaHoy();
    const [a, m, d] = hoy.split("-").map(Number);
    const nombres = [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ];
    const esperado = nombres[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
    assert.ok(prompts[0].texto.includes(`Hoy es ${esperado} ${hoy}`));
  });

  test("los prompts modulares por etapas incorporan límites de agenda y visión general", () => {
    const e1 = prompts.find((x) => x.nombre === "etapa 1: objetivos")!;
    assert.ok(e1.texto.includes("<vision_general_del_sistema>"));
    assert.ok(e1.texto.includes("<limites_de_la_app>"));
    assert.ok(e1.texto.includes("MÁXIMO 1 Actividad de Enfoque"));

    const e2 = prompts.find((x) => x.nombre === "etapa 2: proyectos")!;
    assert.ok(e2.texto.includes("<limites_de_la_app>"));
    assert.ok(e2.texto.includes("Desglosar el Objetivo en 2 a 4 Proyectos"));

    const e3 = prompts.find((x) => x.nombre === "etapa 3: entregables y SOPs")!;
    assert.ok(e3.texto.includes("<procedimientos_sops>"));
    assert.ok(e3.texto.includes('"procedimiento"'));
    assert.ok(e3.texto.includes("Protocolo de Contacto en Frío"));

    const e4 = prompts.find((x) => x.nombre === "etapa 4: actividades")!;
    assert.ok(e4.texto.includes("<limites_de_la_app>"));
    assert.ok(e4.texto.includes("enfoque"));
    assert.ok(e4.texto.includes("mantenimiento"));
  });

  test("los prompts globales (árbol completo y etapas) mencionan Procedimientos/SOPs y límites de capacidad", () => {
    const arbol = prompts.find((x) => x.nombre === "árbol completo")!;
    assert.ok(arbol.texto.includes("<limites_de_la_app>"));
    assert.ok(arbol.texto.includes("<procedimientos_sops>"));

    const etapas = prompts.find((x) => x.nombre === "planificación en etapas")!;
    assert.ok(etapas.texto.includes("<limites_de_la_app>"));
    assert.ok(etapas.texto.includes("<procedimientos_sops>"));
  });
});
