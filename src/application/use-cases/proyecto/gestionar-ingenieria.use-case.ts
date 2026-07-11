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
      if (!Array.isArray(data.epicas) || !Array.isArray(data.historias)) {
        return Resultado.falla(
          new ErrorValidacion(
            "El JSON de backlog debe incluir 'epicas' e 'historias' como arrays."
          )
        );
      }

      await db.epicas.where("proyectoId").equals(proyectoId).delete();
      await db.historias.where("proyectoId").equals(proyectoId).delete();

      for (const ep of data.epicas) {
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

      for (const us of data.historias) {
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

      await db.logs_sincronizacion.add({
        tipo: "exito",
        mensaje: `Ingeniería: Backlog importado correctamente. Épicas: ${data.epicas.length}, Historias: ${data.historias.length}`,
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
