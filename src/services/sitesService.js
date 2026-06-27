/**
 * sitesService.js
 * Fuente de datos de sitios con Firebase Firestore en tiempo real.
 *
 * Estrategia:
 *  - Si Firebase está activo → lee la colección "sites" con onSnapshot (tiempo real).
 *  - Si no → devuelve inmediatamente los datos hardcodeados de sites.js (fallback).
 *
 * Exporta:
 *  - subscribeSites(callback)  → se llama cada vez que Firestore actualiza.
 *    Devuelve la función unsubscribe para limpiar el listener.
 *  - getSitesOnce()            → promesa con el array de sitios (sin listener).
 */

import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, isFirebaseEnabled } from './firebase.js';
import { SITES as LOCAL_SITES } from '../data/sites.js';

/**
 * Suscribe a los sitios en tiempo real.
 * @param {(sites: object[]) => void} callback  Se llama con el array de sitios.
 * @returns {() => void}  Función para cancelar la suscripción.
 */
export function subscribeSites(callback) {
  if (!isFirebaseEnabled || !db) {
    // Sin Firebase: devuelve los datos locales de inmediato y un unsubscribe vacío.
    console.info('[sitesService] Firebase no disponible, usando sites.js local.');
    callback(LOCAL_SITES);
    return () => {};
  }

  // Firestore: escucha cambios en tiempo real sobre la colección "sites".
  const q = query(collection(db, 'sites'), orderBy('name'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        // La colección existe pero está vacía → fallback local.
        console.warn('[sitesService] Colección "sites" vacía en Firestore, usando local.');
        callback(LOCAL_SITES);
        return;
      }

      // Mapea los documentos Firestore al mismo formato que usa sites.js.
      // Los campos de "current" (entorno + objetos 3D) los complementamos con
      // los datos locales para no duplicar la geometría en Firestore.
      const remoteSites = snapshot.docs.map((doc) => {
        const data = doc.data();
        // Busca el sitio local equivalente para obtener los objetos 3D.
        const local = LOCAL_SITES.find((s) => s.id === data.id || s.id === doc.id);
        return {
          id: data.id || doc.id,
          name: data.name,
          mlCategory: data.mlCategory,
          currentYear: data.currentYear,
          targetYear: data.targetYear,
          summary: data.summary,
          // La geometría 3D (current.objects) siempre viene del local porque
          // sería muy verboso duplicarla en Firestore.
          current: local?.current ?? data.current ?? {},
        };
      });

      console.info(`[sitesService] ${remoteSites.length} sitios cargados desde Firestore.`);
      callback(remoteSites);
    },
    (error) => {
      // Error de red o de permisos → fallback silencioso.
      console.warn('[sitesService] Error al leer Firestore, usando local:', error.message);
      callback(LOCAL_SITES);
    }
  );

  return unsubscribe;
}

/**
 * Devuelve los sitios una sola vez (sin listener activo).
 * Útil si solo necesitas el array puntual.
 * @returns {Promise<object[]>}
 */
export function getSitesOnce() {
  return new Promise((resolve) => {
    const unsub = subscribeSites((sites) => {
      resolve(sites);
      // Cancela inmediatamente después de la primera entrega.
      setTimeout(unsub, 0);
    });
  });
}
