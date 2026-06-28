/**
 * uiController.js
 * Coordina la interfaz con la escena y los servicios. Es el "pegamento":
 *  - Construye el selector de sitios (cargados desde Firestore en tiempo real).
 *  - Gestiona los botones "Activar Chrono-Vision" y "Restablecer vista actual".
 *  - Llama al API de reconstrucción y actualiza el panel.
 *  - Persiste interacciones.
 *
 * No contiene lógica 3D (delegada a SceneController) ni de render del panel
 * (delegada a PanelController).
 */

import { MESSAGES } from '../utils/constants.js';
import { requestReconstruction } from '../services/reconstructionApi.js';
import { saveInteraction } from '../services/interactionService.js';
import { subscribeSites } from '../services/sitesService.js';
import { subscribeInteractionCount } from '../services/liveStatsService.js';
import { streamNarration } from '../services/narrationApi.js';

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
    this._sites = [];           // sitios cargados (local o Firestore)
    this._unsubSites = null;    // cleanup del listener de sitios
    this._unsubStats = null;    // cleanup del listener de stats
    this._narrationAbort = null; // AbortController del stream activo

    this.selectorEl = root.querySelector('#cv-site-selector');
    this.activateBtn = root.querySelector('#cv-activate');
    this.resetBtn = root.querySelector('#cv-reset');

    this._wireButtons();
    this._initFirestoreListeners();
    this._initMobileSheet();
  }

  // ── Drawer / Bottom sheet ───────────────────────────────────────────────────
  _initMobileSheet() {
    const panel    = document.querySelector('#cv-panel');
    const handle   = document.querySelector('#cv-panel-handle');   // mobile
    const toggle   = document.querySelector('#cv-drawer-toggle');  // desktop
    const overlay  = document.querySelector('#cv-overlay');
    const fab      = document.querySelector('#cv-fab');

    this._panelEl = panel;
    this._fabEl   = fab;

    if (!panel) return;

    const open = () => {
      panel.classList.add('is-open');
      if (overlay) overlay.classList.add('is-visible');
      if (toggle)  toggle.setAttribute('aria-expanded', 'true');
      if (fab)     fab.classList.add('is-hidden');
    };

    const close = () => {
      panel.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-visible');
      if (toggle)  toggle.setAttribute('aria-expanded', 'false');
      if (fab)     fab.classList.remove('is-hidden');
    };

    const togglePanel = () => panel.classList.contains('is-open') ? close() : open();

    // Desktop: botón toggle lateral.
    if (toggle) {
      toggle.addEventListener('click', togglePanel);
    }

    // Desktop: overlay cierra el panel.
    if (overlay) {
      overlay.addEventListener('click', close);
    }

    // Mobile: handle abre/cierra el bottom sheet.
    if (handle) {
      handle.addEventListener('click', togglePanel);
      handle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') togglePanel();
      });
    }

    // Mobile: FAB activa Chrono-Vision desde la escena.
    if (fab) {
      fab.addEventListener('click', () => this.activateChrono());
    }

    // Abre el panel al arrancar en desktop para que el usuario lo vea.
    if (window.innerWidth >= 761) open();
  }

  /** Actualiza el título del handle y el estado del FAB en mobile. */
  _syncMobile(siteName, fabEnabled) {
    const handleTitle = document.querySelector('#cv-handle-site-name');
    if (handleTitle) handleTitle.textContent = siteName || 'Chrono-Vision';
    if (this._fabEl) this._fabEl.disabled = !fabEnabled;
  }

  // ── Listeners en tiempo real ────────────────────────────────────────────────

  _initFirestoreListeners() {
    // 1) Sitios: se actualiza el selector cuando Firestore cambia.
    this._unsubSites = subscribeSites((sites) => {
      this._sites = sites;
      this._buildSelector(sites);
    });

    // 2) Estadísticas de interacciones en tiempo real.
    this._unsubStats = subscribeInteractionCount((stats) => {
      this.panel.updateLiveStats(stats);
    });
  }

  // ── Selector de sitios ──────────────────────────────────────────────────────
  _buildSelector(sites) {
    const activeSiteId = this.site?.id ?? null;
    this.selectorEl.innerHTML = '';
    for (const site of sites) {
      const btn = document.createElement('button');
      btn.className = 'cv-site-btn';
      btn.dataset.siteId = site.id;
      if (site.id === activeSiteId) btn.classList.add('is-active');
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
    const site = this._sites.find((s) => s.id === siteId);
    if (!site) return;
    this.site = site;

    // Cancela narración previa si estaba activa.
    if (this._narrationAbort) {
      this._narrationAbort.abort();
      this._narrationAbort = null;
    }

    // Marca el botón activo.
    this.selectorEl.querySelectorAll('.cv-site-btn').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.siteId === siteId);
    });

    this.scene.loadSite(site);
    this.panel.setSite(site);
    this.panel.clearNarration();
    this.panel.setStatus(MESSAGES.IDLE, 'idle');
    this.activateBtn.disabled = false;
    this.resetBtn.disabled = true;
    this._syncMobile(site.name, true);

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
      this._syncMobile(this.site?.name, false); // deshabilita FAB tras reconstruir

      // 6) Arranca la narración histórica con IA (streaming).
      this._startNarration(this.site, reconstruction.targetYear);

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

    // Cancela cualquier narración en curso.
    if (this._narrationAbort) {
      this._narrationAbort.abort();
      this._narrationAbort = null;
    }

    this.scene.reset();
    this.panel.clearPrediction();
    this.panel.clearNarration();
    this.panel.setSite(this.site);
    this.panel.setStatus(MESSAGES.IDLE, 'idle');
    this.activateBtn.disabled = false;
    this.resetBtn.disabled = true;
    this._syncMobile(this.site?.name, true); // reactiva FAB al resetear
    saveInteraction({ action: 'reset_view', siteId: this.site.id });
  }

  // ── Narración histórica con IA ──────────────────────────────────────────────
  _startNarration(site, targetYear) {
    // Cancela si había una narración previa activa.
    if (this._narrationAbort) this._narrationAbort.abort();

    this.panel.startNarration();

    this._narrationAbort = streamNarration(site.id, targetYear, {
      onChunk: (chunk) => this.panel.appendNarrationChunk(chunk),
      onDone: () => {
        this.panel.endNarration(false);
        this._narrationAbort = null;
      },
      onError: () => {
        this.panel.endNarration(true);
        this._narrationAbort = null;
      },
    });
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
