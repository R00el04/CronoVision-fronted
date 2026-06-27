/**
 * reconstructionApi.js
 * Capa de acceso al "backend de reconstrucción" (modelo ML).
 *
 * En el MVP el backend aún NO existe, por lo que esta capa puede operar en dos
 * modos según VITE_USE_MOCK_API:
 *
 *  - true  → devuelve datos simulados desde mockReconstructions.js,
 *            con un retardo artificial de 1.2–2 s para imitar la inferencia.
 *  - false → hace POST a `${VITE_API_BASE_URL}/reconstruct`.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CONTRATO DE RESPUESTA ESPERADO DEL BACKEND REAL (POST /reconstruct)
 *
 *   Request body:  { siteId, mlCategory, currentYear, targetYear }
 *
 *   Response 200 (application/json):
 *   {
 *     "siteId": "centro_lima",
 *     "sceneName": "Centro Histórico de Lima — Reconstrucción 2010",
 *     "currentYear": 2077,
 *     "targetYear": 2010,
 *     "prediction": { "class": "urban_historical", "confidence": 0.92 },
 *     "environment": { "sky": "#...", "fog": "#...", "ground": "#...",
 *                      "lightColor": "#...", "lightIntensity": 1.1, "ambient": 0.75 },
 *     "objects":  [ { id, type, geometry?, position, rotation?, scale?,
 *                     material?, interactive?, info? }, ... ],
 *     "hotspots": [ { id, title, description, position }, ... ],
 *     "effects":  { particleColor, particleCount, scanSpeed, glow }
 *   }
 * ───────────────────────────────────────────────────────────────────────────
 */

import { getMockReconstruction } from '../data/mockReconstructions.js';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Retardo aleatorio entre 1.2 y 2 s para simular la latencia del modelo.
const fakeLatency = () => 1200 + Math.random() * 800;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Solicita la reconstrucción de un sitio.
 * @param {object} site  Objeto de sitio (de sites.js).
 * @returns {Promise<object>} JSON de reconstrucción (ver contrato arriba).
 */
export async function requestReconstruction(site) {
  // ── Modo MOCK ─────────────────────────────────────────────────────────────
  if (USE_MOCK) {
    await wait(fakeLatency());
    const data = getMockReconstruction(site.id);
    if (!data) {
      throw new Error(`No hay reconstrucción simulada para "${site.id}".`);
    }
    return data;
  }

  // ── Modo BACKEND REAL ───────────────────────────────────────────────────────
  const res = await fetch(`${API_BASE_URL}/reconstruct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: site.id,
      mlCategory: site.mlCategory,
      currentYear: site.currentYear,
      targetYear: site.targetYear,
    }),
  });

  if (!res.ok) {
    throw new Error(`Backend respondió ${res.status} ${res.statusText}`);
  }
  return res.json();
}
