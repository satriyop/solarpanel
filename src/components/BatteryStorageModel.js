import * as THREE from 'three';
import gsap from 'gsap';
import {
  createBatterySpecPlateTexture,
  createBatteryBmsTexture
} from '../textures/solarTextures.js';

/**
 * BatteryStorageModel - Home Battery Energy Storage System (BESS) 10.5kWh
 * 
 * Includes:
 * 1. Wall-mounted architectural enclosure with inspection cutaway
 * 2. 14 Prismatic LiFePO4 battery cell modules in 2 columns with nickel interconnect busbars
 * 3. Battery Management System (BMS) controller PCB with balance harness
 * 4. High-voltage DC safety contactor & service disconnect breaker
 * 5. Vertical multi-segment State-of-Charge (SoC) LED meter
 * 6. Laser-etched UL 9540 / UL 1973 specification rating plate
 * 7. Metallic EMT conduit bridging Central Inverter BATTERY port to Battery unit
 */
export class BatteryStorageModel {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'BatteryStorage';
    this.group.position.set(2.85, 0.15, -0.2); // Positioned on equipment wall with 18cm NEC service clearance

    this.isVisible = false;
    this.group.visible = false;

    this.fadeMaterials = [];
    this.socLeds = [];

    this.initModel();
  }

  initModel() {
    // 1. Common Materials
    const metalBracketMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.45,
      metalness: 0.85
    });
    this.fadeMaterials.push(metalBracketMat);

    const cabinetBodyMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Architectural clean satin white
      roughness: 0.28,
      metalness: 0.18,
      envMapIntensity: 1.2
    });
    this.fadeMaterials.push(cabinetBodyMat);

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.5
    });
    this.fadeMaterials.push(darkTrimMat);

    const emtConduitMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Galvanized EMT conduit
      roughness: 0.22,
      metalness: 0.92
    });
    this.fadeMaterials.push(emtConduitMat);

    // 2. Wall Mounting Backer Plate (Aligns flush with Central Inverter at Z = -0.10)
    const wallPlateGeo = new THREE.BoxGeometry(0.68, 1.05, 0.02);
    const wallPlateMat = new THREE.MeshStandardMaterial({
      color: 0x181c24,
      roughness: 0.85,
      metalness: 0.1
    });
    this.fadeMaterials.push(wallPlateMat);
    const wallPlate = new THREE.Mesh(wallPlateGeo, wallPlateMat);
    wallPlate.position.set(0, 0, -0.10);
    wallPlate.receiveShadow = true;
    wallPlate.userData.isBatteryStorage = true;
    this.group.add(wallPlate);

    // Mounting bolts in plate corners
    const boltGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.012, 8);
    const boltMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
    this.fadeMaterials.push(boltMat);
    [
      [-0.30, 0.48], [0.30, 0.48],
      [-0.30, -0.48], [0.30, -0.48]
    ].forEach(([bx, by]) => {
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(bx, by, -0.088);
      this.group.add(bolt);
    });

    // 3. Main Battery Cabinet Enclosure
    const W = 0.52;
    const H = 0.80;
    const D = 0.15;

    // Outer Cabinet Frame
    const cabinetGeo = new THREE.BoxGeometry(W, H, D);
    const cabinet = new THREE.Mesh(cabinetGeo, cabinetBodyMat);
    cabinet.position.set(0, 0, 0);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    cabinet.userData.isBatteryStorage = true;
    this.group.add(cabinet);

    // Front Bezel Face Frame
    const bezelGeo = new THREE.BoxGeometry(W * 0.96, H * 0.96, 0.01);
    const bezel = new THREE.Mesh(bezelGeo, cabinetBodyMat);
    bezel.position.set(0, 0, D / 2 + 0.005);
    bezel.userData.isBatteryStorage = true;
    this.group.add(bezel);

    // 4. Transparent Inspection Window Cutaway
    const windowGeo = new THREE.PlaneGeometry(0.32, 0.58);
    const windowMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      transmission: 0.92,
      opacity: 0.85,
      transparent: true,
      roughness: 0.05,
      ior: 1.5,
      reflectivity: 0.6,
      depthWrite: false
    });
    this.fadeMaterials.push(windowMat);
    const windowMesh = new THREE.Mesh(windowGeo, windowMat);
    windowMesh.position.set(-0.06, -0.02, D / 2 + 0.012);
    windowMesh.userData.isBatteryStorage = true;
    this.group.add(windowMesh);

    // Window rubber seal trim
    const trimGeo = new THREE.BoxGeometry(0.33, 0.59, 0.004);
    const trim = new THREE.Mesh(trimGeo, darkTrimMat);
    trim.position.set(-0.06, -0.02, D / 2 + 0.008);
    trim.userData.isBatteryStorage = true;
    this.group.add(trim);

    // 4b. Interior Service LED Luminaire Strip (illuminates LiFePO4 cells & BMS through window)
    const bayLightGroup = new THREE.Group();
    const ledFixtureGeo = new THREE.BoxGeometry(0.30, 0.012, 0.024);
    const ledFixtureMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    this.fadeMaterials.push(ledFixtureMat);
    const ledFixture = new THREE.Mesh(ledFixtureGeo, ledFixtureMat);
    ledFixture.position.set(-0.06, 0.28, 0.035);
    bayLightGroup.add(ledFixture);

    const ledEmitterGeo = new THREE.BoxGeometry(0.28, 0.004, 0.016);
    const ledEmitterMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe }); // Cool daylight white
    this.fadeMaterials.push(ledEmitterMat);
    const ledEmitter = new THREE.Mesh(ledEmitterGeo, ledEmitterMat);
    ledEmitter.position.set(-0.06, 0.273, 0.035);
    bayLightGroup.add(ledEmitter);

    const bayPointLight = new THREE.PointLight(0x38bdf8, 1.8, 0.75, 2.0);
    bayPointLight.position.set(-0.06, 0.22, 0.05);
    bayLightGroup.add(bayPointLight);
    this.group.add(bayLightGroup);

    // 5. Internal Prismatic LiFePO4 Battery Cells (14 Cells in 2 Columns)
    const cellGroup = new THREE.Group();
    cellGroup.position.set(-0.06, -0.05, 0.01);

    const cellW = 0.13;
    const cellH = 0.065;
    const cellD = 0.085;

    const cellGeo = new THREE.BoxGeometry(cellW, cellH, cellD);
    const cellMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // Prismatic cell cobalt blue insulation wrap
      roughness: 0.35,
      metalness: 0.25
    });
    this.fadeMaterials.push(cellMat);

    const terminalMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // Brushed aluminum terminal posts
      roughness: 0.2,
      metalness: 0.9
    });
    this.fadeMaterials.push(terminalMat);

    const busbarMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Copper interconnect busbar links
      metalness: 0.95,
      roughness: 0.25
    });
    this.fadeMaterials.push(busbarMat);

    const termGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.01, 12);
    const busbarGeo = new THREE.BoxGeometry(0.018, cellH * 0.92, 0.005);

    // 2 columns (left: col -1, right: col +1) x 7 rows
    for (let col = 0; col < 2; col++) {
      const cx = col === 0 ? -0.07 : 0.07;
      for (let row = 0; row < 7; row++) {
        const cy = -0.21 + row * (cellH + 0.008);
        const cell = new THREE.Mesh(cellGeo, cellMat);
        cell.position.set(cx, cy, 0);
        cell.castShadow = true;
        cell.userData.isBatteryStorage = true;
        cellGroup.add(cell);

        // Positive (+) and Negative (-) terminals
        [-0.038, 0.038].forEach((tx, tIdx) => {
          const term = new THREE.Mesh(termGeo, terminalMat);
          term.position.set(cx + tx, cy + cellH / 2 + 0.004, 0.015);
          cellGroup.add(term);

          // Polarity color ring
          const ringGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.003, 12);
          const ringMat = new THREE.MeshBasicMaterial({ color: tIdx === 0 ? 0xef4444 : 0x3b82f6 });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.position.set(cx + tx, cy + cellH / 2 + 0.002, 0.015);
          cellGroup.add(ring);
        });

        // Series interconnect busbar linking adjacent cells
        if (row < 6) {
          const busbar = new THREE.Mesh(busbarGeo, busbarMat);
          busbar.position.set(cx + (row % 2 === 0 ? 0.038 : -0.038), cy + cellH * 0.54, 0.02);
          cellGroup.add(busbar);
        }
      }
    }
    this.group.add(cellGroup);

    // 6. Battery Management System (BMS) Controller Board
    const bmsTex = createBatteryBmsTexture();
    const bmsGeo = new THREE.PlaneGeometry(0.30, 0.11);
    const bmsMat = new THREE.MeshStandardMaterial({
      map: bmsTex,
      roughness: 0.4,
      metalness: 0.3
    });
    this.fadeMaterials.push(bmsMat);
    const bmsMesh = new THREE.Mesh(bmsGeo, bmsMat);
    bmsMesh.position.set(-0.06, 0.26, 0.04);
    bmsMesh.userData.isBatteryStorage = true;
    this.group.add(bmsMesh);

    // BMS mounting frame
    const bmsFrameGeo = new THREE.BoxGeometry(0.31, 0.12, 0.01);
    const bmsFrame = new THREE.Mesh(bmsFrameGeo, darkTrimMat);
    bmsFrame.position.set(-0.06, 0.26, 0.034);
    this.group.add(bmsFrame);

    // 7. High-Voltage DC Contactor & Emergency Disconnect
    const contactorGeo = new THREE.BoxGeometry(0.09, 0.08, 0.06);
    const contactor = new THREE.Mesh(contactorGeo, darkTrimMat);
    contactor.position.set(0.16, 0.14, 0.02);
    contactor.userData.isBatteryStorage = true;
    this.group.add(contactor);

    // Red manual service breaker switch
    const switchGeo = new THREE.BoxGeometry(0.025, 0.04, 0.02);
    const switchMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
    this.fadeMaterials.push(switchMat);
    const switchMesh = new THREE.Mesh(switchGeo, switchMat);
    switchMesh.position.set(0.16, 0.14, 0.055);
    switchMesh.userData.isBatteryStorage = true;
    this.group.add(switchMesh);

    // 8. State-of-Charge (SoC) Multi-Segment LED Meter (Right Side of Cabinet)
    const socGroup = new THREE.Group();
    socGroup.position.set(0.16, -0.06, D / 2 + 0.012);

    const segCount = 5;
    const segH = 0.026;
    const segW = 0.048;
    const segGap = 0.008;

    for (let s = 0; s < segCount; s++) {
      const segGeo = new THREE.BoxGeometry(segW, segH, 0.004);
      const isLit = s < 4; // 80% default charge
      const segMat = new THREE.MeshBasicMaterial({
        color: isLit ? 0x10b981 : 0x334155,
        transparent: true,
        opacity: isLit ? 0.95 : 0.4
      });
      this.fadeMaterials.push(segMat);
      const segMesh = new THREE.Mesh(segGeo, segMat);
      segMesh.position.set(0, -0.07 + s * (segH + segGap), 0);
      segMesh.userData.isBatteryStorage = true;
      socGroup.add(segMesh);
      this.socLeds.push({ mesh: segMesh, mat: segMat, defaultLit: isLit });
    }

    // SoC Status Label
    const socLabelGeo = new THREE.PlaneGeometry(0.054, 0.018);
    const socCanvas = document.createElement('canvas');
    socCanvas.width = 128;
    socCanvas.height = 48;
    const sctx = socCanvas.getContext('2d');
    sctx.fillStyle = '#0f172a';
    sctx.fillRect(0, 0, 128, 48);
    sctx.font = 'bold 22px "JetBrains Mono", monospace';
    sctx.fillStyle = '#10b981';
    sctx.textAlign = 'center';
    sctx.fillText('85% SoC', 64, 32);
    const socTex = new THREE.CanvasTexture(socCanvas);
    const socLabelMat = new THREE.MeshBasicMaterial({ map: socTex, transparent: true });
    this.fadeMaterials.push(socLabelMat);
    const socLabelMesh = new THREE.Mesh(socLabelGeo, socLabelMat);
    socLabelMesh.position.set(0, 0.10, 0);
    socGroup.add(socLabelMesh);

    this.group.add(socGroup);

    // 9. Laser-Etched Specification Rating Plate (Bottom Right)
    const specPlateTex = createBatterySpecPlateTexture();
    const specPlateGeo = new THREE.PlaneGeometry(0.14, 0.08);
    const specPlateMat = new THREE.MeshStandardMaterial({
      map: specPlateTex,
      roughness: 0.35,
      metalness: 0.75
    });
    this.fadeMaterials.push(specPlateMat);
    const specPlateMesh = new THREE.Mesh(specPlateGeo, specPlateMat);
    specPlateMesh.position.set(0.15, -0.28, D / 2 + 0.012);
    specPlateMesh.userData.isBatteryStorage = true;
    this.group.add(specPlateMesh);

    // 10. Interconnection Metallic EMT Conduit (Central Inverter BATTERY Port to Battery Unit)
    this.initConduitRun(emtConduitMat);
  }

  /**
   * Builds an authentic rigid metallic EMT conduit path connecting Central Inverter BATTERY port to Battery Unit
   */
  initConduitRun(emtMat) {
    this.interconnectGroup = new THREE.Group();
    this.interconnectGroup.name = 'BatteryInterconnect';

    // Rigid 90° EMT Conduit:
    // P0: Central Inverter BATTERY port at local relative offset (-0.86, -0.315, 0.01)
    // P1: Straight vertical drop down to (-0.86, -0.45, 0.01)
    // P2: 90° sweep elbow bending right to horizontal at Y = -0.49
    // P3: Horizontal straight run along wall (-0.50, -0.49, 0.01) to (-0.20, -0.49, 0.01)
    // P4: 90° sweep elbow bending upward
    // P5: Vertical rise into Battery bottom gland at (-0.16, -0.40, 0.01)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.86, -0.315, 0.01),
      new THREE.Vector3(-0.86, -0.45, 0.01),
      new THREE.Vector3(-0.85, -0.48, 0.01),
      new THREE.Vector3(-0.82, -0.49, 0.01),
      new THREE.Vector3(-0.50, -0.49, 0.01),
      new THREE.Vector3(-0.20, -0.49, 0.01),
      new THREE.Vector3(-0.17, -0.48, 0.01),
      new THREE.Vector3(-0.16, -0.45, 0.01),
      new THREE.Vector3(-0.16, -0.40, 0.01)
    ]);
    this.conduitCurve = curve;

    const pipeGeo = new THREE.TubeGeometry(curve, 48, 0.014, 16, false);
    const pipeMesh = new THREE.Mesh(pipeGeo, emtMat);
    pipeMesh.castShadow = true;
    pipeMesh.userData.isBatteryStorage = true;
    this.interconnectGroup.add(pipeMesh);

    // Compression locknut fittings at conduit endpoints
    const locknutGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.016, 6);
    const locknutMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.3 });
    this.fadeMaterials.push(locknutMat);

    const locknutInv = new THREE.Mesh(locknutGeo, locknutMat);
    locknutInv.position.set(-0.86, -0.325, 0.01);
    this.interconnectGroup.add(locknutInv);

    const locknutBat = new THREE.Mesh(locknutGeo, locknutMat);
    locknutBat.position.set(-0.16, -0.395, 0.01);
    this.interconnectGroup.add(locknutBat);

    // Wall unistrut mounting straps for horizontal pipe run
    const strapGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.018, 16);
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.35 });
    this.fadeMaterials.push(strapMat);

    [-0.65, -0.35].forEach((sx) => {
      const strap = new THREE.Mesh(strapGeo, strapMat);
      strap.rotation.z = Math.PI / 2;
      strap.position.set(sx, -0.49, 0.01);
      this.interconnectGroup.add(strap);
    });

    // Bare copper equipment grounding wire (#6 AWG) between Inverter and Battery chassis
    const groundCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.72, -0.365, -0.02),
      new THREE.Vector3(-0.50, -0.44, -0.02),
      new THREE.Vector3(-0.21, -0.40, -0.02)
    ]);
    const groundGeo = new THREE.TubeGeometry(groundCurve, 16, 0.003, 8, false);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.25 });
    this.fadeMaterials.push(groundMat);
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.interconnectGroup.add(groundMesh);

    this.group.add(this.interconnectGroup);

    // Brass DC Gland on Battery unit bottom (anchored to battery chassis)
    const glandGeo = new THREE.CylinderGeometry(0.016, 0.018, 0.035, 16);
    const glandMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.9 });
    this.fadeMaterials.push(glandMat);
    const gland = new THREE.Mesh(glandGeo, glandMat);
    gland.position.set(-0.16, -0.40, 0.01);
    this.group.add(gland);

    // Grounding Lug on Battery Chassis
    const lugGeo = new THREE.BoxGeometry(0.012, 0.012, 0.012);
    const lug = new THREE.Mesh(lugGeo, glandMat);
    lug.position.set(-0.21, -0.40, -0.02);
    this.group.add(lug);
  }

  /**
   * Toggles visibility of the interconnect conduit and bonding wire
   */
  setInterconnectVisible(visible) {
    if (this.interconnectGroup) {
      this.interconnectGroup.visible = visible;
    }
  }

  /**
   * Smoothly toggle visibility with GSAP scale and opacity transitions
   */
  setVisible(visible, duration = 0.8) {
    this.isVisible = visible;

    if (visible) {
      this.group.visible = true;
      this.group.scale.set(0.85, 0.85, 0.85);

      gsap.to(this.group.scale, {
        x: 1.0,
        y: 1.0,
        z: 1.0,
        duration: duration,
        ease: 'back.out(1.4)'
      });

      this.fadeMaterials.forEach((mat) => {
        mat.transparent = true;
        mat.opacity = 0;
        gsap.to(mat, {
          opacity: 1.0,
          duration: duration * 0.8,
          ease: 'power2.out'
        });
      });
    } else {
      gsap.to(this.group.scale, {
        x: 0.85,
        y: 0.85,
        z: 0.85,
        duration: duration * 0.6,
        ease: 'power2.in'
      });

      this.fadeMaterials.forEach((mat) => {
        mat.transparent = true;
        gsap.to(mat, {
          opacity: 0,
          duration: duration * 0.6,
          ease: 'power2.in',
          onComplete: () => {
            if (!this.isVisible) {
              this.group.visible = false;
            }
          }
        });
      });
    }
  }

  /**
   * Pulses the active SoC charge segment in sync with power flow
   */
  setLedPulse(intensity) {
    if (this.socLeds && this.socLeds.length > 3) {
      const activeSeg = this.socLeds[3]; // 4th segment breathes while charging
      activeSeg.mat.opacity = Math.max(0.3, Math.min(1.0, intensity));
    }
  }
}
