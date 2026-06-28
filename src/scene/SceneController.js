/**
 * SceneController.js
 * Orquesta TODA la escena A-Frame:
 *  - Construye el "shell" (cámara, cursor/raycaster, luces, cielo, suelo, grupos).
 *  - Carga la vista actual de un sitio.
 *  - Ejecuta la transición actual → pasado (efecto Chrono-Vision + GSAP).
 *  - Restablece la vista actual.
 *
 * No contiene lógica de UI: se comunica mediante callbacks (onHotspot, onObject).
 */

import gsap from 'gsap';
import { buildCurrentScene } from './currentSceneBuilder.js';
import { renderReconstruction, setHighlight } from './reconstructionRenderer.js';
import { registerChronoEffects } from './chronoEffects.js';
import { createObject } from './objectFactory.js';
import { getReference } from '../data/referenceImages.js';
import { DOM, COLORS, deburr } from '../utils/constants.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Utilidades de color (lerp entre dos hex) ──────────────────────────────────
const clampHex = (h) => (h && h[0] === '#' ? h : '#888888');

function hexToRgb(hex) {
  const h = clampHex(hex).slice(1);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]) {
  const c = (n) => Math.round(n).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function hexLerp(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca.map((v, i) => v + (cb[i] - v) * t));
}

export class SceneController {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.container  contenedor del DOM para la <a-scene>.
   * @param {object} opts.AFRAME          referencia global de A-Frame.
   * @param {(hs:object)=>void} opts.onHotspot   callback al clicar un hotspot.
   * @param {(spec:object)=>void} opts.onObject  callback al clicar un objeto.
   */
  constructor({ container, AFRAME, onHotspot, onObject }) {
    this.container = container;
    this.AFRAME = AFRAME;
    this.onHotspot = onHotspot;
    this.onObject = onObject;
    this.site = null;
    this.lastHighlighted = null;

    registerChronoEffects(AFRAME);
    this._buildShell();
  }

  // ── Construcción del esqueleto de la escena ─────────────────────────────────
  _buildShell() {
    const scene = document.createElement('a-scene');
    scene.setAttribute('id', DOM.SCENE_ID);
    scene.setAttribute('vr-mode-ui', 'enabled: false');
    scene.setAttribute('embedded', '');
    scene.setAttribute('renderer', 'antialias: true; colorManagement: true');
    scene.setAttribute('fog', 'type: linear; color: #1c1a18; near: 10; far: 45');
    scene.setAttribute('chrono-effect', 'active: false');

    // Luces.
    const ambient = document.createElement('a-entity');
    ambient.setAttribute('id', 'cv-ambient');
    ambient.setAttribute('light', 'type: ambient; color: #ffffff; intensity: 0.4');

    const dir = document.createElement('a-entity');
    dir.setAttribute('id', 'cv-dir');
    dir.setAttribute('light', 'type: directional; color: #ffffff; intensity: 0.6');
    dir.setAttribute('position', '4 10 6');

    // Cielo y suelo.
    const sky = document.createElement('a-sky');
    sky.setAttribute('id', 'cv-sky');
    sky.setAttribute('color', '#1c1a18');

    const ground = document.createElement('a-plane');
    ground.setAttribute('id', 'cv-ground');
    ground.setAttribute('rotation', '-90 0 0');
    ground.setAttribute('width', '120');
    ground.setAttribute('height', '120');
    ground.setAttribute('material', 'color: #3b352e; roughness: 1');

    // Grupos dinámicos.
    const currentGroup = document.createElement('a-entity');
    currentGroup.setAttribute('id', DOM.CURRENT_GROUP);

    const reconGroup = document.createElement('a-entity');
    reconGroup.setAttribute('id', DOM.RECONSTRUCTED_GROUP);

    // Cámara con cursor de ratón.
    const camera = document.createElement('a-camera');
    camera.setAttribute('position', '0 1.6 6');
    camera.setAttribute('wasd-controls', 'acceleration: 30');

    const cursor = document.createElement('a-entity');
    cursor.setAttribute('cursor', 'rayOrigin: mouse; fuse: false');
    cursor.setAttribute('raycaster', 'objects: .clickable; far: 100');

    camera.appendChild(cursor);

    // Mejora UX: texto de ayuda dentro de la escena.
    const helpText = document.createElement('a-text');
    helpText.setAttribute('id', 'cv-help-text');
    helpText.setAttribute(
      'value','Interactua con los puntos turquesa'
      
    );
    helpText.setAttribute('align', 'center');
    helpText.setAttribute('color', COLORS.accent);
    helpText.setAttribute('width', '5');
    helpText.setAttribute('position', '0 3.5 -5');
    helpText.setAttribute('scale', '0.55 0.55 0.55');
    helpText.setAttribute(
      'animation',
      'property: opacity; from: 0.45; to: 1; dir: alternate; dur: 1500; loop: true; easing: easeInOutSine'
    );

    // Tarjeta flotante con la imagen de referencia del modelado (persistente:
    // no pertenece a los grupos que se desvanecen; su imagen cambia con la transición).
    const refCard = createObject({
      type: 'reference_card',
      position: { x: 3.7, y: 2.4, z: 1.6 },
      rotation: { x: 0, y: -30, z: 0 },
      w: 3.0,
      h: 1.7,
    });
    refCard.setAttribute('id', 'cv-reference-card');
    refCard.setAttribute('visible', 'false');

    scene.append(
      ambient,
      dir,
      sky,
      ground,
      currentGroup,
      reconGroup,
      refCard,
      helpText,
      camera
    );

    this.container.appendChild(scene);

    this.sceneEl = scene;
    this.skyEl = sky;
    this.groundEl = ground;
    this.ambientEl = ambient;
    this.dirEl = dir;
    this.currentGroup = currentGroup;
    this.reconGroup = reconGroup;
    this.helpText = helpText;
    this.refCard = refCard;
    this.refImg = refCard.querySelector('.cv-ref-image');
    this.refTitle = refCard.querySelector('.cv-ref-title');
  }

