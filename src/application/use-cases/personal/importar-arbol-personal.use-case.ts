import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorDominio } from "../../../domain/errores/error-base";
import {
  importarArbolPersonalSchema,
  importarProyectoBajoObjetivoSchema,
  importarEntregableBajoProyectoSchema,
  importarActividadesBajoEntregableSchema,
  importarFasesBajoEntregableSchema,
  type ItemObjetivoJson,
  type ItemProyectoJson,
  type ItemEntregableJson,
  type ItemActividadJson,
  type ItemFaseJson,
} from "../../../domain/entidades/planificacion-jerarquica.entity";
import { GestionarAreasUseCase } from "./gestionar-areas.use-case";
import { GestionarObjetivosUseCase } from "./gestionar-objetivos.use-case";
import { GestionarProyectosPersonalUseCase } from "./gestionar-proyectos-personal.use-case";
import { GestionarEntregablesUseCase } from "./gestionar-entregables.use-case";
import { GestionarActividadesUseCase } from "./gestionar-actividades.use-case";
import { GestionarFasesUseCase } from "./gestionar-fases.use-case";
import { DistribuirPlanUseCase } from "./distribuir-plan.use-case";
import {
  expandirReparto,
  type RepartoJson,
} from "../../../domain/entidades/distribucion-personal.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";

/** Arma un mensaje legible a partir de los issues de zod — mismo criterio que en importar-planificacion.use-case.ts. */
function mensajeDeIssues(
  issues: { path: PropertyKey[]; message: string }[]
): string {
  return issues
    .map((i) => `${i.path.map(String).join(".") || "(raíz)"}: ${i.message}`)
    .join(" — ");
}

interface ResultadoCreacion {
  creados: number;
  /** Elementos que ya existían (mismo título bajo el mismo padre) y se reusaron en vez de duplicarse. */
  omitidos: number;
  errores: string[];
}

function combinar(...resultados: ResultadoCreacion[]): ResultadoCreacion {
  return resultados.reduce(
    (acc, r) => ({
      creados: acc.creados + r.creados,
      omitidos: acc.omitidos + r.omitidos,
      errores: [...acc.errores, ...r.errores],
    }),
    { creados: 0, omitidos: 0, errores: [] as string[] }
  );
}

function igual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Arma la jerarquía Área→Objetivo→Proyecto→Entregable→Actividad a partir
 * del JSON que devuelve una IA — un solo use-case, 5 puntos de entrada
 * (árbol completo / objetivo / proyecto / entregable / actividades), todos
 * validados con zod antes de tocar nada y todos delegando en los use-cases
 * ya existentes (mismos límites, misma auditoría, mismo recompute). Los
 * niveles ya existentes se resuelven por título EXACTO (como
 * `resolverEjercicioPorNombre` en rutinas); si no matchea, no se inventa un
 * id — se reporta como no encontrado y se sigue con el resto (aditivo, no
 * bloqueante), salvo que el nivel de entrada completo dependa de esa
 * resolución (ver cada método).
 */
export class ImportarArbolPersonalUseCase {
  private readonly areas = new GestionarAreasUseCase();
  private readonly objetivos = new GestionarObjetivosUseCase();
  private readonly proyectos = new GestionarProyectosPersonalUseCase();
  private readonly entregables = new GestionarEntregablesUseCase();
  private readonly actividades = new GestionarActividadesUseCase();
  private readonly fases = new GestionarFasesUseCase();
  private readonly distribuir = new DistribuirPlanUseCase();

