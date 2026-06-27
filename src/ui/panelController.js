/**
 * panelController.js
 * Controla el panel lateral oscuro: estado del modelo, predicción, confianza,
 * año reconstruido e información de hotspots/objetos seleccionados.
 *
 * Solo manipula el DOM del panel; no conoce A-Frame ni servicios.
 */

import { MESSAGES } from '../utils/constants.js';

export class PanelController {
  /** @param {HTMLElement} root  elemento raíz del panel (#cv-panel). */
  constructor(root) {
    this.root = root;
    this.els = {
      siteName: root.querySelector('#cv-site-name'),
      mlModel: root.querySelector('#cv-ml-model'),
      status: root.querySelector('#cv-status-text'),
      statusDot: root.querySelector('#cv-status-dot'),
      predClass: root.querySelector('#cv-pred-class'),
      confidence: root.querySelector('#cv-confidence'),
      confidenceBar: root.querySelector('#cv-confidence-bar'),
      targetYear: root.querySelector('#cv-target-year'),
      sceneName: root.querySelector('#cv-scene-name'),
      info: root.querySelector('#cv-info-content'),
    };
    this.setStatus(MESSAGES.IDLE, 'idle');
  }

  /** Muestra el sitio seleccionado y su categoría ML. */
  setSite(site) {
    this.els.siteName.textContent = site.name;
    this.els.mlModel.textContent = `Modelo ML: ${site.mlCategory}`;
    this.clearPrediction();
    this.showInfo({
      title: 'Vista actual',
      description: `${site.summary}\n\nActiva Chrono-Vision para ver la reconstrucción del año ${site.targetYear}.`,
    });
  }

  /**
   * Actualiza el estado del modelo.
   * @param {string} message
   * @param {'idle'|'working'|'done'} state
   */
  setStatus(message, state = 'idle') {
    this.els.status.textContent = message;
    this.els.statusDot.dataset.state = state;
  }

  /** Rellena predicción, confianza, año y nombre de escena. */
  setPrediction(reconstruction) {
    const { prediction, targetYear, sceneName } = reconstruction;
    const pct = Math.round((prediction.confidence || 0) * 100);
    this.els.predClass.textContent = prediction.class;
    this.els.confidence.textContent = `Confianza: ${pct}%`;
    this.els.confidenceBar.style.width = `${pct}%`;
    this.els.targetYear.textContent = `Año reconstruido: ${targetYear}`;
    this.els.sceneName.textContent = sceneName;
    this.root.querySelector('#cv-prediction').hidden = false;
  }

  /** Limpia el bloque de predicción (al cambiar de sitio o resetear). */
  clearPrediction() {
    this.els.confidenceBar.style.width = '0%';
    this.root.querySelector('#cv-prediction').hidden = true;
  }

  /** Muestra información contextual (hotspot u objeto). */
  showInfo({ title, description }) {
    this.els.info.innerHTML = '';
    const h = document.createElement('h4');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = description;
    this.els.info.append(h, p);
  }
}
