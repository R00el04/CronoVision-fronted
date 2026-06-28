/**
 * audioService.js
 * Gestiona la reproducción de audio ambiental de Chrono-Vision.
 *
 * Comportamiento:
 *  - Al arrancar: precarga todos los audios y reproduce Intro.mp3 en loop.
 *  - Al seleccionar un sitio: crossfade suave al audio del sitio.
 *  - Botón mute: silencia/activa sin detener la reproducción.
 *  - Si el audio del sitio no existe: mantiene el intro.
 *
 * Mapa siteId → archivo:
 *  centro_lima  → Corazon_colonial.mp3
 *  chan_chan     → Chan_Chan.mp3
 *  real_felipe  → Fortaleza_del_Real_Felipe.mp3
 */

const AUDIO_BASE = '/audio/';

const SITE_AUDIO_MAP = {
  centro_lima: 'Corazon_colonial.mp3',
  chan_chan:    'Chan_Chan.mp3',
  real_felipe: 'Fortaleza_del_Real_Felipe.mp3',
};

const INTRO_AUDIO = 'Intro.mp3';

const FADE_MS    = 800;
const FADE_STEPS = 20;
const TARGET_VOL = 0.45;

class AudioService {
  constructor() {
    this._current   = null;   // HTMLAudioElement activo
    this._fadeTimer = null;   // setInterval del crossfade
    this._started   = false;  // primer gesto del usuario
    this._cache     = {};     // audios precargados { filename: HTMLAudioElement }

    this._preload();
  }

  // ── Precarga ───────────────────────────────────────────────────────────────
  /**
   * Crea todos los HTMLAudioElement al arrancar (antes del primer gesto)
   * para que el browser descargue los archivos en segundo plano.
   * Cuando el usuario interactúe, el audio ya estará en caché del navegador.
   */
  _preload() {
    const allFiles = [INTRO_AUDIO, ...Object.values(SITE_AUDIO_MAP)];
    allFiles.forEach((file) => {
      const audio = new Audio(`${AUDIO_BASE}${file}`);
      audio.preload = 'auto';  // descarga completa en background
      audio.loop    = true;
      audio.volume  = 0;       // silencioso hasta que se reproduzca
      this._cache[file] = audio;
    });
  }

  // ── API pública ────────────────────────────────────────────────────────────

  /**
   * Primer gesto del usuario → desbloquea el autoplay y arranca el intro.
   * Llamar en cualquier interacción del usuario.
   */
  start() {
    if (this._started) return;
    this._started = true;
    this._play(INTRO_AUDIO);
  }

  /**
   * Crossfade al audio del sitio.
   * @param {string} siteId
   */
  playSite(siteId) {
    const file = SITE_AUDIO_MAP[siteId] || INTRO_AUDIO;
    this._crossfade(file);
  }

  /** Vuelve al intro. */
  playIntro() {
    this._crossfade(INTRO_AUDIO);
  }

  /**
   * Alterna silencio/sonido.
   * @returns {boolean} true si ahora está silenciado.
   */
  toggleMute() {
    if (!this._current) return true;
    this._current.muted = !this._current.muted;
    return this._current.muted;
  }

  get isMuted() {
    return this._current ? this._current.muted : false;
  }

  // ── Internos ───────────────────────────────────────────────────────────────

  _play(file) {
    const audio = this._cache[file] || new Audio(`${AUDIO_BASE}${file}`);
    audio.loop   = true;
    audio.volume = TARGET_VOL;
    audio.muted  = false;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Navegador bloqueó autoplay — silencioso, no es error crítico.
    });
    this._current = audio;
  }

  _crossfade(file) {
    // Mismo archivo ya sonando → no hace nada.
    const cached = this._cache[file] || null;
    if (this._current && this._current === cached && !this._current.paused) return;

    const outgoing = this._current;

    // Cancela fade anterior si había uno en curso.
    if (this._fadeTimer) {
      clearInterval(this._fadeTimer);
      this._fadeTimer = null;
    }

    // Usa el audio precargado o crea uno nuevo.
    const incoming = cached || new Audio(`${AUDIO_BASE}${file}`);
    incoming.loop   = true;
    incoming.volume = 0;
    incoming.muted  = outgoing ? outgoing.muted : false;
    incoming.play().catch(() => {});
    this._current = incoming;

    const step     = TARGET_VOL / FADE_STEPS;
    const interval = FADE_MS / FADE_STEPS;
    let steps = 0;

    this._fadeTimer = setInterval(() => {
      steps++;

      // Fade in del entrante.
      incoming.volume = Math.min(TARGET_VOL, incoming.volume + step);

      // Fade out del saliente.
      if (outgoing) {
        outgoing.volume = Math.max(0, outgoing.volume - step);
        if (outgoing.volume <= 0) {
          outgoing.pause();
          outgoing.currentTime = 0;
          outgoing.volume = 0;
        }
      }

      if (steps >= FADE_STEPS) {
        clearInterval(this._fadeTimer);
        this._fadeTimer = null;
        incoming.volume = TARGET_VOL;
      }
    }, interval);
  }
}

// Singleton — una sola instancia para toda la app.
export const audioService = new AudioService();
