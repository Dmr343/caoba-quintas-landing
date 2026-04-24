# PROMPT MAESTRO — DISEÑO Y DESARROLLO DE `caobaquintas.com`

> Documento de especificación completa para una landing page / board informativo orientada 100% a conversión (Call to Action First).
> **Proyecto:** venta de lotes / terrenos en Costa Rica.
> **Filosofía base:** *"El sitio no es el objetivo. El objetivo es que el usuario haga clic."*
> **Restricción clave:** No usar hero de una sola imagen de fondo (se descarta el patrón tipo DAMAC/Azizi puro).

---

## 1. CONTEXTO DEL PROYECTO

Caoba Quintas es un desarrollo de terrenos/lotes en Costa Rica. El sitio debe funcionar como **un embudo disfrazado de página web**: cada pixel, cada sección, cada microinteracción existe para mover al usuario hacia una de estas cuatro acciones primarias:

1. **Solicitar información** (acción principal, lead caliente)
2. **Agendar visita** (acción de alto compromiso)
3. **Hablar por WhatsApp** (acción de baja fricción, móvil-first en Costa Rica)
4. **Ver disponibilidad** (acción intermedia, navega a listado/ficha)

Todo lo demás — historia, fotos, texto descriptivo — es **soporte de conversión**, no contenido por sí mismo.

---

## 2. PRINCIPIOS CIENTÍFICOS QUE RIGEN EL DISEÑO

Cada decisión visual está anclada en evidencia. No son opiniones.

### 2.1. Ley de Hick-Hyman (Hick, 1952)
> El tiempo que tarda un usuario en tomar una decisión aumenta logarítmicamente con el número de opciones.

**Aplicación obligatoria:**
- Máximo **1 CTA primario visible** en cualquier momento.
- Máximo **3–4 filtros iniciales** en la vista de listado (precio, tamaño, ubicación, estado). Filtros avanzados se ocultan detrás de un disclosure.
- Menú superior con máximo **4 items** + 1 CTA.

### 2.2. Ley de Fitts (Fitts, 1954)
> El tiempo para alcanzar un objetivo es función del tamaño del objetivo y la distancia hasta él.

**Aplicación obligatoria:**
- Botones de CTA con altura mínima **56px desktop / 48px móvil** (touch targets iOS HIG recomienda ≥44pt; subimos a 48 para CTA).
- Área clickeable del CTA = todo el bloque de contenedor, no solo el texto.
- CTA sticky en móvil: barra fija inferior con botón ancho al 100% del viewport — imposible de fallar con el pulgar.

### 2.3. Teoría de Carga Cognitiva (Sweller, 1988)
> La memoria de trabajo es limitada (~4 chunks según Cowan, 2001). El exceso de información simultánea rompe el procesamiento.

**Aplicación obligatoria:**
- Progressive disclosure: la ficha de lote muestra **precio + ubicación + 1 imagen** de entrada; detalles técnicos bajo acordeones o tabs.
- Textos en bloques de máximo **2–3 líneas**. Nada de párrafos largos en landing.
- Un concepto por sección. Ninguna sección intenta comunicar dos ideas a la vez.

### 2.4. F-Pattern y Z-Pattern (Nielsen, 2006; Nielsen Norman Group)
> Los usuarios escanean, no leen. En páginas con texto lineal siguen una F; en páginas visuales/landing, una Z.

**Aplicación obligatoria:**
- Información crítica en la **esquina superior izquierda** y en el **primer barrido horizontal**.
- Logo arriba-izquierda, CTA primario arriba-derecha.
- El hero sigue patrón Z: titular arriba-izq → imagen/visual arriba-der → subtítulo/USP medio-izq → CTA abajo-der.

### 2.5. Efecto Von Restorff / Isolation Effect (Von Restorff, 1933)
> Un elemento visualmente distinto del resto se recuerda y se atiende primero.

**Aplicación obligatoria:**
- El CTA primario usa un **color único** que no aparece en ningún otro elemento (excepto otros CTAs primarios).
- Fondos neutros alrededor del CTA. Nada compite visualmente.

### 2.6. Principios Gestalt
- **Proximidad:** elementos relacionados se agrupan con espaciado consistente (8pt grid).
- **Similaridad:** todos los CTAs primarios idénticos en estilo (mismo color, forma, tipografía).
- **Figura-fondo:** CTA = figura; todo lo demás = fondo.

