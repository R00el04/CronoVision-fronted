# Chrono-Vision

Experiencia web inmersiva en 3D donde el usuario explora **sitios reales del Perú**
en una versión futura deteriorada (año 2077) y activa el dispositivo
**Chrono-Vision** para ver una reconstrucción conceptual del pasado.

> MVP para el curso de **Tecnologías Emergentes**.

## Descripción

Al abrir la app se muestra un panel lateral con el título *Chrono-Vision* y un
selector de tres sitios. Al elegir uno se carga su escena actual deteriorada en
A-Frame. El botón **Activar Chrono-Vision** dispara una llamada al modelo ML
(mock por defecto, o el **backend FastAPI real**, ver más abajo), muestra la
predicción y ejecuta una transición animada *presente → pasado* con un efecto
holográfico de escaneo construido en Three.js.

## Tecnologías

- **Vite** — bundler y servidor de desarrollo.
- **A-Frame** — estructura principal de la escena 3D (cámara, cursor, luces, sky, entidades).
- **Three.js** — efectos visuales avanzados (partículas y plano de escaneo del efecto Chrono-Vision).
- **GSAP** — animaciones de transición (fades, cambio de cielo/luz).
- **Firebase (Firestore)** — persistencia de interacciones, con *fallback* a `localStorage`.

## Flujo de la demo

1. Abre la web → título **Chrono-Vision** y selector de sitios.
2. Selecciona **Centro Histórico de Lima**, **Chan Chan** o **Fortaleza del Real Felipe**.
3. Se carga la **vista actual deteriorada** (año 2077).
4. Pulsa **Activar Chrono-Vision**:
   - Mensaje *“Analizando registros históricos…”*.
   - Llamada al modelo ML vía `reconstructionApi.js` (mock con retardo 1.2–2 s, o el backend FastAPI real).
   - El panel muestra **predicción**, **confianza**, **año reconstruido** y **estado**.
   - Transición animada: escaneo holográfico + partículas, cambio de cielo/luz,
     desvanecimiento de ruinas y aparición de los objetos reconstruidos.
   - Texto flotante con el año (*“Año 2010 / 1450 / 1800”*).
5. Haz clic en los **hotspots** o en los objetos interactivos para ver información histórica.
6. Pulsa **Restablecer vista actual** para volver a la versión deteriorada.

## Cómo instalar

```bash
cd chrono-vision
npm install
```

> Dependencias usadas: `aframe`, `three`, `firebase`, `gsap` (+ `vite` como devDependency).

## Cómo ejecutar

```bash
npm run dev      # servidor de desarrollo (http://localhost:5173)
npm run build    # build de producción en dist/
npm run preview  # sirve el build de producción
```

## Variables de entorno

Crea un archivo `.env.local` (ya incluido como ejemplo):

```bash
# Firebase (opcional). Si faltan, la app usa localStorage y NO falla.
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

## Escenarios incluidos

| Sitio | ID | Categoría ML | Actual → Reconstruido |
|-------|----|--------------|-----------------------|
| Centro Histórico de Lima | `centro_lima` | `urban_historical` | 2077 → 2010 |
| Chan Chan | `chan_chan` | `archaeological_zone` | 2077 → 1450 |
| Fortaleza del Real Felipe | `real_felipe` | `coastal_fortress` | 2077 → 1800 |

## Arquitectura

> 📖 **Guía técnica completa para colaboradores:** [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)
> — explica capa por capa cómo está construido y cómo funciona el proyecto, el
> contrato JSON de reconstrucción, los tipos de objeto soportados y cómo agregar
> un sitio u objeto nuevo.

```
src/
  main.js                      # entrada: conecta módulos
  style.css                    # tema oscuro futurista
  data/
    sites.js                   # catálogo de sitios + vista actual deteriorada
    mockReconstructions.js     # respuestas ML simuladas (vista reconstruida)
  scene/
    SceneController.js         # orquesta escena, transición y efectos
    currentSceneBuilder.js     # construye la vista actual
    reconstructionRenderer.js  # renderiza la vista reconstruida + hotspots
    objectFactory.js           # fábrica de entidades A-Frame por tipo
    chronoEffects.js           # efecto Chrono-Vision (Three.js, componente A-Frame)
  services/
    firebase.js                # init resiliente → db, isFirebaseEnabled
    interactionService.js      # saveInteraction(): Firestore o localStorage
    reconstructionApi.js       # requestReconstruction(): mock o backend real
  ui/
    uiController.js            # selector, botones, orquestación UI ↔ escena
    panelController.js         # render del panel (estado, predicción, info)
  utils/
    constants.js               # eventos, mensajes, paleta, IDs
```

## Backend (ML real)

Ya existe un backend **FastAPI** en [`../chrono-vision-backend`](../chrono-vision-backend)
que clasifica el sitio con un modelo real (TF-IDF + Logistic Regression) y
devuelve el JSON de reconstrucción compatible con este renderizador. Por defecto
el frontend usa el **mock** (no requiere backend corriendo). Para conectarlo:

```bash
# 1) Levanta el backend (ver su README)
cd ../chrono-vision-backend && uvicorn app.main:app --reload --port 8000

# 2) En chrono-vision/.env.local
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:8000
```

El contrato `POST /reconstruct` (request/response) está documentado en
`reconstructionApi.js` y en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) §11.

## Próximos pasos

- **Firebase como fuente de datos en tiempo real**: mover sitios/reconstrucciones
  a Firestore y leerlos con listener (hoy Firebase solo guarda interacciones).
- **Cloud Functions + deploy**: exponer el backend en la nube (Cloud Run /
  Functions) y publicar el frontend (Firebase Hosting).
- **Más sitios y assets**: modelos GLTF/texturas reales en lugar de geometría primitiva.
- **VR/AR**: habilitar modo inmersivo de A-Frame (WebXR).
