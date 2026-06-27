/**
 * chronoEffects.js
 * Efecto visual "Chrono-Vision" construido con Three.js y empaquetado como
 * componente A-Frame (`chrono-effect`).
 *
 * Combina:
 *  - Un sistema de PARTÍCULAS que ascienden (escaneo temporal).
 *  - Un PLANO de escaneo holográfico (wireframe cian) que barre verticalmente.
 *
 * Se activa/desactiva mediante el atributo `active`, controlado desde
 * SceneController:   sceneEl.setAttribute('chrono-effect', 'active', true)
 */

/**
 * Registra el componente `chrono-effect` en A-Frame.
 * @param {object} AFRAME  Referencia global de A-Frame (con AFRAME.THREE).
 */
export function registerChronoEffects(AFRAME) {
  if (AFRAME.components['chrono-effect']) return; // evita doble registro
  const THREE = AFRAME.THREE;

  AFRAME.registerComponent('chrono-effect', {
    schema: {
      active: { type: 'boolean', default: false },
      color: { type: 'color', default: '#36e0c8' },
      count: { type: 'int', default: 1400 },
      speed: { type: 'number', default: 1.4 },
      area: { type: 'number', default: 18 }, // radio del volumen de partículas
      height: { type: 'number', default: 8 }, // altura máxima de ascenso
    },

    init() {
      this.elapsed = 0;
      this.group = new THREE.Group();
      this.el.sceneEl.object3D.add(this.group);

      // ── Partículas ──────────────────────────────────────────────────────────
      const { count, area, height } = this.data;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * area;
        positions[i * 3 + 1] = Math.random() * height;
        positions[i * 3 + 2] = (Math.random() - 0.5) * area - 5;
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      this.pMaterial = new THREE.PointsMaterial({
        color: new THREE.Color(this.data.color),
        size: 0.07,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.points = new THREE.Points(geom, this.pMaterial);
      this.group.add(this.points);

      // ── Plano de escaneo holográfico ─────────────────────────────────────────
      const planeGeom = new THREE.PlaneGeometry(area, area, 20, 20);
      this.scanMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.data.color),
        wireframe: true,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.scanPlane = new THREE.Mesh(planeGeom, this.scanMaterial);
      this.scanPlane.rotation.x = -Math.PI / 2;
      this.scanPlane.position.z = -5;
      this.group.add(this.scanPlane);

      this.group.visible = false;
    },

    update() {
      // Refleja color y visibilidad cuando cambian los datos.
      if (this.pMaterial) this.pMaterial.color.set(this.data.color);
      if (this.scanMaterial) this.scanMaterial.color.set(this.data.color);
      if (this.group) this.group.visible = this.data.active;
      this.elapsed = 0;
    },

    tick(time, delta) {
      if (!this.data.active || !this.group.visible) return;
      const dt = (delta || 16) / 1000;
      this.elapsed += dt;

      // Ascenso de partículas con reciclaje al llegar arriba.
      const pos = this.points.geometry.attributes.position;
      const { speed, height } = this.data;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + speed * dt;
        if (y > height) y = 0;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;

      // Barrido vertical del plano de escaneo (sube y reinicia).
      const sweep = (this.elapsed * speed) % height;
      this.scanPlane.position.y = sweep;
      this.scanMaterial.opacity = 0.45 * (1 - sweep / height);
    },

    remove() {
      if (this.group) this.el.sceneEl.object3D.remove(this.group);
    },
  });
}