### 2.7. Teoría de Affordances (Gibson, 1979; Norman, 1988)
> Los elementos deben comunicar visualmente qué se puede hacer con ellos.

**Aplicación obligatoria:**
- Botones con **sombra sutil + border-radius** — parecen presionables.
- Inputs con borde visible y label externo — parecen escribibles.
- Links con subrayado en hover — parecen clickeables.
- Nada de "flat extremo" que deje dudas sobre qué es interactivo.

### 2.8. Sistema 1 / Sistema 2 (Kahneman, 2011)
> Las decisiones iniciales son rápidas, emocionales, automáticas (Sistema 1). Solo si el Sistema 1 falla, activamos el Sistema 2 (análisis).

**Aplicación obligatoria:**
- Los primeros **3 segundos** deben comunicar: *qué es, para quién, cuánto cuesta, qué hacer*.
- El CTA debe ser una decisión Sistema 1: sin costo percibido ("Solicitar información" es gratis y reversible).

### 2.9. Principios de Persuasión (Cialdini, 1984)
**Aplicación dosificada (sin manipular):**
- **Prueba social:** testimonios reales, número de familias que ya compraron, reseñas.
- **Escasez:** "X lotes disponibles de Y" — solo si es verdad.
- **Autoridad:** certificaciones, permisos, años de trayectoria.
- **Compromiso y consistencia:** micro-CTAs que escalan ("ver lote" → "agendar visita" → "reservar").

### 2.10. Goal-Gradient Hypothesis (Hull, 1932; Kivetz et al., 2006)
> La motivación aumenta a medida que el usuario se acerca a completar una meta.

**Aplicación obligatoria:**
- Si el formulario tiene más de 2 pasos, mostrar **indicador de progreso** ("Paso 1 de 2"). El usuario completa más cuando ve que está cerca.

---

## 3. INSPIRACIÓN CONCRETA (qué tomar de cada referencia)

| Sitio | Qué tomar | Qué NO tomar |
|---|---|---|
| **Opendoor** | Hero con input/CTA protagonista, sin imagen de fondo dominante. Fondo con gradiente suave + elementos gráficos funcionales (ilustración de casa, mapa estilizado). | La verticalidad excesiva de scroll. |
| **Zillow** | Mapa + listado sincronizados. Filtros en sidebar. Cards de propiedad con jerarquía clara (precio > ubicación > specs). | Densidad de información en cards (demasiados badges). |
| **Redfin** | CTA sticky siempre visible. Múltiples CTAs ("Tour this home", "Contact agent") por tipo de usuario. Microinteracciones pulidas. | Tipografía condensada. |
| **Realtor.com** | Mini-argumentos antes del CTA ("desde $X", "ubicación premium") — reduce objeciones. Datos contextuales (tendencias de precio). | Publicidad embebida. |
| **DAMAC / Azizi** | Formulario visible en primer pantallazo. Cada sección termina en CTA. | Hero de imagen única a pantalla completa. El storytelling aspiracional exagerado. |

**Síntesis para caobaquintas.com:**
Hero tipo **Opendoor** (funcional, con búsqueda/CTA protagonista, sin imagen de fondo dominante) + flujo tipo **Redfin** (CTA sticky, múltiples puntos de conversión) + cards tipo **Zillow** (limpias, jerarquía de precio) + persuasión medida tipo **Realtor.com** (mini-argumentos pre-CTA).

---

## 4. IDENTIDAD VISUAL

### 4.1. Paleta de colores

El nombre "Caoba" ancla la paleta en madera/naturaleza costarricense. Evitar verde saturado genérico de "inmobiliaria tropical".

```
--caoba-900: #3D2418    /* Caoba oscura, textos principales */
--caoba-700: #6B3D28    /* Caoba media, acentos */
--caoba-500: #8B5A3C    /* Caoba clara, bordes */
--verde-bosque: #2D4A3E /* Verde profundo CR, headers secundarios */
--crema-arena: #F5EFE6  /* Fondo principal cálido */
--blanco-puro: #FFFFFF  /* Contraste máximo */
--gris-neutro: #6B6B6B  /* Texto secundario */
--cta-primario: #E87D3E /* NARANJA TIERRA - único color del CTA primario */
--cta-hover:    #C96428 /* Naranja más oscuro para hover */
--exito: #2F7D4F        /* Verde confirmación */
--advertencia: #D4A017  /* Ámbar, nunca para CTA */
```

