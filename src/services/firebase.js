/**
 * firebase.js
 * Inicialización resiliente de Firebase.
 *
 * Lee las variables VITE_FIREBASE_* del entorno. Si falta alguna, la app NO
 * falla: simplemente queda deshabilitada (isFirebaseEnabled = false) y los
 * servicios usan un fallback (localStorage / consola).
 *
 * Exporta:
 *  - db                 → instancia Firestore o null
 *  - isFirebaseEnabled  → boolean
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuración tomada del entorno Vite.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Solo habilitamos Firebase si las claves esenciales existen y no están vacías.
const hasCredentials = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let db = null;
let isFirebaseEnabled = false;

if (hasCredentials) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirebaseEnabled = true;
    console.info('[Firebase] Inicializado correctamente.');
  } catch (err) {
    // Si algo falla, seguimos sin romper la app.
    console.warn('[Firebase] No se pudo inicializar, se usará fallback:', err);
    db = null;
    isFirebaseEnabled = false;
  }
} else {
  console.info('[Firebase] Sin credenciales: se usará localStorage / consola.');
}

export { db, isFirebaseEnabled };
