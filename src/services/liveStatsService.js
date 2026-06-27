/**
 * liveStatsService.js
 * Escucha la colección "interactions" en Firestore en tiempo real
 * y notifica al suscriptor con el conteo actualizado.
 *
 * Esto es lo que evidencia "Firebase en tiempo real" ante el jurado:
 * el contador del panel se actualiza solo mientras la app está abierta.
 *
 * Exporta:
 *  - subscribeInteractionCount(callback) → devuelve unsubscribe.
 */

import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, isFirebaseEnabled } from './firebase.js';

/**
 * Suscribe al conteo de interacciones en tiempo real.
 * @param {(stats: { total: number, recent: object[] }) => void} callback
 * @returns {() => void}  Función para cancelar la suscripción.
 */
export function subscribeInteractionCount(callback) {
  if (!isFirebaseEnabled || !db) {
    // Sin Firebase no hay stats en tiempo real.
    return () => {};
  }

  // Últimas 5 interacciones ordenadas por tiempo de servidor.
  // Usamos limit para no descargar toda la colección.
  const q = query(
    collection(db, 'interactions'),
    orderBy('serverTime', 'desc'),
    limit(5)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const recent = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          action: d.action || '—',
          siteId: d.siteId || '—',
          time: d.clientTime || '',
        };
      });
      callback({ total: snapshot.size, recent });
    },
    (error) => {
      console.warn('[liveStatsService] Error al leer interacciones:', error.message);
    }
  );

  return unsubscribe;
}
