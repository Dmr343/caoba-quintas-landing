# Bitácora — caoba_landing_page


## 2026-04-30 | 18:35

**Resumen:** Se implementó el mapa interactivo por lote con polígonos clicables y se actualizaron las tarjetas con fotos reales de drone como fondo.

**Cambios:**
- Tarjetas de los 11 lotes ahora usan fotos reales de drone con overlay semitransparente en color de marca
- Mapa interactivo con polígonos verdes (disponibles) y grises (vendidos)
- Popup por lote con nombre, tamaño, zona, precio y botón directo a WhatsApp
- Matching automático de polígonos GeoJSON a lotes por algoritmo de área + posición

**Archivos clave:** `index.html`, `worker/index.js`

---

No recibí argumentos. Necesito dos datos antes de continuar:

1. **Proyectos a incluir** — ¿cuáles trabajaste esta semana? (ej: `caoba_landing_page`, algún otro)
2. **Horas totales** — ¿cuántas horas en total trabajaste esta semana?

## 2026-04-28 | 15:16

**Resumen:** Se redactaron dos PRDs para el proyecto — uno de correcciones de contenido de la landing page y otro para un bot de WhatsApp de captación automatizada de leads — y se publicaron como issues en GitHub.

**Cambios:**
- Creado Issue #2: PRD de correcciones de contenido y mejoras visuales de la landing page
- Creado Issue #3: PRD de bot de WhatsApp para captación automatizada de leads con Evolution API

**Archivos clave:** `https://github.com/Dmr343/caoba-quintas-landing/issues/2`, `https://github.com/Dmr343/caoba-quintas-landing/issues/3`

---

## 2026-04-28 | 14:08

**Resumen:** Se resolvió el problema del logo que no aparecía al abrir el HTML como archivo autónomo, embebiendo la imagen como base64 directamente en el código.

**Cambios:**
- Logo embebido en base64 para eliminar dependencia de la carpeta `images/`
- Panel de tweaks (`tweaks-panel.jsx`) inlineado en el HTML para evitar errores de ruta
- `index.html` sincronizado con `index-dev.html` como fuente única de verdad

**Archivos clave:** `index-dev.html`, `index.html`

---

## 2026-04-28 | 12:47

**Resumen:** Revisión del estado del proyecto y preparación del checklist de go-live para despliegue en producción con Cloudflare Pages, Workers y D1.

**Archivos clave:** `wrangler.toml`, `migrations/0001_leads.sql`

---

## 2026-04-27 | 22:01

**Resumen:** Se revisó el estado del proyecto para determinar los pasos pendientes antes del go-live del sitio web de Caoba Quintas.

**Archivos clave:** `images/`, `wrangler.toml`, `migrations/0001_leads.sql`

---

## 2026-04-27 | 18:08

**Resumen:** Se incorporaron al repositorio los activos gráficos de marca del proyecto: manual de marca y logos oficiales en múltiples variantes.

**Cambios:**
- Agregado `Manual_de_Marca_v5.html` con las guías de identidad visual de Caoba Quintas
- Agregados 4 logos en `images/`: versión principal, crema, sobre verde y formato JPEG

**Archivos clave:** `Manual_de_Marca_v5.html`, `images/logo.jpeg`, `images/logo_v2_crema.png`, `images/logo_v2_principal.png`, `images/logo_v2_sobre_verde.png`

---

## 2026-04-27 | 16:26

**Resumen:** Consulta sobre qué archivos subir para generar un manual de marca completo de Caoba Quintas usando IA.

**Archivos clave:** `caobaquintas_prompt.md`, `index-dev.html`

---

## 2026-04-24 | 18:09

**Resumen:** Se consultó y planificó la arquitectura de infraestructura para publicar la landing page de Caoba Quintas con dominio propio y captura de leads persistente.

**Archivos clave:** `index.html`

---

## 2026-04-23 | 20:00

**Resumen:** Sesión de levantamiento de requerimientos para la landing page de Caoba Quintas, identificando brechas de información necesarias antes de iniciar el desarrollo.

---
