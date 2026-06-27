/**
 * narrationApi.js
 * Consume el endpoint GET /narrate/{siteId} del backend con streaming.
 *
 * Cuando VITE_USE_MOCK_API=true usa una narración simulada local
 * para poder trabajar sin el backend activo.
 *
 * onChunk(text)    → llamado con cada fragmento que llega del stream
 * onDone()         → llamado cuando el stream termina
 * onError(err)     → llamado si algo falla
 */

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Narraciones de fallback para modo mock (una por sitio).
const MOCK_NARRATIONS = {
  centro_lima:
    'Ante ti se extiende el Centro Histórico de Lima en el año 2010, ' +
    'rescatado de las garras del tiempo. Los balcones de madera tallada proyectan ' +
    'sombras sobre adoquines recién lavados, y el campanario de la catedral se alza ' +
    'imponente contra el cielo limeño. Aquí late el corazón colonial de la Ciudad de ' +
    'los Reyes, fundada en 1535. Explora los puntos de interés para descubrir sus secretos.',
  chan_chan:
    'Ante ti se extiende Chan Chan en el año 1450, en el apogeo del reino Chimú. ' +
    'Los muros de adobe se elevan cubiertos de relieves geométricos que representan ' +
    'peces y olas del Pacífico, y el olor a tierra húmeda impregna el aire ceremonial. ' +
    'Esta fue la ciudad de barro más grande del mundo, hogar de decenas de miles de almas. ' +
    'Acércate a los relieves y las plazas para sentir su grandeza.',
  real_felipe:
    'Ante ti se alza la Fortaleza del Real Felipe en 1800, centinela de piedra del ' +
    'puerto del Callao. Los cañones de bronce apuntan hacia el horizonte marino, ' +
    'listos para defender el paso más estratégico del Virreinato del Perú. ' +
    'El viento salado agita las banderas sobre los torreones mientras los soldados ' +
    'patrullan las murallas. Explora las torres y la explanada para conocer su historia.',
};

// Simula el streaming del mock letra por letra con un intervalo.
async function streamMock(siteId, { onChunk, onDone, onError }) {
  const text = MOCK_NARRATIONS[siteId] ||
    'Ante ti se extiende este sitio histórico en su época de esplendor. Explora los puntos de interés.';
  const CHUNK_SIZE = 4;   // caracteres por tick
  const DELAY_MS = 28;    // ms entre ticks

  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    await new Promise((r) => setTimeout(r, DELAY_MS));
    onChunk(text.slice(i, i + CHUNK_SIZE));
  }
  onDone();
}

/**
 * Solicita la narración histórica del sitio con streaming.
 *
 * @param {string} siteId          ID del sitio.
 * @param {number} targetYear      Año de la reconstrucción.
 * @param {object} callbacks
 * @param {(text:string)=>void} callbacks.onChunk   Fragmento de texto recibido.
 * @param {()=>void}            callbacks.onDone    Stream completado.
 * @param {(err:Error)=>void}   callbacks.onError   Error en el stream.
 * @returns {AbortController}  Permite cancelar el stream si el usuario resetea.
 */
export function streamNarration(siteId, targetYear, { onChunk, onDone, onError }) {
  const controller = new AbortController();

  if (USE_MOCK) {
    streamMock(siteId, { onChunk, onDone, onError });
    return controller;
  }

  (async () => {
    try {
      const url = `${API_BASE_URL}/narrate/${siteId}?year=${targetYear}`;
      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) {
        throw new Error(`Narration backend ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) onChunk(chunk);
      }

      onDone();
    } catch (err) {
      if (err.name === 'AbortError') return; // cancelación intencional
      console.warn('[narrationApi] Error en stream:', err);
      onError(err);
    }
  })();

  return controller;
}
