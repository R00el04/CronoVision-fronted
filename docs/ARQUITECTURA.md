# Chrono-Vision — Guía de Arquitectura (para colaboradores)

Documento técnico de **cómo está construido y cómo funciona** el proyecto hasta
hoy. Pensado para que cualquiera del equipo pueda ubicarse rápido antes de tocar
código o conectar el backend/ML.

> Resumen en una frase: el frontend es **data-driven**. Toda la escena 3D
> (ruinas y reconstrucción) se genera dinámicamente recorriendo objetos **JSON**;
> no hay geometría escrita a mano en el HTML.

---

## 1. Visión general

Chrono-Vision es una experiencia web inmersiva donde el usuario explora sitios
reales del Perú en una versión futura deteriorada (año 2077) y activa el
dispositivo **Chrono-Vision** para ver una reconstrucción conceptual del pasado.

Sitios soportados:

| Sitio | `id` | Categoría ML | Actual → Reconstruido |
|-------|------|--------------|------------------------|
| Centro Histórico de Lima | `centro_lima` | `urban_historical` | 2077 → 2010 |
| Chan Chan | `chan_chan` | `archaeological_zone` | 2077 → 1450 |
| Fortaleza del Real Felipe | `real_felipe` | `coastal_fortress` | 2077 → 1800 |

El **backend/ML todavía no existe**: se simula con un *mock* que devuelve el
mismo JSON que entregará el backend real (ver §6 y §11).

---

## 2. Stack

- **Vite** — bundler y dev server (`npm run dev`, `npm run build`).
- **A-Frame 1.8** — estructura de la escena 3D (cámara, cursor/raycaster, luces, sky, entidades `<a-*>`).
- **Three.js** — efectos visuales avanzados (partículas y plano de escaneo del efecto Chrono-Vision). Se usa la instancia `AFRAME.THREE` para no mezclar versiones.
- **GSAP** — animaciones de transición (fades de escena, lerp de cielo/luz/niebla, aparición del año).
- **Firebase (Firestore)** — persistencia de interacciones, con *fallback* a `localStorage` (nunca rompe la app).
- JavaScript **vanilla** con módulos ES. Sin framework de UI.

---

## 3. Estructura de carpetas

```
chrono-vision/
├── index.html                  # contenedor app + panel UI; NO contiene la <a-scene>
├── .env.local                  # variables VITE_* (Firebase + API)
├── docs/
│   └── ARQUITECTURA.md         # este documento
└── src/
    ├── main.js                 # punto de entrada: conecta los módulos
    ├── style.css               # tema oscuro futurista (panel + layout)
    ├── data/
    │   ├── sites.js                  # catálogo de sitios + VISTA ACTUAL (ruinas)
    │   └── mockReconstructions.js    # respuestas ML SIMULADAS (vista reconstruida)
    ├── scene/
    │   ├── SceneController.js        # orquesta escena, transición y efectos
    │   ├── currentSceneBuilder.js    # construye la vista actual
    │   ├── reconstructionRenderer.js # renderiza la vista reconstruida + hotspots + año
    │   ├── objectFactory.js          # fábrica de entidades A-Frame por `type`
    │   └── chronoEffects.js          # efecto Chrono-Vision (Three.js, componente A-Frame)
    ├── services/
    │   ├── firebase.js               # init resiliente → { db, isFirebaseEnabled }
    │   ├── interactionService.js     # saveInteraction(): Firestore o localStorage
    │   └── reconstructionApi.js      # requestReconstruction(): mock o backend real
    ├── ui/
    │   ├── uiController.js            # selector, botones, orquestación UI ↔ escena
    │   └── panelController.js         # render del panel (estado, predicción, info)
    └── utils/
        └── constants.js              # eventos, mensajes, IDs, paleta, helpers de texto
```

**Regla de oro:** la lógica está separada por capas. `main.js` solo conecta.
Nada de lógica 3D en la UI, nada de DOM de UI en la escena.

---

## 4. Flujo de datos (de punta a punta)

