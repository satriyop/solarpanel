import * as THREE from 'three';

/**
 * PowerFlowController - Visualizes real-time electrical current flow:
 * 1. DC Power Flow (Amber / Gold): Silicon cell busbars -> ribbon feedthroughs -> Junction Box -> MC4 leads -> Microinverter DC input.
 * 2. Inversion Stage: Microinverter status LED rhythmic heartbeat pulse (MPPT grid sync).
 * 3. AC Power Flow (Cyan / Electric Blue): Microinverter AC drop cable -> T-junction -> AC array trunk line to grid.
 * 
 * Particles dynamically track layer separation (Y coordinates) so the energy flow remains
 * perfectly aligned during assembled and exploded diagram states.
 */
export class PowerFlowController {
  constructor(solarModel, studioScene) {
    this.model = solarModel;
    this.scene = studioScene;

    this.group = new THREE.Group();
    this.group.visible = false;
    this.model.group.add(this.group);

    this.isVisible = false;
    this.clock = new THREE.Clock();
    this.time = 0;

    this.initParticles();
  }

  initParticles() {
    // 1. Soft glowing energy particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.35)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const particleTex = new THREE.CanvasTexture(canvas);

    // DC Particle Material (Warm Solar Gold / Amber)
    this.dcMat = new THREE.SpriteMaterial({
      map: particleTex,
      color: 0xf59e0b,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // AC Particle Material (Electric Cyan / Sine Blue)
    this.acMat = new THREE.SpriteMaterial({
      map: particleTex,
      color: 0x06b6d4,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // 2. DC Busbar Paths (6 columns across panel cells)
    this.dcBusbarParticles = [];
    const busbarCols = [-0.41, -0.246, -0.082, 0.082, 0.246, 0.41];
    const particlesPerCol = 6;

    busbarCols.forEach((colX) => {
      for (let i = 0; i < particlesPerCol; i++) {
        const sprite = new THREE.Sprite(this.dcMat.clone());
        sprite.scale.set(0.038, 0.038, 1);
        this.group.add(sprite);
        this.dcBusbarParticles.push({
          sprite,
          colX,
          t: i / particlesPerCol,
          speed: 0.24
        });
      }
    });

    // 3. DC Cable Interconnect Particles (J-Box -> Microinverter DC Inputs)
    this.dcCableParticles = [];
    const dcWhips = [
      { startX: -0.045, isPos: true },
      { startX: 0.045, isPos: false }
    ];

    dcWhips.forEach(({ startX, isPos }) => {
      for (let i = 0; i < 8; i++) {
        const sprite = new THREE.Sprite(this.dcMat.clone());
        sprite.scale.set(0.044, 0.044, 1);
        if (isPos) {
          sprite.material.color.setHex(0xfbbf24); // Warm gold
        } else {
          sprite.material.color.setHex(0x38bdf8); // Blue return
        }
        this.group.add(sprite);
        this.dcCableParticles.push({
          sprite,
          startX,
          t: i / 8,
          speed: 0.35
        });
      }
    });

    // 4. AC Output Trunk Particles (Microinverter -> AC Trunk -> Grid)
    this.acTrunkParticles = [];
    for (let i = 0; i < 14; i++) {
      const sprite = new THREE.Sprite(this.acMat.clone());
      sprite.scale.set(0.048, 0.048, 1);
      this.group.add(sprite);
      this.acTrunkParticles.push({
        sprite,
        t: i / 14,
        speed: 0.42
      });
    }
  }

  setCentralInverter(centralInverter) {
    this.centralInverter = centralInverter;
    if (!centralInverter) return;

    // 1. J-Box to Soladeck DC Particles (inside this.group on solar panel)
    this.centralJboxParticles = [];
    const whips = [-0.045, 0.045];
    whips.forEach((startX, wIdx) => {
      for (let i = 0; i < 4; i++) {
        const sprite = new THREE.Sprite(this.dcMat.clone());
        sprite.scale.set(0.042, 0.042, 1);
        if (wIdx === 0) {
          sprite.material.color.setHex(0xfbbf24); // Warm gold (+)
        } else {
          sprite.material.color.setHex(0x38bdf8); // Blue return (-)
        }
        sprite.visible = (this.isVisible && this.inverterMode === 'central');
        this.group.add(sprite);
        this.centralJboxParticles.push({
          sprite,
          startX,
          isPos: wIdx === 0,
          t: i / 4,
          speed: 0.32
        });
      }
    });

    // 2. Continuous EMT Conduit Particles (inside centralInverter.group)
    this.centralDcParticles = [];
    for (let i = 0; i < 14; i++) {
      const sprite = new THREE.Sprite(this.dcMat.clone());
      sprite.scale.set(0.046, 0.046, 1);
      sprite.visible = (this.isVisible && this.inverterMode === 'central');
      centralInverter.group.add(sprite);
      this.centralDcParticles.push({
        sprite,
        t: i / 14,
        speed: 0.28
      });
    }

    // 3. Central Inverter AC Drop Conduit Particles
    this.centralAcParticles = [];
    for (let i = 0; i < 6; i++) {
      const sprite = new THREE.Sprite(this.acMat.clone());
      sprite.scale.set(0.046, 0.046, 1);
      sprite.visible = (this.isVisible && this.inverterMode === 'central');
      centralInverter.group.add(sprite);
      this.centralAcParticles.push({
        sprite,
        t: i / 6,
        speed: 0.38
      });
    }
  }

  setBatteryStorage(batteryStorage) {
    this.batteryStorage = batteryStorage;
    if (!batteryStorage) return;

    // Battery charging DC particles along the interconnect conduit
    this.batteryChargeParticles = [];
    for (let i = 0; i < 10; i++) {
      const sprite = new THREE.Sprite(this.dcMat.clone());
      sprite.scale.set(0.044, 0.044, 1);
      sprite.visible = (this.isVisible && batteryStorage.isVisible);
      batteryStorage.group.add(sprite);
      this.batteryChargeParticles.push({
        sprite,
        t: i / 10,
        speed: 0.30
      });
    }
  }

  /**
   * Switch active power flow path between Microinverter (MLPE) and Central Inverter (String)
   */
  setInverterMode(mode) {
    this.inverterMode = mode; // 'micro' or 'central'
    const isCentral = (mode === 'central');

    if (this.dcCableParticles) {
      this.dcCableParticles.forEach(p => p.sprite.visible = (this.isVisible && !isCentral));
    }
    if (this.acTrunkParticles) {
      this.acTrunkParticles.forEach(p => p.sprite.visible = (this.isVisible && !isCentral));
    }
    if (this.centralJboxParticles) {
      this.centralJboxParticles.forEach(p => p.sprite.visible = (this.isVisible && isCentral));
    }
    if (this.centralDcParticles) {
      this.centralDcParticles.forEach(p => p.sprite.visible = (this.isVisible && isCentral));
    }
    if (this.centralAcParticles) {
      this.centralAcParticles.forEach(p => p.sprite.visible = (this.isVisible && isCentral));
    }
  }

  setVisible(visible) {
    this.isVisible = visible;
    this.group.visible = visible;

    const isCentral = (this.inverterMode === 'central');

    if (this.dcCableParticles) {
      this.dcCableParticles.forEach(p => p.sprite.visible = (visible && !isCentral));
    }
    if (this.acTrunkParticles) {
      this.acTrunkParticles.forEach(p => p.sprite.visible = (visible && !isCentral));
    }
    if (this.centralJboxParticles) {
      this.centralJboxParticles.forEach(p => p.sprite.visible = (visible && isCentral));
    }
    if (this.centralDcParticles) {
      this.centralDcParticles.forEach(p => p.sprite.visible = (visible && isCentral));
    }
    if (this.centralAcParticles) {
      this.centralAcParticles.forEach(p => p.sprite.visible = (visible && isCentral));
    }
    if (this.batteryChargeParticles && this.batteryStorage) {
      this.batteryChargeParticles.forEach(p => p.sprite.visible = (visible && this.batteryStorage.isVisible));
    }

    if (!visible) {
      this.model.setInverterLedPulse(1.0);
      if (this.centralInverter) {
        this.centralInverter.setLedPulse(1.0);
      }
      if (this.batteryStorage) {
        this.batteryStorage.setLedPulse(1.0);
      }
    }
  }

  /**
   * Update particle positions along dynamic 3D paths tracking current layer separation heights
   */
  update(delta, currentWatts = 410) {
    if (!this.isVisible) return;

    this.time += delta;

    // Power factor scales particle speed and brightness (dimmer at sunset / 0W)
    const powerFactor = Math.max(0.12, Math.min(1.0, currentWatts / 410));

    // Dynamic layer heights from model
    const cellsLayer = this.model.layers.find(l => l.id === 'cells');
    const jboxLayer = this.model.layers.find(l => l.id === 'jbox');
    const invLayer = this.model.layers.find(l => l.id === 'inverter');

    const cellsY = cellsLayer ? cellsLayer.currentY : 0.0;
    const jboxY = jboxLayer ? jboxLayer.currentY : -0.038;
    const invY = invLayer ? invLayer.currentY : -0.09;

    // 1. Animate DC Busbar Particles (common to both architectures: cell matrix to J-box)
    this.dcBusbarParticles.forEach((p) => {
      p.t = (p.t + p.speed * powerFactor * delta) % 1.0;
      const zPos = 0.75 - p.t * 1.20;
      p.sprite.position.set(p.colX, cellsY + 0.003, zPos);
      p.sprite.material.opacity = 0.4 + 0.55 * Math.sin(p.t * Math.PI) * powerFactor;
    });

    // 2. ARCHITECTURE A: Microinverter (MLPE) Mode
    if (this.inverterMode !== 'central') {
      // Animate DC Cable Interconnect Particles (J-Box -> Microinverter)
      this.dcCableParticles.forEach((p) => {
        p.t = (p.t + p.speed * powerFactor * delta) % 1.0;
        const t = p.t;
        const x = p.startX * (1.0 + 0.2 * Math.sin(t * Math.PI));
        const y = (1 - t) * (1 - t) * (jboxY - 0.018) + 
                  2 * (1 - t) * t * ((jboxY + invY) * 0.5 - 0.04) + 
                  t * t * (invY - 0.012);
        const z = -0.38 + t * 0.54;

        p.sprite.position.set(x, y, z);
        p.sprite.material.opacity = 0.75 * powerFactor;
      });

      // Pulse Microinverter Status LED
      const pulseIntensity = 1.2 + 1.8 * Math.sin(this.time * (6.0 * powerFactor));
      this.model.setInverterLedPulse(Math.max(0.4, pulseIntensity * powerFactor));

      // Animate AC Trunk Line Particles (Microinverter -> AC Trunk -> Grid)
      this.acTrunkParticles.forEach((p) => {
        p.t = (p.t + p.speed * powerFactor * delta) % 1.0;
        const t = p.t;

        if (t < 0.35) {
          const subT = t / 0.35;
          const x = 0.08 * subT;
          const y = invY - 0.032 - subT * 0.053;
          const z = 0.16 + subT * 0.08;
          p.sprite.position.set(x, y, z);
        } else {
          const subT = (t - 0.35) / 0.65;
          const x = 0.08 + subT * 0.40;
          const y = invY - 0.085;
          const z = 0.24;
          p.sprite.position.set(x, y, z);
        }

        const acSine = Math.sin(this.time * 16.0 + p.t * Math.PI * 4);
        p.sprite.material.opacity = (0.55 + 0.4 * acSine) * powerFactor;
      });
    }

    // 3. ARCHITECTURE B: Central String Inverter Mode
    if (this.inverterMode === 'central' && this.centralInverter && this.centralInverter.isVisible) {
      // A. Animate J-Box to Soladeck DC Particles
      if (this.centralJboxParticles) {
        this.centralJboxParticles.forEach((p) => {
          p.t = (p.t + p.speed * powerFactor * delta) % 1.0;
          const t = p.t;
          const x = p.startX + t * (0.50 - p.startX);
          const y = jboxY - 0.016 - 0.015 * Math.sin(t * Math.PI);
          const z = -0.36 - 0.02 * t;
          p.sprite.position.set(x, y, z);
          p.sprite.material.opacity = 0.75 * powerFactor;
        });
      }

      // B. Animate Continuous Conduit Particles (Soladeck Hub -> Central Inverter DC_PV Gland)
      if (this.centralDcParticles && this.centralInverter.conduitCurve) {
        const pt = new THREE.Vector3();
        this.centralDcParticles.forEach((p) => {
          p.t = (p.t + p.speed * powerFactor * delta) % 1.0;
          this.centralInverter.conduitCurve.getPoint(p.t, pt);
          p.sprite.position.copy(pt);
          p.sprite.material.opacity = (0.6 + 0.4 * Math.sin(p.t * Math.PI)) * powerFactor;
        });
      }

      // C. Animate AC output particles dropping through the bottom AC conduit to grid
      if (this.centralAcParticles) {
        this.centralAcParticles.forEach((p) => {
          p.t = (p.t + p.speed * powerFactor * delta) % 1.0;
          p.sprite.position.set(0.14, -0.38 - p.t * 0.28, 0.01);
          p.sprite.material.opacity = 0.75 * powerFactor;
        });
      }

      // D. Pulse Central Inverter status ring & update live telemetry
      const pulseIntensity = 0.6 + 0.4 * Math.sin(this.time * (5.0 * powerFactor));
      this.centralInverter.setLedPulse(pulseIntensity * powerFactor);
      this.centralInverter.updateTelemetry(currentWatts);

      // E. Animate Battery Storage Charging Particles (Inverter to Battery)
      if (this.batteryStorage && this.batteryStorage.isVisible) {
        if (this.batteryChargeParticles && this.batteryStorage.conduitCurve) {
          const pt = new THREE.Vector3();
          this.batteryChargeParticles.forEach((p) => {
            p.t = (p.t + p.speed * powerFactor * delta) % 1.0;
            this.batteryStorage.conduitCurve.getPoint(p.t, pt);
            p.sprite.position.copy(pt);
            p.sprite.visible = this.isVisible;
            p.sprite.material.opacity = (0.55 + 0.45 * Math.sin(p.t * Math.PI)) * powerFactor;
          });
        }
        const chargePulse = 0.5 + 0.5 * Math.sin(this.time * 4.0 * powerFactor);
        this.batteryStorage.setLedPulse(chargePulse);
      } else if (this.batteryChargeParticles) {
        this.batteryChargeParticles.forEach(p => p.sprite.visible = false);
      }
    }
  }
}
