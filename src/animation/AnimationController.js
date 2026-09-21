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
    this.cameraRadius = 4.4;
    this.cameraHeight = 2.1;
    this.cameraAngle = Math.PI * 0.27; // Start at ~48° isometric angle framing the Sun from start

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
      case 'frame': return 'Anodized 6063-T5 Extruded Aluminum (35mm Profile)';
      case 'glass': return '3.2mm Low-Iron Tempered Glass (94.5% Transmittance)';
      case 'topEva': return 'Ethylene Vinyl Acetate Encapsulant (0.45mm Film)';
      case 'cells': return 'Tier-1 415Wp Monocrystalline (108 Half-Cut M10 MBB)';
      case 'bottomEva': return 'Moisture-Resistant Cushioning Polymer Film';
      case 'backsheet': return 'Tedlar / PET Weatherproof Composite Barrier (1500V DC)';
      case 'jbox': return 'IP68 Weatherproof Box with Bypass Diodes & MC4 Leads';
      case 'inverter': return (this.inverterMode === 'central')
        ? '5.0kW 220V/50Hz Hybrid Inverter (Dual MPPT & PLN Grid)'
        : 'Enphase-Style 220V 50Hz MLPE Inverter (PLN Grid Profile)';
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

      const targetY = this.isUnderSideView ? -0.30 : 0.15;
      const targetZ = this.isUnderSideView ? -0.10 : 0.0;
      this.scene.camera.lookAt(0, targetY, targetZ);
      this.scene.controls.target.set(0, targetY, targetZ);
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

  /**
   * Switch camera view between Front (Sun-facing cells) and Underside (MLPE Microinverter & J-Box).
   */
  setCameraView(viewName, duration = 1.6) {
    this.isUnderSideView = viewName === 'underside';
    let targetPos, camPos;

    if (this.isUnderSideView) {
      // Cinematic low-angle inspection view looking up at microinverter, J-box, and AC trunk
      targetPos = { x: 0, y: -0.30, z: -0.10 };
      camPos = { x: 1.4, y: -0.90, z: -2.8 };
    } else {
      // Default isometric high-noon view
      targetPos = { x: 0, y: 0.15, z: 0.0 };
      camPos = { x: 2.6, y: 2.1, z: 3.4 };
    }

    this.isHoveringOrDragging = true; // temporarily pause auto-orbit during transition

    gsap.to(this.scene.controls.target, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: duration,
      ease: 'power3.inOut'
    });

    gsap.to(this.scene.camera.position, {
      x: camPos.x,
      y: camPos.y,
      z: camPos.z,
      duration: duration,
      ease: 'power3.inOut',
      onUpdate: () => {
        this.scene.controls.update();
      },
      onComplete: () => {
        this.cameraAngle = Math.atan2(this.scene.camera.position.z, this.scene.camera.position.x);
        this.cameraRadius = Math.sqrt(
          this.scene.camera.position.x ** 2 + this.scene.camera.position.z ** 2
        );
        this.cameraHeight = this.scene.camera.position.y;
        this.isHoveringOrDragging = false;
      }
    });
  }

  setInverterMode(mode) {
    this.inverterMode = mode;
    const isCentral = (mode === 'central');

    // Update 8th layer annotation label if it exists
    const invLabelItem = this.labelElements.find(item => item.id === 'inverter');
    if (invLabelItem) {
      const titleEl = invLabelItem.domElement.querySelector('.annotation-title');
      const descEl = invLabelItem.domElement.querySelector('.annotation-desc');
      const stepEl = invLabelItem.domElement.querySelector('.annotation-step');

      if (isCentral && this.centralInverter) {
        invLabelItem.object = this.centralInverter.group;
        invLabelItem.anchorOffset = new THREE.Vector3(0.35, 0.20, 0);
        if (titleEl) titleEl.textContent = 'Central Hybrid Inverter (5kW)';
        if (descEl) descEl.textContent = '5.0kW 220V/50Hz Hybrid Inverter (Dual MPPT & PLN Grid)';
        if (stepEl) stepEl.textContent = '8';
      } else {
        const invLayer = this.model.layers.find(l => l.id === 'inverter');
        if (invLayer) invLabelItem.object = invLayer.object;
        invLabelItem.anchorOffset = new THREE.Vector3(0.65, 0, 0);
        if (titleEl) titleEl.textContent = 'Microinverter & AC Trunk (MLPE)';
        if (descEl) descEl.textContent = 'Enphase-Style 220V 50Hz MLPE Inverter (PLN Grid Profile)';
        if (stepEl) stepEl.textContent = '8';
      }
    }
  }

  updateLabels() {
    const widthHalf = this.scene.width / 2;
    const heightHalf = this.scene.height / 2;
    const tempV = new THREE.Vector3();

    // Only show detailed labels when partially or fully exploded
    const labelOpacity = Math.max(0, (this.explodeProgress - 0.15) / 0.85);

    this.labelElements.forEach((item) => {
      // If in central inverter mode and central inverter is not visible, hide inverter label
      if (item.id === 'inverter' && this.inverterMode === 'central' && (!this.centralInverter || !this.centralInverter.isVisible)) {
        item.domElement.style.opacity = '0';
        item.domElement.style.pointerEvents = 'none';
        return;
      }

      // World position of layer
      item.object.getWorldPosition(tempV);
      // Offset to outer edge of layer for clean leader lines
      const offset = item.anchorOffset || new THREE.Vector3(0.65, 0, 0);
      tempV.add(offset);

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

  /**
   * Cinematic Macro Zoom: Smoothly fly the camera close to an individual layer for micro-inspection.
   */
  focusCameraOnLayer(layerId, duration = 1.3) {
    this.focusedLayerId = layerId;

    if (!layerId || layerId === 'all') {
      // Return to overview isometric angle
      this.isAutoOrbit = true;
      gsap.to(this.scene.controls.target, { x: 0, y: 0.15, z: 0, duration: duration, ease: 'power2.inOut' });
      gsap.to(this.scene.camera.position, {
        x: 2.6,
        y: 2.1,
        z: 3.4,
        duration: duration,
        ease: 'power2.inOut',
        onUpdate: () => this.scene.controls.update()
      });
      return;
    }

    // Pause orbit during micro-macro inspection
    this.isAutoOrbit = false;

    if (layerId === 'centralInverter') {
      this.focusCameraOnCentralInverter(duration);
      return;
    }
    if (layerId === 'batteryStorage') {
      this.focusCameraOnBatteryStorage(duration);
      return;
    }

    // Find layer
    const layer = this.model.layers.find(l => l.id === layerId);
    if (!layer) return;

    const layerY = layer.currentY;

    // Specific cinematic camera angles & target positions for each layer
    let targetPos = { x: 0, y: layerY, z: 0 };
    let camPos = { x: 1.2, y: layerY + 0.6, z: 1.2 };

    switch (layerId) {
      case 'frame':
        // Close-up of 45° corner miter joint & CNC water weep slot
        targetPos = { x: -this.model.panelWidth / 2 + 0.04, y: layerY, z: -this.model.panelLength / 2 + 0.08 };
        camPos = { x: -this.model.panelWidth / 2 - 0.22, y: layerY + 0.22, z: -this.model.panelLength / 2 - 0.15 };
        break;

      case 'glass':
        // Grazing angle looking across emerald-cyan safety edge and AR sheen
        targetPos = { x: this.model.panelWidth / 2 - 0.08, y: layerY, z: 0.2 };
        camPos = { x: this.model.panelWidth / 2 + 0.38, y: layerY + 0.12, z: 0.1 };
        break;

      case 'topEva':
        // Macro view looking down at embossed diamond waffle micro-texture
        targetPos = { x: 0, y: layerY, z: 0.1 };
        camPos = { x: 0.22, y: layerY + 0.32, z: 0.32 };
        break;

      case 'cells':
        // Macro view directly over silver multi-busbar and solder meniscus
        targetPos = { x: 0, y: layerY, z: 0 };
        camPos = { x: 0.18, y: layerY + 0.24, z: 0.24 };
        break;

      case 'bottomEva':
        // Macro view of rear cushioning film
        targetPos = { x: 0, y: layerY, z: -0.1 };
        camPos = { x: 0.22, y: layerY + 0.32, z: 0.15 };
        break;

      case 'backsheet':
        // Macro view of technical rating plate and copper ribbon slits
        targetPos = { x: -0.15, y: layerY, z: 0.45 };
        camPos = { x: -0.15, y: layerY + 0.42, z: 0.72 };
        break;

      case 'jbox': {
        const jboxLayer = this.model.layers.find(l => l.id === 'jbox');
        const pos = new THREE.Vector3();
        if (jboxLayer) jboxLayer.object.getWorldPosition(pos);
        targetPos = { x: pos.x, y: pos.y, z: pos.z };
        camPos = { x: pos.x + 0.35, y: pos.y - 0.28, z: pos.z - 0.45 };
        break;
      }

      case 'inverter': {
        const invLayer = this.model.layers.find(l => l.id === 'inverter');
        const pos = new THREE.Vector3();
        if (invLayer) invLayer.object.getWorldPosition(pos);
        targetPos = { x: pos.x, y: pos.y, z: pos.z + 0.05 };
        camPos = { x: pos.x + 0.38, y: pos.y - 0.26, z: pos.z - 0.48 };
        break;
      }
    }

    gsap.to(this.scene.controls.target, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: duration,
      ease: 'power3.out'
    });

    gsap.to(this.scene.camera.position, {
      x: camPos.x,
      y: camPos.y,
      z: camPos.z,
      duration: duration,
      ease: 'power3.out',
      onUpdate: () => this.scene.controls.update()
    });
  }

  /**
   * Setup interactive 3D raycasting and mouse hover tooltips.
   */
  setupHoverTooltips(tooltipElement) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.tooltipEl = tooltipElement;

    // Technical specifications database for hover cards
    this.layerSpecs = {
      frame: {
        title: '1. Extruded Aluminum Frame',
        mat: 'Anodized 6063-T5 Aerospace Grade Alloy',
        detail: '35mm profile • 1722 × 1134 mm • 45° corner miters • CNC rainwater drainage weep slots • 2400Pa wind / 5400Pa snow load rating'
      },
      glass: {
        title: '2. Tempered Solar Glass Sheet',
        mat: '3.2mm Low-Iron Ultra-Clear Tempered Glass',
        detail: '94.5% solar transmittance • Anti-Reflective (AR) SiO2 thin-film coating • Emerald-cyan safety bevels • Hail Class 4 resistance'
      },
      topEva: {
        title: '3. Top EVA Encapsulant Film',
        mat: 'Ethylene Vinyl Acetate Copolymer Sheet (0.45mm)',
        detail: 'Embossed diamond micro-pyramid texture for bubble-free vacuum lamination • >85% cross-linking gel content • High UV cut-off'
      },
      cells: {
        title: '4. Silicon Solar Cells & Busbars (415Wp)',
        mat: 'Tier-1 Monocrystalline Silicon (182mm M10 Half-Cut Wafers)',
        detail: '108 half-cut matrix • Multi-Busbar (MBB 10-12BB) • 21.3% module efficiency (1.95m² area) • Voc 37.8V, Isc 13.85A, Vmp 31.6V, Imp 13.13A • NMOT 45°C • Low temp coefficient -0.34%/°C'
      },
      bottomEva: {
        title: '5. Bottom EVA Encapsulant Film',
        mat: 'Rear Cushioning Polymer Adhesive Film (0.45mm)',
        detail: 'High dielectric breakdown strength (>30kV/mm) • Moisture barrier • PID-resistant • Permanently bonds cell matrix to backsheet'
      },
      backsheet: {
        title: '6. Tedlar Composite Backsheet',
        mat: 'TPT (Tedlar PVF / PET / Primer Multi-layer Barrier)',
        detail: '1500V DC breakdown rating • SNI 04-3850.2 / IEC 61215 / IEC 61730 certified • 415Wp STC laser specification rating plate'
      },
      jbox: {
        title: '7. Junction Box & MC4 Solar Leads',
        mat: 'Flame-Retardant Polycarbonate Enclosure (IP68 Weatherproof)',
        detail: '3x Schottky bypass diodes (15A) • Heat-dissipating convective cooling fins • 4mm² UV-resistant double-insulated solar cables with MC4 connectors'
      },
      inverter: {
        title: '8. Microinverter & AC Trunk (MLPE 220V)',
        mat: 'Die-Cast Natural Aluminum Enclosure (IP67 / NEMA 4X)',
        detail: 'Integrated MPPT per panel • 220V Single-Phase 50Hz AC Output (PLN Grid Profile) • 97.5% CEC Efficiency • SNI / IEC 62116 Anti-Islanding Protection • Heavy-duty AC trunk line'
      },
      centralInverter: {
        title: 'Central Hybrid Inverter 5.0kW (PLN Grid-Tied)',
        mat: 'Powder-Coated Die-Cast Aluminum (IP65 Outdoor NEMA 4X)',
        detail: '5.0kW 220V/50Hz Single-Phase Output • Dual MPPT for 415Wp+ strings • <10ms EPS Backup Transfer (Blackout UPS) • Permen ESDM Zero-Export Ready'
      },
      soladeck: {
        title: 'Rooftop Transition Box (Soladeck NEMA 3R)',
        mat: 'Galvanized Steel Enclosure with Integrated Roof Flashing',
        detail: 'NEMA 3R weatherproof transition box on roof • Receives module MC4 DC leads and transitions them into metallic EMT conduit to central inverter'
      },
      batteryStorage: {
        title: 'Home Battery Energy Storage System (10.5kWh BESS)',
        mat: 'Lithium Iron Phosphate (LiFePO4) Cells in NEMA 3R Enclosure',
        detail: '10.5kWh Usable Storage • 5.0kW Continuous Output • Peak Shaving for PLN R-1/TR Tariff • Household Backup during PLN Blackout (Mati Lampu) • SNI / IEC 62619 Certified'
      }
    };

    const dom = this.scene.renderer.domElement;
    dom.addEventListener('pointermove', (e) => this.onPointerMove(e));
    dom.addEventListener('pointerleave', () => this.hideTooltip());
  }

  setCentralInverter(centralInverter) {
    this.centralInverter = centralInverter;
  }

  setBatteryStorage(batteryStorage) {
    this.batteryStorage = batteryStorage;
  }

  /**
   * Cinematic Macro Zoom for the Wall-Mounted Central Hybrid Inverter
   */
  focusCameraOnCentralInverter(duration = 1.4) {
    this.isAutoOrbit = false;

    const targetPos = { x: 1.95, y: 0.16, z: 0.02 };
    const camPos = { x: 2.45, y: 0.42, z: 0.92 };

    gsap.to(this.scene.controls.target, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: duration,
      ease: 'power3.out'
    });

    gsap.to(this.scene.camera.position, {
      x: camPos.x,
      y: camPos.y,
      z: camPos.z,
      duration: duration,
      ease: 'power3.out',
      onUpdate: () => this.scene.controls.update()
    });
  }

  /**
   * Cinematic Macro Zoom for Home Battery Storage (BESS)
   */
  focusCameraOnBatteryStorage(duration = 1.4) {
    this.isAutoOrbit = false;

    const targetPos = { x: 2.85, y: 0.15, z: 0.02 };
    const camPos = { x: 3.30, y: 0.38, z: 0.88 };

    gsap.to(this.scene.controls.target, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: duration,
      ease: 'power3.out'
    });

    gsap.to(this.scene.camera.position, {
      x: camPos.x,
      y: camPos.y,
      z: camPos.z,
      duration: duration,
      ease: 'power3.out',
      onUpdate: () => this.scene.controls.update()
    });
  }

  onPointerMove(e) {
    const rect = this.scene.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.scene.camera);

    // Collect all layer meshes
    const meshes = [];
    this.model.layers.forEach(layer => {
      layer.object.traverse(child => {
        if (child.isMesh && child.material.visible !== false) {
          child.userData.parentLayerId = layer.id;
          meshes.push(child);
        }
      });
    });

    // Also collect Central Inverter meshes if active
    if (this.centralInverter && this.centralInverter.isVisible) {
      this.centralInverter.group.traverse(child => {
        if (child.isMesh && child.material.visible !== false) {
          if (child.userData.isSoladeck) {
            child.userData.parentLayerId = 'soladeck';
            meshes.push(child);
          } else if (child.userData.isCentralInverter) {
            child.userData.parentLayerId = 'centralInverter';
            meshes.push(child);
          }
        }
      });
    }

    // Also collect Battery Storage meshes if active
    if (this.batteryStorage && this.batteryStorage.isVisible) {
      this.batteryStorage.group.traverse(child => {
        if (child.isMesh && child.material.visible !== false && child.userData.isBatteryStorage) {
          child.userData.parentLayerId = 'batteryStorage';
          meshes.push(child);
        }
      });
    }

    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hitLayerId = intersects[0].object.userData.parentLayerId;
      const spec = this.layerSpecs[hitLayerId];

      if (spec && this.tooltipEl) {
        this.tooltipEl.innerHTML = `
          <div class="tooltip-header">
            <span class="tooltip-dot"></span>
            <strong>${spec.title}</strong>
          </div>
          <div class="tooltip-mat">${spec.mat}</div>
          <div class="tooltip-desc">${spec.detail}</div>
        `;

        // Position tooltip smoothly near cursor
        const left = Math.min(window.innerWidth - 320, e.clientX + 16);
        const top = Math.min(window.innerHeight - 120, e.clientY + 16);
        this.tooltipEl.style.transform = `translate3d(${left}px, ${top}px, 0)`;
        this.tooltipEl.style.opacity = '1';
        this.tooltipEl.style.pointerEvents = 'none';
        return;
      }
    }

    this.hideTooltip();
  }

  hideTooltip() {
    if (this.tooltipEl) {
      this.tooltipEl.style.opacity = '0';
    }
  }
}
