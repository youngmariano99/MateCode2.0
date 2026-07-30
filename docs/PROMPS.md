Actúa como un Product Owner Senior. Tu objetivo es analizar los requisitos funcionales, no funcionales y el modelo de base de datos para generar un listado exhaustivo de las Épicas del backlog del proyecto NODEXA.

### Reglas de Negocio y Cobertura para las Épicas

1. **Cobertura Total:** Las Épicas deben cubrir el 100% del alcance, incluyendo los requisitos funcionales, no funcionales y siguiendo schema de bases de datos.
2. **Granularidad:** Cada Épica debe representar un bloque funcional coherente y de valor de negocio que agrupe futuras historias de usuario relacionales y transaccionales según el esquema de base de datos proporcionado.
3. **Estándares Técnicos:** Debes respetar estrictamente las restricciones técnicas mencionadas en los requisitos que están en CLAUDE.md.

<ponemos una etiqueta para insertar el contenido de CLAUDE.md>
Acá imprimimos lo de CLAUDE.md
</claude.md>

<requisitos>
Acá imprimimos los requerimentos
</requisitos>

<base_de_datos>
Acá imprimimos lo de la base de datos
</base_de_datos>

### Formato de Salida

Devuelve ÚNICAMENTE un array JSON válido con la estructura solicitada. No agregues texto introductorio, explicaciones posteriores ni bloques de código markdown (`json ... `); devuelve el JSON crudo para su parseo directo:

[
{
"nombre": "Épica 1: [Nombre descriptivo centrado en valor de negocio o módulo]",
"descripcion": "Descripción detallada del alcance funcional, técnico y las principales entidades de base de datos involucradas."
}
]

---

Actúa como un Product Owner Senior. Tu objetivo es desglosar las Épicas proporcionadas en un listado completo e exhaustivo de Historias de Usuario (HU) listas para ser incorporadas al backlog del proyecto NODEXA.

### Reglas de Negocio y Construcción de Historias

1. **Mapeo 1:1 con Épicas:** Debes generar Historias de Usuario para CADA UNA de las épicas listadas en <epicas_existentes>, sin omitir las épicas técnicas o transversales (Seguridad, RLS, UX/UI, Telemetría, etc.).
2. **Estructura Estándar:** Cada historia debe usar el formato tradicional: "Como [rol/usuario] quiero [acción/funcionalidad] para [beneficio/valor de negocio]".
3. **Principios INVEST:** Asegúrate de que las historias sean independientes, negociables, valiosas, estimables, pequeñas y testeables.
4. **Estimación y Priorización:** Asigna la prioridad (`Alta`, `Media`, `Baja`) y puntos de historia en la escala Fibonacci (`1`, `2`, `3`, `5`, `8`).

<requisitos>
[PEGA AQUÍ TUS REQUISITOS FUNCIONALES Y NO FUNCIONALES]
</requisitos>

<epicas_existentes>
[PEGA AQUÍ LAS ÉPICAS QUE SE ENCUENTRAN EN <epicas_existentes>]
</epicas_existentes>

### Formato de Salida

Devuelve ÚNICAMENTE un array JSON válido con la siguiente estructura. No agregues texto introductorio, explicaciones posteriores ni bloques de código markdown (`json ... `); devuelve el JSON crudo para su parseo directo:

[
{
"epicNombre": "Nombre exacto de la Épica de la lista",
"titulo": "Título corto y descriptivo de la Historia",
"descripcion": "Como [rol] quiero [acción] para [beneficio]",
"prioridad": "Alta",
"estimacionPuntos": 3
}
]

---
