/**
 * main.js
 * Punto de entrada de Chrono-Vision. Solo CONECTA los módulos; la lógica vive
 * en scene/, ui/, services/ y data/.
 *
 * Flujo:
 *   import A-Frame → crear escena (SceneController) → panel (PanelController)
 *   → coordinador (UIController) → wiring de callbacks de interacción.
 */

import 'aframe'; // registra el global window.AFRAME y los custom elements <a-*>
import './style.css';

import { SceneController } from './scene/SceneController.js';
import { PanelController } from './ui/panelController.js';
import { UIController } from './ui/uiController.js';

const AFRAME = window.AFRAME;

// Elementos del DOM definidos en index.html.
const appEl = document.querySelector('#app');
const panelEl = document.querySelector('#cv-panel');
const stageEl = document.querySelector('#cv-stage');

// El panel se inicializa primero (estado "en espera").
const panel = new PanelController(panelEl);

// `ui` se declara antes para que los callbacks de la escena lo capturen.
let ui;

// Controlador de escena 3D. Recibe callbacks que delegan en la UI.
const scene = new SceneController({
  container: stageEl,
  AFRAME,
  onHotspot: (hs) => ui.onHotspotClick(hs),
  onObject: (spec) => ui.onObjectClick(spec),
});

// Coordinador de interfaz (selector de sitios, botones, API, persistencia).
ui = new UIController({ root: appEl, panel, scene });

console.info('%cChrono-Vision listo · Sistema en espera', 'color:#36e0c8');
