/**
 * constants.js
 * Constantes compartidas por toda la aplicación Chrono-Vision.
 * Centraliza nombres de eventos, mensajes de estado, IDs del DOM y paleta.
 */

// Eventos internos (DOM CustomEvents) para comunicar UI <-> escena sin acoplar módulos.
export const EVENTS = {
  SITE_SELECTED: 'cv:site-selected',
  ACTIVATE_CHRONO: 'cv:activate-chrono',
  RECONSTRUCTION_DONE: 'cv:reconstruction-done',
  HOTSPOT_CLICK: 'cv:hotspot-click',
  OBJECT_CLICK: 'cv:object-click',
  RESET_VIEW: 'cv:reset-view',
};

// Mensajes de estado mostrados en el panel lateral.
export const MESSAGES = {
  IDLE: 'Sistema Chrono-Vision en espera',
  ANALYZING: 'Analizando registros históricos…',
  RENDERING: 'Reconstruyendo escena…',
  DONE: 'Reconstrucción completada',
};

// IDs de elementos clave del DOM / escena A-Frame.
export const DOM = {
  SCENE_ID: 'cv-scene',
  CURRENT_GROUP: 'current-scene',
  RECONSTRUCTED_GROUP: 'reconstructed-scene',
  EFFECTS_GROUP: 'effects-layer',
};

// Paleta del tema oscuro futurista (también usada por Three.js / materiales).
export const COLORS = {
  accent: '#36e0c8',     // cian Chrono-Vision
  accentSoft: '#1b8f82',
  warning: '#ffb547',
  danger: '#ff5d6c',
  panelBg: '#0c1118',
  textBright: '#e8f6f4',
};

// Texto del marcador flotante de año según destino de reconstrucción (panel/HTML).
export const yearLabel = (year) => `Año ${year}`;

/**
 * La fuente MSDF por defecto de A-Frame (Roboto) NO tiene glifos de acentos ni
 * ñ, y la fuente con acentos del CDN ya no existe (404). Para el texto DENTRO de
 * la escena (a-text) quitamos diacríticos y normalizamos guiones largos, de modo
 * que se rendericen limpios sin depender de fuentes externas. El panel HTML sí
 * conserva los acentos (usa fuentes del navegador).
 */
export const deburr = (s = '') =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[—–]/g, '-');

// Etiqueta flotante en la escena 3D. Evita "Año" → "Ano" usando "ÉPOCA" (sin
// acento tras deburr: "EPOCA"), temáticamente apropiado para un viaje temporal.
export const sceneYearLabel = (year) => deburr(`ÉPOCA ${year}`);