  /** Expande un "reparto" compacto a una Actividad por día con cantidad, heredando del padre lo que falte. */
  private async crearReparto(
    reparto: RepartoJson,
    entregableId: string,
    contexto: {
      diaInicio: string;
      diaLimite: string;
      total?: number;
      unidad?: string;
    }
  ): Promise<ResultadoCreacion> {
    const expandido = expandirReparto(reparto, contexto);
    if (expandido.porDia.length === 0) {
      return {
        creados: 0,
        omitidos: 0,
        errores: [
          `Reparto "${reparto.descripcion}": no hay días ni cantidad para repartir (revisá fechas, días de la semana y el total).`,
        ],
      };
    }
    const r = await this.distribuir.crearActividadesDeReparto(
      entregableId,
      expandido
    );
    return {
      creados: r.creadas,
      omitidos: r.omitidas,
      errores: r.errores.map((e) => `Reparto "${reparto.descripcion}" ${e}`),
    };
  }

  private async resolverOCrearArea(
    areaTitulo: string
  ): Promise<Resultado<string>> {
    const existente = await db.area_personal
      .filter(
        (a) => a.nombre.toLowerCase().trim() === areaTitulo.toLowerCase().trim()
      )
      .first();
    if (existente) return Resultado.exito(existente.id);
    return this.areas.crearArea({ nombre: areaTitulo });
  }

  private async crearActividad(
    item: ItemActividadJson,
    entregableId: string
  ): Promise<ResultadoCreacion> {
    const yaExiste = await db.actividad
      .where("entregableId")
      .equals(entregableId)
      .filter(
        (a) =>
          a.estado !== "cancelada" &&
          a.estado !== "descartada" &&
          igual(a.descripcion, item.descripcion) &&
          a.diaTarea === item.diaTarea
      )
      .first();
    if (yaExiste) return { creados: 0, omitidos: 1, errores: [] };
    const res = await this.actividades.crearActividad({
      entregableId,
      tipo: item.tipo,
      descripcion: item.descripcion,
      diaTarea: item.diaTarea,
      cantidadObjetivo: item.cantidadObjetivo,
      unidad: item.unidad,
    });
    if (!res.ok) {
      return {
        creados: 0,
        omitidos: 0,
        errores: [`Actividad "${item.descripcion}": ${res.error!.mensaje}`],
      };
    }
    return { creados: 1, omitidos: 0, errores: [] };
  }

  private async crearEntregableConHijos(
    item: ItemEntregableJson,
    proyectoId: string,
    objetivoId: string
  ): Promise<ResultadoCreacion> {
    // Idempotente: mismo título bajo el mismo proyecto = mismo entregable.
    // Se reusa y se siguen completando sus hijos (los que ya existen se omiten).
    const existente = await db.entregable
      .where("proyectoId")
      .equals(proyectoId)
      .filter((e) => e.estado !== "archivado" && igual(e.titulo, item.titulo))
      .first();
    let entregableId: string;
    let propio: ResultadoCreacion;
    if (existente) {
      entregableId = existente.id;
      propio = { creados: 0, omitidos: 1, errores: [] };
    } else {
      const res = await this.entregables.crearEntregable({
        proyectoId,
        objetivoId,
        titulo: item.titulo,
        diaInicio: item.diaInicio ?? obtenerDiaTareaHoy(),
        diaLimite: item.diaLimite,
        cantidadObjetivo: item.cantidadObjetivo,
        unidad: item.unidad,
        recurrencia: item.recurrencia,
      });
      if (!res.ok) {
        return {
          creados: 0,
          omitidos: 0,
          errores: [`Entregable "${item.titulo}": ${res.error!.mensaje}`],
        };
      }
      entregableId = res.valor!;
      propio = { creados: 1, omitidos: 0, errores: [] };
    }
    const hijosActividades = await Promise.all(
      item.actividades.map((a) => this.crearActividad(a, entregableId))
    );
    const hijosFases = await Promise.all(
      item.fases.map((f) => this.crearFase(f, entregableId))
    );
    const hijosReparto = item.reparto
      ? [
          await this.crearReparto(item.reparto, entregableId, {
            diaInicio: item.diaInicio ?? obtenerDiaTareaHoy(),
            diaLimite: item.diaLimite,
            total: item.cantidadObjetivo,
            unidad: item.unidad,
          }),
        ]
      : [];
    return combinar(
      propio,
      ...hijosActividades,
      ...hijosFases,
      ...hijosReparto
    );
  }

