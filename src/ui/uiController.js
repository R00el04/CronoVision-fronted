/**
 * uiController.js
 * Coordina la interfaz con la escena y los servicios. Es el "pegamento":
 *  - Construye el selector de sitios.
 *  - Gestiona los botones "Activar Chrono-Vision" y "Restablecer vista actual".
 *  - Llama al API de reconstrucción y actualiza el panel.
 *  - Persiste interacciones.
 *
 * No contiene lógica 3D (delegada a SceneController) ni de render del panel
 * (delegada a PanelController).
 */

import { SITES } from '../data/sites.js';
import { MESSAGES } from '../utils/constants.js';
import { requestReconstruction } from '../services/reconstructionApi.js';
import { saveInteraction } from '../services/interactionService.js';

export class UIController {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.root        contenedor de la app.
   * @param {import('./panelController.js').PanelController} opts.panel
   * @param {import('../scene/SceneController.js').SceneController} opts.scene
   */
  constructor({ root, panel, scene }) {
    this.root = root;
    this.panel = panel;
    this.scene = scene;
    this.site = null;
    this.busy = false;

    this.selectorEl = root.querySelector('#cv-site-selector');
    this.activateBtn = root.querySelector('#cv-activate');
    this.resetBtn = root.querySelector('#cv-reset');

    this._buildSelector();
    this._wireButtons();
  }

  // ── Selector de sitios ──────────────────────────────────────────────────────
  _buildSelector() {
    this.selectorEl.innerHTML = '';
    for (const site of SITES) {
      const btn = document.createElement('button');
      btn.className = 'cv-site-btn';
      btn.dataset.siteId = site.id;
      btn.innerHTML = `<span class="cv-site-btn__name">${site.name}</span>` +
        `<span class="cv-site-btn__meta">${site.mlCategory}</span>`;
      btn.addEventListener('click', () => this.selectSite(site.id));
      this.selectorEl.appendChild(btn);
    }
  }

  _wireButtons() {
    this.activateBtn.addEventListener('click', () => this.activateChrono());
    this.resetBtn.addEventListener('click', () => this.resetView());
  }

  // ── Selección de sitio ──────────────────────────────────────────────────────
  selectSite(siteId) {
    if (this.busy) return;
    const site = SITES.find((s) => s.id === siteId);
    if (!site) return;
    this.site = site;

    // Marca el botón activo.
    this.selectorEl.querySelectorAll('.cv-site-btn').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.siteId === siteId);
    });

    this.scene.loadSite(site);
    this.panel.setSite(site);
    this.panel.setStatus(MESSAGES.IDLE, 'idle');
    this.activateBtn.disabled = false;
    this.resetBtn.disabled = true;

    saveInteraction({ action: 'select_site', siteId: site.id, mlCategory: site.mlCategory });
  }

  // ── Activar Chrono-Vision ───────────────────────────────────────────────────
  async activateChrono() {
    if (!this.site || this.busy) return;
    this.busy = true;
    this.activateBtn.disabled = true;
    this.resetBtn.disabled = true;

    // 1) Estado: analizando.
    this.panel.setStatus(MESSAGES.ANALYZING, 'working');
    saveInteraction({ action: 'activate_chrono', siteId: this.site.id });

    try {
      // 2) Llamada (simulada) al backend/ML.
      const reconstruction = await requestReconstruction(this.site);

      // 3) Muestra la predicción del modelo.
      this.panel.setPrediction(reconstruction);
      this.panel.setStatus(MESSAGES.RENDERING, 'working');

      // 4) Transición visual actual → pasado.
      await this.scene.runReconstruction(reconstruction);

      // 5) Estado final.
      this.panel.setStatus(MESSAGES.DONE, 'done');
      this.resetBtn.disabled = false;

      saveInteraction({
        action: 'reconstruction_done',
        siteId: this.site.id,
        predictionClass: reconstruction.prediction.class,
        confidence: reconstruction.prediction.confidence,
        targetYear: reconstruction.targetYear,
      });
    } catch (err) {
      console.error('[Chrono-Vision] Error en la reconstrucción:', err);
      this.panel.setStatus('Error al reconstruir. Intenta de nuevo.', 'idle');
      this.activateBtn.disabled = false;
    } finally {
      this.busy = false;
    }
  }

  // ── Restablecer vista actual ────────────────────────────────────────────────
  resetView() {
    if (!this.site || this.busy) return;
    this.scene.reset();
    this.panel.clearPrediction();
    this.panel.setSite(this.site);
    this.panel.setStatus(MESSAGES.IDLE, 'idle');
    this.activateBtn.disabled = false;
    this.resetBtn.disabled = true;
    saveInteraction({ action: 'reset_view', siteId: this.site.id });
  }

  // ── Handlers de escena (inyectados a SceneController) ───────────────────────
  onHotspotClick(hs) {
    this.panel.showInfo({ title: hs.title, description: hs.description });
    if (hs.target) this.scene.highlightById(hs.target);
    saveInteraction({ action: 'hotspot_click', siteId: this.site?.id, hotspotId: hs.id });
  }

  onObjectClick(spec) {
    this.panel.showInfo({
      title: spec.type ? spec.type.replace(/_/g, ' ') : 'Objeto',
      description: spec.info || 'Elemento reconstruido de la escena.',
    });
    saveInteraction({ action: 'object_click', siteId: this.site?.id, objectId: spec.id });
  }
}
