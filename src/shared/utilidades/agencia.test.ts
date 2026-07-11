import "fake-indexeddb/auto";
import { test, describe } from "node:test";
import assert from "node:assert";
import { CrearAgenciaUseCase } from "../../application/use-cases/agencia/CrearAgenciaUseCase";
import { ActualizarAgenciaUseCase } from "../../application/use-cases/agencia/ActualizarAgenciaUseCase";
import { ActualizarBrandingUseCase } from "../../application/use-cases/agencia/ActualizarBrandingUseCase";
import { ActualizarDesignUseCase } from "../../application/use-cases/agencia/ActualizarDesignUseCase";
import { SupabaseAgenciaRepository } from "../../infrastructure/persistencia/supabase/branding/supabase-agencia.repository";
import { db } from "../../offline/dexie/db";
import { Resultado } from "../utilidades/resultado";

const mockRepo = new SupabaseAgenciaRepository();
mockRepo.guardar = async () => {
  return Resultado.exito(undefined);
};

describe("Módulo de Agencia y Casos de Uso", () => {
  test("Debería crear una agencia y registrar logs de auditoría", async () => {
    await db.clientes.clear();
    await db.logs_sincronizacion.clear();

    const useCase = new CrearAgenciaUseCase(mockRepo);
    const testAgencia = {
      id: "age_123",
      nombreComercial: "Agencia Test",
      tipoAgencia: "Design",
      estado: "activo",
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };

    const res = await useCase.ejecutar(testAgencia);
    assert.strictEqual(res.ok, true);

    const local = await db.clientes.get("age_123");
    assert.ok(local);
    assert.strictEqual(local.nombreComercial, "Agencia Test");

    const auditLogs = await db.logs_sincronizacion.toArray();
    assert.ok(auditLogs.length > 0);
    assert.ok(auditLogs.some((l) => l.mensaje.includes("Agencia creada")));
  });

  test("Debería actualizar datos de la agencia", async () => {
    const useCase = new ActualizarAgenciaUseCase(mockRepo);
    const testAgencia = {
      id: "age_123",
      nombreComercial: "Agencia Modificada",
      tipoAgencia: "Design",
      estado: "activo",
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };

    const res = await useCase.ejecutar(testAgencia);
    assert.strictEqual(res.ok, true);

    const local = await db.clientes.get("age_123");
    assert.strictEqual(local?.nombreComercial, "Agencia Modificada");
  });

  test("Debería actualizar colores de branding localmente", async () => {
    const useCase = new ActualizarBrandingUseCase();
    const branding = {
      colorPrincipal: "#FF0000",
      colorSecundario: "#0000FF",
      colorExito: "#00FF00",
      colorAdvertencia: "#FFFF00",
      colorError: "#FF00FF",
    };

    const res = await useCase.ejecutar("age_123", branding);
    assert.strictEqual(res.ok, true);
  });

  test("Debería actualizar lineamientos de design.md", async () => {
    const useCase = new ActualizarDesignUseCase();
    const res = await useCase.ejecutar("age_123", "# Lineamientos");
    assert.strictEqual(res.ok, true);
  });
});
