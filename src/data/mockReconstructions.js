/**
 * mockReconstructions.js
 * Respuestas SIMULADAS del backend/ML para cada sitio.
 *
 * Este objeto imita la forma exacta que tendrá la respuesta real del modelo
 * (ver reconstructionApi.js para el contrato documentado). reconstructionApi.js
 * lo devuelve cuando VITE_USE_MOCK_API=true.
 *
 * Estructura por sitio:
 *  - siteId, sceneName, currentYear, targetYear
 *  - prediction: { class, confidence }   ← salida del clasificador ML
 *  - environment: parámetros de cielo/luz/suelo de la época reconstruida
 *  - objects[]: entidades a renderizar (mismo formato que objectFactory)
 *  - hotspots[]: puntos interactivos con datos históricos
 *  - effects: parámetros del efecto Chrono-Vision (Three.js)
 */

export const MOCK_RECONSTRUCTIONS = {
  // ──────────────────────────────────────────────────────────────────────────
  centro_lima: {
    siteId: 'centro_lima',
    sceneName: 'Centro Histórico de Lima — Reconstrucción 2010',
    currentYear: 2077,
    targetYear: 2010,
    prediction: { class: 'urban_historical', confidence: 0.92 },
    environment: {
      sky: '#aebfd0',
      fog: '#c2d2de',
      ground: '#897f6c',
      lightColor: '#fff2dc',
      lightIntensity: 1.1,
      ambient: 0.8,
    },
    // Misma composición que la vista actual, pero restaurada (ruined: false),
    // faroles encendidos, calle ordenada y casi sin escombros.
    objects: [
      { id: 'l_plaza', type: 'plaza', position: { x: 0, y: 0.02, z: -7 }, scale: { x: 26, y: 1, z: 26 }, material: { color: '#897f6c' } },
      { id: 'l_build_left', type: 'colonial_building', position: { x: -6, y: 0, z: -6.5 }, rotation: { x: 0, y: 18, z: 0 }, interactive: true, info: 'Casona colonial con arquería y balcón de madera tallada, restaurada al estado de 2010.' },
      { id: 'l_build_right', type: 'colonial_building', position: { x: 6, y: 0, z: -6.5 }, rotation: { x: 0, y: -18, z: 0 }, interactive: true, info: 'Fachada colonial con balcón completo y arcos del primer piso.' },
      { id: 'l_church', type: 'church', position: { x: 0, y: 0, z: -17 }, interactive: true, info: 'Iglesia histórica con torre campanario y cúpula, eje del centro virreinal.' },
      { id: 'l_balustrade', type: 'balustrade', position: { x: 0, y: 0, z: -6 }, length: 6 },
      { id: 'l_fountain', type: 'fountain', position: { x: 0, y: 0, z: -3.5 }, interactive: true, info: 'Fuente de piedra restaurada, punto central de la plaza.' },
      { id: 'l_lamp_1', type: 'lamp_post', position: { x: -2.6, y: 0, z: -3.2 }, lit: true, info: 'Farol de hierro encendido.' },
      { id: 'l_lamp_2', type: 'lamp_post', position: { x: 3.0, y: 0, z: -4.2 }, lit: true },
      { id: 'l_lamp_3', type: 'lamp_post', position: { x: -3.6, y: 0, z: -2.2 }, lit: true },
      { id: 'l_tree_1', type: 'tree', position: { x: 4.4, y: 0, z: -2.8 }, material: { color: '#3f8a3a' } },
      { id: 'l_tree_2', type: 'tree', position: { x: -4.6, y: 0, z: -5.6 }, material: { color: '#4a9b44' } },
      { id: 'l_panel', type: 'text_panel', position: { x: 0, y: 2.6, z: -5 }, info: 'Plaza Mayor de Lima\nFundada en 1535 — corazón virreinal del Perú.' },
    ],
    hotspots: [
      { id: 'l_hs_1', target: 'l_build_left', title: 'Balcones coloniales', description: 'Los balcones de madera eran uno de los elementos más representativos de la arquitectura histórica limeña.', position: { x: -4.6, y: 3, z: -5 } },
      { id: 'l_hs_2', target: 'l_church', title: 'Iglesia histórica', description: 'El centro histórico concentraba edificios religiosos y administrativos de alto valor patrimonial.', position: { x: 0, y: 4.5, z: -12 } },
      { id: 'l_hs_3', target: 'l_fountain', title: 'Plaza central', description: 'La plaza funcionaba como espacio urbano de encuentro, tránsito e intercambio cultural.', position: { x: 1.6, y: 1.6, z: -3.5 } },
    ],
    effects: { particleColor: '#36e0c8', particleCount: 1400, scanSpeed: 1.4, glow: true },
  },

  // ──────────────────────────────────────────────────────────────────────────
  chan_chan: {
    siteId: 'chan_chan',
    sceneName: 'Chan Chan — Reconstrucción 1450',
    currentYear: 2077,
    targetYear: 1450,
    prediction: { class: 'archaeological_zone', confidence: 0.89 },
    environment: {
      sky: '#86bce6',
      fog: '#d8d2be',
      ground: '#cdb083',
      lightColor: '#fff0cf',
      lightIntensity: 1.15,
      ambient: 0.85,
    },
    // Misma composición que las ruinas, pero restaurada: muros completos con
    // relieves nítidos, antorchas encendidas, banderines y patio ceremonial.
    objects: [
      { id: 'c_plaza', type: 'plaza', position: { x: 0, y: 0.02, z: -8 }, scale: { x: 30, y: 1, z: 32 }, material: { color: '#cdb083' } },
      { id: 'c_wall_left', type: 'adobe_wall', position: { x: -6.5, y: 0, z: -8 }, rotation: { x: 0, y: 90, z: 0 }, w: 13, h: 2.8, d: 0.7, relief: 'diamond', material: { color: '#cda878' }, interactive: true, info: 'Muro de adobe con relieves geométricos en rombos, restaurado a su estado de 1450.' },
      { id: 'c_wall_right', type: 'adobe_wall', position: { x: 6.5, y: 0, z: -8 }, rotation: { x: 0, y: -90, z: 0 }, w: 13, h: 2.8, d: 0.7, relief: 'lattice', material: { color: '#d3b07c' }, interactive: true, info: 'Friso de celosía: patrones repetidos que evocan redes y olas del mar.' },
      { id: 'c_huaca', type: 'adobe_platform', position: { x: 0, y: 0, z: -16 }, w: 9, h: 3, d: 4, relief: 'steps', material: { color: '#cda878' }, interactive: true, info: 'Plataforma ceremonial (huaca) con portada trapezoidal y escalinata de acceso.' },
      // Postes ceremoniales completos a lo largo del camino.
      { id: 'c_col_1', type: 'column', position: { x: -3, y: 0, z: -6 }, material: { color: '#c9a877' } },
      { id: 'c_col_2', type: 'column', position: { x: 3, y: 0, z: -6 }, material: { color: '#c9a877' } },
      { id: 'c_col_3', type: 'column', position: { x: -3, y: 0, z: -11 }, material: { color: '#c9a877' } },
      { id: 'c_col_4', type: 'column', position: { x: 3, y: 0, z: -11 }, material: { color: '#c9a877' } },
      // Antorchas encendidas flanqueando la plaza.
      { id: 'c_torch_1', type: 'torch', position: { x: -4.2, y: 0, z: -5 }, material: { color: '#ff8a3a' }, info: 'Antorcha ceremonial.' },
      { id: 'c_torch_2', type: 'torch', position: { x: 4.2, y: 0, z: -5 }, material: { color: '#ff8a3a' } },
      { id: 'c_torch_3', type: 'torch', position: { x: -4.2, y: 0, z: -11 }, material: { color: '#ff8a3a' } },
      { id: 'c_torch_4', type: 'torch', position: { x: 4.2, y: 0, z: -11 }, material: { color: '#ff8a3a' } },
      // Banderines simbólicos discretos.
      { id: 'c_banner_1', type: 'banner', position: { x: -2.6, y: 0, z: -13 }, material: { color: '#d9a93a' } },
      { id: 'c_banner_2', type: 'banner', position: { x: 2.6, y: 0, z: -13 }, rotation: { x: 0, y: 180, z: 0 }, material: { color: '#cf9a2f' } },
      // Patio central: jardinera con vegetación estilizada.
      { id: 'c_planter', type: 'custom_box', position: { x: 0, y: 0.15, z: -7 }, geometry: { width: 3.2, height: 0.3, depth: 3.2 }, material: { color: '#7a5a3a', roughness: 1 }, interactive: true, info: 'Patio central con jardinera, núcleo de la organización ceremonial.' },
      { id: 'c_palm_1', type: 'tree', position: { x: -0.8, y: 0.3, z: -7 }, scale: { x: 0.8, y: 0.9, z: 0.8 }, material: { color: '#4a8a3a' } },
      { id: 'c_palm_2', type: 'tree', position: { x: 0.8, y: 0.3, z: -6.6 }, scale: { x: 0.8, y: 1, z: 0.8 }, material: { color: '#3f7e34' } },
      { id: 'c_panel', type: 'text_panel', position: { x: 0, y: 2.8, z: -6 }, info: 'Ciudadela de Chan Chan\nCapital del reino Chimú — apogeo ceremonial en 1450.' },
    ],
    hotspots: [
      { id: 'c_hs_1', target: 'c_wall_left', title: 'Relieves geométricos', description: 'Los muros de Chan Chan incorporaban relieves decorativos con patrones geométricos y simbólicos.', position: { x: -3.6, y: 2.6, z: -6 } },
      { id: 'c_hs_2', target: 'c_planter', title: 'Plaza ceremonial', description: 'Las plazas y patios abiertos cumplían funciones ceremoniales, políticas y administrativas.', position: { x: 1.6, y: 1.8, z: -7 } },
      { id: 'c_hs_3', target: 'c_huaca', title: 'Arquitectura de adobe', description: 'Chan Chan fue una de las mayores ciudades de adobe del mundo y capital del reino Chimú.', position: { x: 0, y: 3.8, z: -13 } },
    ],
    effects: { particleColor: '#36e0c8', particleCount: 1300, scanSpeed: 1.3, glow: true },
  },

  // ──────────────────────────────────────────────────────────────────────────
  real_felipe: {
    siteId: 'real_felipe',
    sceneName: 'Fortaleza del Real Felipe — Reconstrucción 1800',
    currentYear: 2077,
    targetYear: 1800,
    prediction: { class: 'coastal_fortress', confidence: 0.91 },
    environment: {
      sky: '#9fc4e0',
      fog: '#c4dcee',
      ground: '#a89a7e',
      lightColor: '#fff2dc',
      lightIntensity: 1.15,
      ambient: 0.82,
    },
    // Misma composición que las ruinas, pero restaurada: murallas íntegras con
    // almenas, baluartes con garita y bandera, cañones bien colocados y banderines.
    objects: [
      { id: 'r_sea', type: 'water', position: { x: -16, y: 0.05, z: -8 }, scale: { x: 24, y: 1, z: 40 }, material: { color: '#3f7fa8', opacity: 0.9 } },
      { id: 'r_sea_back', type: 'water', position: { x: 0, y: 0.04, z: -22 }, scale: { x: 60, y: 1, z: 16 }, material: { color: '#3f7fa8', opacity: 0.9 } },
      { id: 'r_plaza', type: 'plaza', position: { x: 0, y: 0.02, z: -8 }, scale: { x: 26, y: 1, z: 30 }, material: { color: '#bfae8c' }, interactive: true, info: 'Patio de armas: espacio central de circulación y organización militar.' },
      // Frente: puerta principal + muralla a ambos lados.
      { id: 'r_gate', type: 'fort_gate', position: { x: 0, y: 0, z: -14 }, w: 5, h: 4.2, d: 1.2, material: { color: '#c2bcaa' }, interactive: true, info: 'Puerta principal de la fortaleza, con arco de medio punto y escudo.' },
      { id: 'r_wall_back_l', type: 'wall', position: { x: -5.5, y: 0, z: -14 }, w: 5, h: 3.2, d: 1, material: { color: '#c2bcaa' } },
      { id: 'r_wall_back_r', type: 'wall', position: { x: 5.5, y: 0, z: -14 }, w: 5, h: 3.2, d: 1, material: { color: '#c2bcaa' } },
      // Murallas laterales íntegras.
      { id: 'r_wall_left', type: 'wall', position: { x: -7.5, y: 0, z: -9 }, rotation: { x: 0, y: 90, z: 0 }, w: 11, h: 3, d: 1, material: { color: '#c2bcaa' }, interactive: true, info: 'Muralla defensiva con almenas, parte del sistema de protección del puerto.' },
      { id: 'r_wall_right', type: 'wall', position: { x: 7.5, y: 0, z: -9 }, rotation: { x: 0, y: -90, z: 0 }, w: 11, h: 3, d: 1, material: { color: '#c2bcaa' } },
      // Baluartes con garita abovedada y bandera.
      { id: 'r_tower_1', type: 'tower', position: { x: -3, y: 0, z: -13 }, r: 1.6, flag: true, flagColor: '#c0392b', material: { color: '#c2bcaa' }, interactive: true, info: 'Torreón del Rey: baluarte con garita de vigilancia.' },
      { id: 'r_tower_2', type: 'tower', position: { x: 3, y: 0, z: -13 }, r: 1.6, flag: true, flagColor: '#c0392b', material: { color: '#c2bcaa' } },
      // Artillería bien colocada mirando al mar/frente.
      { id: 'r_cannon_1', type: 'cannon', position: { x: -4, y: 0.4, z: -6 }, material: { color: '#2c2c2c' }, interactive: true, info: 'Cañón de bronce restaurado, orientado a la línea de costa.' },
      { id: 'r_cannon_2', type: 'cannon', position: { x: -1.4, y: 0.4, z: -6 }, material: { color: '#2c2c2c' } },
      { id: 'r_cannon_3', type: 'cannon', position: { x: 1.4, y: 0.4, z: -6 }, material: { color: '#2c2c2c' } },
      { id: 'r_cannon_4', type: 'cannon', position: { x: 4, y: 0.4, z: -6 }, material: { color: '#2c2c2c' } },
      { id: 'r_balls_1', type: 'cannonballs', position: { x: -3.1, y: 0, z: -6.2 }, material: { color: '#2c2c2c' } },
      { id: 'r_balls_2', type: 'cannonballs', position: { x: 2.3, y: 0, z: -6.2 }, material: { color: '#2c2c2c' } },
      // Banderines en la puerta + asta central.
      { id: 'r_banner_1', type: 'banner', position: { x: -1.7, y: 0, z: -12.8 }, material: { color: '#c0392b' } },
      { id: 'r_banner_2', type: 'banner', position: { x: 1.7, y: 0, z: -12.8 }, rotation: { x: 0, y: 180, z: 0 }, material: { color: '#d9d2c4' } },
      { id: 'r_flagpole', type: 'banner', position: { x: 0, y: 0, z: -9 }, material: { color: '#e4ddcf' } },
      // Faroles encendidos del patio.
      { id: 'r_torch_1', type: 'torch', position: { x: -3.4, y: 0, z: -7.5 }, material: { color: '#ff9a4a' } },
      { id: 'r_torch_2', type: 'torch', position: { x: 3.4, y: 0, z: -7.5 }, material: { color: '#ff9a4a' } },
      { id: 'r_panel', type: 'text_panel', position: { x: 0, y: 3.0, z: -8 }, info: 'Fortaleza del Real Felipe\nCallao, 1800 — base militar que defendía el puerto.' },
    ],
    hotspots: [
      { id: 'r_hs_1', target: 'r_wall_left', title: 'Murallas defensivas', description: 'Las murallas formaban parte del sistema defensivo principal de la fortaleza y protegían el puerto del Callao.', position: { x: -4.4, y: 3, z: -8 } },
      { id: 'r_hs_2', target: 'r_cannon_1', title: 'Cañones', description: 'Los cañones eran elementos clave en la defensa costera y en el control del acceso marítimo.', position: { x: -4, y: 1.4, z: -5 } },
      { id: 'r_hs_3', target: 'r_plaza', title: 'Patio o plaza interior', description: 'La fortaleza incluía espacios interiores para circulación, organización militar y operaciones defensivas.', position: { x: 1.6, y: 1.6, z: -9 } },
    ],
    effects: { particleColor: '#36e0c8', particleCount: 1500, scanSpeed: 1.5, glow: true },
  },
};

/** Devuelve la reconstrucción simulada de un sitio. */
export const getMockReconstruction = (siteId) => MOCK_RECONSTRUCTIONS[siteId];
