// Generado desde ejercicios-matriz.json (referencia del usuario) — no editar a
// mano, si hace falta corregir algo, corregir el JSON fuente y regenerar.
import type { CatalogoEjercicio } from "./ejercicio.entity";

export const CATALOGO_EJERCICIOS_SEED: CatalogoEjercicio[] = [
  {
    id: "cej_emp_flexiones",
    patron: "empuje",
    nombre: "Flexiones de brazos / Lagartijas (Push-ups)",
    tipoConteo: "repes",
    modoConteo: "global",
    equipamiento: ["peso_corporal", "pared", "banco", "silla"],
    esPausaActiva: false,
    esNeat: false,
    permiteCarga: false,
    niveles: [
      {
        nivel: -3,
        nombre: "Flexiones de brazos apoyado en pared",
        detalle:
          "Disminución máxima del vector de carga por inclinación casi vertical. Ideal para rehabilitación o fatiga extrema.",
      },
      {
        nivel: -2,
        nombre: "Flexiones con manos elevadas en banco/mesa",
        detalle:
          "Reduce la fracción de peso corporal soportado (aprox. 40-50% del peso corporal).",
      },
      {
        nivel: -1,
        nombre: "Flexiones apoyando rodillas en suelo",
        detalle:
          "Mantiene el plano horizontal recortando el brazo de palanca desde las rodillas.",
      },
      {
        nivel: 0,
        nombre: "Flexiones planas estrictas en suelo",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Flexiones declinadas (pies elevados en silla/banco)",
        detalle:
          "Aumenta la sobrecarga sobre el haz clavicular del pectoral y deltoides anterior.",
      },
      {
        nivel: 2,
        nombre: "Flexiones arqueadas (Archer Push-ups)",
        detalle:
          "Carga predominantemente un solo brazo mientras el otro actúa como estabilizador.",
      },
      {
        nivel: 3,
        nombre: "Flexiones a una mano libre",
        detalle:
          "Demanda máxima de fuerza unilateral y control anti-rotacional del core.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_emp_press_militar",
    patron: "empuje",
    nombre: "Press Militar / Press de Hombros",
    tipoConteo: "repes",
    modoConteo: "global",
    equipamiento: ["mancuernas", "kettlebell", "mochila", "banda_elastica"],
    esPausaActiva: false,
    esNeat: false,
    permiteCarga: true,
    niveles: [
      {
        nivel: -2,
        nombre: "Press de hombros sentado con banda elástica",
        detalle:
          "Ajuste de resistencia progresiva y descarga de columna por apoyo en silla.",
      },
      {
        nivel: -1,
        nombre: "Press de hombros sentado con respaldo",
        detalle:
          "Elimina la exigencia de estabilización de piernas y zona lumbar.",
      },
      {
        nivel: 0,
        nombre: "Press militar de pie con mancuernas/mochila",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Flexiones Pike en suelo (cadera en 'V' invertida)",
        detalle:
          "Orienta el peso corporal verticalmente sobre la cintura escapular.",
      },
      {
        nivel: 2,
        nombre: "Flexiones Pike con pies elevados en silla",
        detalle:
          "Aumenta el porcentaje de peso corporal sostenido por los hombros.",
      },
      {
        nivel: 3,
        nombre: "Flexión en pino / Handstand Push-up apoyado en pared",
        detalle:
          "Fuerza de empuje vertical pura con la totalidad del peso corporal.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_emp_fondos",
    patron: "empuje",
    nombre: "Fondos en Paralelas / Banco (Dips)",
    tipoConteo: "repes",
    modoConteo: "global",
    equipamiento: ["paralelas", "sillas", "banco", "peso_corporal"],
    esPausaActiva: false,
    esNeat: false,
    permiteCarga: false,
    niveles: [
      {
        nivel: -2,
        nombre: "Fondos en banco con pies apoyados en suelo (rodillas a 90°)",
        detalle: "Descarga sustancial del peso en miembros inferiores.",
      },
      {
        nivel: -1,
        nombre: "Fondos en banco con piernas extendidas",
        detalle:
          "Aumenta la palanca y carga sobre tríceps y pectoral inferior.",
      },
      {
        nivel: 0,
        nombre: "Fondos libres en paralelas / dos sillas firmes",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Fondos en paralelas con pausa abajo (2 segundos)",
        detalle:
          "Elimina el rebote elástico y fortalece el punto ciego en estiramiento.",
      },
      {
        nivel: 2,
        nombre: "Fondos en paralelas con lastre / mochila cargada",
        detalle: "Sobrecarga progresiva lineal por adición de peso externo.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_tir_remo_invertido",
    patron: "tiron",
    nombre: "Remo Invertido / Australiano (Bodyweight Row)",
    tipoConteo: "repes",
    modoConteo: "global",
    equipamiento: ["mesa_firme", "trx", "barra_baja", "sillas"],
    esPausaActiva: false,
    esNeat: false,
    permiteCarga: false,
    niveles: [
      {
        nivel: -2,
        nombre: "Remo en marco de puerta / sábana en ángulo vertical",
        detalle:
          "Mínima exigencia de fuerza por inclinación corporal casi erguida.",
      },
      {
        nivel: -1,
        nombre: "Remo invertido con pies apoyados y rodillas flexionadas",
        detalle:
          "Reduce el brazo de momento y alivia la tensión en la cadena posterior.",
      },
      {
        nivel: 0,
        nombre: "Remo invertido con cuerpo horizontal al suelo bajo mesa/barra",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Remo invertido con pies elevados en silla",
        detalle:
          "Incrementa la carga gravitacional sobre la espalda alta y retractores escapulares.",
      },
      {
        nivel: 2,
        nombre: "Remo invertido a un solo brazo",
        detalle:
          "Alta exigencia de tracción unilateral y estabilidad anti-rotacional.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_tir_dominadas",
    patron: "tiron",
    nombre: "Dominadas (Pull-ups / Chin-ups)",
    tipoConteo: "repes",
    modoConteo: "global",
    equipamiento: ["barra_dominadas", "banda_elastica", "peso_corporal"],
    esPausaActiva: false,
    esNeat: false,
    permiteCarga: true,
    niveles: [
      {
        nivel: -3,
        nombre: "Jalón al pecho de pie con banda elástica fijada arriba",
        detalle:
          "Aprender el patrón de depresión escapular con carga regulable.",
      },
      {
        nivel: -2,
        nombre: "Dominadas asistidas con banda elástica gruesa",
        detalle:
          "La banda alivia la carga en el punto inicial de máxima desventaja mecánica.",
      },
      {
        nivel: -1,
        nombre: "Dominadas negativas (salto a la barra y bajada en 5 segundos)",
        detalle: "Construye fuerza mediante sobrecarga excéntrica controlada.",
      },
      {
        nivel: 0,
        nombre: "Dominada estricta prona/supina completa",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Dominada con sostén isométrico arriba (3 segundos)",
        detalle: "Refuerza la máxima contracción y depresión escapular.",
      },
      {
        nivel: 2,
        nombre: "Dominadas arqueadas (Archer Pull-ups)",
        detalle: "Transferencia asimétrica de peso hacia un solo lado.",
      },
      {
        nivel: 3,
        nombre: "Dominadas estrictas con lastre (mochila cargada)",
        detalle: "Aumento directo de la densidad y carga absoluta.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_tir_remo_unilateral",
    patron: "tiron",
    nombre: "Remo Horizontal a 1 Brazo con Mancuerna/Kettlebell",
    tipoConteo: "repes",
    modoConteo: "por_lado",
    equipamiento: ["mancuerna", "kettlebell", "mochila", "silla"],
    esPausaActiva: false,
    esNeat: false,
    permiteCarga: true,
    niveles: [
      {
        nivel: -1,
        nombre: "Remo a 1 brazo con apoyo de pecho en mesa/respaldo",
        detalle: "Inmoviliza el torso para evitar compensación lumbar.",
      },
      {
        nivel: 0,
        nombre: "Remo a 1 brazo apoyando mano libre en silla/banco",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Remo a 1 brazo en posición de zancada libre (Kettlebell Row)",
        detalle:
          "Requiere mayor estabilización del núcleo y extensores de cadera.",
      },
      {
        nivel: 2,
        nombre: "Remo Renegado en posición de plancha alta",
        detalle:
          "Combina tracción unilateral con anti-rotación estricta de core.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_rod_sentadilla_goblet",
    patron: "dominante_rodilla",
    nombre: "Sentadilla Copa / Aire (Goblet / Air Squat)",
    tipoConteo: "repes",
    modoConteo: "global",
    equipamiento: ["peso_corporal", "mancuerna", "kettlebell", "mochila"],
    esPausaActiva: false,
    esNeat: false,
    permiteCarga: true,
    niveles: [
      {
        nivel: -2,
        nombre: "Sentadilla a una silla alta con apoyo total",
        detalle:
          "Enseña el patrón de sentarse sin exigir rango completo de tobillo.",
      },
      {
        nivel: -1,
        nombre: "Sentadilla asistida sosteniéndose de un marco/TRX",
        detalle: "Descarga peso para permitir mayor profundidad y movilidad.",
      },
      {
        nivel: 0,
        nombre: "Sentadilla libre profunda / Copa con peso al pecho",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Sentadilla Copa con pausa de 3 segundos en el fondo",
        detalle:
          "Desarrolla fuerza en el punto ciego e hipertrofia por tiempo bajo tensión.",
      },
      {
        nivel: 2,
        nombre: "Sentadilla con mochila cargada o doble pesas al hombro",
        detalle: "Aumento directo del peso externo absoluto.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_rod_estocadas",
    patron: "dominante_rodilla",
    nombre: "Estocadas / Zancadas (Lunges / Split Squat)",
    tipoConteo: "repes",
    modoConteo: "por_lado",
    equipamiento: ["peso_corporal", "mancuernas", "mochila"],
    esPausaActiva: false,
    esNeat: false,
    permiteCarga: true,
    niveles: [
      {
        nivel: -2,
        nombre: "Sentadilla Split estática sosteniéndose de pared",
        detalle: "Pies fijos sin fase de impacto ni desaceleración.",
      },
      {
        nivel: -1,
        nombre: "Sentadilla Split estática libre sin peso",
        detalle: "Trabajo de estabilidad unipodal en posición estática.",
      },
      {
        nivel: 0,
        nombre: "Estocada reversa / caminada libre (Reverse / Walking Lunge)",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Sentadilla Búlgara (pie trasero elevado en silla)",
        detalle: "Aísla casi el 90% de la carga en la pierna delantera.",
      },
      {
        nivel: 2,
        nombre:
          "Skater Squat (sentadilla a 1 pierna con la otra flotando atrás)",
        detalle:
          "Elimina el apoyo posterior, exigiendo control total de la rodilla.",
      },
      {
        nivel: 3,
        nombre:
          "Pistol Squat (sentadilla a 1 pierna con pierna extendida adelante)",
        detalle:
          "Máxima exigencia de fuerza unipodal, dorsiflexión y movilidad de cadera.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_cad_peso_muerto_rumano",
    patron: "dominante_cadera",
    nombre: "Peso Muerto Rumano (RDL - Romanian Deadlift)",
    tipoConteo: "repes",
    modoConteo: "global",
    equipamiento: ["mancuernas", "kettlebell", "mochila", "barra"],
    esPausaActiva: false,
    esNeat: false,
    permiteCarga: true,
    niveles: [
      {
        nivel: -2,
        nombre: "Bisagra de cadera tocando pared con glúteos",
        detalle:
          "Patrón educativo para obligar a llevar la cadera hacia atrás sin flexionar rodillas.",
      },
      {
        nivel: -1,
        nombre: "Buenos Días (Good Mornings) con banda elástica en cuello",
        detalle:
          "Carga ligera centrada en la activación isométrica de la columna.",
      },
      {
        nivel: 0,
        nombre: "Peso Muerto Rumano bípode con mancuernas/mochila",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Peso Muerto Rumano en posición B-Stance (escalonado)",
        detalle:
          "Carga el 80% del peso en una pierna manteniendo un dedo de la otra apoyado.",
      },
      {
        nivel: 2,
        nombre: "Peso Muerto Rumano a 1 pierna libre",
        detalle:
          "Gran desafío para los estabilizadores de la cadera y el tobillo.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_cad_hip_thrust",
    patron: "dominante_cadera",
    nombre: "Puente de Cadera / Hip Thrust",
    tipoConteo: "repes",
    modoConteo: "global",
    equipamiento: ["peso_corporal", "silla_sofá", "mochila", "mancuerna"],
    esPausaActiva: false,
    esNeat: false,
    permiteCarga: true,
    niveles: [
      {
        nivel: -2,
        nombre: "Puente de glúteo bípode en suelo sin peso",
        detalle:
          "Rango corto sin carga externa, enfocado en re-activar los glúteos.",
      },
      {
        nivel: -1,
        nombre: "Puente de glúteo en suelo con sostenimiento de 3 segundos",
        detalle:
          "Aumenta la activación neuromuscular mediante contracción isométrica.",
      },
      {
        nivel: 0,
        nombre: "Hip Thrust con espalda elevada en sofá/silla y peso en pelvis",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Puente de glúteo a 1 pierna en suelo",
        detalle: "Duplica la carga relativa sobre el glúteo activo.",
      },
      {
        nivel: 2,
        nombre: "Hip Thrust elevado a 1 pierna",
        detalle:
          "Combina rango de movimiento extendido con carga unilateral estricta.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_cad_kettlebell_swing",
    patron: "dominante_cadera",
    nombre: "Kettlebell Swing (Balístico de Cadera)",
    tipoConteo: "repes",
    modoConteo: "global",
    equipamiento: ["kettlebell", "mancuerna", "mochila_pesada"],
    esPausaActiva: false,
    esNeat: false,
    permiteCarga: true,
    niveles: [
      {
        nivel: -1,
        nombre: "Peso Muerto Rumano acelerado concéntrico",
        detalle:
          "Construye la intención de velocidad sin el componente balístico del péndulo.",
      },
      {
        nivel: 0,
        nombre: "Kettlebell Swing ruso a dos manos (hasta la altura del pecho)",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Kettlebell Swing a 1 sola mano",
        detalle: "Añade un componente de control anti-rotacional en el torso.",
      },
      {
        nivel: 2,
        nombre: "Kettlebell Swing con cambio de mano en la fase flotante",
        detalle:
          "Mayor exigencia de coordinación intra-muscular y tiempo de reacción.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_cor_plancha_frontal",
    patron: "core_transporte",
    nombre: "Plancha Frontal (Anti-extensión)",
    tipoConteo: "tiempo",
    modoConteo: "global",
    equipamiento: ["peso_corporal"],
    esPausaActiva: false,
    esNeat: false,
    permiteCarga: false,
    niveles: [
      {
        nivel: -2,
        nombre: "Plancha frontal apoyado en mesa/silla",
        detalle: "Disminuye la exigencia gravitacional en la pared abdominal.",
      },
      {
        nivel: -1,
        nombre: "Plancha frontal apoyando rodillas en suelo",
        detalle: "Reduce la palanca conservando la horizontalidad.",
      },
      {
        nivel: 0,
        nombre: "Plancha frontal estricta apalancada en antebrazos y pies",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Plancha frontal con codos adelantados (Long-lever Plank)",
        detalle:
          "Incrementa dramáticamente el momento de fuerza extensor sobre la columna.",
      },
      {
        nivel: 2,
        nombre: "Rollout con Rueda Abdominal / Toalla en suelo deslizante",
        detalle: "Anti-extensión dinámica en máximo rango de estiramiento.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_cor_caminatas_carga",
    patron: "core_transporte",
    nombre: "Caminata de Granjero y Valija (Carries)",
    tipoConteo: "tiempo",
    modoConteo: "por_lado",
    equipamiento: ["mancuernas", "kettlebells", "bidones_agua"],
    esPausaActiva: false,
    esNeat: false,
    permiteCarga: true,
    niveles: [
      {
        nivel: -1,
        nombre:
          "Caminata del Granjero Bilateral (2 pesos equilibrados a los lados)",
        detalle:
          "Distribución simétrica de carga; enfocado en agarre y postura erguida.",
      },
      {
        nivel: 0,
        nombre: "Caminata de Valija (Suitcase Carry - 1 solo peso a un lado)",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre:
          "Caminata en Posición Rack (1 peso sosteniéndose al pecho/hombro)",
        detalle:
          "Eleva el centro de gravedad requiriendo mayor antirotación e inclinación.",
      },
      {
        nivel: 2,
        nombre: "Caminata Overhead (1 peso sostenido por encima de la cabeza)",
        detalle:
          "Máxima exigencia de estabilidad escapular, torácica y abdominal.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_pau_chair_stands",
    patron: "pausa_movilidad",
    nombre: "Levantamientos de la Silla sin Manos (Chair Stands)",
    tipoConteo: "tiempo",
    modoConteo: "global",
    equipamiento: ["silla_oficina"],
    esPausaActiva: true,
    esNeat: false,
    permiteCarga: false,
    niveles: [
      {
        nivel: -1,
        nombre: "Levantarse de la silla empujándose levemente con las manos",
        detalle: "Para momentos de fatiga extrema o articulaciones sensibles.",
      },
      {
        nivel: 0,
        nombre:
          "Levantarse y sentarse de la silla continuamente sin usar brazos",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre:
          "Levantamiento rozando el asiento con pausa de 2 segundos sin apoyarse",
        detalle: "Mayor tiempo bajo tensión en cuádriceps y glúteos.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_pau_puente_amnesia_glutea",
    patron: "pausa_movilidad",
    nombre: "Puente de Glúteo Isométrico (Desinhibición Pélvica)",
    tipoConteo: "repes",
    modoConteo: "global",
    equipamiento: ["colchoneta_piso"],
    esPausaActiva: true,
    esNeat: false,
    permiteCarga: false,
    niveles: [
      {
        nivel: -1,
        nombre: "Puente de glúteo continuo sin pausa isométrica",
        detalle: "Activación suave para articulaciones rígidas.",
      },
      {
        nivel: 0,
        nombre:
          "Puente de glúteo en suelo con pausa isométrica de 3 segundos en extensión total",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Puente de glúteo a 1 pierna con sostenimiento de 2 segundos",
        detalle: "Mayor reactivación de glúteo mayor y medio.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_pau_soleo_pump",
    patron: "pausa_movilidad",
    nombre: "Bombardeo de Sóleo / Calf Raises Sentado",
    tipoConteo: "repes",
    modoConteo: "global",
    equipamiento: ["silla_oficina"],
    esPausaActiva: true,
    esNeat: false,
    permiteCarga: false,
    niveles: [
      {
        nivel: 0,
        nombre: "Elevación de talones sentado en la silla con espalda erguida",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre:
          "Elevación de talones sentado presionando con las manos sobre las rodillas",
        detalle: "Añade resistencia manual al movimiento.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_pau_movilidad_toracica",
    patron: "pausa_movilidad",
    nombre: "Extensión y Rotación Torácica en Silla",
    tipoConteo: "repes",
    modoConteo: "por_lado",
    equipamiento: ["silla_oficina"],
    esPausaActiva: true,
    esNeat: false,
    permiteCarga: false,
    niveles: [
      {
        nivel: -1,
        nombre: "Rotación torácica con manos cruzadas sobre el pecho",
        detalle: "Menor palanca para hombros con rigidez.",
      },
      {
        nivel: 0,
        nombre:
          "Rotación torácica sentado con manos en la nuca abriendo el codo",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre:
          "Extensión torácica apoyando antebrazos en pared e inclinando el pecho",
        detalle: "Abre la cadena anterior e inmoviliza la zona lumbar.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_neat_caminata_liss",
    patron: "neat",
    nombre: "Caminata Ligera / Continua (LISS)",
    tipoConteo: "distancia",
    modoConteo: "global",
    equipamiento: ["calzado_comodo"],
    esPausaActiva: false,
    esNeat: true,
    permiteCarga: false,
    niveles: [
      {
        nivel: -1,
        nombre:
          "Interrupción de sedentarismo: 2 minutos de caminata suave por casa",
        detalle: "Aclaramiento metabólico exprés postprandial.",
      },
      {
        nivel: 0,
        nombre:
          "Caminata al aire libre a ritmo conversacional (RPE 3-4 / Zona 1-2)",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Caminata a paso ligero (RPE 5-6 / 5 a 6 km/h)",
        detalle:
          "Entra directamente en la franja óptima de Zona 2 cardiovascular.",
      },
      {
        nivel: 2,
        nombre: "Rucking con mochila cargada (5kg a 10kg)",
        detalle:
          "Aumenta la densidad ósea y el gasto calórico sin impacto articular.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_neat_subida_escaleras",
    patron: "neat",
    nombre: "Subida de Escaleras Acumulada",
    tipoConteo: "tiempo",
    modoConteo: "global",
    equipamiento: ["escaleras"],
    esPausaActiva: true,
    esNeat: true,
    permiteCarga: false,
    niveles: [
      {
        nivel: -1,
        nombre: "Subida de escaleras sujetándose del pasamanos",
        detalle: "Descarga articular para rodillas.",
      },
      {
        nivel: 0,
        nombre: "Subir escaleras paso a paso de forma continua",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Subir escaleras de 2 en 2 escalones",
        detalle: "Mayor reclutamiento de extensores de cadera y glúteos.",
      },
    ],
    creadoEn: 0,
  },
  {
    id: "cej_neat_ciclismo_urbano",
    patron: "neat",
    nombre: "Ciclismo Urbano / Bicicleta Fija",
    tipoConteo: "distancia",
    modoConteo: "global",
    equipamiento: ["bicicleta"],
    esPausaActiva: false,
    esNeat: true,
    permiteCarga: false,
    niveles: [
      {
        nivel: 0,
        nombre: "Pedaleo moderado continuo en bicicleta estática o paseo",
        detalle: "Versión base",
      },
      {
        nivel: 1,
        nombre: "Pedaleo sostenido 45 minutos en umbral conversacional",
        detalle: "Optimiza la biogénesis mitocondrial y salud cardiovascular.",
      },
    ],
    creadoEn: 0,
  },
];
