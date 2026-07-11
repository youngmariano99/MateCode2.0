# Filosofía de MateCode

Versión: 2.0

---

# Nuestro principio

MateCode no es un gestor de tareas.

MateCode es el sistema operativo de una agencia.

Toda decisión de diseño, desarrollo o arquitectura deberá responder una única pregunta:

> ¿Esto ayuda a que una agencia trabaje mejor?

Si la respuesta es "no", esa funcionalidad no debe implementarse.

---

# Nuestra filosofía

MateCode se basa en diez principios fundamentales.

Estos principios tienen prioridad sobre cualquier decisión técnica.

---

# 1. Simplicidad antes que cantidad

Agregar funcionalidades nunca es un objetivo.

Resolver problemas sí.

Es preferible una única funcionalidad perfectamente diseñada que diez funcionalidades difíciles de entender.

Si una característica requiere capacitación para ser utilizada, probablemente esté mal diseñada.

---

# 2. La aplicación debe enseñar

El usuario nunca debe sentirse perdido.

La interfaz debe guiar constantemente.

Cada pantalla debe explicar qué hace.

Cada formulario debe indicar cómo completarlo.

Cada error debe indicar cómo solucionarlo.

La aplicación debe reducir al mínimo la necesidad de consultar documentación externa.

---

# 3. Todo debe sentirse rápido

La percepción de velocidad es tan importante como la velocidad real.

La aplicación siempre debe responder inmediatamente.

Siempre que una acción pueda tardar, deberá mostrar claramente qué está ocurriendo.

Nunca dejar al usuario esperando sin información.

---

# 4. Menos clics

Cada acción frecuente debe requerir la menor cantidad posible de pasos.

Objetivos generales:

- Crear un cliente en menos de un minuto.
- Registrar un pago en menos de treinta segundos.
- Crear un contrato en menos de dos minutos.
- Buscar cualquier cliente en menos de cinco segundos.

---

# 5. Todo debe ser evidente

El usuario nunca debería preguntarse:

- ¿Dónde estoy?
- ¿Qué hace este botón?
- ¿Qué significa este estado?
- ¿Qué tengo que hacer ahora?

Si necesita pensar demasiado, el diseño falló.

---

# 6. La IA es un asistente

La Inteligencia Artificial nunca reemplaza al usuario.

Debe ayudar.

Debe sugerir.

Debe resumir.

Debe organizar.

Debe detectar oportunidades.

Debe ahorrar tiempo.

Pero nunca debe ejecutar acciones críticas automáticamente.

Toda acción importante deberá requerir confirmación.

---

# 7. Modularidad

Cada módulo debe ser completamente independiente.

Los módulos deberán poder evolucionar sin afectar al resto del sistema.

Los módulos nunca deberán depender directamente entre sí.

Toda comunicación deberá realizarse mediante interfaces bien definidas.

---

# 8. Consistencia

La misma acción siempre debe verse igual.

Si un botón verde significa "Guardar", deberá significar "Guardar" en toda la aplicación.

Si un estado utiliza un color determinado, deberá utilizar exactamente el mismo color en todos los módulos.

La consistencia reduce el tiempo de aprendizaje.

---

# 9. Información antes que configuración

MateCode no quiere ser una aplicación llena de opciones.

Debe tomar decisiones inteligentes por defecto.

El usuario configura una vez.

Después simplemente trabaja.

---

# 10. Escalabilidad

Todo lo que se construya hoy deberá permitir agregar nuevas funcionalidades mañana sin reescribir el sistema.

No se desarrollarán soluciones específicas si impiden el crecimiento futuro.

---

# Principios de experiencia de usuario

Toda pantalla debe responder cuatro preguntas.

## ¿Dónde estoy?

El usuario siempre debe conocer el contexto actual.

## ¿Qué puedo hacer?

Las acciones principales deben ser evidentes.

## ¿Qué debería hacer ahora?

La interfaz debe sugerir el siguiente paso lógico.

## ¿Qué acaba de ocurrir?

Toda acción debe devolver una confirmación clara.

---

# Filosofía visual

MateCode transmite tranquilidad.

No pretende impresionar.

Pretende ayudar.

La interfaz debe sentirse:

- limpia
- ordenada
- moderna
- profesional
- silenciosa

Nunca sobrecargada.

Nunca agresiva.

Nunca llena de elementos decorativos innecesarios.

---

# Filosofía de nomenclatura

Toda la aplicación utilizará lenguaje humano.

Se evitarán términos técnicos siempre que exista una alternativa más sencilla.

Ejemplos:

❌ Persistencia

✅ Guardado

---

❌ Entidad

✅ Cliente

---

❌ Pipeline

✅ Estado del cliente

---

❌ Repository

✅ No debe aparecer en la interfaz.

---

❌ CRUD

✅ Agregar, editar o eliminar.

---

# Filosofía de formularios

Todo formulario deberá cumplir las siguientes reglas.

- Mostrar únicamente la información necesaria.
- Utilizar placeholders útiles.
- Mostrar ejemplos reales.
- Indicar claramente cuáles son los campos opcionales.
- Validar mientras el usuario escribe.
- Mostrar mensajes de error fáciles de entender.
- Permitir guardar rápidamente.

Si un formulario supera los ocho campos visibles deberá dividirse en pasos.

---

# Filosofía Mobile First

Toda funcionalidad debe diseñarse primero para teléfonos.

Luego adaptarse a tablet.

Finalmente a escritorio.

No se aceptarán funcionalidades exclusivas para escritorio.

---

# Filosofía Offline First

MateCode debe seguir funcionando sin conexión.

El usuario podrá:

- navegar
- buscar
- editar
- crear registros

Cuando vuelva Internet, la sincronización deberá realizarse automáticamente.

Siempre deberá mostrarse claramente si la aplicación está trabajando en modo offline.

---

# Filosofía del desarrollo

El objetivo del desarrollo no es escribir más código.

El objetivo es escribir el menor código posible para resolver correctamente un problema.

El código más simple casi siempre será el correcto.

---

# Regla de oro

Antes de implementar cualquier funcionalidad, la IA deberá responder internamente estas preguntas:

1. ¿Resuelve un problema real?
2. ¿Hace la aplicación más simple?
3. ¿Reduce tiempo al usuario?
4. ¿Respeta la filosofía de MateCode?
5. ¿Puede mantenerse fácilmente dentro de cinco años?

Si alguna respuesta es negativa, la implementación deberá replantearse.