**Regla Von Restorff:** `--cta-primario` NO se usa en ningún otro lugar del sitio. Ni iconos decorativos, ni headers, ni fondos. Solo botones de acción primaria.

### 4.2. Tipografía

Combinación serif/sans-serif para jerarquía emocional + funcional:

- **Display / Headers:** `Fraunces` o `Playfair Display` (serif con carácter, evoca calidez y tradición — coherente con "caoba/quintas").
- **Cuerpo / UI:** `Inter` o `Manrope` (sans-serif neutra, alta legibilidad, probada en UI).
- **Números (precios):** `Inter` con `font-feature-settings: "tnum"` (tabular nums — los precios se alinean).

Jerarquía tipográfica (mobile-first, escala modular 1.25):
```
H1: 40px / 48px desktop — 32px móvil
H2: 32px / 40px desktop — 26px móvil
H3: 24px — 20px móvil
Body:  16px — 16px móvil (nunca menos)
Small: 14px
```

Line-height: 1.5 en cuerpo, 1.2 en headers. Espaciado respirado.

### 4.3. Imagery

**NO:** una sola imagen de fondo gigante.
**SÍ:**
- **Galería/carrusel** en el hero (3–5 fotos rotando sutilmente, Ken Burns suave).
- **Grid/mosaico** asimétrico en la sección de terrenos (inspirado en cómo Airbnb presenta propiedades).
- **Mapa interactivo** como elemento visual dominante de la sección "Ubicación".
- Fotografía real > renders > stock. Si hay renders, declararlos.
- Aspect ratio consistente en todas las cards (4:3 o 3:2).

### 4.4. Iconografía

Set consistente (Lucide, Heroicons o Phosphor — elegir UNO). Stroke-based, no filled. Tamaño estándar 20px/24px.

---

## 5. ARQUITECTURA DE PÁGINA — SECCIÓN POR SECCIÓN

### 5.1. Navigation Bar (sticky)

**Estructura:**
```
[Logo Caoba Quintas]    [Proyecto] [Lotes] [Ubicación] [Contacto]    [WhatsApp icono] [Solicitar información ▸]
```

- Altura: 72px desktop, 56px móvil.
- Fondo: `--crema-arena` con blur al hacer scroll (`backdrop-filter: blur(12px)`).
- CTA primario siempre visible arriba-derecha.
- En móvil: hamburguesa + botón CTA reducido a icono de WhatsApp + teléfono.

### 5.2. Hero (above-the-fold)

**Objetivo:** Comunicar qué es, para quién, y empujar al primer CTA en menos de 3 segundos.

**Layout:** Split 60/40 (desktop), stack vertical en móvil.

**Columna izquierda (60%):**
- **Eyebrow** (pequeño, `--verde-bosque`, uppercase): `TERRENOS EN [ZONA], COSTA RICA`
- **H1 (Fraunces, 48px):** `Lotes listos para construir tu próximo hogar`
- **Subtítulo (18px):** `Desde ₡X millones. Financiamiento directo. Visitas guiadas los fines de semana.`
- **Formulario inline** (el CTA protagonista — inspiración Opendoor):
  ```
  [ Nombre           ] [ Teléfono o email ] [ QUIERO INFORMACIÓN ▸ ]
  ```
  O alternativa simplificada: un solo input grande + botón.
- **Trust signals debajo:** `✓ 120+ familias ya compraron  ✓ Permisos al día  ✓ Escrituración inmediata`

**Columna derecha (40%):**
- **NO una foto estática.** Un **componente visual vivo**:
  - Opción A: **Mapa interactivo mini** mostrando la zona con pines de lotes disponibles.
  - Opción B: **Galería con auto-rotate** (3 fotos: aéreo del proyecto, una quinta terminada, un atardecer local) con transición fade suave cada 5s.
  - Opción C: **Card destacada** "Lote del mes" con foto + precio + CTA "Ver este lote".

Recomendación: **Opción A + Opción C combinadas** (mapa arriba, card destacada debajo). Da funcionalidad real, no decoración.

