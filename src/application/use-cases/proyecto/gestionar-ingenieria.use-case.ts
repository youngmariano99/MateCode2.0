/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorValidacion,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";

export interface StackConfig {
  frontend: string[];
  backend: string[];
  baseDatos: string[];
  infraestructura: string[];
  seguridad: string[];
  integraciones: string[];
}

export interface EstandaresConfig {
  arquitectura: string[];
  patrones: string[];
  buenasPracticas: string[];
  principios: string[];
  testing: string[];
  devops: string[];
  coberturaMinima: number;
}

export interface ProductOwnerConfig {
  problema: string;
  dolor: string;
  objetivos: string;
  usuarios: string;
  restricciones: string;
  competencia: string;
  notas: string;
}

export interface FinancieroConfig {
  precioTotal: number;
  moneda: string;
  formaPago: string;
  cantidadPagos: number;
  estadoPago: string;
}

export class GestionarIngenieriaUseCase {
  public async configurarStackYEstandares(
    proyectoId: string,
    stack: StackConfig,
    estandares: EstandaresConfig
  ): Promise<Resultado<void>> {
    const proyecto = await db.proyectos.get(proyectoId);
    if (!proyecto) {
      return Resultado.falla(new ErrorNoEncontrado("Proyecto no encontrado."));
    }

    await db.proyectos.put({
      ...proyecto,
      stack,
      estandares,
      fechaActualizacion: Date.now(),
    });

    return Resultado.exito(undefined);
  }

  public async guardarProductOwner(
    proyectoId: string,
    productOwner: ProductOwnerConfig
  ): Promise<Resultado<void>> {
    const proyecto = await db.proyectos.get(proyectoId);
    if (!proyecto) {
      return Resultado.falla(new ErrorNoEncontrado("Proyecto no encontrado."));
    }

    await db.proyectos.put({
      ...proyecto,
      productOwner,
      fechaActualizacion: Date.now(),
    });

    return Resultado.exito(undefined);
  }

  public async guardarFinanciero(
    proyectoId: string,
    financiero: FinancieroConfig
  ): Promise<Resultado<void>> {
    const proyecto = await db.proyectos.get(proyectoId);
    if (!proyecto) {
      return Resultado.falla(new ErrorNoEncontrado("Proyecto no encontrado."));
    }

    await db.proyectos.put({
      ...proyecto,
      financiero,
      fechaActualizacion: Date.now(),
    });

    return Resultado.exito(undefined);
  }

  public async generarPrompt(proyectoId: string): Promise<Resultado<string>> {
    const proyecto = await db.proyectos.get(proyectoId);
    if (!proyecto) {
      return Resultado.falla(new ErrorNoEncontrado("Proyecto no encontrado."));
    }

    const po = (proyecto.productOwner || {}) as Partial<ProductOwnerConfig>;
    const stack = (proyecto.stack || {}) as Partial<StackConfig>;
    const estandares = (proyecto.estandares || {}) as Partial<EstandaresConfig>;

    const prompt = `Actúa como un Ingeniero de Software Principal y Product Owner.
Genera un Backlog estructurado en JSON para el siguiente proyecto:

INFORMACIÓN DEL PROYECTO:
- Nombre: ${proyecto.nombre}
- Tipo: ${proyecto.tipo || "No especificado"}
- Descripción: ${proyecto.descripcion || ""}

CONTEXTO DE PRODUCT OWNER (NEGOCIO):
- Problema a resolver: ${po.problema || ""}
- Dolor del usuario: ${po.dolor || ""}
- Objetivos de negocio: ${po.objetivos || ""}
- Restricciones: ${po.restricciones || ""}
- Competencia principal: ${po.competencia || ""}

STACK TECNOLÓGICO SELECCIONADO:
- Frontend: ${(stack.frontend || []).join(", ")}
- Backend: ${(stack.backend || []).join(", ")}
- Base de Datos: ${(stack.baseDatos || []).join(", ")}
- DevOps/Infraestructura: ${(stack.infraestructura || []).join(", ")}
- Seguridad: ${(stack.seguridad || []).join(", ")}
- Integraciones: ${(stack.integraciones || []).join(", ")}

ESTÁNDARES DE INGENIERÍA:
- Arquitectura: ${(estandares.arquitectura || []).join(", ")}
- Patrones de Diseño: ${(estandares.patrones || []).join(", ")}
- Buenas Prácticas: ${(estandares.buenasPracticas || []).join(", ")}
- Principios de OO: ${(estandares.principios || []).join(", ")}
- Testing: ${(estandares.testing || []).join(", ")}
- Cobertura de tests sugerida: ${estandares.coberturaMinima || 80}%

REQUERIMIENTO:
Retorna ÚNICAMENTE un objeto JSON con el siguiente formato, sin explicaciones ni markdown:
{
  "epicas": [
    { "id": "ep_1", "nombre": "Nombre de la Épica", "descripcion": "Detalle funcional de la épica" }
  ],
  "historias": [
    {
      "id": "us_1",
      "epicaId": "ep_1",
      "titulo": "Título de la historia",
      "descripcion": "Como... Quiero... Para...",
      "prioridad": "Alta",
      "estimacion": 5,
      "dependencias": [],
      "etiquetas": ["frontend", "auth"]
    }
  ]
}`;

    return Resultado.exito(prompt);
  }

