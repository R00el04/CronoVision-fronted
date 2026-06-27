/**
 * objectFactory.js
 * Convierte una especificación de objeto (JSON) en una entidad A-Frame.
 *
 * Es la ÚNICA fábrica de entidades: la usan tanto currentSceneBuilder.js
 * (escena deteriorada) como reconstructionRenderer.js (escena reconstruida),
 * porque ambos comparten el mismo formato de objeto.
 *
 * Formato de spec admitido:
 *   { id, type, geometry?, position, rotation?, scale?, material?, interactive?, info? }
 *
 * Tipos soportados:
 *   building · colonial_building · road · tree · wall · adobe_wall · tower ·
 *   cannon · water · torch · column · plaza · text_panel · debris · custom_box
 */

import { COLORS, deburr } from '../utils/constants.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Crea un elemento A-Frame y aplica atributos. */
function makeEl(tag, attrs = {}) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/** Construye la cadena de material A-Frame con soporte de opacidad y emisivo. */
function materialStr(material = {}) {
  const {
    color = '#cccccc',
    opacity = 1,
    metalness = 0.1,
    roughness = 0.85,
    emissive = '#000000',
    emissiveIntensity = 0,
    side = 'front',
  } = material;
  return (
    `color:${color}; opacity:${opacity}; transparent:true; ` +
    `metalness:${metalness}; roughness:${roughness}; ` +
    `emissive:${emissive}; emissiveIntensity:${emissiveIntensity}; side:${side}`
  );
}

const vec = (v, d = 0) => `${v?.x ?? d} ${v?.y ?? d} ${v?.z ?? d}`;

// ── Helpers de geometría compuesta ───────────────────────────────────────────

/** Cruz cristiana (dos cajas finas) para torres y cúpulas. */
function addCross(parent, x, y, z, s = 1, color = '#d8d2c2') {
  parent.appendChild(makeEl('a-box', { position: `${x} ${y} ${z}`, width: 0.09 * s, height: 0.55 * s, depth: 0.09 * s, material: materialStr({ color }) }));
  parent.appendChild(makeEl('a-box', { position: `${x} ${y + 0.06 * s} ${z}`, width: 0.34 * s, height: 0.09 * s, depth: 0.09 * s, material: materialStr({ color }) }));
}

/**
 * Arco de medio punto = vano oscuro (sombra interior) + curva superior (a-torus).
 * @param height altura del vano recto (sin contar el semicírculo).
 */
function addArch(parent, cx, faceZ, radius, height, color, opening = '#1b1712') {
  parent.appendChild(makeEl('a-plane', { position: `${cx} ${height / 2} ${faceZ - 0.05}`, width: radius * 1.7, height, material: materialStr({ color: opening, opacity: 0.95 }) }));
  parent.appendChild(makeEl('a-torus', { position: `${cx} ${height} ${faceZ}`, radius, 'radius-tubular': radius * 0.16, arc: 180, 'segments-tubular': 16, material: materialStr({ color }) }));
}

/**
 * Friso de relieves geométricos (estilo Chan Chan) sobre la cara frontal (+z).
 * @param pattern 'diamond' (rombos), 'lattice' (celosía), 'steps' (greca escalonada).
 */
