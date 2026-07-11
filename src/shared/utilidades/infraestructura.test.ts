import { test, describe } from "node:test";
import assert from "node:assert";
import { useTemaStore } from "../../presentation/stores/tema.store";
import { useSidebarStore } from "../../presentation/stores/sidebar.store";
import { useConexionStore } from "../../presentation/stores/conexion.store";
import {
  formatearDinero,
  formatearFecha,
} from "../../presentation/helpers/formatters";
import { mapearErrorAPresentacion } from "../../presentation/helpers/mappers";
import { ValidationService } from "../../presentation/services/validation.service";
import { ApiError } from "../../presentation/services/http-client";

describe("Infraestructura Frontend y Estado Global", () => {
  describe("Zustand Stores", () => {
    test("Debería inicializar y modificar el tema en TemaStore", () => {
      const store = useTemaStore.getState();
      assert.strictEqual(store.tema, "oscuro");
      store.setTema("claro");
      assert.strictEqual(useTemaStore.getState().tema, "claro");
      store.setTema("oscuro");
    });

    test("Debería alternar colapsado en SidebarStore", () => {
      const store = useSidebarStore.getState();
      assert.strictEqual(store.colapsado, false);
      store.toggleColapsado();
      assert.strictEqual(useSidebarStore.getState().colapsado, true);
      store.setColapsado(false);
    });

    test("Debería registrar estado de conexión en ConexionStore", () => {
      const store = useConexionStore.getState();
      store.setOnline(false);
      assert.strictEqual(useConexionStore.getState().online, false);
      store.setOnline(true);
    });
  });

  describe("Helpers de Formateo", () => {
    test("Debería formatear dinero correctamente", () => {
      const res = formatearDinero(1500, "ARS");
      assert.ok(res.includes("1.500"));
    });

    test("Debería formatear fechas correctamente", () => {
      const res = formatearFecha("2026-07-10T12:00:00Z");
      assert.strictEqual(res, "10/07/2026");
    });
  });

  describe("Mapeador de Errores", () => {
    test("Debería mapear excepciones a mensajes amigables", () => {
      const errNet = new ApiError(503, "No response", "NETWORK_ERROR");
      assert.strictEqual(
        mapearErrorAPresentacion(errNet),
        "No hay conexión a Internet. Por favor, verificá tu red."
      );
    });
  });

  describe("Validaciones de Zod", () => {
    test("Debería validar CUITs de forma correcta", () => {
      const validCuit = "20-34381898-0";
      const invalidCuit = "20-34381898-9";

      const resValid = ValidationService.cuit.safeParse(validCuit);
      const resInvalid = ValidationService.cuit.safeParse(invalidCuit);

      assert.strictEqual(resValid.success, true);
      assert.strictEqual(resInvalid.success, false);
    });
  });
});
