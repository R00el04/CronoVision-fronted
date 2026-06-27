/**
 * reconstructionRenderer.js
 * Renderiza la VISTA RECONSTRUIDA (pasado) a partir del JSON de reconstrucción
 * devuelto por reconstructionApi.js. Recorre `objects` y `hotspots` y los crea
 * dinámicamente con objectFactory, más el texto flotante del año.
 */

import { createObject, setHighlight } from './objectFactory.js';
import { COLORS, deburr, sceneYearLabel } from '../utils/constants.js';

/** Crea un elemento A-Frame con atributos. */
function makeEl(tag, attrs = {}) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

const vec = (v, d = 0) => `${v?.x ?? d} ${v?.y ?? d} ${v?.z ?? d}`;

/**
 * Construye un hotspot interactivo: esfera luminosa + halo + etiqueta.
 * @param {object} hs  { id, title, description, position }
 * @param {(hs:object, el:HTMLElement)=>void} onHotspot
 */
function buildHotspot(hs, onHotspot) {
  const wrapper = makeEl('a-entity', { position: vec(hs.position) });
  wrapper.classList.add('clickable');
  wrapper.dataset.cvHotspot = hs.id;

  // Núcleo luminoso.
  const core = makeEl('a-sphere', {
    radius: 0.18,
    material: `color:${COLORS.accent}; emissive:${COLORS.accent}; emissiveIntensity:1; transparent:true; opacity:0.95`,
  });
  // Halo pulsante.
  const halo = makeEl('a-ring', {
    'radius-inner': 0.26,
    'radius-outer': 0.34,
    material: `color:${COLORS.accent}; emissive:${COLORS.accent}; emissiveIntensity:0.8; side:double; transparent:true; opacity:0.6`,
    animation: 'property: scale; to: 1.6 1.6 1.6; dir: alternate; dur: 1200; loop: true; easing: easeInOutSine',
  });
  // Etiqueta de título.
  const label = makeEl('a-text', {
    value: deburr(hs.title),
    align: 'center',
    color: COLORS.textBright,
    width: 3,
    position: '0 0.5 0',
  });

  wrapper.append(core, halo, label);
  wrapper.addEventListener('click', () => onHotspot && onHotspot(hs, wrapper));
  return wrapper;
}

/**
 * Renderiza la reconstrucción completa en un grupo.
 * @param {object} reconstruction  JSON de reconstrucción.
 * @param {HTMLElement} group  Contenedor <a-entity>.
 * @param {object} handlers  { onObject, onHotspot }
 * @returns {{objectEls:HTMLElement[], hotspotEls:HTMLElement[], yearEl:HTMLElement}}
 */
export function renderReconstruction(reconstruction, group, handlers = {}) {
  group.innerHTML = '';
  const objectEls = [];
  const hotspotEls = [];

  // 1) Objetos reconstruidos.
  for (const spec of reconstruction.objects || []) {
    const el = createObject(spec, { onInteract: handlers.onObject });
    group.appendChild(el);
    objectEls.push(el);
  }

  // 2) Hotspots interactivos.
  for (const hs of reconstruction.hotspots || []) {
    const el = buildHotspot(hs, handlers.onHotspot);
    group.appendChild(el);
    hotspotEls.push(el);
  }

  // 3) Texto flotante del año reconstruido (p. ej. "Año 2010").
  const yearEl = makeEl('a-text', {
    value: sceneYearLabel(reconstruction.targetYear), // "ÉPOCA 2010" → "EPOCA 2010"
    align: 'center',
    color: COLORS.accent,
    width: 14,
    position: '0 4.2 -6',
    scale: '0.1 0.1 0.1', // arranca pequeño; SceneController lo anima
  });
  group.appendChild(yearEl);

  return { objectEls, hotspotEls, yearEl };
}

// Reexport para que SceneController resalte objetos sin importar objectFactory.
export { setHighlight };