  public async generarPromptEspecializado(
    proyectoId: string,
    templateId: string,
    customVariables: Record<string, string> = {}
  ): Promise<Resultado<string>> {
    const proyecto = (await db.proyectos.get(proyectoId)) as any;
    if (!proyecto) {
      return Resultado.falla(new ErrorNoEncontrado("Proyecto no encontrado."));
    }

    const template = await db.prompt_templates.get(templateId);
    if (!template) {
      return Resultado.falla(
        new ErrorNoEncontrado("Plantilla de prompt no encontrada.")
      );
    }

    const poContext = ((await db.proyecto_contexto.get(proyectoId)) ||
      {}) as any;
    const ds = ((await db.proyecto_design_system.get(proyectoId)) || {}) as any;

    const projectStack = (proyecto.stack || {}) as any;
    const projectEstandares = (proyecto.estandares || {}) as any;

    let content = template.contenido as string;

    const valuesMap: Record<string, string> = {
      dolores_cliente: (
        poContext.doloresCliente ||
        proyecto.productOwner?.dolor ||
        ""
      ).toString(),
      reglas_negocio: (
        poContext.reglasNegocio ||
        proyecto.productOwner?.restricciones ||
        ""
      ).toString(),
      publico_objetivo: (
        poContext.publicoObjetivo ||
        proyecto.productOwner?.usuarios ||
        ""
      ).toString(),

      arquetipo: (ds.arquetipo || "Diseño Suizo").toString(),
      metafora: (ds.metafora || "").toString(),
      radio_bordes: (ds.radioBordes || "0px").toString(),
      sombras: (ds.sombras || "Prohibidas").toString(),
      directrices_diseno: (ds.directrizNegacion || "").toString(),
      escala_espaciado: (ds.escalaEspaciado || "Holgado").toString(),
      reglas_color: (ds.reglaColor || "").toString(),
      tipografias: (ds.tipografias || "Inter").toString(),
      animaciones: (ds.estiloAnimaciones || "Secas 0ms").toString(),

      stack_frontend: (projectStack.frontend || []).join(", "),
      stack_backend: (projectStack.backend || []).join(", "),
      stack_base_datos: (projectStack.baseDatos || []).join(", "),
      arquitectura_patrones: [
        ...(projectEstandares.arquitectura || []),
        ...(projectEstandares.patrones || []),
      ].join(", "),
      ...customVariables,
    };

    Object.keys(valuesMap).forEach((key) => {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      content = content.replace(
        placeholder,
        valuesMap[key] || `[Ingresar ${key}]`
      );
    });

    content += `\n\n[Instrucción de Sistema Oculta]
Al finalizar tu tarea, si agregaste una nueva librería, modificaste una tabla de la base de datos o cambiaste la arquitectura, debes añadir al final de tu respuesta un bloque de código JSON con el lenguaje json-app-sync siguiendo esta estructura:
\`\`\`json-app-sync
{
  "update_type": "database|dependencies",
  "data": {
    "dependencies": ["nombre_libreria_1", "nombre_libreria_2"],
    "esquemaDb": {
      "nombre_tabla": {
        "campos": ["id", "nombre", "tipo"],
        "descripcion": "Descripción corta de su propósito"
      }
    }
  }
}
\`\`\``;

    return Resultado.exito(content);
  }