**Fondo del hero:** Gradiente sutil `--crema-arena` → `--blanco-puro` con pattern geométrico muy tenue (líneas topográficas estilizadas, 5% de opacidad) — evoca mapa/terreno sin ser imagen de fondo.

### 5.3. Barra de búsqueda / filtros (inmediatamente debajo del hero)

Para usuarios que saltan el hero y quieren actuar directo. Inspirado en Zillow/Redfin.

```
[ Ubicación ▾ ]  [ Precio ▾ ]  [ Tamaño ▾ ]  [ BUSCAR LOTES ▸ ]
```

Solo 3 filtros iniciales (Ley de Hick). "Filtros avanzados" detrás de un disclosure discreto.

### 5.4. Sección "¿Por qué Caoba Quintas?" (beneficios)

**Formato:** 3 columnas con icono + título + descripción corta. **Termina en CTA.**

```
[ 🏞️ Naturaleza ]  [ 🛣️ Acceso ]  [ 📜 Legalidad ]
Título breve       Título breve      Título breve
2 líneas máximo    2 líneas máximo   2 líneas máximo

              [ VER LOTES DISPONIBLES ▸ ]
```

Principio aplicado: **Regla del 3** (Miller, 1956 — la memoria de trabajo procesa mejor agrupaciones de 3).

### 5.5. Sección "Lotes disponibles" (el corazón del sitio)

**Layout:** Grid de cards 3xN en desktop, 1 columna en móvil.

**Estructura de cada card (orden jerárquico):**
```
[ Imagen 4:3 con badge "Disponible" / "Reservado" ]
Precio en GRANDE (H3, Inter tabular)
Ubicación (body, con icono de pin)
Specs en línea: 📐 500m²  🌳 Con árboles  🚰 Agua
───────────────────────────────────
[ Ver detalles ▸ ]  [ 💬 WhatsApp ]
```

- **Hover:** card se eleva (shadow + translateY(-4px)), imagen hace zoom 1.05 suave.
- **Badge de estado** en esquina superior izquierda de la imagen.
- **Heart/favorito** en esquina superior derecha (microcompromiso — Cialdini).

**Paginación / carga:**
- "Cargar más" botón (NO scroll infinito — perjudica conversión en landing).
- Alternativa: "Ver los 24 lotes ▸" → página dedicada.

### 5.6. Sección "Ubicación" (mapa protagonista)

**Layout:** Split 50/50.

**Izquierda:** mapa interactivo (Leaflet + tiles OpenStreetMap, o Google Maps si hay presupuesto) con:
- Pines de cada lote.
- Pines de puntos de interés (escuela, supermercado, playa, clínica) — **reduce objeciones** antes del CTA (Realtor.com pattern).

**Derecha:** Lista de distancias clave + CTA.
```
⏱️ 15 min al centro de [pueblo]
🏖️ 25 min a la playa [X]
✈️ 45 min al aeropuerto [Y]
🏥 10 min al hospital más cercano

[ AGENDAR VISITA GUIADA ▸ ]
```

### 5.7. Sección "Prueba social" (testimonios + números)

**Números grandes (inspirado en Emaar, sin ser cringe):**
```
  120+           15 años         100%
Familias        trayectoria    permisos al día
```

**Testimonios:** 2–3 reales con foto, nombre, y quizás un detalle (ej: "Compró Lote 14, 2023"). NO usar stock photos ni testimonios inventados — Cialdini solo funciona con autenticidad.

### 5.8. Sección "Preguntas frecuentes"

**Formato:** Acordeones (progressive disclosure — Sweller).

Preguntas que anticipan objeciones y por lo tanto empujan al CTA al resolverlas:
- ¿Cómo es el proceso de compra?
- ¿Ofrecen financiamiento?
- ¿Puedo construir cuando quiera?
- ¿Qué incluye el precio?
- ¿Cómo agendo una visita?

Cada respuesta termina con un micro-CTA textual: *"¿Más dudas? [Hablemos por WhatsApp]"*.

### 5.9. CTA final (cierre)

**Sección a ancho completo, fondo `--verde-bosque` con texto `--crema-arena`:**

```
           ¿Listo para conocer Caoba Quintas?

       Agendá una visita guiada este fin de semana.
     Te llevamos, te mostramos los lotes, sin compromiso.

            [ AGENDAR VISITA ▸ ]   [ 💬 WhatsApp ]
```