```
Usuario selecciona sitio
        │
        ▼
UIController.selectSite(id)
        ├─ SceneController.loadSite(site)  ──► currentSceneBuilder ──► objectFactory  (vista 2077)
        ├─ PanelController.setSite(site)
        └─ interactionService.saveInteraction(...)

Usuario pulsa "Activar Chrono-Vision"
        │
        ▼
UIController.activateChrono()
        ├─ Panel: "Analizando registros históricos…"
        ├─ reconstructionApi.requestReconstruction(site)  ──►  JSON de reconstrucción
        │        (mock desde mockReconstructions.js  ó  POST /reconstruct)
        ├─ Panel: predicción + confianza + año
        ├─ SceneController.runReconstruction(json)
        │        ├─ chrono-effect ON (Three.js: partículas + escaneo)
        │        ├─ GSAP: lerp de entorno (cielo/luz/niebla)
        │        ├─ GSAP: fade-out escena actual  →  se limpia
        │        ├─ reconstructionRenderer.renderReconstruction(json) ──► objectFactory
        │        ├─ GSAP: fade-in escena reconstruida
        │        ├─ animación del texto "ÉPOCA XXXX"
        │        └─ chrono-effect OFF
        ├─ Panel: "Reconstrucción completada"
        └─ interactionService.saveInteraction(...)
```

---

## 5. Arranque de la app — `main.js`

1. `import 'aframe'` (registra el global `window.AFRAME` y los custom elements `<a-*>`).
2. Crea `PanelController(#cv-panel)`.
3. Crea `SceneController({ container: #cv-stage, AFRAME, onHotspot, onObject })`
   — construye el "shell" de la `<a-scene>` y registra el componente `chrono-effect`.
4. Crea `UIController({ root, panel, scene })` — arma el selector de sitios y los botones.
5. Los callbacks `onHotspot`/`onObject` se inyectan a la escena y delegan en la UI
   (la variable `ui` se declara antes para capturarla por *closure*).

> `index.html` solo tiene el `#app`, el panel (`#cv-panel`) y el contenedor
> `#cv-stage`. **La `<a-scene>` se crea por JS** dentro de `#cv-stage`.

---

## 6. Capa de datos

### `data/sites.js`
Array `SITES`. Cada sitio define metadatos + su **vista actual deteriorada**:

```js
{
  id, name, mlCategory, currentYear, targetYear, summary,
  current: {
    environment: { sky, fog, ground, lightColor, lightIntensity, ambient },
    objects: [ /* specs de objeto, ver §9 */ ],
  }
}
```
Helper: `getSiteById(id)`.

### `data/mockReconstructions.js`
Objeto `MOCK_RECONSTRUCTIONS` indexado por `siteId`. Cada entrada es **la
respuesta simulada del backend/ML** (la vista reconstruida). Helper:
`getMockReconstruction(siteId)`.

> Ambos archivos comparten **el mismo formato de objeto** para que `objectFactory`
> pueda construir tanto las ruinas como la reconstrucción.

---

## 7. Capa de servicios

### `services/reconstructionApi.js`
```js
requestReconstruction(site): Promise<ReconstructionJSON>
```
- Si `VITE_USE_MOCK_API=true` → devuelve el mock con **latencia artificial 1.2–2 s**
  (simula la inferencia del modelo).
- Si `false` → `POST ${VITE_API_BASE_URL}/reconstruct` con body
  `{ siteId, mlCategory, currentYear, targetYear }` y espera el JSON (ver §11).
- El **contrato del backend** está documentado en comentarios dentro del archivo.

### `services/firebase.js`
Inicialización resiliente. Lee `VITE_FIREBASE_*`. Si falta alguna clave esencial
(`apiKey`, `projectId`, `appId`) **no falla**: exporta `db = null` e
`isFirebaseEnabled = false`. Exporta `{ db, isFirebaseEnabled }`.

### `services/interactionService.js`
```js
saveInteraction(data): Promise<{ ok, backend }>
```
- Si Firebase está activo → colección **`interactions`** en Firestore.
- Si no → `localStorage` (clave `cv:interactions`) + `console.log`.
- Nunca lanza. Se llama al seleccionar sitio, activar Chrono-Vision, terminar la
  reconstrucción y al hacer clic en hotspots/objetos.

---

## 8. Capa de escena

### `scene/objectFactory.js` — la fábrica
`createObject(spec, { onInteract })` → devuelve un `<a-entity>` (wrapper) con
`position`/`rotation`/`scale` y, dentro, la geometría según `spec.type`
(construida con primitivas A-Frame). Si `spec.interactive` agrega la clase
`clickable` y un listener de `click`.
- `setHighlight(el, on)` — recorre las mallas Three.js del objeto y cambia su
  `emissive` para resaltarlo (usado al clicar objetos/hotspots).