  public async generarPromptIngesta(
    proyectoId: string
  ): Promise<Resultado<string>> {
    const proyecto = await db.proyectos.get(proyectoId);
    if (!proyecto) {
      return Resultado.falla(new ErrorNoEncontrado("Proyecto no encontrado."));
    }

    const ingestaPrompt = `Actúa como un Analista de Software Senior.
Necesito realizar ingeniería inversa (Reverse Engineering) de un proyecto de software en curso para integrarlo a nuestro Workspace.

INSTRUCCIONES:
1. Lee detenidamente el código fuente, la estructura de directorios, el archivo package.json y el README de este proyecto.
2. Extrae y formatea la información del proyecto según la estructura JSON detallada a continuación.
3. Devuelve EXCLUSIVAMENTE un objeto JSON con este formato exacto, sin explicaciones, sin texto introductorio y sin formateo markdown (solo el JSON puro):

{
  "contexto": {
    "doloresCliente": "Resumen de dolores que resuelve la aplicación",
    "reglasNegocio": "Leyes o reglas principales del negocio/código",
    "publicoObjetivo": "Para quién está construida"
  },
  "stack": {
    "frontend": ["React", "TypeScript"],
    "backend": ["NodeJS", "Express"],
    "baseDatos": ["PostgreSQL"]
  },
  "designSystem": {
    "arquetipo": "Elegir uno de: Diseño Suizo, Brutalismo, Neumorfismo, Material Design 3, Neo-Retro, Cyberpunk Oscuro, Minimalismo Monocromático",
    "metafora": "Metáfora del vibe del diseño actual",
    "radioBordes": "0px o 4px o 12px o Píldora",
    "sombras": "Prohibidas o Sombras Duras o Sombras Difusas",
    "directrizNegacion": "Directivas de lo que evita o no hace el diseño",
    "parejaTipografica": "Tipografías detectadas o aconsejadas",
    "escalaEspaciado": "Holgado o Denso",
    "reglaColor": "Paleta cromática detectada",
    "estiloAnimaciones": "Secas 0ms o Elásticas Spring o Suaves Ease-in-out",
    "estadoHover": "Efectos al pasar el cursor"
  },
  "epicas": [
    { "id": "ep_1", "nombre": "Nombre de la Épica", "descripcion": "Descripción del módulo" }
  ],
  "historias": [
    {
      "id": "us_1",
      "epicaId": "ep_1",
      "titulo": "Título de la Historia",
      "descripcion": "Como... Quiero... Para...",
      "prioridad": "Alta",
      "estimacion": 3,
      "etiquetas": ["frontend", "backend"]
    }
  ]
}`;

    return Resultado.exito(ingestaPrompt);
  }