  private async crearProyectoConHijos(
    item: ItemProyectoJson,
    objetivoId: string
  ): Promise<ResultadoCreacion> {
    const existente = await db.proyecto_personal
      .where("objetivoId")
      .equals(objetivoId)
      .filter((p) => p.estado !== "archivado" && igual(p.titulo, item.titulo))
      .first();
    let proyectoId: string;
    let propio: ResultadoCreacion;
    if (existente) {
      proyectoId = existente.id;
      propio = { creados: 0, omitidos: 1, errores: [] };
    } else {
      const res = await this.proyectos.crearProyecto({
        objetivoId,
        titulo: item.titulo,
        diaInicio: item.diaInicio ?? obtenerDiaTareaHoy(),
        diaLimite: item.diaLimite,
        cantidadObjetivo: item.cantidadObjetivo,
        unidad: item.unidad,
      });
      if (!res.ok) {
        return {
          creados: 0,
          omitidos: 0,
          errores: [`Proyecto "${item.titulo}": ${res.error!.mensaje}`],
        };
      }
      proyectoId = res.valor!;
      propio = { creados: 1, omitidos: 0, errores: [] };
    }
    const hijos = await Promise.all(
      item.entregables.map((e) =>
        this.crearEntregableConHijos(e, proyectoId, objetivoId)
      )
    );
    return combinar(propio, ...hijos);
  }

  private async crearObjetivoConHijos(
    item: ItemObjetivoJson,
    areaId: string
  ): Promise<ResultadoCreacion> {
    const existente = await db.objetivo_cuantificable
      .where("areaId")
      .equals(areaId)
      .filter(
        (o) =>
          (o.estado === "activo" || o.estado === "vencido") &&
          igual(o.titulo, item.titulo)
      )
      .first();
    let objetivoId: string;
    let propio: ResultadoCreacion;
    if (existente) {
      objetivoId = existente.id;
      propio = { creados: 0, omitidos: 1, errores: [] };
    } else {
      const res = await this.objetivos.crearObjetivo({
        titulo: item.titulo,
        unidad: item.unidad,
        cantidadObjetivo: item.cantidadObjetivo,
        diaInicio: item.diaInicio ?? obtenerDiaTareaHoy(),
        diaLimite: item.diaLimite,
        areaId,
      });
      if (!res.ok) {
        return {
          creados: 0,
          omitidos: 0,
          errores: [`Objetivo "${item.titulo}": ${res.error!.mensaje}`],
        };
      }
      objetivoId = res.valor!;
      propio = { creados: 1, omitidos: 0, errores: [] };
    }
    const hijos = await Promise.all(
      item.proyectos.map((p) => this.crearProyectoConHijos(p, objetivoId))
    );
    return combinar(propio, ...hijos);
  }

  private resultadoFinal(
    r: ResultadoCreacion,
    etiqueta: string
  ): Resultado<string> {
    if (r.creados === 0 && r.omitidos === 0) {
      return Resultado.falla(
        new ErrorDominio(
          r.errores.length > 0
            ? r.errores.join(" — ")
            : `No se creó ningún ${etiqueta}.`
        )
      );
    }
    const omitidos =
      r.omitidos > 0
        ? ` ${r.omitidos} ya existían (mismo título bajo el mismo padre) y se reusaron o se omitieron, sin duplicar.`
        : "";
    return Resultado.exito(
      (r.creados === 0
        ? "Nada nuevo para crear."
        : `${r.creados} elemento(s) creado(s).`) +
        omitidos +
        (r.errores.length > 0 ? ` Con errores: ${r.errores.join(" — ")}` : "")
    );
  }