### 5.10. Footer

Minimalista. Logo, dirección, teléfono, email, redes sociales, links legales. NO es área de conversión, es soporte de confianza.

### 5.11. Elementos persistentes

- **WhatsApp flotante** (bottom-right, círculo verde CR-friendly, con pequeña animación de pulse cada 10s).
- **CTA sticky móvil:** barra inferior fija con "Solicitar información" ancho 100%, altura 56px. Siempre accesible con el pulgar (Fitts).
- **Back-to-top** (aparece después de 800px de scroll).

---

## 6. ESTRATEGIA DE CTA (detalle quirúrgico)

### 6.1. Jerarquía de CTAs

| Nivel | Texto | Color | Uso |
|---|---|---|---|
| **Primario** | "Solicitar información", "Agendar visita" | `--cta-primario` naranja | Máximo 1 por pantalla visible |
| **Secundario** | "Ver lotes", "Ver detalles" | Borde `--caoba-700`, fondo transparente | Acciones de navegación |
| **Terciario** | "Saber más", links textuales | Texto `--caoba-700` con flecha | Navegación interna |
| **WhatsApp** | Icono + texto opcional | Verde WhatsApp `#25D366` | Canal paralelo, siempre visible |

### 6.2. Lenguaje de CTA (copywriting)

**Prohibido:**
- ❌ "Conocer más"
- ❌ "Leer"
- ❌ "Submit"
- ❌ "Enviar"

**Obligatorio (acción concreta + beneficio):**
- ✅ "Solicitar información"
- ✅ "Agendar visita guiada"
- ✅ "Ver lotes disponibles"
- ✅ "Hablar con un asesor"
- ✅ "Recibir catálogo por WhatsApp"

### 6.3. Repetición estratégica

CTA primario aparece **al menos 5 veces** en la home:
1. Navbar (arriba-derecha)
2. Hero (formulario)
3. Después de beneficios
4. Después de ubicación
5. CTA final (cierre)
6. Sticky móvil (persistente)

### 6.4. Formulario de conversión (fricción mínima)

**Versión corta (hero y flotante):**
```
Nombre:     [_______________]
Teléfono:   [_______________]
            [ QUIERO INFORMACIÓN ▸ ]
```

**2 campos. No más.** El email se puede pedir en el siguiente paso si es necesario.

**Versión extendida (solo tras calificar el lead):**
Agregar: rango de presupuesto, ¿cuándo planea comprar?, zona de interés.

**Principios aplicados:**
- Labels encima del input (no placeholders — desaparecen al escribir, rompen memoria de trabajo).
- Validación inline inmediata (verde al ser válido, rojo con mensaje al no serlo).
- Botón de submit del ancho completo del form en móvil.
- Mensaje de éxito claro post-envío: *"Te contactaremos en menos de 24 horas. También puedes escribirnos por WhatsApp [link]."*

---

## 7. MICROINTERACCIONES Y DETALLES UX

- **Scroll:** smooth scroll en anclas internas.
- **Hover de CTA primario:** cambio de color + elevación de sombra + flecha se mueve 4px a la derecha (feedback afirmativo).
- **Loading states:** skeletons (no spinners) en carga de lotes.
- **Entrada de secciones:** fade-in + subtle translateY(20px) al entrar al viewport (Intersection Observer). Duración 400ms, ease-out. NO animaciones agresivas.
- **Formulario enviado:** confetti sutil o checkmark animado + mensaje claro. Pequeña recompensa dopaminérgica (Goal-gradient — el usuario completó la meta).
- **Respeto de `prefers-reduced-motion`:** desactivar todas las animaciones automáticamente si el usuario lo prefiere (accesibilidad WCAG 2.1).

---

## 8. MOBILE-FIRST

En Costa Rica **más del 70% del tráfico inmobiliario viene de móvil**. El diseño se piensa primero para pantalla de 390px.

**Reglas específicas móvil:**
- Hero colapsa a stack vertical: titular → subtítulo → formulario → visual debajo.
- Navegación hamburguesa + botón WhatsApp + botón teléfono siempre visibles en top.
- CTA sticky bottom bar: ocupa 100% del ancho, altura 64px, siempre accesible.
- Imágenes optimizadas: WebP con fallback, lazy loading (`loading="lazy"`).
- Filtros en bottom-sheet modal, no sidebar (patrón móvil nativo).
- **Tap targets mínimo 48x48px.**
- Inputs con `type` apropiado (`tel`, `email`) para disparar teclado correcto.