  // ── Tarjeta de imagen de referencia ─────────────────────────────────────────
  /** Asigna imagen + título a la tarjeta, o la oculta si no hay referencia. */
  setReference(src, title) {
    if (!this.refCard) return;
    if (!src) {
      this.refCard.setAttribute('visible', 'false');
      return;
    }
    if (this.refImg) this.refImg.setAttribute('src', src);
    if (this.refTitle) this.refTitle.setAttribute('value', deburr(title || ''));
    this.refCard.setAttribute('visible', 'true');
  }

  // ── Carga de la vista actual ────────────────────────────────────────────────
  loadSite(site) {
    this.site = site;
    this.reconGroup.innerHTML = '';
    this._applyEnvironment(site.current.environment, false);
    buildCurrentScene(site, this.currentGroup);
    this.sceneEl.setAttribute('chrono-effect', 'active', false);

    // Tarjeta de referencia: muestra la imagen de la vista deteriorada.
    const ref = getReference(site.id);
    this.setReference(ref?.current, ref ? `${site.name} (${site.currentYear})` : '');

    if (this.helpText) {
      this.helpText.setAttribute(
        'value',
        'Activa Chrono-Vision para reconstruir el sitio historico'
      );
    }
  }

  // ── Transición actual → pasado ──────────────────────────────────────────────
  /**
   * Ejecuta la reconstrucción completa con efectos.
   * @param {object} reconstruction  JSON de reconstrucción.
   * @returns {Promise<void>}
   */
  async runReconstruction(reconstruction) {
    const fx = reconstruction.effects || {};

    if (this.helpText) {
      this.helpText.setAttribute(
        'value',
        'Interactua con los puntos turquesa'
      );
    }

    // 1) Activa el efecto Chrono-Vision.
    this.sceneEl.setAttribute('chrono-effect', {
      active: true,
      color: fx.particleColor || COLORS.accent,
      count: fx.particleCount || 1400,
      speed: fx.scanSpeed || 1.4,
    });

    // 2) Transición de entorno.
    this._animateEnvironment(reconstruction.environment, 2.0);

    // 3) Desvanece los objetos deteriorados.
    await this._fadeGroup(this.currentGroup, 1, 0, 1.1);
    this.currentGroup.innerHTML = '';

    // 4) Renderiza la reconstrucción.
    const { yearEl } = renderReconstruction(reconstruction, this.reconGroup, {
      onHotspot: (hs) => this.onHotspot && this.onHotspot(hs),
      onObject: (spec, el) => this._handleObjectClick(spec, el),
    });

    await wait(60);
    await this._fadeGroup(this.reconGroup, 0, 1, 1.2);

    // 5) Aparición animada del texto del año.
    if (yearEl) {
      yearEl.setAttribute(
        'animation__pop',
        'property: scale; from: 0.1 0.1 0.1; to: 1 1 1; dur: 900; easing: easeOutElastic'
      );
    }

    // 5b) La tarjeta de referencia también "viaja al pasado".
    const ref = getReference(this.site?.id);
    if (ref?.reconstructed) {
      this.setReference(ref.reconstructed, `${this.site.name} (${reconstruction.targetYear})`);
    }

    // 6) Apaga el efecto de escaneo.
    await wait(500);
    this.sceneEl.setAttribute('chrono-effect', 'active', false);
  }