  /** Árbol completo (o solo Objetivo, si los items no traen "proyectos") — resuelve/crea el Área por título. */
  public async importarArbol(items: unknown[]): Promise<Resultado<string>> {
    const parsed = importarArbolPersonalSchema.safeParse(items[0] ?? {});
    if (!parsed.success) {
      return Resultado.falla(
        new ErrorDominio(
          `El JSON no tiene la estructura esperada: ${mensajeDeIssues(parsed.error.issues)}`
        )
      );
    }
    const area = await this.resolverOCrearArea(parsed.data.areaTitulo);
    if (!area.ok) return area;

    const resultados = await Promise.all(
      parsed.data.objetivosNuevos.map((o) =>
        this.crearObjetivoConHijos(o, area.valor)
      )
    );
    return this.resultadoFinal(combinar(...resultados), "objetivo");
  }

  /** Igual que importarArbol — nombre propio para el prompt "solo Objetivo" (misma estructura, sin nivel de Proyecto). */
  public async importarObjetivo(items: unknown[]): Promise<Resultado<string>> {
    return this.importarArbol(items);
  }

  /** Proyecto(s) (con o sin Entregables/Actividades anidados) bajo un Objetivo YA EXISTENTE, resuelto por título exacto. */
  public async importarProyecto(items: unknown[]): Promise<Resultado<string>> {
    const parsed = importarProyectoBajoObjetivoSchema.safeParse(items[0] ?? {});
    if (!parsed.success) {
      return Resultado.falla(
        new ErrorDominio(
          `El JSON no tiene la estructura esperada: ${mensajeDeIssues(parsed.error.issues)}`
        )
      );
    }
    const objetivo = await db.objetivo_cuantificable
      .filter(
        (o) =>
          o.titulo.toLowerCase().trim() ===
            parsed.data.objetivoTitulo.toLowerCase().trim() &&
          (o.estado === "activo" || o.estado === "vencido")
      )
      .first();
    if (!objetivo) {
      return Resultado.falla(
        new ErrorDominio(
          `No se encontró un objetivo activo con el título "${parsed.data.objetivoTitulo}".`
        )
      );
    }
    const resultados = await Promise.all(
      parsed.data.proyectosNuevos.map((p) =>
        this.crearProyectoConHijos(p, objetivo.id)
      )
    );
    return this.resultadoFinal(combinar(...resultados), "proyecto");
  }

  /** Entregable(s) (con o sin Actividades anidadas) bajo un Proyecto YA EXISTENTE, resuelto por título exacto. */
  public async importarEntregable(
    items: unknown[]
  ): Promise<Resultado<string>> {
    const parsed = importarEntregableBajoProyectoSchema.safeParse(
      items[0] ?? {}
    );
    if (!parsed.success) {
      return Resultado.falla(
        new ErrorDominio(
          `El JSON no tiene la estructura esperada: ${mensajeDeIssues(parsed.error.issues)}`
        )
      );
    }
    const proyecto = await db.proyecto_personal
      .filter(
        (p) =>
          p.titulo.toLowerCase().trim() ===
            parsed.data.proyectoTitulo.toLowerCase().trim() &&
          p.estado !== "archivado"
      )
      .first();
    if (!proyecto) {
      return Resultado.falla(
        new ErrorDominio(
          `No se encontró un proyecto activo con el título "${parsed.data.proyectoTitulo}".`
        )
      );
    }
    const resultados = await Promise.all(
      parsed.data.entregablesNuevos.map((e) =>
        this.crearEntregableConHijos(e, proyecto.id, proyecto.objetivoId)
      )
    );
    return this.resultadoFinal(combinar(...resultados), "entregable");
  }

