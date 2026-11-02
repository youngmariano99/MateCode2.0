import { describe, test } from "node:test";
import assert from "node:assert";
import {
  calcularEstadoHito,
  crearRecursoOficinaSchema,
} from "../../domain/entidades/recurso-oficina.entity";

describe("RecursoOficina - Alertas de Hitos", () => {
  const hoy = "2026-11-02";

  test("identifica un hito que vence hoy con debeAvisar en true", () => {
    const estado = calcularEstadoHito(
      {
        tipo: "hito_fecha",
        fechaLimite: "2026-11-02",
        diasAvisoPrevio: 3,
      },
      hoy
    );

    assert.notStrictEqual(estado, null);
    assert.strictEqual(estado?.estado, "hoy");
    assert.strictEqual(estado?.diasRestantes, 0);
    assert.strictEqual(estado?.debeAvisar, true);
    assert.strictEqual(estado?.mensajeAlerta, "¡Es hoy!");
  });

  test("identifica un hito próximo dentro del rango de días de aviso", () => {
    const estado = calcularEstadoHito(
      {
        tipo: "hito_fecha",
        fechaLimite: "2026-11-04",
        diasAvisoPrevio: 3,
      },
      hoy
    );

    assert.notStrictEqual(estado, null);
    assert.strictEqual(estado?.estado, "proximo");
    assert.strictEqual(estado?.diasRestantes, 2);
    assert.strictEqual(estado?.debeAvisar, true);
    assert.strictEqual(estado?.mensajeAlerta, "En 2 días");
  });

  test("identifica un hito futuro que aún NO debe avisar", () => {
    const estado = calcularEstadoHito(
      {
        tipo: "hito_fecha",
        fechaLimite: "2026-11-10",
        diasAvisoPrevio: 2,
      },
      hoy
    );

    assert.notStrictEqual(estado, null);
    assert.strictEqual(estado?.estado, "futuro");
    assert.strictEqual(estado?.diasRestantes, 8);
    assert.strictEqual(estado?.debeAvisar, false);
  });

  test("identifica un hito vencido con debeAvisar en false", () => {
    const estado = calcularEstadoHito(
      {
        tipo: "hito_fecha",
        fechaLimite: "2026-10-30",
        diasAvisoPrevio: 3,
      },
      hoy
    );

    assert.notStrictEqual(estado, null);
    assert.strictEqual(estado?.estado, "vencido");
    assert.strictEqual(estado?.debeAvisar, false);
    assert.strictEqual(estado?.diasRestantes, -3);
  });
});

describe("RecursoOficina - Validación de esquemas", () => {
  test("valida un link útil correctamente", () => {
    const res = crearRecursoOficinaSchema.safeParse({
      tipo: "link_util",
      titulo: "Documentación Odoo",
      url: "https://www.odoo.com/documentation",
      etiquetas: ["ERP", "Odoo"],
    });

    assert.strictEqual(res.success, true);
  });

  test("rechaza si falta el título", () => {
    const res = crearRecursoOficinaSchema.safeParse({
      tipo: "link_util",
      titulo: "",
      url: "https://google.com",
    });

    assert.strictEqual(res.success, false);
  });
});
