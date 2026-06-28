/**
 * liveStatsService.js
 * Escucha la colección "interactions" en Firestore en tiempo real.
 *
 * Estrategia robusta:
 *  - Usa TWO listeners:
 *    1. Sin orderBy → colección completa para el conteo total (resistente a
 *       documentos sin serverTime).
 *    2. Con orderBy('clientTime') → las 5 más recientes para mostrar en lista.
 *       clientTime es un string ISO que SIEMPRE existe (lo pone el frontend).
 *
 *  - Si algún listener falla (permisos, índice faltante), cae silenciosamente
 *    y sigue funcionando con lo que tenga.
 */

import {
  collection, onSnapshot, query, limit,
} from 'firebase/firestore';
import { db, isFirebaseEnabled } from './firebase.js';

/**
 * Suscribe a las estadísticas de interacciones en tiempo real.
 * @param {(stats: { total: number, recent: object[] }) => void} callback
 * @returns {() => void}  Función para cancelar ambas suscripciones.
 */
export function subscribeInteractionCount(callback) {
  if (!isFirebaseEnabled || !db) {
    return () => {};
  }

  let totalCount = 0;
  let recentList = [];

  const notify = () => callback({ total: totalCount, recent: recentList });

  // ── Listener 1: total de documentos (sin ordenar, sin limit) ─────────────
  // Firestore no tiene COUNT nativo en SDK web, así que leemos la colección
  // completa pero solo usamos .size. Con muchos documentos esto podría ser
  // costoso, pero para una demo con pocas interacciones es correcto.
  const colRef = collection(db, 'interactions');

  const unsubTotal = onSnapshot(
    colRef,
    (snapshot) => {
      totalCount = snapshot.size;
      notify();
    },
    (err) => {
      console.warn('[liveStatsService] Error en listener total:', err.message);
    }
  );

  // ── Listener 2: últimas 5 por clientTime — ordena en cliente ────────────────
  // No usamos orderBy en Firestore para evitar necesitar índice compuesto.
  // Leemos los últimos 10 documentos y ordenamos en memoria.
  const qRecent = query(colRef, limit(10));

  const unsubRecent = onSnapshot(
    qRecent,
    (snapshot) => {
      // Ordena por clientTime desc en memoria y toma las 5 más recientes.
      const docs = snapshot.docs
        .map((doc) => ({ ...doc.data() }))
        .filter((d) => d.clientTime)
        .sort((a, b) => b.clientTime.localeCompare(a.clientTime))
        .slice(0, 5);

      recentList = docs.map((d) => ({
        action: d.action  || '—',
        siteId: d.siteId  || '—',
        time:   d.clientTime || '',
      }));
      notify();
    },
    (err) => {
      console.warn('[liveStatsService] Error en listener recientes:', err.message);
      recentList = [];
      notify();
    }
  );

  // Devuelve función que cancela AMBOS listeners.
  return () => {
    unsubTotal();
    unsubRecent();
  };
}
