/**
 * referenceImages.js
 * Imágenes de referencia (concept-art) en las que se basó el modelado 3D de cada
 * sitio. Se muestran como una tarjeta flotante dentro de la escena para que el
 * usuario vea en base a qué se construyó cada versión.
 *
 * Viven aquí (indexadas por el `id` del sitio) y NO dentro de sites.js / Firestore,
 * para que funcionen igual con datos locales o remotos: solo se necesita `site.id`.
 *
 * Los archivos están en public/ → se sirven desde la raíz del sitio ("/archivo.png").
 */

export const REFERENCE_IMAGES = {
  centro_lima: {
    current: '/escena-lima-futura.png', // vista deteriorada (2077)
    reconstructed: '/escena-lima-pasado.png', // reconstrucción (2010)
  },
  chan_chan: {
    current: '/chan-chan-futuro.png',
    reconstructed: '/chan-chan-pasado.png',
  },
  real_felipe: {
    current: '/san-felipe-futuro.png',
    reconstructed: '/san-felipe-pasado.png',
  },
};

/** Devuelve { current, reconstructed } de un sitio, o null si no hay referencia. */
export const getReference = (siteId) => REFERENCE_IMAGES[siteId] || null;