- Helpers internos de geometría compuesta: `addArch` (arco de medio punto),
  `addCross` (cruz), `addReliefFrieze` (frisos geométricos Chan Chan),
  `addCrenellations` (almenas).

### `scene/currentSceneBuilder.js`
`buildCurrentScene(site, group)` — limpia el grupo y crea las entidades de
`site.current.objects` con `objectFactory`. Sin hotspots (la vista actual no los
tiene).

### `scene/reconstructionRenderer.js`
`renderReconstruction(reconstruction, group, { onObject, onHotspot })` — recorre:
- `objects[]` → `objectFactory.createObject`.
- `hotspots[]` → esfera luminosa + halo pulsante + etiqueta (clickable).
- crea el texto flotante del año (`sceneYearLabel`, p. ej. "ÉPOCA 2010").

Devuelve `{ objectEls, hotspotEls, yearEl }`.

### `scene/SceneController.js` — el orquestador
- `_buildShell()` — crea la `<a-scene>` con cámara + cursor de ratón
  (`raycaster: objects: .clickable`), luces (ambiente + direccional), `a-sky`,
  suelo, y los grupos `#current-scene` / `#reconstructed-scene`. Registra
  `chrono-effect`.
- `loadSite(site)` — aplica entorno actual y construye la vista deteriorada.
- `runReconstruction(json)` — la transición completa (ver §10).
- `reset()` — vuelve a la vista actual.
- `_handleObjectClick` / `highlightById` — resaltado de objetos; el clic en un
  objeto muestra su `info`; el clic en un hotspot muestra **la descripción del
  hotspot** y resalta su objeto `target` sin sobrescribir el panel.
- `_applyEnvironment` / `_animateEnvironment` — cambian/animan cielo, niebla,
  suelo y luces (lerp de color por GSAP).
- `_fadeGroup` / `_setGroupOpacity` — fundidos de opacidad recorriendo las mallas.

### `scene/chronoEffects.js` — el efecto (Three.js)
Registra el componente A-Frame **`chrono-effect`** con:
- un sistema de **partículas** (`THREE.Points`) que ascienden y se reciclan,
- un **plano de escaneo** holográfico (wireframe cian) que barre verticalmente.

Se activa/desactiva por atributo: `sceneEl.setAttribute('chrono-effect', { active, color, count, speed })`.
El color sale de `reconstruction.effects.particleColor`.

---

## 9. Contrato de un objeto de escena (`spec`)

Cada elemento de `objects[]` (tanto en ruinas como en reconstrucción) tiene esta
forma. Solo `type` es obligatorio; el resto tiene valores por defecto.

```js
{
  id: 'c_wall_left',          // string, identificador (necesario si es target de hotspot)
  type: 'adobe_wall',         // string, ver tabla §9.1 (obligatorio)
  position: { x, y, z },      // posición del wrapper (metros)
  rotation: { x, y, z },      // grados
  scale:    { x, y, z },      // escala del wrapper (ver nota de tamaños)
  material: {                 // opcional
    color, opacity, metalness, roughness, emissive, emissiveIntensity, side
  },
  interactive: true,          // opcional; clickable → muestra `info` y se resalta
  info: 'texto...',           // opcional; se muestra en el panel al clicar
  geometry: { width, height, depth },  // solo para custom_box
  // params específicos por tipo: w, h, d, relief, ruined, lit, flag, length, ...
}
```

**Nota de tamaños (importante):** hay dos familias de builders.
- **Por `scale`** (escalan una primitiva unidad): `building`, `road`, `plaza`,
  `tree`, `water`, `column`, `debris`, `cannon`, `custom_box`.
- **Por parámetros en metros** (`w`/`h`/`d`/etc., *ignoran* `scale` para el
  tamaño): `colonial_building`, `church`, `fountain`, `lamp_post`, `balustrade`,
  `wall`, `adobe_wall`, `tower`, `adobe_platform`, `banner`, `fort_gate`,
  `cannonballs`. A estos se les pasan sus propios campos (ej. `w`, `h`, `d`,
  `relief`, `ruined`, `lit`, `flag`).

### 9.1 Tipos de objeto soportados