  public async sincronizarEstado(
    proyectoId: string,
    syncJsonText: string
  ): Promise<Resultado<void>> {
    try {
      const cleanedText = syncJsonText.replace(/```[a-z0-9_-]*/gi, "").trim();

      const syncObj = JSON.parse(cleanedText);
      if (!syncObj.update_type || !syncObj.data) {
        return Resultado.falla(
          new ErrorValidacion(
            "Formato json-app-sync inválido. Falta 'update_type' o 'data'."
          )
        );
      }

      const pState = (await db.proyecto_estado_tecnico.get(proyectoId)) || {
        proyectoId,
        dependencias: [],
        esquemaDb: {},
      };

      if (syncObj.update_type === "dependencies") {
        const newDeps = syncObj.data.dependencies || [];
        const currentDeps = (pState.dependencias as string[]) || [];
        const mergedDeps = Array.from(new Set([...currentDeps, ...newDeps]));
        pState.dependencias = mergedDeps;
      } else if (syncObj.update_type === "database") {
        const newSchema = syncObj.data.esquemaDb || {};
        pState.esquemaDb = {
          ...(pState.esquemaDb as Record<string, unknown>),
          ...newSchema,
        };
      } else {
        return Resultado.falla(
          new ErrorValidacion(
            `Tipo de actualización no soportado: ${syncObj.update_type}`
          )
        );
      }

      await db.proyecto_estado_tecnico.put(pState);

      await db.logs_sincronizacion.add({
        tipo: "exito",
        mensaje: `Sincronización Bidireccional exitosa (${syncObj.update_type}) para Proyecto ID ${proyectoId}`,
        fecha: Date.now(),
      });

      return Resultado.exito(undefined);
    } catch (e: unknown) {
      const err = e as Error;
      return Resultado.falla(
        new ErrorValidacion(`Error al procesar json-app-sync: ${err.message}`)
      );
    }
  }

  public async exportarContextoMarkdown(
    proyectoId: string
  ): Promise<Resultado<string>> {
    const proyecto = await db.proyectos.get(proyectoId);
    if (!proyecto) {
      return Resultado.falla(new ErrorNoEncontrado("Proyecto no encontrado."));
    }

    const po = (proyecto.productOwner || {}) as Partial<ProductOwnerConfig>;
    const stack = (proyecto.stack || {}) as Partial<StackConfig>;
    const estandares = (proyecto.estandares || {}) as Partial<EstandaresConfig>;

    const epicas = await db.epicas
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    const historias = await db.historias
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();

    let md = `# Contexto del Proyecto: ${proyecto.nombre}\n\n`;
    md += `## 1. Información General\n`;
    md += `- **Tipo de Proyecto:** ${proyecto.tipo || "General"}\n`;
    md += `- **Estado Actual:** ${proyecto.estado || "Análisis"}\n`;
    md += `- **Descripción:** ${proyecto.descripcion || ""}\n\n`;

    md += `## 2. Contexto de Negocio (Product Owner)\n`;
    md += `### Problema\n${po.problema || "No cargado"}\n\n`;
    md += `### Dolor\n${po.dolor || "No cargado"}\n\n`;
    md += `### Objetivos\n${po.objetivos || "No cargados"}\n\n`;
    md += `### Restricciones\n${po.restricciones || "Ninguna"}\n\n`;

    md += `## 3. Stack Tecnológico\n`;
    md += `- **Frontend:** ${(stack.frontend || []).join(", ") || "No definido"}\n`;
    md += `- **Backend:** ${(stack.backend || []).join(", ") || "No definido"}\n`;
    md += `- **Base de Datos:** ${(stack.baseDatos || []).join(", ") || "No definido"}\n`;
    md += `- **Infraestructura:** ${(stack.infraestructura || []).join(", ") || "No definido"}\n\n`;

    md += `## 4. Estándares y Prácticas\n`;
    md += `- **Arquitectura:** ${(estandares.arquitectura || []).join(", ") || "No definida"}\n`;
    md += `- **Patrones:** ${(estandares.patrones || []).join(", ") || "No definidos"}\n`;
    md += `- **Buenas Prácticas:** ${(estandares.buenasPracticas || []).join(", ") || "No definidas"}\n`;
    md += `- **Testing:** ${(estandares.testing || []).join(", ") || "No definidos"}\n\n`;

    md += `## 5. Backlog de Ingeniería\n`;
    md += `### Épicas (${epicas.length})\n`;
    for (const ep of epicas) {
      md += `- **${ep.nombre}** [${ep.id}]: ${ep.descripcion || ""}\n`;
    }
    md += `\n### Historias de Usuario (${historias.length})\n`;
    for (const us of historias) {
      md += `#### ${us.titulo} [${us.id}]\n`;
      md += `- **Épica:** ${us.epicaId || "General"}\n`;
      md += `- **Prioridad:** ${us.prioridad || "Media"}\n`;
      md += `- **Estimación:** ${us.estimacion || 0} pts\n`;
      md += `- **Estado:** ${us.estado || "backlog"}\n`;
      md += `- **Descripción:** ${us.descripcion || ""}\n\n`;
    }

    return Resultado.exito(md);
  }

  public async importarBacklogJSON(
    proyectoId: string,
    backlogJson: string
  ): Promise<Resultado<void>> {
    try {
      const data = JSON.parse(backlogJson);
      const isFullIngesta = data.contexto || data.stack || data.designSystem;

      const epicas = data.epicas || [];
      const historias = data.historias || [];

      await db.epicas.where("proyectoId").equals(proyectoId).delete();
      await db.historias.where("proyectoId").equals(proyectoId).delete();

      for (const ep of epicas) {
        if (!ep.id || !ep.nombre) {
          return Resultado.falla(
            new ErrorValidacion(
              "Cada épica debe contener al menos 'id' y 'nombre'."
            )
          );
        }
        await db.epicas.put({
          id: ep.id,
          proyectoId,
          nombre: ep.nombre,
          descripcion: ep.descripcion || "",
          creadoEn: Date.now(),
        });
      }

      for (const us of historias) {
        if (!us.id || !us.titulo) {
          return Resultado.falla(
            new ErrorValidacion(
              "Cada historia debe contener al menos 'id' y 'titulo'."
            )
          );
        }
        await db.historias.put({
          id: us.id,
          proyectoId,
          epicaId: us.epicaId || "",
          sprintId: "",
          titulo: us.titulo,
          descripcion: us.descripcion || "",
          prioridad: us.prioridad || "Media",
          estimacion: typeof us.estimacion === "number" ? us.estimacion : 1,
          estado: "backlog",
          dependencias: Array.isArray(us.dependencias) ? us.dependencias : [],
          etiquetas: Array.isArray(us.etiquetas) ? us.etiquetas : [],
          creadoEn: Date.now(),
        });
      }

      if (isFullIngesta) {
        if (data.contexto) {
          await db.proyecto_contexto.put({
            proyectoId,
            doloresCliente: data.contexto.doloresCliente || "",
            reglasNegocio: data.contexto.reglasNegocio || "",
            publicoObjetivo: data.contexto.publicoObjetivo || "",
          });
        }

        if (data.designSystem) {
          await db.proyecto_design_system.put({
            proyectoId,
            arquetipo: data.designSystem.arquetipo || "Diseño Suizo",
            metafora: data.designSystem.metafora || "",
            radioBordes: data.designSystem.radioBordes || "0px",
            sombras: data.designSystem.sombras || "Prohibidas",
            directrizNegacion: data.designSystem.directrizNegacion || "",
            parejaTipografica: data.designSystem.parejaTipografica || "Inter",
            escalaEspaciado: data.designSystem.escalaEspaciado || "Holgado",
            reglaColor: data.designSystem.reglaColor || "",
            estiloAnimaciones:
              data.designSystem.estiloAnimaciones || "Secas 0ms",
            estadoHover: data.designSystem.estadoHover || "",
            logoUrl: data.designSystem.logoUrl || "",
          });
        }

        if (data.stack) {
          const proyecto = await db.proyectos.get(proyectoId);
          if (proyecto) {
            await db.proyectos.put({
              ...proyecto,
              stack: {
                ...(proyecto.stack as Record<string, string[]>),
                frontend: data.stack.frontend || [],
                backend: data.stack.backend || [],
                baseDatos: data.stack.baseDatos || [],
              },
            });
          }

          await db.proyecto_estado_tecnico.put({
            proyectoId,
            dependencias: [
              ...(data.stack.frontend || []),
              ...(data.stack.backend || []),
            ],
            esquemaDb: {},
          });
        }
      }

      await db.logs_sincronizacion.add({
        tipo: "exito",
        mensaje: `Ingeniería: Backlog ${isFullIngesta ? "con Ingeniería Inversa" : ""} importado. Épicas: ${epicas.length}, Historias: ${historias.length}`,
        fecha: Date.now(),
      });

      return Resultado.exito(undefined);
    } catch (e: unknown) {
      const err = e as Error;
      return Resultado.falla(
        new ErrorValidacion(`Formato JSON inválido: ${err.message}`)
      );
    }
  }
}
