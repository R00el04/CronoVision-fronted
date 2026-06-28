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

  /**
   * Inicia la sección de narración IA con efecto de escritura.
   */
  startNarration() {
    const toast = document.querySelector('#cv-narration');
    if (!toast) return;

    const content = toast.querySelector('#cv-narration-text');
    if (!content) return;

    content.innerHTML = '';
    content.dataset.state = 'writing';

    const cursor = document.createElement('span');
    cursor.className = 'cv-narration-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    content.appendChild(cursor);

    // Muestra el toast (la transición CSS se encarga de la animación)
    toast.hidden = false;

    // Botón de cierre
    const closeBtn = toast.querySelector('#cv-narration-close');
    if (closeBtn) {
      // Elimina listener anterior para evitar duplicados
      closeBtn.replaceWith(closeBtn.cloneNode(true));
      toast.querySelector('#cv-narration-close')
           .addEventListener('click', () => this.clearNarration());
    }
  }

  /** Agrega un fragmento de texto al área de narración (streaming). */
  appendNarrationChunk(chunk) {
    const content = document.querySelector('#cv-narration-text');
    if (!content) return;

    const cursor = content.querySelector('.cv-narration-cursor');
    const textNode = document.createTextNode(chunk);
    if (cursor) {
      content.insertBefore(textNode, cursor);
    } else {
      content.appendChild(textNode);
    }

    // Auto-scroll al fondo del área de texto del toast
    content.scrollTop = content.scrollHeight;
  }

  /** Finaliza la narración: oculta el cursor. */
  endNarration(isError = false) {
    const content = document.querySelector('#cv-narration-text');
    if (!content) return;

    const cursor = content.querySelector('.cv-narration-cursor');
    if (cursor) cursor.remove();

    content.dataset.state = isError ? 'error' : 'done';

    if (isError && !content.textContent.trim()) {
      content.textContent = 'No se pudo generar la narración.';
    }
  }

  /** Oculta y limpia el toast de narración. */
  clearNarration() {
    const toast = document.querySelector('#cv-narration');
    if (!toast) return;
    toast.hidden = true;
    const content = toast.querySelector('#cv-narration-text');
    if (content) {
      content.innerHTML = '';
      content.dataset.state = '';
    }
  }

  /**
   * Actualiza el bloque de estadísticas en tiempo real.
   * Se llama automáticamente cuando Firestore notifica un cambio.
   * @param {{ total: number, recent: {action:string, siteId:string}[] }} stats
   */
  updateLiveStats({ total, recent }) {
    const block = this.root.querySelector('#cv-live-stats');
    if (!block) return;

    // Muestra el bloque si estaba oculto.
    block.hidden = false;

    // Actualiza el contador.
    const counter = block.querySelector('#cv-interaction-count');
    if (counter) counter.textContent = total;

    // Actualiza la lista de las últimas acciones.
    const list = block.querySelector('#cv-recent-actions');
    if (!list) return;
    list.innerHTML = '';
    recent.forEach(({ action, siteId }) => {
      const li = document.createElement('li');
      li.className = 'cv-live-item';
      const label = action.replace(/_/g, ' ');
      const site = siteId !== '—' ? ` · <span class="cv-live-site">${siteId}</span>` : '';
      li.innerHTML = `<span class="cv-live-action">${label}</span>${site}`;
      list.appendChild(li);
    });
  }
}
