import { test, describe } from "node:test";
import assert from "node:assert";
import { LoginUseCase } from "../../application/casos-de-uso/autenticacion/login.use-case";
import { LogoutUseCase } from "../../application/casos-de-uso/autenticacion/logout.use-case";

describe("Seguridad y Control de Acceso", () => {
  test("Debería instanciar correctamente LoginUseCase", () => {
    const login = new LoginUseCase();
    assert.ok(login.ejecutar);
  });

  test("Debería instanciar correctamente LogoutUseCase", () => {
    const logout = new LogoutUseCase();
    assert.ok(logout.ejecutar);
  });

  test("Debería validar permisos basados en arrays de forma correcta", () => {
    const permisosUsuario = ["crear_cliente", "ver_pagos"];
    const tienePermiso = (permiso: string) => permisosUsuario.includes(permiso);

    assert.strictEqual(tienePermiso("crear_cliente"), true);
    assert.strictEqual(tienePermiso("eliminar_cliente"), false);
  });
});