---

## 9. ACCESIBILIDAD (WCAG 2.1 AA mínimo)

- Contraste de color ≥ 4.5:1 para texto, ≥ 3:1 para UI.
- Todos los elementos interactivos accesibles por teclado (tab order lógico, focus visible con outline de 2px `--cta-primario`).
- Labels explícitos en todos los form fields.
- Imágenes con `alt` descriptivo.
- Estructura semántica HTML5 (`<header>`, `<main>`, `<section>`, `<article>`, `<footer>`).
- ARIA labels en iconos sin texto (ej: botón WhatsApp flotante).
- Sin autoplay de audio/video con sonido.

---

## 10. PERFORMANCE (afecta directamente la conversión)

Google: cada 1s de retraso en LCP reduce conversión ~7% (Deloitte, 2020; Google Web Vitals research).

**Objetivos:**
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID / INP** (interactividad): < 100ms / < 200ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **Lighthouse score:** ≥ 90 en todas las categorías

**Cómo lograrlo:**
- Imágenes en WebP/AVIF, dimensiones declaradas (evita CLS).
- Fuentes con `font-display: swap` y preload.
- CSS crítico inline, el resto deferred.
- JavaScript diferido; mapas y carruseles cargan post-LCP.
- CDN para assets (Cloudflare).
- Sin libraries pesadas innecesarias (nada de Bootstrap si se usa Tailwind).

---

## 11. STACK TÉCNICO SUGERIDO

**Frontend:**
- **Framework:** Next.js 14+ (App Router) o Astro (si es mayormente estático — probablemente mejor aquí, carga más rápido).
- **Estilos:** Tailwind CSS con config custom (paleta declarada arriba).
- **Componentes UI:** Shadcn/ui o Radix (accesibles por defecto).
- **Iconos:** Lucide.
- **Mapas:** Leaflet (gratis, OpenStreetMap) o Google Maps (si presupuesto lo permite).
- **Carrusel:** Embla Carousel (liviano, accesible).
- **Animaciones:** Framer Motion (si es React) o CSS puro + Intersection Observer.

**Backend / Formularios:**
- Para empezar: **Formspree, Basin, o Netlify Forms** → envían a email.
- Escalable: **Supabase** (DB + Auth + Storage) + webhook a WhatsApp Business API + email transaccional (Resend).
- CMS ligero para gestionar lotes: **Sanity, Decap CMS, o Notion API**.

**Hosting:**
- **Vercel, Cloudflare Pages, o Netlify.** SSL gratis, CDN incluido, previews automáticos.

**Analytics:**
- **Plausible o Fathom** (privacy-first, rápidos, no cookies de consentimiento complejas).
- **Google Tag Manager + GA4** si se necesita tracking de campañas pagas.
- **Hotjar o Microsoft Clarity** (gratis) para heatmaps y session recordings — validar que el CTA funciona realmente.

**Tracking de conversión obligatorio:**
- Evento: `cta_click` (con parámetro `location: hero|listado|ficha|cierre`).
- Evento: `form_submit`.
- Evento: `whatsapp_click`.
- Evento: `scroll_depth` (25/50/75/100%).

---

## 12. SEO TÉCNICO (para que la landing aparezca)

- `<title>` y `<meta description>` optimizados por página.
- Schema.org JSON-LD: `RealEstateListing` para cada lote, `LocalBusiness` para la empresa.
- Open Graph + Twitter Cards para compartir en redes (imagen 1200x630).
- Sitemap.xml y robots.txt.
- URLs limpias y descriptivas: `/lotes/cedro-alto-1200m2` no `/lote?id=14`.
- Contenido local: "terrenos en [zona] Costa Rica", "lotes en [provincia]".
- Google Business Profile conectado.

---

## 13. CHECKLIST DE VALIDACIÓN (antes de lanzar)

**Test de los 5 segundos:**
Mostrar la home a alguien por 5 segundos. Cerrarla. Preguntar:
- ¿Qué es? → debe saber: venta de lotes.
- ¿Dónde? → debe saber: Costa Rica, [zona específica].
- ¿Qué hago? → debe saber: pedir información / agendar visita.

