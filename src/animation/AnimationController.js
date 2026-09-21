import gsap from 'gsap';
import * as THREE from 'three';

/**
 * AnimationController - Orchestrates:
 * 1. Start Frame (Fully assembled) to End Frame (Exploded diagram view) vertical separation.
 * 2. Continuous 360° orbital camera pan.
 * 3. 3D layer label anchors and screen-space projection.
 */
export class AnimationController {
  constructor(solarModel, studioScene, labelContainer) {
    this.model = solarModel;
    this.scene = studioScene;
    this.labelContainer = labelContainer;

    // State
    this.explodeProgress = 0.0; // 0 = Assembled, 1 = Exploded
    this.isAutoOrbit = true;
    this.orbitSpeed = 0.0035; // Slow, cinematic 360-degree pan
    this.isHoveringOrDragging = false;
    this.labelsVisible = true;

    // Camera initial orbit parameters
    this.cameraRadius = 4.8;
    this.cameraHeight = 2.4;
    this.cameraAngle = Math.PI / 4; // Start at 45° isometric angle

    this.initLabels();
    this.setupInteractions();
  }

  initLabels() {
    this.labelElements = [];

    this.model.layers.forEach((layer) => {
      const el = document.createElement('div');
      el.className = 'layer-annotation';
      el.innerHTML = `
        <div class="annotation-dot"></div>
        <div class="annotation-line"></div>
        <div class="annotation-card">
          <span class="annotation-step">${layer.name.split('.')[0]}</span>
          <div class="annotation-content">
            <span class="annotation-title">${layer.name.split('. ')[1]}</span>
            <span class="annotation-desc">${this.getLayerSubtitle(layer.id)}</span>
          </div>
        </div>
      `;
      this.labelContainer.appendChild(el);
      this.labelElements.push({
        id: layer.id,
        domElement: el,
        object: layer.object,
        anchorOffset: new THREE.Vector3(0.65, 0, 0)
      });
    });
  }

  getLayerSubtitle(id) {
    switch (id) {
      case 'frame': return 'Anodized 6063-T5 Extruded Aluminum';
      case 'glass': return '3.2mm High-Transmission Anti-Reflective';
      case 'topEva': return 'Ethylene Vinyl Acetate Copolymer Sheet';
      case 'cells': return 'Monocrystalline Silicon • 5 Silver Busbars';
      case 'bottomEva': return 'Moisture-Resistant Cushioning Film';
      case 'backsheet': return 'Tedlar / PET Weatherproof Barrier';
      case 'jbox': return 'IP68 Weatherproof Box with MC4 Leads';
      default: return '';
    }
  }

  setupInteractions() {
    // Pause auto-orbit on manual drag interaction
    this.scene.controls.addEventListener('start', () => {
      this.isHoveringOrDragging = true;
    });
    this.scene.controls.addEventListener('end', () => {
      this.isHoveringOrDragging = false;
    });
  }

  /**
   * Animate smoothly from current state to target progress (0.0 to 1.0).
   */
  animateTo(targetProgress, duration = 1.8, ease = 'power3.inOut') {
    return gsap.to(this, {
      explodeProgress: targetProgress,
      duration: duration,
      ease: ease,
      onUpdate: () => {
        this.model.setExplodeProgress(this.explodeProgress);
        if (this.onProgressUpdate) this.onProgressUpdate(this.explodeProgress);
      }
    });
  }

  /**
   * Toggle between Assembled and Exploded.
   */
  toggleExplode() {
    const target = this.explodeProgress > 0.5 ? 0.0 : 1.0;
    this.animateTo(target);
    return target;
  }

  /**
   * Directly set explode progress from UI slider (0 to 1).
   */
  setProgress(val) {
    this.explodeProgress = val;
    this.model.setExplodeProgress(this.explodeProgress);
  }

  setOrbitPan(enabled) {
    this.isAutoOrbit = enabled;
  }

  setLabelsVisible(visible) {
    this.labelsVisible = visible;
    this.labelElements.forEach(item => {
      item.domElement.style.display = visible ? 'flex' : 'none';
    });
  }

  /**
   * Main animation loop tick.
   */
  update(delta) {
    // 1. Slow, continuous 360-degree orbital camera pan
    if (this.isAutoOrbit && !this.isHoveringOrDragging) {
      this.cameraAngle += this.orbitSpeed;
      if (this.cameraAngle > Math.PI * 2) this.cameraAngle -= Math.PI * 2;

      // Keep orbit radius and elevation smooth
      const x = Math.cos(this.cameraAngle) * this.cameraRadius;
      const z = Math.sin(this.cameraAngle) * this.cameraRadius;
      this.scene.camera.position.x = x;
      this.scene.camera.position.z = z;
      this.scene.camera.position.y = this.cameraHeight;
      this.scene.camera.lookAt(0, 0, 0);
      this.scene.controls.target.set(0, 0, 0);
    } else {
      // Sync angle with user orbital control
      this.cameraAngle = Math.atan2(this.scene.camera.position.z, this.scene.camera.position.x);
      this.cameraRadius = Math.sqrt(
        this.scene.camera.position.x ** 2 + this.scene.camera.position.z ** 2
      );
      this.cameraHeight = this.scene.camera.position.y;
    }

    // 2. Project 3D layer anchor points to 2D screen positions for HUD labels
    if (this.labelsVisible) {
      this.updateLabels();
    }
  }

  updateLabels() {
    const widthHalf = this.scene.width / 2;
    const heightHalf = this.scene.height / 2;
    const tempV = new THREE.Vector3();

    // Only show detailed labels when partially or fully exploded
    const labelOpacity = Math.max(0, (this.explodeProgress - 0.15) / 0.85);

    this.labelElements.forEach((item) => {
      // World position of layer
      item.object.getWorldPosition(tempV);
      // Offset to outer edge of layer for clean leader lines
      tempV.x += 0.65;

      // Check if behind camera
      tempV.project(this.scene.camera);
      const isBehind = tempV.z > 1;

      if (isBehind || labelOpacity <= 0.05) {
        item.domElement.style.opacity = '0';
        item.domElement.style.pointerEvents = 'none';
      } else {
        const screenX = (tempV.x * widthHalf) + widthHalf;
        const screenY = -(tempV.y * heightHalf) + heightHalf;

        item.domElement.style.opacity = labelOpacity.toFixed(2);
        item.domElement.style.pointerEvents = 'auto';
        item.domElement.style.transform = `translate3d(${screenX}px, ${screenY}px, 0)`;
      }
    });
  }
}