  // ── Restablecer vista actual ────────────────────────────────────────────────
  reset() {
    if (!this.site) return;

    this.sceneEl.setAttribute('chrono-effect', 'active', false);
    this.reconGroup.innerHTML = '';
    this._applyEnvironment(this.site.current.environment, true);
    buildCurrentScene(this.site, this.currentGroup);
    this._setGroupOpacity(this.currentGroup, 1);

    // La tarjeta de referencia vuelve a la imagen de la vista deteriorada.
    const ref = getReference(this.site.id);
    this.setReference(ref?.current, ref ? `${this.site.name} (${this.site.currentYear})` : '');

    if (this.helpText) {
      this.helpText.setAttribute(
        'value',
        'Activa Chrono-Vision para reconstruir el sitio historico'
      );
    }
  }

  // ── Interacción con objetos ─────────────────────────────────────────────────
  _highlight(el) {
    if (this.lastHighlighted && this.lastHighlighted !== el) {
      setHighlight(this.lastHighlighted, false);
    }

    setHighlight(el, true);
    this.lastHighlighted = el;
  }

  _handleObjectClick(spec, el) {
    this._highlight(el);
    if (this.onObject) this.onObject(spec);
  }

  highlightById(id) {
    const el = this.reconGroup.querySelector(`[data-cv-id="${id}"]`);
    if (el) this._highlight(el);
  }

  // ── Entorno ─────────────────────────────────────────────────────────────────
  _applyEnvironment(env, _animate) {
    this.skyEl.setAttribute('color', env.sky);
    this.groundEl.setAttribute('material', 'color', env.ground);
    this.sceneEl.setAttribute(
      'fog',
      `type: linear; color: ${env.fog}; near: 10; far: 45`
    );
    this.dirEl.setAttribute(
      'light',
      `type: directional; color: ${env.lightColor}; intensity: ${env.lightIntensity}`
    );
    this.ambientEl.setAttribute(
      'light',
      `type: ambient; color: #ffffff; intensity: ${env.ambient}`
    );
  }

  _animateEnvironment(env, dur) {
    const fromSky = this.skyEl.getAttribute('color');
    const fromGround = this.groundEl.getAttribute('material').color;
    const fromFog = this.sceneEl.getAttribute('fog').color;
    const fromDir = this.dirEl.getAttribute('light');
    const fromAmb = this.ambientEl.getAttribute('light');

    const p = { t: 0 };

    gsap.to(p, {
      t: 1,
      duration: dur,
      ease: 'power2.inOut',
      onUpdate: () => {
        const t = p.t;

        this.skyEl.setAttribute('color', hexLerp(fromSky, env.sky, t));
        this.groundEl.setAttribute(
          'material',
          'color',
          hexLerp(fromGround, env.ground, t)
        );
        this.sceneEl.setAttribute(
          'fog',
          `type: linear; color: ${hexLerp(fromFog, env.fog, t)}; near: 10; far: 45`
        );
        this.dirEl.setAttribute(
          'light',
          `type: directional; color: ${hexLerp(
            fromDir.color,
            env.lightColor,
            t
          )}; intensity: ${
            fromDir.intensity + (env.lightIntensity - fromDir.intensity) * t
          }`
        );
        this.ambientEl.setAttribute(
          'light',
          `type: ambient; color: #ffffff; intensity: ${
            fromAmb.intensity + (env.ambient - fromAmb.intensity) * t
          }`
        );
      },
    });
  }

  // ── Opacidad de un grupo ────────────────────────────────────────────────────
  _setGroupOpacity(group, o) {
    if (!group.object3D) return;

    group.object3D.traverse((node) => {
      if (node.isMesh && node.material) {
        const mats = Array.isArray(node.material) ? node.material : [node.material];

        mats.forEach((m) => {
          m.transparent = true;
          m.opacity = o;
        });
      }
    });
  }

  _fadeGroup(group, from, to, dur) {
    return new Promise((resolve) => {
      const proxy = { o: from };
      this._setGroupOpacity(group, from);

      gsap.to(proxy, {
        o: to,
        duration: dur,
        ease: 'power2.inOut',
        onUpdate: () => this._setGroupOpacity(group, proxy.o),
        onComplete: resolve,
      });
    });
  }
}