function addReliefFrieze(parent, W, D, pattern, ruined, centerY) {
  const fz = D / 2 + 0.05;
  const raised = ruined ? '#9c8b66' : '#e0c08a';
  const inset = ruined ? '#6e6248' : '#a07c46';
  // Líneas de marco superior e inferior del friso.
  parent.appendChild(makeEl('a-box', { position: `0 ${centerY + 0.5} ${fz}`, width: W * 0.94, height: 0.1, depth: 0.12, material: materialStr({ color: inset, roughness: 1 }) }));
  parent.appendChild(makeEl('a-box', { position: `0 ${centerY - 0.5} ${fz}`, width: W * 0.94, height: 0.1, depth: 0.12, material: materialStr({ color: inset, roughness: 1 }) }));
  const cell = 1.1;
  const n = Math.max(1, Math.floor(W / cell));
  const start = -W / 2 + (W - n * cell) / 2 + cell / 2;
  for (let i = 0; i < n; i++) {
    if (ruined && i % 4 === 1) continue; // motivos perdidos por erosión
    const x = start + i * cell;
    if (pattern === 'lattice') {
      parent.appendChild(makeEl('a-box', { position: `${x} ${centerY} ${fz}`, width: 0.78, height: 0.12, depth: 0.12, rotation: '0 0 45', material: materialStr({ color: raised, roughness: 1 }) }));
      parent.appendChild(makeEl('a-box', { position: `${x} ${centerY} ${fz}`, width: 0.78, height: 0.12, depth: 0.12, rotation: '0 0 -45', material: materialStr({ color: raised, roughness: 1 }) }));
    } else if (pattern === 'steps') {
      parent.appendChild(makeEl('a-box', { position: `${x} ${centerY + 0.2} ${fz}`, width: 0.7, height: 0.14, depth: 0.12, material: materialStr({ color: raised, roughness: 1 }) }));
      parent.appendChild(makeEl('a-box', { position: `${x - 0.28} ${centerY} ${fz}`, width: 0.14, height: 0.5, depth: 0.12, material: materialStr({ color: raised, roughness: 1 }) }));
      parent.appendChild(makeEl('a-box', { position: `${x - 0.05} ${centerY - 0.2} ${fz}`, width: 0.45, height: 0.14, depth: 0.12, material: materialStr({ color: raised, roughness: 1 }) }));
    } else { // 'diamond': rombo con núcleo más oscuro
      parent.appendChild(makeEl('a-box', { position: `${x} ${centerY} ${fz}`, width: 0.6, height: 0.6, depth: 0.1, rotation: '0 0 45', material: materialStr({ color: raised, roughness: 1 }) }));
      parent.appendChild(makeEl('a-box', { position: `${x} ${centerY} ${fz + 0.04}`, width: 0.3, height: 0.3, depth: 0.1, rotation: '0 0 45', material: materialStr({ color: inset, roughness: 1 }) }));
    }
  }
}

/** Fila de almenas (merlones) sobre el borde superior de un muro/puerta. */
function addCrenellations(parent, W, D, topY, ruined, color) {
  const mer = 0.5, gap = 0.42, step = mer + gap;
  const n = Math.max(1, Math.floor(W / step));
  const start = -W / 2 + (W - n * step) / 2 + mer / 2;
  for (let i = 0; i < n; i++) {
    if (ruined && i % 3 === 2) continue; // almenas rotas por el deterioro
    const x = start + i * step;
    parent.appendChild(makeEl('a-box', { position: `${x} ${topY + 0.3} 0`, width: mer, height: 0.6, depth: D, material: materialStr({ color, roughness: 1 }) }));
  }
}

// ── Constructores por tipo (devuelven hijos en coordenadas locales) ───────────
// Cada builder recibe (wrapper, spec) y agrega geometría al wrapper.