| `type` | Descripción | Params propios | Usado en |
|--------|-------------|----------------|----------|
| `building` | Caja simple (estructura genérica) | — | genérico |
| `colonial_building` | Casona limeña: arquería + balcón + tejado | `ruined`, `w`, `d`, `woodColor`, `roofColor` | Lima |
| `church` | Iglesia: nave + fachada + torre + cúpula + cruces | `ruined` | Lima |
| `fountain` | Fuente de piedra (con/ sin agua) | `ruined` | Lima |
| `lamp_post` | Farol de hierro (rotación = inclinado) | `lit` | Lima |
| `balustrade` | Balaustrada de piedra | `length`, `ruined` | Lima |
| `road` | Plano de calle | `scale` | Lima |
| `plaza` | Plano de plaza/explanada | `scale` | todos |
| `tree` | Tronco + copa (color = copa) | `scale` | Lima, Chan Chan |
| `wall` | Muralla con almenas | `w`, `h`, `d`, `ruined`, `crenellated` | Real Felipe |
| `adobe_wall` | Muro de adobe con friso de relieves | `w`, `h`, `d`, `relief`*, `ruined` | Chan Chan |
| `tower` | Baluarte costero con garita abovedada | `r`, `ruined`, `flag`, `flagColor` | Real Felipe |
| `cannon` | Cañón (tubo + cureña) | `scale`, `rotation` | Real Felipe |
| `water` | Plano de agua | `scale`, `opacity` | Real Felipe |
| `torch` | Antorcha (poste + llama + luz puntual) | — | Chan Chan, Real Felipe |
| `column` | Columna + capitel | `scale` | Chan Chan, Real Felipe |
| `text_panel` | Panel flotante con `a-text` | `info` | todos (reconstrucción) |
| `debris` | Escombro (dodecaedro) | `scale` | todos |
| `adobe_platform` | Huaca escalonada: portada trapezoidal + escalinata + friso | `w`, `h`, `d`, `relief`, `ruined` | Chan Chan |
| `banner` | Banderín (poste + travesaño + tela + emblema) | `material.color` | Chan Chan, Real Felipe |
| `fort_gate` | Puerta principal: arco + pilastras + escudo + almenas | `w`, `h`, `d`, `ruined` | Real Felipe |
| `cannonballs` | Pila piramidal de balas | `material.color` | Real Felipe |
| `custom_box` | Caja paramétrica genérica | `geometry: { width, height, depth }` | varios |

\* `relief`: `'diamond'` (rombos), `'lattice'` (celosía), `'steps'` (greca escalonada).

### 9.2 Contrato de un hotspot

```js
{ id, target, title, description, position: { x, y, z } }
```
`target` = `id` de un objeto interactivo a resaltar al clicar el hotspot.

---

## 10. La transición Chrono-Vision (paso a paso)

Implementada en `SceneController.runReconstruction(json)`:

1. **`chrono-effect` ON** con color/cantidad/velocidad de `json.effects`.
2. **Entorno** → `_animateEnvironment(json.environment, 2.0s)`: lerp de cielo,
   niebla, suelo y luces.
3. **Fade-out** de `#current-scene` (GSAP, ~1.1s) y se vacía el grupo.
4. **Render** de `#reconstructed-scene` con `renderReconstruction` (oculto).
5. **Fade-in** de la reconstrucción (~1.2s).
6. **Año** → animación `scale` del texto "ÉPOCA XXXX" (easeOutElastic).
7. **`chrono-effect` OFF**.

El panel, en paralelo (desde `UIController`):
`Analizando…` → muestra `prediction.class` + `confidence` + `targetYear` →
`Reconstruyendo escena…` → `Reconstrucción completada`.

---

## 11. Contrato del backend (futuro) — `POST /reconstruct`

Cuando exista el backend/ML real, basta con poner `VITE_USE_MOCK_API=false` y
apuntar `VITE_API_BASE_URL`. **No hay que tocar el renderer ni `objectFactory`**
mientras la respuesta respete este contrato:

**Request body:** `{ siteId, mlCategory, currentYear, targetYear }`

