import { test, describe } from "node:test";
import assert from "node:assert";
import { Resultado } from "./resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../domain/errores/error-base";
import { ContenedorDependencias } from "../../infrastructure/di/contenedor-dependencias";
import { ConsolaLogger } from "../../infrastructure/logger/logger";
import { PublicadorEventos, EventoDominio } from "../../domain/eventos/evento";

describe("Arquitectura Base", () => {
  describe("Resultado", () => {
    test("Debería crear un resultado exitoso", () => {
      const valor = "datos";
      const resultado = Resultado.exito(valor);
      assert.strictEqual(resultado.ok, true);
      assert.strictEqual(resultado.error, null);
      assert.strictEqual(resultado.valor, valor);
    });

    test("Debería crear un resultado fallido", () => {
      const error = new ErrorNoEncontrado("No existe");
      const resultado = Resultado.falla(error);
      assert.strictEqual(resultado.ok, false);
      assert.strictEqual(resultado.error, error);
      assert.throws(() => resultado.valor, /No se puede obtener el valor/);
    });
  });

  describe("ErrorBase", () => {
    test("Debería instanciar errores con código correcto", () => {
      const error = new ErrorDominio("Error de negocio");
      assert.strictEqual(error.codigo, "ERROR_DOMINIO");
      assert.strictEqual(error.mensaje, "Error de negocio");
      assert.ok(error instanceof Error);
    });
  });

  describe("ContenedorDependencias", () => {
    test("Debería registrar y resolver dependencias", () => {
      const contenedor = ContenedorDependencias.obtenerInstancia();
      contenedor.limpiar();

      const dependenciaMock = { mock: true };
      contenedor.registrar("ServicioMock", dependenciaMock);

      const res = contenedor.resolver<{ mock: boolean }>("ServicioMock");
      assert.deepStrictEqual(res, dependenciaMock);
    });
  });

  describe("Logger", () => {
    test("Debería instanciarse y responder a métodos", () => {
      const logger = new ConsolaLogger();
      assert.ok(logger.info);
      assert.ok(logger.error);
    });
  });

  describe("PublicadorEventos", () => {
    test("Debería suscribir y publicar eventos correctamente", async () => {
      const pubsub = PublicadorEventos.obtenerInstancia();
      pubsub.limpiar();

      let llamado = false;
      const handler = (evento: EventoDominio) => {
        llamado = true;
        assert.strictEqual(evento.nombreEvento, "TestEvento");
        assert.deepStrictEqual(evento.obtenerDatos(), { id: 1 });
      };

      pubsub.suscribir("TestEvento", handler);

      const evento: EventoDominio = {
        ocurridoEn: new Date(),
        nombreEvento: "TestEvento",
        obtenerDatos: () => ({ id: 1 }),
      };

      await pubsub.publicar(evento);
      assert.strictEqual(llamado, true);
    });
  });
});
