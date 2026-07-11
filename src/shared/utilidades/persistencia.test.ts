import { test, describe } from "node:test";
import assert from "node:assert";
import { SupabaseClienteRepository } from "../../infrastructure/persistencia/supabase/clientes/supabase-cliente.repository";
import { SupabasePagoRepository } from "../../infrastructure/persistencia/supabase/pagos/supabase-pago.repository";
import { SupabaseContratoRepository } from "../../infrastructure/persistencia/supabase/contratos/supabase-contrato.repository";
import { SupabaseProyectoRepository } from "../../infrastructure/persistencia/supabase/proyectos/supabase-proyecto.repository";
import { SupabaseAgenciaRepository } from "../../infrastructure/persistencia/supabase/branding/supabase-agencia.repository";

describe("Infraestructura de Persistencia", () => {
  test("Debería instanciar correctamente el repositorio de clientes", () => {
    const repo = new SupabaseClienteRepository();
    assert.ok(repo.guardar);
    assert.ok(repo.obtenerPorId);
    assert.ok(repo.obtenerTodos);
    assert.ok(repo.eliminar);
  });

  test("Debería instanciar correctamente el repositorio de pagos", () => {
    const repo = new SupabasePagoRepository();
    assert.ok(repo.guardar);
    assert.ok(repo.obtenerPorId);
    assert.ok(repo.obtenerTodos);
    assert.ok(repo.eliminar);
  });

  test("Debería instanciar correctamente el repositorio de contratos", () => {
    const repo = new SupabaseContratoRepository();
    assert.ok(repo.guardar);
    assert.ok(repo.obtenerPorId);
    assert.ok(repo.obtenerTodos);
    assert.ok(repo.eliminar);
  });

  test("Debería instanciar correctamente el repositorio de proyectos", () => {
    const repo = new SupabaseProyectoRepository();
    assert.ok(repo.guardar);
    assert.ok(repo.obtenerPorId);
    assert.ok(repo.obtenerTodos);
    assert.ok(repo.eliminar);
  });

  test("Debería instanciar correctamente el repositorio de agencias", () => {
    const repo = new SupabaseAgenciaRepository();
    assert.ok(repo.guardar);
    assert.ok(repo.obtenerPorId);
    assert.ok(repo.obtenerTodos);
    assert.ok(repo.eliminar);
  });
});