**Response 200 (`application/json`):**
```json
{
  "siteId": "centro_lima",
  "sceneName": "Centro Histórico de Lima — Reconstrucción 2010",
  "currentYear": 2077,
  "targetYear": 2010,
  "prediction": { "class": "urban_historical", "confidence": 0.92 },
  "environment": {
    "sky": "#aebfd0", "fog": "#c2d2de", "ground": "#897f6c",
    "lightColor": "#fff2dc", "lightIntensity": 1.1, "ambient": 0.8
  },
  "objects":  [ { "id": "...", "type": "...", "position": {"x":0,"y":0,"z":0}, "material": {"color":"#..."}, "interactive": true, "info": "..." } ],
  "hotspots": [ { "id": "...", "target": "...", "title": "...", "description": "...", "position": {"x":0,"y":0,"z":0} } ],
  "effects":  { "particleColor": "#36e0c8", "particleCount": 1400, "scanSpeed": 1.4, "glow": true }
}
```

> El backend puede devolver los `type` que ya soporta `objectFactory` (§9.1). Si
> el ML necesitara un objeto nuevo, primero hay que **agregar el builder**
> correspondiente (§13) y luego usarlo en el JSON.

---

## 12. Cómo agregar un **nuevo sitio**

1. En `data/sites.js` agrega una entrada a `SITES` con metadatos + `current`
   (entorno + objetos de la vista deteriorada).
2. En `data/mockReconstructions.js` agrega `MOCK_RECONSTRUCTIONS['<id>']` con la
   vista reconstruida (environment, objects, hotspots ≥ 3, effects, prediction).
3. El selector de sitios y todo lo demás se arma solo (lee `SITES`).

## 13. Cómo agregar un **nuevo tipo de objeto**

1. En `scene/objectFactory.js`, dentro de `const builders = { ... }`, agrega
   `mi_tipo(wrapper, spec) { ... }` y crea la geometría con `makeEl(...)`
   (coordenadas **locales**; el wrapper ya lleva position/rotation/scale).
2. Úsalo en el JSON con `{ "type": "mi_tipo", ... }`.
3. Si lleva texto, pásalo por `deburr()` (ver §14).

---

## 14. Limitaciones conocidas

- **Acentos en texto 3D.** La fuente MSDF por defecto de A-Frame (Roboto) no
  tiene glifos de acentos/ñ y la fuente con acentos del CDN responde 404. Por eso
  el texto **dentro de la escena** se pasa por `deburr()` (quita diacríticos) y el
  año usa `"ÉPOCA XXXX"` → `"EPOCA XXXX"` (evita que "Año" quede como "Ano"). El
  **panel HTML** sí muestra acentos correctos (usa fuentes del navegador).
- **Bundle grande.** A-Frame + Three + Firebase pesan; el build avisa de chunks
  > 500 kB. Aceptable para el MVP; se puede *code-split* más adelante.
- **Throttling de animación en preview headless.** Al verificar en un navegador
  sin foco, `requestAnimationFrame` se ralentiza y la transición puede parecer
  "congelada"; en uso real (pestaña visible) corre normal.

---

## 15. Variables de entorno (`.env.local`)

```bash
# Firebase (opcional). Si faltan, se usa localStorage y NO falla.
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# API de reconstrucción
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK_API=true   # true = datos simulados; false = POST real a /reconstruct
```

---

## 16. Cómo correr

```bash
cd chrono-vision
npm install        # dependencias: aframe, three, firebase, gsap (+ vite)
npm run dev        # http://localhost:5173
npm run build      # build de producción en dist/
npm run preview    # sirve el build
```

**Demo:** abrir → elegir sitio → ver ruinas → "Activar Chrono-Vision" →
escaneo cian → reconstrucción → clic en hotspots → "Restablecer vista actual".

---

## 17. Estado actual y próximos pasos

**Listo:** los 3 sitios con vista actual + reconstrucción, escena 100%
data-driven desde JSON, efecto Chrono-Vision (Three.js), transiciones GSAP,
hotspots interactivos, persistencia con *fallback*, panel UI.

**Mock (se conectará al backend/ML real):** `reconstructionApi` con
`VITE_USE_MOCK_API=true` y los datos de `mockReconstructions.js`. La predicción
(`class`/`confidence`) y la geometría son simuladas.

**Pendiente:**
- Backend real + modelo ML que produzca el JSON del §11.
- Firebase definitivo (completar `VITE_FIREBASE_*`).
- (Opcional) assets GLTF/texturas reales en vez de geometría primitiva; modo VR/AR (WebXR).