  /** Actividad(es) bajo un Entregable YA EXISTENTE, resuelto por título exacto. */
  public async importarActividades(
    items: unknown[]
  ): Promise<Resultado<string>> {
    const parsed = importarActividadesBajoEntregableSchema.safeParse(
      items[0] ?? {}
    );
    if (!parsed.success) {
      return Resultado.falla(
        new ErrorDominio(
          `El JSON no tiene la estructura esperada: ${mensajeDeIssues(parsed.error.issues)}`
        )
      );
    }
    const entregable = await db.entregable
      .filter(
        (e) =>
          e.titulo.toLowerCase().trim() ===
            parsed.data.entregableTitulo.toLowerCase().trim() &&
          e.estado !== "archivado"
      )
      .first();
    if (!entregable) {
      return Resultado.falla(
        new ErrorDominio(
          `No se encontró un entregable activo con el título "${parsed.data.entregableTitulo}".`
        )
      );
    }
    const resultados = await Promise.all(
      parsed.data.actividadesNuevas.map((a) =>
        this.crearActividad(a, entregable.id)
      )
    );
    const repartos: ResultadoCreacion[] = [];
    for (const r of parsed.data.repartos) {
      repartos.push(
        await this.crearReparto(r, entregable.id, {
          diaInicio: entregable.diaInicio,
          diaLimite: entregable.diaLimite,
          total: entregable.cantidadObjetivo,
          unidad: entregable.unidad,
        })
      );
    }
    return this.resultadoFinal(
      combinar(...resultados, ...repartos),
      "actividad"
    );
  }

  private async crearFase(
    item: ItemFaseJson,
    entregableId: string
  ): Promise<ResultadoCreacion> {
    // Idempotente: misma fase (título) bajo el mismo entregable = la misma.
    // Si ya existía igual se omite, pero su reparto se revisa igual (los días
    // que ya tienen actividad se saltean solos).
    const existente = await db.fase_personal
      .where("entregableId")
      .equals(entregableId)
      .filter((f) => igual(f.titulo, item.titulo))
      .first();
    let propio: ResultadoCreacion;
    if (existente) {
      propio = { creados: 0, omitidos: 1, errores: [] };
    } else {
      const res = await this.fases.crearFase({
        entregableId,
        titulo: item.titulo,
        orden: item.orden,
        diaInicio: item.diaInicio,
        diaLimite: item.diaLimite,
        cantidadObjetivo: item.cantidadObjetivo,
        unidad: item.unidad,
        bandaAceptable: item.bandaAceptable,
        bandaMejorable: item.bandaMejorable,
      });
      if (!res.ok) {
        return {
          creados: 0,
          omitidos: 0,
          errores: [`Fase "${item.titulo}": ${res.error!.mensaje}`],
        };
      }
      propio = { creados: 1, omitidos: 0, errores: [] };
    }
    if (item.reparto) {
      const hijos = await this.crearReparto(item.reparto, entregableId, {
        diaInicio: item.diaInicio,
        diaLimite: item.diaLimite,
        total: item.cantidadObjetivo,
        unidad: item.unidad,
      });
      return combinar(propio, hijos);
    }
    return propio;
  }

  /** Fase(s) bajo un Entregable YA EXISTENTE, resuelto por título exacto. */
  public async importarFases(items: unknown[]): Promise<Resultado<string>> {
    const parsed = importarFasesBajoEntregableSchema.safeParse(items[0] ?? {});
    if (!parsed.success) {
      return Resultado.falla(
        new ErrorDominio(
          `El JSON no tiene la estructura esperada: ${mensajeDeIssues(parsed.error.issues)}`
        )
      );
    }
    const entregable = await db.entregable
      .filter(
        (e) =>
          e.titulo.toLowerCase().trim() ===
            parsed.data.entregableTitulo.toLowerCase().trim() &&
          e.estado !== "archivado"
      )
      .first();
    if (!entregable) {
      return Resultado.falla(
        new ErrorDominio(
          `No se encontró un entregable activo con el título "${parsed.data.entregableTitulo}".`
        )
      );
    }
    const resultados = await Promise.all(
      parsed.data.fasesNuevas.map((f) => this.crearFase(f, entregable.id))
    );
    return this.resultadoFinal(combinar(...resultados), "fase");
  }
}
