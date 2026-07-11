import { test, describe } from "node:test";
import assert from "node:assert";
import { Icono } from "../../presentation/components/icons";
import { Badge, StatusBadge } from "../../presentation/components/badge";
import { Button, IconButton } from "../../presentation/components/button";

describe("Biblioteca de Componentes y Sistema de Diseño", () => {
  test("Debería exportar todos los iconos requeridos", () => {
    assert.ok(Icono.Inicio);
    assert.ok(Icono.Clientes);
    assert.ok(Icono.Proyectos);
    assert.ok(Icono.Pagos);
    assert.ok(Icono.Contratos);
    assert.ok(Icono.IA);
    assert.ok(Icono.Configuracion);
    assert.ok(Icono.Menu);
  });

  test("Debería exportar componentes de botones", () => {
    assert.ok(Button);
    assert.ok(IconButton);
  });

  test("Debería exportar componentes de badges", () => {
    assert.ok(Badge);
    assert.ok(StatusBadge);
  });
});