const builders = {
  building(wrapper, { material }) {
    wrapper.appendChild(makeEl('a-box', { material: materialStr(material) }));
  },

  // Edificio colonial limeño: arquería en planta baja + balcón de madera + tejado.
  // Parámetros opcionales en la spec: ruined, w, d, woodColor, roofColor.
  colonial_building(wrapper, spec) {
    const m = spec.material || {};
    const ruined = !!spec.ruined;
    const facade = m.color || (ruined ? '#9b9080' : '#d9c7a6');
    const facade2 = ruined ? '#8a8070' : '#e6d6b6';
    const wood = spec.woodColor || (ruined ? '#46382a' : '#6e4f30');
    const roofC = spec.roofColor || (ruined ? '#5b4636' : '#9c4a2e');
    const W = spec.w || 5, D = spec.d || 3.6, GF = 2.3, UF = 2.3;

    // Planta baja (masa) + arquería al frente.
    wrapper.appendChild(makeEl('a-box', { position: `0 ${GF / 2} 0`, width: W, height: GF, depth: D, material: materialStr({ color: facade, roughness: 1 }) }));
    const n = 3, seg = W / n, r = seg * 0.34;
    for (let j = 0; j <= n; j++) {
      const x = -W / 2 + j * seg;
      wrapper.appendChild(makeEl('a-box', { position: `${x} ${GF * 0.5} ${D / 2}`, width: 0.34, height: GF, depth: 0.5, material: materialStr({ color: facade2, roughness: 1 }) }));
    }
    for (let i = 0; i < n; i++) {
      const cx = -W / 2 + seg * (i + 0.5);
      addArch(wrapper, cx, D / 2 + 0.02, r, GF * 0.55, facade2);
    }

    // Piso superior + ventanas tras el balcón.
    wrapper.appendChild(makeEl('a-box', { position: `0 ${GF + UF / 2} 0`, width: W, height: UF, depth: D, material: materialStr({ color: facade2, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-plane', { position: `${-W * 0.22} ${GF + UF * 0.55} ${D / 2 + 0.02}`, width: 0.8, height: 1.3, material: materialStr({ color: '#23201a', opacity: 0.9 }) }));
    wrapper.appendChild(makeEl('a-plane', { position: `${W * 0.22} ${GF + UF * 0.55} ${D / 2 + 0.02}`, width: 0.8, height: 1.3, material: materialStr({ color: '#23201a', opacity: 0.9 }) }));

    // Balcón de madera grande (rasgo más representativo).
    const bz = D / 2 + 0.3;
    wrapper.appendChild(makeEl('a-box', { position: `0 ${GF + 0.08} ${bz}`, width: W * 0.96, height: 0.14, depth: 0.7, material: materialStr({ color: wood, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-box', { position: `0 ${GF + 1.0} ${bz}`, width: W * 0.96, height: 0.16, depth: 0.55, material: materialStr({ color: wood, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-box', { position: `0 ${GF + 1.5} ${bz}`, width: W, height: 0.16, depth: 0.9, material: materialStr({ color: roofC, roughness: 1 }) })); // techo del balcón
    const nb = ruined ? 4 : 8, bw = W * 0.9;
    for (let i = 0; i < nb; i++) {
      const x = -bw / 2 + bw * (i / (nb - 1));
      wrapper.appendChild(makeEl('a-box', { position: `${x} ${GF + 0.55} ${bz + 0.05}`, width: 0.06, height: 0.8, depth: 0.06, material: materialStr({ color: wood }) }));
    }
    wrapper.appendChild(makeEl('a-box', { position: `${-W * 0.48} ${GF + 0.75} ${bz}`, width: 0.12, height: 1.4, depth: 0.7, material: materialStr({ color: wood }) }));
    wrapper.appendChild(makeEl('a-box', { position: `${W * 0.48} ${GF + 0.75} ${bz}`, width: 0.12, height: 1.4, depth: 0.7, material: materialStr({ color: wood }) }));

    // Tejado.
    wrapper.appendChild(makeEl('a-box', { position: `0 ${GF + UF + 0.18} 0`, width: W + 0.5, height: 0.36, depth: D + 0.5, material: materialStr({ color: roofC, roughness: 1 }) }));
    if (ruined) {
      // Hueco/daño en el tejado.
      wrapper.appendChild(makeEl('a-box', { position: `${W * 0.2} ${GF + UF + 0.22} ${-D * 0.1}`, width: 1.2, height: 0.5, depth: 1.2, material: materialStr({ color: '#1c1814', opacity: 0.85 }) }));
    }
  },

  // Iglesia/catedral simplificada: nave + fachada + torre campanario + cúpula.
  church(wrapper, spec) {
    const ruined = !!spec.ruined;
    const stone = (spec.material && spec.material.color) || (ruined ? '#8d887c' : '#c6c1b3');
    const stone2 = ruined ? '#7c776c' : '#b4afa1';
    const roofC = ruined ? '#4f4a42' : '#6c5246';
    // Nave + fachada + frontón.
    wrapper.appendChild(makeEl('a-box', { position: '0 3 0', width: 8, height: 6, depth: 6, material: materialStr({ color: stone, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-box', { position: '0 3.75 3', width: 8, height: 7.5, depth: 0.8, material: materialStr({ color: stone2, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-box', { position: '0 7.7 3', width: 3.2, height: 1.2, depth: 0.8, material: materialStr({ color: stone2 }) }));
    addArch(wrapper, 0, 3.45, 0.9, 2.4, stone, '#15110d'); // portada
    wrapper.appendChild(makeEl('a-box', { position: '0 0.25 3.8', width: 6, height: 0.5, depth: 1.2, material: materialStr({ color: stone2 }) })); // escalinata
    // Torre campanario (izquierda).
    wrapper.appendChild(makeEl('a-box', { position: '-2.9 5.5 2', width: 2.2, height: 11, depth: 2.2, material: materialStr({ color: stone, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-plane', { position: '-2.9 8.6 3.11', width: 0.9, height: 1.6, material: materialStr({ color: '#15110d', opacity: 0.9 }) }));
    wrapper.appendChild(makeEl('a-cone', { position: '-2.9 12.3 2', 'radius-bottom': 1.7, 'radius-top': 0, height: 2.2, material: materialStr({ color: roofC }) }));
    addCross(wrapper, -2.9, 13.6, 2, 1.4, stone2);
    // Cúpula (derecha).
    wrapper.appendChild(makeEl('a-cylinder', { position: '2.7 7.2 1', radius: 1.5, height: 1.6, material: materialStr({ color: stone, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-sphere', { position: '2.7 8 1', radius: 1.6, 'theta-length': 90, material: materialStr({ color: stone2 }) }));
    addCross(wrapper, 2.7, 9.9, 1, 1.2, stone2);
    if (ruined) {
      wrapper.appendChild(makeEl('a-box', { position: '3 4 3', width: 1.5, height: 2, depth: 0.9, material: materialStr({ color: '#15110d', opacity: 0.8 }) }));
    }
  },

  // Fuente de piedra central (con o sin agua).
  fountain(wrapper, spec) {
    const ruined = !!spec.ruined;
    const stone = (spec.material && spec.material.color) || (ruined ? '#7c766a' : '#b9b1a0');
    wrapper.appendChild(makeEl('a-cylinder', { position: '0 0.15 0', radius: 1.5, height: 0.3, material: materialStr({ color: stone, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-cylinder', { position: '0 0.5 0', radius: 1.15, height: 0.5, material: materialStr({ color: stone, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-torus', { position: '0 0.75 0', radius: 1.15, 'radius-tubular': 0.12, rotation: '-90 0 0', material: materialStr({ color: stone }) }));
    if (!ruined) {
      wrapper.appendChild(makeEl('a-cylinder', { position: '0 0.72 0', radius: 1.0, height: 0.06, material: materialStr({ color: '#5fa9c8', opacity: 0.85, metalness: 0.3, roughness: 0.2 }) }));
    } else {
      wrapper.appendChild(makeEl('a-cylinder', { position: '0 0.6 0', radius: 1.0, height: 0.06, material: materialStr({ color: '#3a352c' }) }));
    }
    wrapper.appendChild(makeEl('a-cylinder', { position: '0 1.1 0', radius: 0.18, height: 1.2, material: materialStr({ color: stone }) }));
    wrapper.appendChild(makeEl('a-cylinder', { position: '0 1.7 0', radius: 0.5, height: 0.16, material: materialStr({ color: stone }) }));
    if (!ruined) {
      wrapper.appendChild(makeEl('a-sphere', { position: '0 1.9 0', radius: 0.16, material: materialStr({ color: '#8fd0e6', emissive: '#6fb0d0', emissiveIntensity: 0.3, opacity: 0.9 }) }));
    }
  },

  // Farol antiguo de hierro. spec.lit enciende la luz; rotación (data) = deteriorado.
  lamp_post(wrapper, spec) {
    const lit = !!spec.lit;
    const iron = '#23242a';
    wrapper.appendChild(makeEl('a-box', { position: '0 0.15 0', width: 0.4, height: 0.3, depth: 0.4, material: materialStr({ color: iron }) }));
    wrapper.appendChild(makeEl('a-cylinder', { position: '0 1.7 0', radius: 0.07, height: 3.1, material: materialStr({ color: iron, metalness: 0.5, roughness: 0.5 }) }));
    wrapper.appendChild(makeEl('a-cylinder', { position: '0 3.35 0', radius: 0.12, height: 0.25, material: materialStr({ color: iron }) }));
    const glass = lit ? '#ffd98a' : '#2c2e30';
    wrapper.appendChild(makeEl('a-box', { position: '0 3.65 0', width: 0.34, height: 0.5, depth: 0.34, material: materialStr({ color: glass, emissive: lit ? '#ffcf7a' : '#000000', emissiveIntensity: lit ? 1 : 0, opacity: 0.92 }) }));
    wrapper.appendChild(makeEl('a-cone', { position: '0 4.0 0', 'radius-bottom': 0.22, 'radius-top': 0, height: 0.28, material: materialStr({ color: iron }) }));
    if (lit) {
      wrapper.appendChild(makeEl('a-light', { type: 'point', color: '#ffcf8a', intensity: 0.7, distance: 7, position: '0 3.65 0' }));
    }
  },

  // Balaustrada de piedra. spec.length = largo; ruined deja huecos.
  balustrade(wrapper, spec) {
    const ruined = !!spec.ruined;
    const stone = (spec.material && spec.material.color) || (ruined ? '#7c766a' : '#b3ab9a');
    const L = spec.length || 4;
    wrapper.appendChild(makeEl('a-box', { position: '0 0.12 0', width: L, height: 0.24, depth: 0.35, material: materialStr({ color: stone, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-box', { position: '0 1.12 0', width: L, height: 0.22, depth: 0.4, material: materialStr({ color: stone, roughness: 1 }) }));
    const n = Math.max(3, Math.round(L / 0.5));
    for (let i = 0; i < n; i++) {
      if (ruined && i % 3 === 0) continue; // huecos en la versión deteriorada
      const x = -L / 2 + 0.25 + (L - 0.5) * (i / (n - 1));
      wrapper.appendChild(makeEl('a-cylinder', { position: `${x} 0.6 0`, radius: 0.09, height: 0.85, material: materialStr({ color: stone }) }));
    }
    wrapper.appendChild(makeEl('a-box', { position: `${-L / 2} 0.65 0`, width: 0.3, height: 1.3, depth: 0.45, material: materialStr({ color: stone }) }));
    wrapper.appendChild(makeEl('a-box', { position: `${L / 2} 0.65 0`, width: 0.3, height: 1.3, depth: 0.45, material: materialStr({ color: stone }) }));
  },

  road(wrapper, { material }) {
    wrapper.appendChild(makeEl('a-plane', { rotation: '-90 0 0', width: 1, height: 1, material: materialStr({ ...material, roughness: 1 }) }));
  },

  plaza(wrapper, { material }) {
    wrapper.appendChild(makeEl('a-plane', { rotation: '-90 0 0', width: 1, height: 1, material: materialStr({ ...material, roughness: 1 }) }));
  },

  tree(wrapper, { material }) {
    const leaf = material?.color || '#3f8a3a';
    wrapper.appendChild(makeEl('a-cylinder', { position: '0 0.6 0', radius: 0.15, height: 1.2, material: materialStr({ color: '#6b4a2b' }) }));
    wrapper.appendChild(makeEl('a-sphere', { position: '0 1.6 0', radius: 0.8, material: materialStr({ color: leaf }) }));
  },

  // Muralla de fortaleza con almenas. Params: w, h, d, ruined, crenellated, material.
  wall(wrapper, spec) {
    const m = spec.material || {};
    const ruined = !!spec.ruined;
    const stone = m.color || (ruined ? '#8f897e' : '#bdb4a2');
    const W = spec.w || 8, H = spec.h || 2.6, D = spec.d || 0.9;
    // Cuerpo de la muralla.
    wrapper.appendChild(makeEl('a-box', { position: `0 ${H / 2} 0`, width: W, height: H, depth: D, material: materialStr({ color: stone, roughness: 1 }) }));
    // Cordón superior.
    wrapper.appendChild(makeEl('a-box', { position: `0 ${H - 0.05} 0`, width: W, height: 0.12, depth: D + 0.08, material: materialStr({ color: ruined ? '#7d776c' : '#a79e8d', roughness: 1 }) }));
    // Almenas.
    if (spec.crenellated !== false) addCrenellations(wrapper, W, D, H, ruined, stone);
    if (ruined) {
      // Brecha oscura (daño en la muralla).
      wrapper.appendChild(makeEl('a-box', { position: `${W * 0.22} ${H * 0.55} 0`, width: W * 0.16, height: H * 0.5, depth: D + 0.05, material: materialStr({ color: '#26221d', opacity: 0.9 }) }));
    }
  },

  // Muro de adobe con friso de relieves geométricos. Params: w, h, d, relief, ruined.
  adobe_wall(wrapper, spec) {
    const m = spec.material || {};
    const ruined = !!spec.ruined;
    const base = m.color || (ruined ? '#9a8a66' : '#cda878');
    const W = spec.w || 6, H = spec.h || 2.6, D = spec.d || 0.6;
    // Cuerpo del muro.
    wrapper.appendChild(makeEl('a-box', { position: `0 ${H / 2} 0`, width: W, height: H, depth: D, material: materialStr({ color: base, roughness: 1 }) }));
    // Friso decorativo en la cara frontal (+z).
    if (spec.relief) addReliefFrieze(wrapper, W, D, spec.relief, ruined, H * 0.58);
    // Erosión: cresta irregular (bloques de distinta altura, sensación de muro roto).
    if (ruined) {
      const chunks = [[-W * 0.35, 0.5], [-W * 0.05, 0.3], [W * 0.2, 0.6], [W * 0.4, 0.25]];
      for (const [ox, hh] of chunks) {
        wrapper.appendChild(makeEl('a-box', { position: `${ox} ${H + hh / 2} 0`, width: W * 0.16, height: hh, depth: D, material: materialStr({ color: '#8a7b58', roughness: 1 }) }));
      }
    }
  },

  // Baluarte/torreón costero con garita abovedada (estilo colonial). Params: r, ruined, flag, flagColor.
  tower(wrapper, spec) {
    const ruined = !!spec.ruined;
    const stone = (spec.material && spec.material.color) || (ruined ? '#8f897e' : '#bdb4a2');
    const R = spec.r || 1.6;
    // Cuerpo cilíndrico + parapeto.
    wrapper.appendChild(makeEl('a-cylinder', { position: '0 2 0', radius: R, height: 4, material: materialStr({ color: stone, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-cylinder', { position: '0 4.1 0', radius: R + 0.18, height: 0.4, material: materialStr({ color: stone, roughness: 1 }) }));
    // Almenas en anillo.
    const n = ruined ? 8 : 10;
    for (let i = 0; i < n; i++) {
      if (ruined && i % 3 === 0) continue;
      const a = (i / n) * Math.PI * 2;
      const x = Math.cos(a) * (R + 0.05), z = Math.sin(a) * (R + 0.05);
      wrapper.appendChild(makeEl('a-box', { position: `${x} 4.5 ${z}`, width: 0.32, height: 0.5, depth: 0.32, rotation: `0 ${-a * 180 / Math.PI} 0`, material: materialStr({ color: stone }) }));
    }
    // Saeteras en el cuerpo.
    for (const ang of [0, Math.PI * 0.5, Math.PI]) {
      const x = Math.cos(ang) * (R + 0.01), z = Math.sin(ang) * (R + 0.01);
      wrapper.appendChild(makeEl('a-plane', { position: `${x} 2.4 ${z}`, rotation: `0 ${-ang * 180 / Math.PI + 90} 0`, width: 0.18, height: 0.7, material: materialStr({ color: '#1c1712', opacity: 0.85 }) }));
    }
    if (!ruined) {
      // Garita (torreta de vigilancia) + cúpula.
      wrapper.appendChild(makeEl('a-cylinder', { position: '0 5.0 0', radius: 0.75, height: 1.4, material: materialStr({ color: stone, roughness: 1 }) }));
      wrapper.appendChild(makeEl('a-sphere', { position: '0 5.8 0', radius: 0.82, 'theta-length': 90, material: materialStr({ color: '#9a9384' }) }));
      wrapper.appendChild(makeEl('a-plane', { position: '0 5.1 0.76', width: 0.16, height: 0.5, material: materialStr({ color: '#1c1712', opacity: 0.9 }) }));
      if (spec.flag) {
        wrapper.appendChild(makeEl('a-cylinder', { position: '0 6.9 0', radius: 0.03, height: 1.2, material: materialStr({ color: '#3a3a3a' }) }));
        wrapper.appendChild(makeEl('a-plane', { position: '0.35 7.2 0', width: 0.6, height: 0.4, material: materialStr({ color: spec.flagColor || '#c0392b', side: 'double' }) }));
      }
    } else {
      // Remate roto (garita derruida).
      wrapper.appendChild(makeEl('a-box', { position: '0.2 4.9 0', width: 1.1, height: 0.8, depth: 1.1, material: materialStr({ color: '#6f6a60', roughness: 1 }) }));
    }
  },

  cannon(wrapper, { material }) {
    // Tubo horizontal + cureña
    wrapper.appendChild(makeEl('a-cylinder', { position: '0 0.3 0', rotation: '90 0 0', radius: 0.13, height: 1, material: materialStr({ ...material, metalness: 0.6, roughness: 0.4 }) }));
    wrapper.appendChild(makeEl('a-box', { position: '0 0.1 -0.3', width: 0.4, height: 0.2, depth: 0.6, material: materialStr({ color: '#4a3520' }) }));
  },

  water(wrapper, { material }) {
    wrapper.appendChild(makeEl('a-plane', { rotation: '-90 0 0', width: 1, height: 1, material: materialStr({ ...material, metalness: 0.3, roughness: 0.2 }) }));
  },

  torch(wrapper, { material }) {
    const flame = material?.color || '#ff8a3a';
    wrapper.appendChild(makeEl('a-cylinder', { position: '0 0.7 0', radius: 0.07, height: 1.4, material: materialStr({ color: '#3a3a3a' }) }));
    wrapper.appendChild(makeEl('a-sphere', { position: '0 1.5 0', radius: 0.18, material: materialStr({ color: flame, emissive: flame, emissiveIntensity: 1 }) }));
    // Luz puntual cálida para dar vida.
    wrapper.appendChild(makeEl('a-light', { type: 'point', color: flame, intensity: 0.6, distance: 6, position: '0 1.5 0' }));
  },

  column(wrapper, { material }) {
    wrapper.appendChild(makeEl('a-cylinder', { position: '0 1 0', radius: 0.25, height: 2, material: materialStr(material) }));
    wrapper.appendChild(makeEl('a-box', { position: '0 2.05 0', width: 0.7, height: 0.2, depth: 0.7, material: materialStr(material) }));
  },

  text_panel(wrapper, { info }) {
    // Panel flotante: fondo translúcido + texto A-Frame.
    wrapper.appendChild(makeEl('a-plane', { width: 3.4, height: 1.2, material: materialStr({ color: COLORS.panelBg, opacity: 0.78, side: 'double' }) }));
    wrapper.appendChild(makeEl('a-text', {
      value: deburr(info || ''), // sin acentos: la fuente MSDF default no los soporta
      align: 'center',
      color: COLORS.accent,
      width: 3.2,
      position: '0 0 0.02',
      'wrap-count': 30,
    }));
  },

  debris(wrapper, { material }) {
    wrapper.appendChild(makeEl('a-dodecahedron', { radius: 0.4, rotation: '12 40 8', material: materialStr({ ...material, roughness: 1 }) }));
  },

  // Estructura ceremonial (huaca) escalonada: cuerpo + nivel superior + portada
  // trapezoidal andina + escalinata frontal + friso de greca. Params: w, h, d, relief, ruined.
  adobe_platform(wrapper, spec) {
    const ruined = !!spec.ruined;
    const base = (spec.material && spec.material.color) || (ruined ? '#9a8a66' : '#cda878');
    const W = spec.w || 9, H = spec.h || 3, D = spec.d || 4;
    // Cuerpo principal + segundo nivel retranqueado.
    wrapper.appendChild(makeEl('a-box', { position: `0 ${H / 2} 0`, width: W, height: H, depth: D, material: materialStr({ color: base, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-box', { position: `0 ${H + 0.75} 0`, width: W * 0.7, height: 1.5, depth: D * 0.7, material: materialStr({ color: base, roughness: 1 }) }));
    // Friso de greca en la parte alta del cuerpo.
    addReliefFrieze(wrapper, W, D, spec.relief || 'steps', ruined, H - 0.7);
    // Portada trapezoidal (recoveco oscuro + jambas inclinadas + dintel).
    const dz = D / 2 + 0.02;
    wrapper.appendChild(makeEl('a-plane', { position: `0 1.1 ${dz}`, width: 1.1, height: 2.0, material: materialStr({ color: '#1c1712', opacity: 0.95 }) }));
    wrapper.appendChild(makeEl('a-box', { position: `-0.7 1.1 ${dz}`, width: 0.22, height: 2.1, depth: 0.2, rotation: '0 0 6', material: materialStr({ color: base, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-box', { position: `0.7 1.1 ${dz}`, width: 0.22, height: 2.1, depth: 0.2, rotation: '0 0 -6', material: materialStr({ color: base, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-box', { position: `0 2.2 ${dz}`, width: 1.7, height: 0.25, depth: 0.25, material: materialStr({ color: base, roughness: 1 }) }));
    // Escalinata frontal (3 peldaños, más alto junto a la portada).
    for (let k = 0; k < 3; k++) {
      const sz = D / 2 + 0.35 + k * 0.45;
      const sh = 0.9 - k * 0.28;
      wrapper.appendChild(makeEl('a-box', { position: `0 ${sh / 2} ${sz}`, width: 2.4, height: sh, depth: 0.5, material: materialStr({ color: base, roughness: 1 }) }));
    }
    if (ruined) {
      for (const ox of [-W * 0.3, W * 0.25]) {
        wrapper.appendChild(makeEl('a-box', { position: `${ox} ${H + 0.3} ${-D * 0.2}`, width: W * 0.2, height: 0.6, depth: D * 0.5, material: materialStr({ color: '#8a7b58', roughness: 1 }) }));
      }
    }
  },

  // Banderín ceremonial: poste + travesaño + tela colgante con emblema.
  banner(wrapper, spec) {
    const cloth = (spec.material && spec.material.color) || '#d9a93a';
    const pole = '#6b4a2b';
    wrapper.appendChild(makeEl('a-cylinder', { position: '0 1.8 0', radius: 0.06, height: 3.6, material: materialStr({ color: pole, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-cylinder', { position: '0.5 3.4 0', radius: 0.04, height: 1.0, rotation: '0 0 90', material: materialStr({ color: pole, roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-plane', { position: '0.5 2.6 0', width: 0.9, height: 1.5, material: materialStr({ color: cloth, side: 'double', roughness: 1 }) }));
    wrapper.appendChild(makeEl('a-plane', { position: '0.5 2.6 0.02', width: 0.4, height: 0.5, material: materialStr({ color: '#7a4a1e', side: 'double' }) }));
  },

  // Puerta principal de la fortaleza: cuerpo + arco + pilastras + escudo + almenas.
  fort_gate(wrapper, spec) {
    const ruined = !!spec.ruined;
    const stone = (spec.material && spec.material.color) || (ruined ? '#8f897e' : '#bdb4a2');
    const W = spec.w || 5, H = spec.h || 4, D = spec.d || 1.1;
    wrapper.appendChild(makeEl('a-box', { position: `0 ${H / 2} 0`, width: W, height: H, depth: D, material: materialStr({ color: stone, roughness: 1 }) }));
    addArch(wrapper, 0, D / 2 + 0.02, 0.95, 2.2, stone, '#15110d'); // arco de acceso
    // Pilastras laterales.
    wrapper.appendChild(makeEl('a-box', { position: `-1.5 ${H * 0.45} ${D / 2}`, width: 0.3, height: H * 0.9, depth: 0.25, material: materialStr({ color: stone }) }));
    wrapper.appendChild(makeEl('a-box', { position: `1.5 ${H * 0.45} ${D / 2}`, width: 0.3, height: H * 0.9, depth: 0.25, material: materialStr({ color: stone }) }));
    // Escudo/placa sobre el arco.
    wrapper.appendChild(makeEl('a-box', { position: `0 ${H - 0.6} ${D / 2 + 0.03}`, width: 0.9, height: 0.7, depth: 0.12, material: materialStr({ color: ruined ? '#7d776c' : '#a79e8d' }) }));
    wrapper.appendChild(makeEl('a-plane', { position: `0 ${H - 0.6} ${D / 2 + 0.1}`, width: 0.5, height: 0.4, material: materialStr({ color: '#7a4a1e' }) }));
    addCrenellations(wrapper, W, D, H, ruined, stone);
    if (ruined) {
      wrapper.appendChild(makeEl('a-box', { position: `${W * 0.28} ${H + 0.4} 0`, width: W * 0.2, height: 0.7, depth: D, material: materialStr({ color: '#6f6a60' }) }));
    }
  },

  // Pila piramidal de balas de cañón (detalle militar).
  cannonballs(wrapper, spec) {
    const c = (spec.material && spec.material.color) || '#2c2c2c';
    const r = 0.13;
    for (const [x, z] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      wrapper.appendChild(makeEl('a-sphere', { position: `${x} ${r} ${z}`, radius: r, material: materialStr({ color: c, metalness: 0.5, roughness: 0.4 }) }));
    }
    wrapper.appendChild(makeEl('a-sphere', { position: `0 ${r * 2.4} 0`, radius: r, material: materialStr({ color: c, metalness: 0.5, roughness: 0.4 }) }));
  },

  custom_box(wrapper, { geometry, material }) {
    const g = geometry || {};
    wrapper.appendChild(makeEl('a-box', {
      width: g.width ?? 1,
      height: g.height ?? 1,
      depth: g.depth ?? 1,
      material: materialStr(material),
    }));
  },
};

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Crea una entidad A-Frame a partir de una spec.
 * @param {object} spec
 * @param {object} [opts]
 * @param {(spec:object, el:HTMLElement)=>void} [opts.onInteract] callback al hacer clic.
 * @returns {HTMLElement} wrapper <a-entity>
 */
export function createObject(spec, opts = {}) {
  const wrapper = makeEl('a-entity', {
    position: vec(spec.position),
    rotation: vec(spec.rotation),
  });
  if (spec.scale) wrapper.setAttribute('scale', vec(spec.scale, 1));
  wrapper.dataset.cvId = spec.id || '';
  wrapper.dataset.cvType = spec.type || '';
  if (spec.info) wrapper.dataset.cvInfo = spec.info;

  // Construye la geometría según el tipo (custom_box como fallback).
  const build = builders[spec.type] || builders.custom_box;
  build(wrapper, spec);

  // Interactividad: clic → resaltar + callback.
  if (spec.interactive) {
    wrapper.classList.add('clickable');
    wrapper.addEventListener('click', () => {
      if (opts.onInteract) opts.onInteract(spec, wrapper);
    });
  }

  return wrapper;
}

/**
 * Resalta (o quita el resaltado de) una entidad cambiando su emisivo.
 * Recorre las mallas Three.js internas del objeto.
 */
export function setHighlight(el, on) {
  if (!el || !el.object3D) return;
  el.object3D.traverse((node) => {
    if (node.isMesh && node.material) {
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((m) => {
        if (!m.emissive) return;
        if (on) {
          if (!m.userData._origEmissive) m.userData._origEmissive = m.emissive.getHex();
          m.emissive.set(COLORS.accent);
          m.emissiveIntensity = 0.6;
        } else if (m.userData._origEmissive !== undefined) {
          m.emissive.setHex(m.userData._origEmissive);
          m.emissiveIntensity = 0;
        }
      });
    }
  });
}
