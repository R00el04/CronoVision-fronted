/**
 * sites.js
 * Catálogo de los tres sitios reales del Perú que maneja el MVP.
 *
 * Cada sitio describe:
 *  - Metadatos (id, nombre, categoría ML, años).
 *  - Su "vista actual" deteriorada (año 2077): entorno + objetos.
 *
 * La "vista reconstruida" vive en mockReconstructions.js para simular que
 * proviene del backend/ML. Ambos comparten el MISMO formato de objeto, de modo
 * que objectFactory.js puede construir cualquiera de las dos escenas.
 */

export const SITES = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. Centro Histórico de Lima
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'centro_lima',
    name: 'Centro Histórico de Lima',
    mlCategory: 'urban_historical',
    currentYear: 2077,
    targetYear: 2010,
    summary:
      'Ciudad histórica colonial. En 2077 luce abandonada y erosionada; ' +
      'Chrono-Vision la reconstruye al esplendor de 2010.',
    // Entorno de la vista actual (deteriorada): gris, polvoriento, niebla suave.
    current: {
      environment: {
        sky: '#3a3c40',
        fog: '#3a3c40',
        ground: '#5f5a50',
        lightColor: '#b3aea2',
        lightIntensity: 0.5,
        ambient: 0.45,
      },
      // Objetos deteriorados generados dinámicamente desde JSON.
      objects: [
        // Plaza empedrada central.
        { id: 'l_plaza', type: 'plaza', position: { x: 0, y: 0.02, z: -7 }, scale: { x: 26, y: 1, z: 26 }, material: { color: '#5d584e' } },
        // Edificios coloniales laterales (con arquería y balcón), girados hacia el centro.
        { id: 'l_build_left', type: 'colonial_building', position: { x: -6, y: 0, z: -6.5 }, rotation: { x: 0, y: 18, z: 0 }, ruined: true },
        { id: 'l_build_right', type: 'colonial_building', position: { x: 6, y: 0, z: -6.5 }, rotation: { x: 0, y: -18, z: 0 }, ruined: true },
        // Iglesia/catedral simplificada al fondo.
        { id: 'l_church', type: 'church', position: { x: 0, y: 0, z: -17 }, ruined: true },
        // Balaustrada y fuente central.
        { id: 'l_balustrade', type: 'balustrade', position: { x: 0, y: 0, z: -6 }, length: 6, ruined: true },
        { id: 'l_fountain', type: 'fountain', position: { x: 0, y: 0, z: -3.5 }, ruined: true },
        // Faroles: dos de pie apagados y uno deteriorado (inclinado).
        { id: 'l_lamp_1', type: 'lamp_post', position: { x: -2.6, y: 0, z: -3.2 }, lit: false },
        { id: 'l_lamp_2', type: 'lamp_post', position: { x: 3.0, y: 0, z: -4.2 }, lit: false },
        { id: 'l_lamp_broken', type: 'lamp_post', position: { x: -3.6, y: 0, z: -2.2 }, rotation: { x: 0, y: 0, z: 16 }, lit: false },
        // Escombros moderados.
        { id: 'l_debris_1', type: 'debris', position: { x: 2.2, y: 0.3, z: -2.6 }, material: { color: '#6b655a' } },
        { id: 'l_debris_2', type: 'debris', position: { x: -1.8, y: 0.3, z: -4.8 }, scale: { x: 1.3, y: 1.3, z: 1.3 }, material: { color: '#5e584e' } },
        { id: 'l_debris_3', type: 'debris', position: { x: 4.2, y: 0.3, z: -5.6 }, material: { color: '#655f54' } },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Chan Chan
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'chan_chan',
    name: 'Chan Chan',
    mlCategory: 'archaeological_zone',
    currentYear: 2077,
    targetYear: 1450,
    summary:
      'Ciudadela de adobe Chimú. En 2077 está erosionada por el viento y la ' +
      'sal; Chrono-Vision recrea su época ceremonial de 1450.',
    // Entorno actual: desértico, seco, cielo gris polvoso.
    current: {
      environment: {
        sky: '#9f9a8c',
        fog: '#a59f8f',
        ground: '#ab9468',
        lightColor: '#c9bb9a',
        lightIntensity: 0.7,
        ambient: 0.5,
      },
      objects: [
        // Plaza/camino central amplio de tierra.
        { id: 'c_plaza', type: 'plaza', position: { x: 0, y: 0.02, z: -8 }, scale: { x: 30, y: 1, z: 32 }, material: { color: '#a89066' } },
        // Muros laterales de adobe con relieves geométricos desgastados (corren hacia el fondo).
        { id: 'c_wall_left', type: 'adobe_wall', position: { x: -6.5, y: 0, z: -8 }, rotation: { x: 0, y: 90, z: 0 }, w: 13, h: 2.6, d: 0.7, relief: 'diamond', ruined: true },
        { id: 'c_wall_right', type: 'adobe_wall', position: { x: 6.5, y: 0, z: -8 }, rotation: { x: 0, y: -90, z: 0 }, w: 13, h: 2.6, d: 0.7, relief: 'lattice', ruined: true },
        // Estructura ceremonial (huaca) al fondo, parcialmente destruida.
        { id: 'c_huaca', type: 'adobe_platform', position: { x: 0, y: 0, z: -16 }, w: 9, h: 3, d: 4, relief: 'steps', ruined: true },
        // Restos de columnas/postes ceremoniales (erosionados, achaparrados).
        { id: 'c_col_1', type: 'column', position: { x: -3, y: 0, z: -6 }, scale: { x: 1, y: 0.6, z: 1 }, material: { color: '#9c855f' } },
        { id: 'c_col_2', type: 'column', position: { x: 3, y: 0, z: -6 }, scale: { x: 1, y: 0.5, z: 1 }, material: { color: '#947d57' } },
        { id: 'c_col_3', type: 'column', position: { x: -3, y: 0, z: -11 }, scale: { x: 1, y: 0.7, z: 1 }, material: { color: '#9c855f' } },
        { id: 'c_col_4', type: 'column', position: { x: 3, y: 0, z: -11 }, scale: { x: 1, y: 0.45, z: 1 }, material: { color: '#8f7a55' } },
        // Escombros moderados de adobe.
        { id: 'c_debris_1', type: 'debris', position: { x: -2, y: 0.3, z: -4 }, material: { color: '#9a8460' } },
        { id: 'c_debris_2', type: 'debris', position: { x: 2.4, y: 0.3, z: -5.5 }, scale: { x: 1.4, y: 1.4, z: 1.4 }, material: { color: '#8d7857' } },
        { id: 'c_debris_3', type: 'debris', position: { x: -1.4, y: 0.3, z: -9.5 }, material: { color: '#947f5b' } },
        { id: 'c_debris_4', type: 'debris', position: { x: 2.8, y: 0.3, z: -12 }, scale: { x: 1.2, y: 1.2, z: 1.2 }, material: { color: '#8a7654' } },
        // Bloque tallado caído (custom_box) con relieve insinuado.
        { id: 'c_block_1', type: 'custom_box', position: { x: -3.4, y: 0.4, z: -3 }, rotation: { x: 0, y: 24, z: 12 }, geometry: { width: 1.2, height: 0.8, depth: 1.2 }, material: { color: '#9c855f', roughness: 1 } },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Fortaleza del Real Felipe
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'real_felipe',
    name: 'Fortaleza del Real Felipe',
    mlCategory: 'coastal_fortress',
    currentYear: 2077,
    targetYear: 1800,
    summary:
      'Fortaleza costera del Callao. En 2077 sus murallas están dañadas por el ' +
      'mar; Chrono-Vision la restaura a su estado defensivo de 1800.',
    // Entorno actual: costero, gris, niebla suave, mar desaturado.
    current: {
      environment: {
        sky: '#7c8590',
        fog: '#828b95',
        ground: '#7e7a70',
        lightColor: '#a8b2bb',
        lightIntensity: 0.6,
        ambient: 0.5,
      },
      objects: [
        // Mar a la izquierda (sensación marítima).
        { id: 'r_sea', type: 'water', position: { x: -16, y: 0.05, z: -8 }, scale: { x: 24, y: 1, z: 40 }, material: { color: '#39515c', opacity: 0.85 } },
        // Explanada/patio central de piedra agrietada.
        { id: 'r_plaza', type: 'plaza', position: { x: 0, y: 0.02, z: -8 }, scale: { x: 26, y: 1, z: 30 }, material: { color: '#857f72' } },
        // Muralla frontal dañada con la puerta al centro.
        { id: 'r_gate', type: 'fort_gate', position: { x: 0, y: 0, z: -14 }, w: 5, h: 4, d: 1.2, ruined: true },
        { id: 'r_wall_back_l', type: 'wall', position: { x: -5.5, y: 0, z: -14 }, w: 5, h: 3, d: 1, ruined: true },
        { id: 'r_wall_back_r', type: 'wall', position: { x: 5.5, y: 0, z: -14 }, w: 5, h: 3, d: 1, ruined: true },
        // Murallas laterales hacia el frente (encierran el patio).
        { id: 'r_wall_left', type: 'wall', position: { x: -7.5, y: 0, z: -9 }, rotation: { x: 0, y: 90, z: 0 }, w: 11, h: 2.8, d: 1, ruined: true },
        { id: 'r_wall_right', type: 'wall', position: { x: 7.5, y: 0, z: -9 }, rotation: { x: 0, y: -90, z: 0 }, w: 11, h: 2.8, d: 1, ruined: true },
        // Baluartes (garitas derruidas) flanqueando la puerta.
        { id: 'r_tower_1', type: 'tower', position: { x: -3, y: 0, z: -13 }, r: 1.6, ruined: true },
        { id: 'r_tower_2', type: 'tower', position: { x: 3, y: 0, z: -13 }, r: 1.6, ruined: true },
        // Cañones viejos: dos en su sitio y uno volcado/inclinado.
        { id: 'r_cannon_1', type: 'cannon', position: { x: -4, y: 0.3, z: -6 }, rotation: { x: 0, y: 12, z: 0 }, material: { color: '#46403a' } },
        { id: 'r_cannon_2', type: 'cannon', position: { x: 3.6, y: 0.3, z: -6.5 }, rotation: { x: 0, y: -18, z: 0 }, material: { color: '#41403a' } },
        { id: 'r_cannon_3', type: 'cannon', position: { x: -0.5, y: 0.4, z: -4 }, rotation: { x: 0, y: 60, z: 38 }, material: { color: '#4a443c' } },
        // Escombros moderados.
        { id: 'r_debris_1', type: 'debris', position: { x: -2.2, y: 0.3, z: -8 }, material: { color: '#7a756a' } },
        { id: 'r_debris_2', type: 'debris', position: { x: 2.6, y: 0.3, z: -9.5 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, material: { color: '#6f6a60' } },
        { id: 'r_debris_3', type: 'debris', position: { x: 1.2, y: 0.3, z: -5 }, material: { color: '#746f64' } },
        { id: 'r_block_1', type: 'custom_box', position: { x: -3.2, y: 0.4, z: -3.5 }, rotation: { x: 0, y: 18, z: 8 }, geometry: { width: 1.1, height: 0.8, depth: 1.1 }, material: { color: '#7d776c', roughness: 1 } },
      ],
    },
  },
];

/** Devuelve el sitio por su id, o undefined. */
export const getSiteById = (id) => SITES.find((s) => s.id === id);