Si falla cualquiera, el hero está mal.

**Test del pulgar (móvil):**
- ¿Puedo llegar al CTA sin estirar la mano? Sí.
- ¿Puedo hacer clic sin zoom? Sí.
- ¿El teclado aparece correcto al tocar inputs? Sí.

**Test de fricción:**
- Desde home hasta enviar formulario: ¿cuántos clicks? Debe ser ≤ 3.
- Desde home hasta WhatsApp: ¿cuántos clicks? Debe ser 1.

**Test de Lighthouse:**
- Performance, Accessibility, Best Practices, SEO: todos ≥ 90.

**Test de accesibilidad con teclado:**
- Tab desde el inicio hasta el CTA primario: debe ser alcanzable en ≤ 5 tabs, con focus visible en cada paso.

---

## 14. ANTI-PATRONES (lo que NO debe aparecer nunca)

- ❌ Hero con imagen de fondo única a pantalla completa (restricción del cliente).
- ❌ Carrusel de imágenes como contenido principal del hero sin CTA.
- ❌ Popup de newsletter al entrar (destroza conversión móvil).
- ❌ Menú con más de 5 items.
- ❌ Formularios con más de 3 campos en primera captura.
- ❌ Textos largos tipo "brochure corporativo" ("Nuestra historia comenzó hace…").
- ❌ Autoplay de video con sonido.
- ❌ Scroll infinito en listado principal.
- ❌ Múltiples CTAs primarios compitiendo en la misma vista.
- ❌ Copy genérico: "Bienvenidos a nuestra web", "Conozca más".
- ❌ Animaciones de entrada lentas (>600ms) o intrusivas.
- ❌ Chatbot automático intrusivo que abre solo.

---

## 15. FUENTES Y REFERENCIAS ACADÉMICAS

Las decisiones de diseño de este documento están ancladas en:

- Fitts, P.M. (1954). *The information capacity of the human motor system in controlling the amplitude of movement.* Journal of Experimental Psychology.
- Hick, W.E. (1952). *On the rate of gain of information.* Quarterly Journal of Experimental Psychology.
- Miller, G.A. (1956). *The magical number seven, plus or minus two.* Psychological Review.
- Cowan, N. (2001). *The magical number 4 in short-term memory.* Behavioral and Brain Sciences.
- Sweller, J. (1988). *Cognitive load during problem solving.* Cognitive Science.
- Nielsen, J. (2006). *F-Shaped Pattern For Reading Web Content.* Nielsen Norman Group.
- Norman, D. (1988). *The Design of Everyday Things.* Basic Books.
- Gibson, J.J. (1979). *The Ecological Approach to Visual Perception.*
- Kahneman, D. (2011). *Thinking, Fast and Slow.* Farrar, Straus and Giroux.
- Cialdini, R. (1984). *Influence: The Psychology of Persuasion.*
- Von Restorff, H. (1933). *Über die Wirkung von Bereichsbildungen im Spurenfeld.*
- Kivetz, R., Urminsky, O., Zheng, Y. (2006). *The Goal-Gradient Hypothesis Resurrected.* Journal of Marketing Research.
- Krug, S. (2014). *Don't Make Me Think, Revisited.* New Riders.
- WCAG 2.1 Guidelines. W3C.
- Google Web Vitals research — impact on conversion.
- Baymard Institute — UX research on e-commerce conversion.

---

## 16. INSTRUCCIÓN FINAL PARA EL EJECUTOR (IA / diseñador / dev)

> Este documento es la biblia del proyecto. Cualquier decisión de diseño o desarrollo debe poder justificarse con **al menos un principio** del apartado 2 o con **al menos una referencia** del apartado 3. Si una propuesta no tiene justificación, se descarta.
>
> La pregunta que contesta cada elemento de la página no es "¿se ve bonito?" sino **"¿qué quiero que haga el usuario en los próximos 10 segundos, y esto lo empuja hacia allá?"**.
>
> Entregable esperado: una página web donde un usuario que llega desde un anuncio pagado, en móvil, con 30 segundos de atención, pueda entender el proyecto, ver un lote que le interese, y dejar sus datos — **sin pensar**.
