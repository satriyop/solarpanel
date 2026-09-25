import * as THREE from 'three';
import gsap from 'gsap';
import {
  createCentralInverterScreenTexture,
  createCentralInverterSpecPlateTexture,
  createRotarySwitchTexture
} from '../textures/solarTextures.js';

/**
 * CentralInverterModel - Wall-Mounted Central / Hybrid String Inverter (5.0kW)
 * 
 * Includes:
 * 1. Equipment backer board & galvanized wall bracket
 * 2. 16 extruded aluminum cooling heatsink fins for convection
 * 3. Powder-coated chassis with lower wiring compartment
 * 4. High-contrast OLED/LCD telemetry screen with live electrical metrics
 * 5. Pulsing status LED halo ring (grid sync)
 * 6. Rotary DC emergency disconnect switch with OSHA/NEC lockable handle
 * 7. Laser-etched UL 1741-SB technical rating plate
 * 8. Dual MPPT input glands, AC grid output, and battery expansion port
 * 9. Galvanized EMT metallic conduit pipe connecting solar array to inverter
 */
export class CentralInverterModel {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'CentralInverter';
    this.group.position.set(1.95, 0.2, -0.2); // Positioned elegantly on equipment wall with NEC clearance

    this.isVisible = false;
    this.group.visible = false;

