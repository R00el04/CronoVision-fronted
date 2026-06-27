/**
 * interactionService.js
 * Persiste las interacciones del usuario (selección de sitio, activación de
 * Chrono-Vision, clics en hotspots).
 *
 * Estrategia:
 *  - Si Firebase está activo → colección "interactions" en Firestore.
 *  - Si no → localStorage (clave cv:interactions) + console.log.
 *
 * Nunca lanza: cualquier error se captura para no romper la experiencia.
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseEnabled } from './firebase.js';

const LOCAL_KEY = 'cv:interactions';

/**
 * Guarda una interacción.
 * @param {object} data  Datos arbitrarios del evento (siteId, action, etc.).
 * @returns {Promise<{ok: boolean, backend: string}>}
 */
export async function saveInteraction(data) {
  const record = {
    ...data,
    clientTime: new Date().toISOString(),
  };

  // 1) Camino Firebase.
  if (isFirebaseEnabled && db) {
    try {
      await addDoc(collection(db, 'interactions'), {
        ...record,
        serverTime: serverTimestamp(),
      });
      console.log('[interaction → Firestore]', record);
      return { ok: true, backend: 'firestore' };
    } catch (err) {
      console.warn('[interaction] Firestore falló, usando localStorage:', err);
      // cae al fallback
    }
  }

  // 2) Fallback localStorage + consola.
  try {
    const prev = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    prev.push(record);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(prev));
    console.log('[interaction → localStorage]', record);
    return { ok: true, backend: 'localStorage' };
  } catch (err) {
    // Último recurso: solo consola.
    console.log('[interaction → console]', record, err);
    return { ok: true, backend: 'console' };
  }
}
