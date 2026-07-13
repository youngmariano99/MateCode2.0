# MateCode 2.0 - Plataforma Comercial e Inteligencia Territorial

MateCode es una aplicación moderna e interactiva diseñada para la optimización comercial, la prospección comercial en la vía pública (preventistas/vendedores) y la gestión integral de relaciones con clientes (CRM) en modo offline-first.

---

## 🚀 Comenzar en Desarrollo

Para iniciar el servidor local de desarrollo:

```bash
npm run dev
```

El servidor estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 📚 Documentación del Proyecto

El desarrollo y arquitectura de la plataforma están organizados y documentados en las siguientes guías:

- **[Guía de Funcionalidades Adicionales (A Medida)](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/docs/EXTRA-FUNCIONALIDADES.md):** Documenta las características comerciales implementadas fuera del alcance original de los sprints (geocodificación preventiva Nominatim, importación inteligente JSON con grilla correctora offline, ruteo vial a pie/auto, códigos postales de precisión, etc.).
- **[Roadmap de Sprints](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/docs/09-SPRINTS/README.md):** Listado secuencial de las iteraciones técnicas del Sprint 00 al Sprint 13.
- **[Arquitectura de Software](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/docs/03-ARQUITECTURA.md):** Estructura del stack tecnológico, Clean Architecture y el motor de sincronización offline con IndexedDB (Dexie).
- **[Estándares de Código y Calidad](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/docs/04-ESTANDARES.md):** Directrices de TypeScript, tests automatizados y control de calidad.
- **[Diseño UX/UI](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/docs/06-UI_UX.md):** Paleta de colores premium en escala de oscuros, micro-interacciones, animaciones fluidas y accesibilidad.

---

## 🛠️ Stack Tecnológico Principal

- **Frontend:** React 19, Next.js (App Router), TailwindCSS, Leaflet (Mapas Interactivos).
- **Base de Datos Local:** IndexedDB mediante Dexie.js (Persistencia en modo offline con sincronización diferida).
- **Motores de Recorrido:** OSRM Server & OpenStreetMap FOSSGIS Routing API (routed-car & routed-foot).
- **Calidad:** Node Test Runner, TypeScript estricto, ESLint & Prettier.