    // Keep track of materials for opacity fades
    this.fadeMaterials = [];

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

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Clean architectural white-silver
      roughness: 0.28,
      metalness: 0.2,
      envMapIntensity: 1.2
    });
    this.fadeMaterials.push(bodyMat);

    const heatsinkMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Anodized dark charcoal aluminum
      roughness: 0.4,
      metalness: 0.85
    });
    this.fadeMaterials.push(heatsinkMat);

    const darkAccentMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.5
    });
    this.fadeMaterials.push(darkAccentMat);

    const brassGlandMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.3,
      metalness: 0.9
    });
    this.fadeMaterials.push(brassGlandMat);

    const emtConduitMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Galvanized EMT metallic conduit
      roughness: 0.22,
      metalness: 0.92
    });
    this.fadeMaterials.push(emtConduitMat);

    // 2. Equipment Mounting Backer Board (Architectural Wall Plate with 18cm NEC clearance)
    const wallBoardGeo = new THREE.BoxGeometry(0.76, 1.12, 0.02);
    const wallBoardMat = new THREE.MeshStandardMaterial({
      color: 0x181c24, // Dark engineering studio equipment backer
      roughness: 0.85,
      metalness: 0.1
    });
    this.fadeMaterials.push(wallBoardMat);
    const wallBoard = new THREE.Mesh(wallBoardGeo, wallBoardMat);
    wallBoard.position.set(0, 0, -0.10);
    wallBoard.receiveShadow = true;
    wallBoard.userData.isCentralInverter = true;
    this.group.add(wallBoard);

    // Wall mounting bolts in corners
    const boltGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.012, 8);
    const boltMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
    this.fadeMaterials.push(boltMat);
    [
      [-0.34, 0.52], [0.34, 0.52],
      [-0.34, -0.52], [0.34, -0.52]
    ].forEach(([bx, by]) => {
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(bx, by, -0.088);
      this.group.add(bolt);
    });

    // 3. Extruded Aluminum Heatsink Fins (16 Cooling Fins)
    const heatsinkGroup = new THREE.Group();
    const finCount = 16;
    const finWidth = 0.42;
    const finHeight = 0.58;
    const finDepth = 0.038;
    const finThickness = 0.0035;
    const finSpacing = finWidth / (finCount - 1);

    for (let i = 0; i < finCount; i++) {
      const finX = -finWidth / 2 + i * finSpacing;
      const finGeo = new THREE.BoxGeometry(finThickness, finHeight, finDepth);
      const fin = new THREE.Mesh(finGeo, heatsinkMat);
      fin.position.set(finX, 0.04, -0.08);
      fin.castShadow = true;
      fin.userData.isCentralInverter = true;
      heatsinkGroup.add(fin);
    }
    this.group.add(heatsinkGroup);

    // 4. Main Inverter Enclosure (Chassis)
    // Upper Main Unit
    const mainBodyGeo = new THREE.BoxGeometry(0.44, 0.52, 0.14);
    const mainBody = new THREE.Mesh(mainBodyGeo, bodyMat);
    mainBody.position.set(0, 0.07, 0.01);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    mainBody.userData.isCentralInverter = true;
    this.group.add(mainBody);

    // Beveled front face highlight
    const bevelGeo = new THREE.BoxGeometry(0.42, 0.50, 0.01);
    const bevelMesh = new THREE.Mesh(bevelGeo, bodyMat);
    bevelMesh.position.set(0, 0.07, 0.082);
    bevelMesh.userData.isCentralInverter = true;
    this.group.add(bevelMesh);

    // Lower Wiring & Disconnect Compartment
    const wiringBoxGeo = new THREE.BoxGeometry(0.44, 0.16, 0.14);
    const wiringBox = new THREE.Mesh(wiringBoxGeo, darkAccentMat);
    wiringBox.position.set(0, -0.27, 0.01);
    wiringBox.castShadow = true;
    wiringBox.userData.isCentralInverter = true;
    this.group.add(wiringBox);

    // Stainless hex screws on wiring compartment face
    [
      [-0.19, -0.21], [0.19, -0.21],
      [-0.19, -0.33], [0.19, -0.33]
    ].forEach(([sx, sy]) => {
      const screw = new THREE.Mesh(boltGeo, boltMat);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(sx, sy, 0.082);
      this.group.add(screw);
    });

    // 5. OLED / LCD Digital Telemetry Screen
    this.screenTex = createCentralInverterScreenTexture();
    const screenGeo = new THREE.PlaneGeometry(0.32, 0.16);
    const screenMat = new THREE.MeshBasicMaterial({
      map: this.screenTex,
      transparent: true,
      depthWrite: true
    });
    this.fadeMaterials.push(screenMat);
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0.16, 0.088);
    screenMesh.userData.isCentralInverter = true;
    this.group.add(screenMesh);

    // Display Glass Bezel frame
    const bezelGeo = new THREE.BoxGeometry(0.336, 0.176, 0.008);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.1,
      metalness: 0.9
    });
    this.fadeMaterials.push(bezelMat);
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.set(0, 0.16, 0.084);
    bezelMesh.userData.isCentralInverter = true;
    this.group.add(bezelMesh);

    // 6. Glowing Status LED Ring / Bar (Grid Sync Pulse)
    const ledRingGeo = new THREE.RingGeometry(0.014, 0.022, 24);
    this.statusLedMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    });
    this.fadeMaterials.push(this.statusLedMat);
    const ledRing = new THREE.Mesh(ledRingGeo, this.statusLedMat);
    ledRing.position.set(0, 0.04, 0.088);
    ledRing.userData.isCentralInverter = true;
    this.group.add(ledRing);

    // Inner status core
    const ledCoreGeo = new THREE.CircleGeometry(0.012, 24);
    const ledCore = new THREE.Mesh(ledCoreGeo, this.statusLedMat);
    ledCore.position.set(0, 0.04, 0.0881);
    this.group.add(ledCore);

    // 7. Rotary DC Disconnect Switch (Left Side of Inverter)
    const rotaryGroup = new THREE.Group();
    rotaryGroup.position.set(-0.13, -0.27, 0.082);

    // Yellow warning faceplate
    const rotaryFaceTex = createRotarySwitchTexture();
    const faceplateGeo = new THREE.CircleGeometry(0.045, 32);
    const faceplateMat = new THREE.MeshStandardMaterial({
      map: rotaryFaceTex,
      roughness: 0.4,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    this.fadeMaterials.push(faceplateMat);
    const faceplateMesh = new THREE.Mesh(faceplateGeo, faceplateMat);
    faceplateMesh.position.set(0, 0, 0.002);
    faceplateMesh.userData.isCentralInverter = true;
    rotaryGroup.add(faceplateMesh);

    // Rotary switch cylindrical boss
    const switchBossGeo = new THREE.CylinderGeometry(0.024, 0.026, 0.018, 24);
    const switchBoss = new THREE.Mesh(switchBossGeo, darkAccentMat);
    switchBoss.rotation.x = Math.PI / 2;
    switchBoss.position.set(0, 0, 0.012);
    rotaryGroup.add(switchBoss);

    // Heavy-duty red industrial switch handle
    const switchHandleGeo = new THREE.BoxGeometry(0.014, 0.052, 0.022);
    const switchHandleMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Industrial safety red
      roughness: 0.35,
      metalness: 0.2
    });
    this.fadeMaterials.push(switchHandleMat);
    const switchHandle = new THREE.Mesh(switchHandleGeo, switchHandleMat);
    switchHandle.position.set(0, 0.008, 0.026);
    switchHandle.userData.isCentralInverter = true;
    rotaryGroup.add(switchHandle);

    this.group.add(rotaryGroup);

    // 8. Laser-Etched Specification Rating Plate (Right Side of Wiring Box)
    const specPlateTex = createCentralInverterSpecPlateTexture();
    const specPlateGeo = new THREE.PlaneGeometry(0.18, 0.09);
    const specPlateMat = new THREE.MeshStandardMaterial({
      map: specPlateTex,
      roughness: 0.35,
      metalness: 0.75
    });
    this.fadeMaterials.push(specPlateMat);
    const specPlateMesh = new THREE.Mesh(specPlateGeo, specPlateMat);
    specPlateMesh.position.set(0.09, -0.27, 0.082);
    specPlateMesh.userData.isCentralInverter = true;
    this.group.add(specPlateMesh);

    // 9. Bottom Conduit Glands & Knockouts
    const glandGeo = new THREE.CylinderGeometry(0.016, 0.018, 0.035, 16);
    const glandOffsets = [
      { x: -0.14, label: 'DC_PV' },
      { x: -0.06, label: 'DC_PV_2' },
      { x: 0.04, label: 'BATTERY' },
      { x: 0.14, label: 'AC_GRID' }
    ];

    glandOffsets.forEach(({ x }) => {
      const gland = new THREE.Mesh(glandGeo, brassGlandMat);
      gland.position.set(x, -0.365, 0.01);
      gland.castShadow = true;
      this.group.add(gland);
    });

    // 10. Rooftop Transition Box (Soladeck NEMA 3R Enclosure on Roof Plane)
    this.initRooftopTransitionBox(metalBracketMat, darkAccentMat, brassGlandMat);

    // 11. Heavy-Duty Metallic EMT Conduit Run (Soladeck to Central Inverter)
    this.initConduitRun(emtConduitMat);
  }

  /**
   * Builds an authentic Rooftop Transition Box (Soladeck NEMA 3R) anchored on the 22° rooftop slope
   * Receives the solar module's (+) and (-) MC4 DC cables and transitions them into EMT conduit.
   */
  initRooftopTransitionBox(bracketMat, darkMat, brassMat) {
    this.soladeckGroup = new THREE.Group();
    // Positioned right at the 22° tilted module right edge in local inverter space (X = +0.607m in world)
    this.soladeckGroup.position.set(-1.343, -0.095, -0.167);
    this.soladeckGroup.rotation.x = 22 * (Math.PI / 180);

    // 1. Galvanized Roof Flashing Plate (tucks under roof shingles)
    const flashingGeo = new THREE.BoxGeometry(0.18, 0.003, 0.20);
    const flashingMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.85,
      roughness: 0.35
    });
    this.fadeMaterials.push(flashingMat);
    const flashing = new THREE.Mesh(flashingGeo, flashingMat);
    flashing.position.set(0, -0.002, 0);
    flashing.receiveShadow = true;
    flashing.userData.isCentralInverter = true;
    flashing.userData.isSoladeck = true;
    this.soladeckGroup.add(flashing);

    // 2. Weatherproof Sloped NEMA 3R Metal Box
    const boxGeo = new THREE.BoxGeometry(0.13, 0.052, 0.11);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.6
    });
    this.fadeMaterials.push(boxMat);
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, 0.026, 0);
    box.castShadow = true;
    box.userData.isCentralInverter = true;
    box.userData.isSoladeck = true;
    this.soladeckGroup.add(box);

    // Weatherproof Lid Seam & Fasteners
    const lidGeo = new THREE.BoxGeometry(0.136, 0.006, 0.116);
    const lid = new THREE.Mesh(lidGeo, boxMat);
    lid.position.set(0, 0.054, 0);
    this.soladeckGroup.add(lid);

    // 3. Two MC4 Female Input Receptacles (Left side, facing module DC leads)
    const mc4PortGeo = new THREE.CylinderGeometry(0.0085, 0.0085, 0.024, 16);
    const mc4PortMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.3 });
    this.fadeMaterials.push(mc4PortMat);

    [-0.025, 0.025].forEach((pz, idx) => {
      const port = new THREE.Mesh(mc4PortGeo, mc4PortMat);
      port.rotation.z = Math.PI / 2;
      port.position.set(-0.072, 0.026, pz);
      this.soladeckGroup.add(port);

      // Color coding ring (Red for +, Blue for -)
      const ringGeo = new THREE.CylinderGeometry(0.0095, 0.0095, 0.004, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: idx === 0 ? 0xef4444 : 0x3b82f6 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.z = Math.PI / 2;
      ring.position.set(-0.068, 0.026, pz);
      this.soladeckGroup.add(ring);
    });

    // 4. Equipment Grounding Lug with Bare Copper Wire
    const lugGeo = new THREE.BoxGeometry(0.012, 0.012, 0.012);
    const lug = new THREE.Mesh(lugGeo, brassMat);
    lug.position.set(0.045, 0.038, 0.048);
    this.soladeckGroup.add(lug);

    const groundWireCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.045, 0.038, 0.048),
      new THREE.Vector3(0.065, 0.02, 0.075),
      new THREE.Vector3(0.09, -0.002, 0.10),
      new THREE.Vector3(0.12, -0.035, 0.13),
      new THREE.Vector3(0.15, -0.075, 0.15)
    ]);
    const groundWireGeo = new THREE.TubeGeometry(groundWireCurve, 18, 0.0025, 8, false);
    const groundWireMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.2 });
    this.fadeMaterials.push(groundWireMat);
    const groundWire = new THREE.Mesh(groundWireGeo, groundWireMat);
    this.soladeckGroup.add(groundWire);

    // 5. Conduit Compression Fitting Hub (Right side of Soladeck box)
    const hubGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.024, 16);
    const hub = new THREE.Mesh(hubGeo, bracketMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(0.072, 0.026, 0);
    this.soladeckGroup.add(hub);

    this.group.add(this.soladeckGroup);

    // 6. Inverter Chassis Grounding Lug (Bonding to wall grounding wire)
    const invLug = new THREE.Mesh(lugGeo, brassMat);
    invLug.position.set(0.18, -0.365, -0.02);
    this.group.add(invLug);
  }

  /**
   * Builds an authentic metallic EMT conduit path bridging the solar array to the Central Inverter
   */
  initConduitRun(emtMat) {
    // 3D Path: Continuous closed-loop from Soladeck Hub to Central Inverter DC_PV gland
    // Point 0: Firmly mated to Soladeck box conduit hub
    // Point 1: Sweeping along the roof eaves / rafters
    // Point 2: 90° smooth radius transition bend onto the equipment wall
    // Point 3: Horizontal run secured by unistrut straps
    // Point 4: Sweep into Central Inverter left MPPT gland
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.271, -0.095, -0.167),
      new THREE.Vector3(-1.02, -0.16, -0.12),
      new THREE.Vector3(-0.65, -0.26, 0.01),
      new THREE.Vector3(-0.30, -0.38, 0.01),
      new THREE.Vector3(-0.14, -0.38, 0.01),
      new THREE.Vector3(-0.14, -0.365, 0.01)
    ]);
    this.conduitCurve = curve;

    const pipeGeo = new THREE.TubeGeometry(curve, 54, 0.014, 16, false);
    const pipeMesh = new THREE.Mesh(pipeGeo, emtMat);
    pipeMesh.castShadow = true;
    pipeMesh.userData.isCentralInverter = true;
    this.group.add(pipeMesh);

    // Compression locknut fittings at conduit entry/exit
    const locknutGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.016, 6); // Hex nut
    const locknutMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.3 });
    this.fadeMaterials.push(locknutMat);

    // Inverter DC entry locknut
    const locknutInv = new THREE.Mesh(locknutGeo, locknutMat);
    locknutInv.position.set(-0.14, -0.365, 0.01);
    this.group.add(locknutInv);

    // Wall unistrut mounting straps for conduit
    const strapGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.018, 16);
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.35 });
    this.fadeMaterials.push(strapMat);

    [-0.75, -0.40].forEach((sx) => {
      const strap = new THREE.Mesh(strapGeo, strapMat);
      strap.rotation.z = Math.PI / 2;
      strap.position.set(sx, -0.38, 0.01);
      this.group.add(strap);
    });

    // Inverter AC Grid output locknut fitting (Mates flush to the incoming ATS interconnect conduit)
    const locknutAc = new THREE.Mesh(locknutGeo, locknutMat);
    locknutAc.position.set(0.14, -0.365, 0.01);
    locknutAc.userData.isCentralInverter = true;
    this.group.add(locknutAc);
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
   * Dynamically updates OLED screen telemetry and stats based on current solar watts and mode
   */
  updateTelemetry(watts, mode) {
    if (this.screenTex && this.screenTex.updateScreen) {
      this.screenTex.updateScreen(watts, mode);
    }
  }

  /**
   * Pulses status LED ring in sync with active power inversion
   */
  setLedPulse(intensity) {
    if (this.statusLedMat) {
      this.statusLedMat.opacity = Math.max(0.2, Math.min(1.0, intensity));
    }
  }
}
