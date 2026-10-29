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
  generarPromptEtapa2ProyectosPorArea,
  generarPromptEtapa3EntregablesYSOPs,
  generarPromptEtapa3EntregablesPorArea,
  generarPromptEtapa4Actividades,
  formatearMapaAreasYObjetivos,
  generarPromptAuditoriaArea,
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

  test("formatearMapaAreasYObjetivos agrupa correctamente las áreas con sus objetivos", () => {
    const areas = [
      { id: "area-1", nombre: "Perfil Profesional" },
      { id: "area-2", nombre: "Salud" },
    ];
    const objetivos = [
      {
        id: "obj-1",
        areaId: "area-1",
        titulo: "Licenciatura en Administración",
        cantidadObjetivo: 8,
        unidad: "instancias",
        diaLimite: "2027-12-31",
      },
      {
        id: "obj-2",
        areaId: "area-2",
        titulo: "Entrenar fuerza",
        cantidadObjetivo: 150,
        unidad: "sesiones",
        diaLimite: "2026-12-31",
      },
    ];

    const mapa = formatearMapaAreasYObjetivos(areas, objetivos);
    assert.ok(mapa.includes('• Área: "Perfil Profesional" (1 objetivo):'));
    assert.ok(mapa.includes('• Área: "Salud" (1 objetivo):'));
    assert.ok(mapa.includes("Licenciatura en Administración"));
    assert.ok(mapa.includes("8 instancias"));
  });

  test("generarPromptEtapa2Proyectos con mapa de contexto global incluye panorama general", () => {
    const mapa =
      '• Área: "Perfil Profesional" (1 objetivo):\n   - [Objetivo] "Licenciatura"';
    const prompt = generarPromptEtapa2Proyectos(
      "Licenciatura",
      "Meta: 8 instancias, vence 2027-12-31, área: Perfil Profesional",
      [],
      mapa
    );

    assert.ok(prompt.includes("<panorama_general_areas_y_objetivos>"));
    assert.ok(prompt.includes(mapa));
    assert.ok(prompt.includes("<objetivo_padre>"));
    assert.ok(prompt.includes("Licenciatura"));
  });

  test("generarPromptEtapa2ProyectosPorArea excluye objetivos ya planificados para no duplicar", () => {
    const pendientes = [
      {
        titulo: "Desarrollar MVP",
        cantidadObjetivo: 1,
        unidad: "MVP",
        diaLimite: "2026-12-31",
      },
    ];
    const yaPlanificados = [
      {
        titulo: "Licenciatura en Administración",
        proyectos: ["Tesis final", "Prácticas profesionales"],
      },
    ];
    const mapaOtras =
      '• Área: "Salud" (1 objetivo):\n   - [Objetivo] "Entrenar"';

    const prompt = generarPromptEtapa2ProyectosPorArea(
      "Perfil Profesional",
      pendientes,
      yaPlanificados,
      mapaOtras
    );

    assert.ok(prompt.includes("<objetivos_ya_planificados_no_repetir>"));
    assert.ok(prompt.includes("Licenciatura en Administración"));
    assert.ok(prompt.includes("Tesis final, Prácticas profesionales"));
    assert.ok(prompt.includes("NO generes proyectos para ellos"));
    assert.ok(prompt.includes("<objetivos_a_desglosar_ahora>"));
    assert.ok(prompt.includes("Desarrollar MVP"));
    assert.ok(prompt.includes('"areaTitulo": "Perfil Profesional"'));
    assert.ok(prompt.includes('"objetivos"'));
  });

  test("formatearMapaAreasYObjetivos al filtrar otras áreas no marca los objetivos de la actual como 'Sin clasificar'", () => {
    const areas = [
      { id: "area-1", nombre: "Perfil Profesional" },
      { id: "area-2", nombre: "Salud" },
      { id: "area-3", nombre: "Deportista" },
    ];
    const objetivos = [
      { id: "o1", areaId: "area-1", titulo: "Obj Profesional" },
      { id: "o2", areaId: "area-2", titulo: "Obj Salud" },
      { id: "o3", areaId: "area-3", titulo: "Obj Deporte" },
    ];

    // Simulamos el copiado de prompt para "Salud"
    const areaTargetId = "area-2";
    const otrasAreas = areas.filter((a) => a.id !== areaTargetId);
    const otrosObjetivos = objetivos.filter((o) => o.areaId !== areaTargetId);

    const mapa = formatearMapaAreasYObjetivos(otrasAreas, otrosObjetivos);

    assert.ok(mapa.includes('• Área: "Perfil Profesional"'));
    assert.ok(mapa.includes('• Área: "Deportista"'));
    assert.ok(
      !mapa.includes("Sin clasificar"),
      "no debe aparecer 'Sin clasificar'"
    );
    assert.ok(
      !mapa.includes("Obj Salud"),
      "no debe listar objetivos del área actual en el mapa de las otras"
    );
  });

  test("generarPromptEtapa3EntregablesPorArea marca entregables opcionales e indica proyectos ya planificados", () => {
    const pendientes = [
      {
        titulo: "Motor de Prospección",
        objetivoTitulo: "Concretar primer empleo",
        diaLimite: "2026-12-31",
        cantidadObjetivo: 150,
        unidad: "contactos",
      },
    ];
    const conEntregables = [
      {
        titulo: "Revisiones semanales",
        entregables: ["SOP de revisión dominical", "Dashboard de métricas"],
      },
    ];
    const mapaOtras =
      '• Área: "Salud" (1 objetivo):\n   - [Objetivo] "Entrenar"';

    const prompt = generarPromptEtapa3EntregablesPorArea(
      "Perfil Profesional",
      pendientes,
      conEntregables,
      mapaOtras
    );

    // Debe mencionar optionalidad
    assert.ok(
      prompt.includes("opcion") ||
        prompt.includes("Opcional") ||
        prompt.includes("opcional"),
      "debe mencionar que los entregables son opcionales"
    );
    // Debe listar proyectos ya planificados para que la IA no los repita
    assert.ok(
      prompt.includes("<proyectos_ya_planificados_no_repetir>"),
      "debe incluir bloque proyectos_ya_planificados_no_repetir"
    );
    assert.ok(prompt.includes("Revisiones semanales"));
    assert.ok(prompt.includes("SOP de revisión dominical"));
    // Debe incluir los proyectos pendientes
    assert.ok(
      prompt.includes("<proyectos_a_desglosar_ahora>"),
      "debe incluir bloque proyectos_a_desglosar_ahora"
    );
    assert.ok(prompt.includes("Motor de Prospección"));
    // El output debe pedir areaTitulo y proyectos[]
    assert.ok(prompt.includes('"areaTitulo"'));
    assert.ok(prompt.includes('"proyectos"'));
    assert.ok(prompt.includes('"entregablesNuevos"'));
    // En Etapa 3 NO deben pedirse actividades diarias (separación de fases)
    assert.ok(!prompt.includes('"actividades": []'));
  });

  test("generarPromptEtapa3EntregablesPorArea excluye y lista proyectos pospuestos para más adelante", () => {
    const seleccionados = [
      {
        titulo: "Motor de Prospección",
        objetivoTitulo: "Empleo IT",
      },
    ];
    const pospuestos = [
      {
        titulo: "Certificación Cloud AWS",
        objetivoTitulo: "Capacitación",
      },
    ];

    const prompt = generarPromptEtapa3EntregablesPorArea(
      "Perfil Profesional",
      seleccionados,
      [],
      "",
      pospuestos
    );

    assert.ok(
      prompt.includes("<proyectos_pospuestos_o_futuros_no_desglosar>"),
      "debe incluir el bloque de proyectos pospuestos"
    );
    assert.ok(prompt.includes("Certificación Cloud AWS"));
    assert.ok(
      prompt.includes("NO generes entregables para ellos en este momento")
    );
    assert.ok(prompt.includes("<proyectos_a_desglosar_ahora>"));
    assert.ok(prompt.includes("Motor de Prospección"));
  });

  test("generarPromptAuditoriaArea genera un mapa jerárquico completo para revisión con IA", () => {
    const objetivos = [
      {
        id: "o1",
        titulo: "Lograr 150 contactos calificados",
        cantidadObjetivo: 150,
        unidad: "contactos",
        diaLimite: "2027-02-28",
      },
    ];
    const proyectos = [
      {
        id: "p1",
        objetivoId: "o1",
        titulo: "Motor de Prospección Outbound",
        cantidadObjetivo: 150,
        unidad: "contactos",
        diaLimite: "2027-01-31",
      },
      {
        id: "p2",
        objetivoId: "o1",
        titulo: "Capacitación en CRM",
      },
    ];
    const entregables = [
      {
        id: "e1",
        proyectoId: "p1",
        titulo: "Semana 1: Filtro de base en LinkedIn",
        cantidadObjetivo: 50,
        unidad: "leads",
        diaLimite: "2027-01-10",
      },
    ];
    const actividades = [
      {
        id: "a1",
        entregableId: "e1",
        procedimientoId: "proc-1",
      },
    ];

    const prompt = generarPromptAuditoriaArea(
      "Perfil Profesional",
      objetivos,
      proyectos,
      entregables,
      actividades
    );

    assert.ok(prompt.includes('Área: "Perfil Profesional"'));
    assert.ok(prompt.includes("Lograr 150 contactos calificados"));
    assert.ok(prompt.includes("Motor de Prospección Outbound"));
    assert.ok(prompt.includes("Semana 1: Filtro de base en LinkedIn"));
    assert.ok(prompt.includes("[📋 Con Procedimiento/SOP]"));
    assert.ok(prompt.includes("Proyecto simple/directo sin entregables"));
    assert.ok(prompt.includes("<criterios_de_auditoria_a_evaluar>"));
  });
});
