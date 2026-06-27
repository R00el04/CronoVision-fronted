/**
 * currentSceneBuilder.js
 * Construye la VISTA ACTUAL (deteriorada, año 2077) de un sitio dentro de un
 * grupo A-Frame. Los objetos se generan dinámicamente desde sites.js usando
 * objectFactory, NO desde HTML estático.
 */

import { createObject } from './objectFactory.js';

/**
 * Limpia un grupo y reconstruye la escena actual del sitio.
 * @param {object} site   Objeto de sitio (sites.js).
 * @param {HTMLElement} group  Contenedor <a-entity> donde montar los objetos.
 * @returns {HTMLElement[]} entidades creadas (para animarlas si hace falta).
 */
export function buildCurrentScene(site, group) {
  group.innerHTML = '';
  const created = [];
  const objects = site.current?.objects || [];
  for (const spec of objects) {
    const el = createObject(spec);
    group.appendChild(el);
    created.push(el);
  }
  return created;
}
