import * as THREE from 'three';
import gsap from 'gsap';
import {
  createPlnSmartMeterTexture,
  createAtsSwitchTexture,
  createZeroExportSensorTexture
} from '../textures/solarTextures.js';

/**
 * PLNGridDistributionModel - Indonesian PLN 220V/50Hz Grid Distribution Board
 * 
 * Compliant with:
 * - Permen ESDM No. 2/2024 (Elimination of kWh Exim net-metering, 100% Self-Consumption, Zero-Export)
 * - SPLN D3.022-1:2020 (PLN Smart Meter AMI specification)
 * - PUIL 2011 / SNI IEC 60947-6-1 / IEC 62116 (Anti-islanding physical isolation, SPD Type 2, RCD 30mA)
 * 
 * Components mounted on industrial equipment backboard:
 * 1. PLN Smart Meter AMI Box with Metrology stamp & digital LCD display
 * 2. DDSU666 Smart Energy Meter & Split-Core CT Clamp (Zero-Export Modbus RS485)
 * 3. Automatic Transfer Switch (ATS) with motorized mechanical arm and status LEDs
 * 4. AC Protection & Distribution Combiner Panel (Type 2 SPD, RCD 30mA, MCBs)
 * 5. Galvanized EMT metallic conduits & grounding busbar
 */
export class PLNGridDistributionModel {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'PLNGridDistribution';
    // Positioned cleanly between solar array roof edge (X=0.6m) and Central Inverter (X=1.95m)
    this.group.position.set(1.15, 0.20, -0.20);

    this.isVisible = false;
    this.group.visible = false;
    this.gridMode = 'ongrid'; // 'ongrid' or 'offgrid'

    this.fadeMaterials = [];
    this.dynamicElements = {};

    this.initModel();
  }

  initModel() {
    // 1. Common Materials
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.45,
      metalness: 0.85
    });
    this.fadeMaterials.push(metalMat);

    const backboardMat = new THREE.MeshStandardMaterial({
      color: 0x181e29, // Deep industrial slate backer board
      roughness: 0.85,
      metalness: 0.15
    });
    this.fadeMaterials.push(backboardMat);

    const unistrutMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // Zinc-galvanized slotted channel
      roughness: 0.35,
      metalness: 0.88
    });
    this.fadeMaterials.push(unistrutMat);

    const enclosureMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Industrial gray-white ABS/polycarbonate
      roughness: 0.30,
      metalness: 0.18
    });
    this.fadeMaterials.push(enclosureMat);

    const darkEnclosureMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.4
    });
    this.fadeMaterials.push(darkEnclosureMat);

    const smokedCoverMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.65,
      roughness: 0.12,
      metalness: 0.1,
      transmission: 0.7,
      ior: 1.52
    });
    this.fadeMaterials.push(smokedCoverMat);

    const emtConduitMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Galvanized EMT metallic conduit
      roughness: 0.22,
      metalness: 0.92
    });
    this.fadeMaterials.push(emtConduitMat);

    const brassGlandMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.30,
      metalness: 0.90
    });
    this.fadeMaterials.push(brassGlandMat);

    const copperGroundMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.25,
      metalness: 0.95
    });
    this.fadeMaterials.push(copperGroundMat);

    // 2. Equipment Wall Backer Board (0.64m wide x 1.12m tall x 0.018m thick)
    const backboardGeo = new THREE.BoxGeometry(0.64, 1.12, 0.018);
    const backboard = new THREE.Mesh(backboardGeo, backboardMat);
    backboard.position.set(0, 0, -0.09);
    backboard.receiveShadow = true;
    this.group.add(backboard);

    // Beveled frame edge
    const borderGeo = new THREE.BoxGeometry(0.65, 1.13, 0.01);
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.3 });
    this.fadeMaterials.push(borderMat);
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.set(0, 0, -0.096);
    this.group.add(border);

    // Galvanized Unistrut Mounting Channels (Horizontal support rails)
    [-0.38, 0.05, 0.42].forEach((ry) => {
      const railGeo = new THREE.BoxGeometry(0.60, 0.038, 0.014);
      const rail = new THREE.Mesh(railGeo, unistrutMat);
      rail.position.set(0, ry, -0.076);
      this.group.add(rail);

      // Mounting anchor bolts
      [-0.26, 0.26].forEach((bx) => {
        const boltGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.018, 6);
        const bolt = new THREE.Mesh(boltGeo, metalMat);
        bolt.rotation.x = Math.PI / 2;
        bolt.position.set(bx, ry, -0.066);
        this.group.add(bolt);
      });
    });

    // -------------------------------------------------------------
    // COMPONENT A: PLN Smart Meter AMI Box (Upper Left: X = -0.16, Y = 0.28)
    // -------------------------------------------------------------
    const plnMeterGroup = new THREE.Group();
    plnMeterGroup.position.set(-0.16, 0.28, 0);

    // Weatherproof Polycarbonate Base Cabinet
    const meterBoxGeo = new THREE.BoxGeometry(0.24, 0.30, 0.09);
    const meterBox = new THREE.Mesh(meterBoxGeo, enclosureMat);
    meterBox.position.set(0, 0, -0.025);
    meterBox.castShadow = true;
    meterBox.userData.isPlnSmartMeter = true;
    plnMeterGroup.add(meterBox);

    // Front Faceplate with PLN Smart Meter Texture
    this.plnMeterTex = createPlnSmartMeterTexture();
    const meterFaceGeo = new THREE.PlaneGeometry(0.22, 0.27);
    const meterFaceMat = new THREE.MeshBasicMaterial({
      map: this.plnMeterTex,
      side: THREE.DoubleSide
    });
    this.fadeMaterials.push(meterFaceMat);
    const meterFaceMesh = new THREE.Mesh(meterFaceGeo, meterFaceMat);
    meterFaceMesh.position.set(0, 0, 0.021);
    meterFaceMesh.userData.isPlnSmartMeter = true;
    plnMeterGroup.add(meterFaceMesh);

    // Transparent inspection window glass
    const meterGlassGeo = new THREE.BoxGeometry(0.224, 0.274, 0.004);
    const meterGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      roughness: 0.05,
      transmission: 0.92,
      ior: 1.5
    });
    this.fadeMaterials.push(meterGlassMat);
    const meterGlass = new THREE.Mesh(meterGlassGeo, meterGlassMat);
    meterGlass.position.set(0, 0, 0.024);
    meterGlass.userData.isPlnSmartMeter = true;
    plnMeterGroup.add(meterGlass);

    // PLN Meter Active Impulse LED (1000 imp/kWh pulse)
    const plnLedGeo = new THREE.CircleGeometry(0.004, 16);
    this.plnPulseLedMat = new THREE.MeshBasicMaterial({
      color: 0xdc2626, // Red calibration LED
      transparent: true,
      opacity: 0.95
    });
    this.fadeMaterials.push(this.plnPulseLedMat);
    const plnLed = new THREE.Mesh(plnLedGeo, this.plnPulseLedMat);
    plnLed.position.set(0.08, -0.08, 0.0261);
    plnMeterGroup.add(plnLed);

    // PLN Tamper-Evident Lead Seal Simulation on lower latch
    const sealWireGeo = new THREE.CylinderGeometry(0.0015, 0.0015, 0.04, 8);
    const sealWire = new THREE.Mesh(sealWireGeo, copperGroundMat);
    sealWire.position.set(0, -0.16, 0.015);
    plnMeterGroup.add(sealWire);

    const sealLeadGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.008, 12);
    const sealLead = new THREE.Mesh(sealLeadGeo, metalMat);
    sealLead.rotation.x = Math.PI / 2;
    sealLead.position.set(0, -0.175, 0.015);
    plnMeterGroup.add(sealLead);

    // PLN Service Entrance Disconnect (Miniature Circuit Breaker C16/3500VA single pole)
    const plnMcbGeo = new THREE.BoxGeometry(0.035, 0.08, 0.05);
    const plnMcbMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    this.fadeMaterials.push(plnMcbMat);
    const plnMcb = new THREE.Mesh(plnMcbGeo, plnMcbMat);
    plnMcb.position.set(0.145, 0.02, -0.02);
    plnMcb.userData.isPlnSmartMeter = true;
    plnMeterGroup.add(plnMcb);

    const plnMcbToggleGeo = new THREE.BoxGeometry(0.012, 0.022, 0.02);
    const plnMcbToggleMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 }); // Blue PLN toggle
    this.fadeMaterials.push(plnMcbToggleMat);
    const plnMcbToggle = new THREE.Mesh(plnMcbToggleGeo, plnMcbToggleMat);
    plnMcbToggle.position.set(0.145, 0.03, 0.012);
    plnMeterGroup.add(plnMcbToggle);

    this.group.add(plnMeterGroup);

    // -------------------------------------------------------------
    // COMPONENT B: Zero-Export Smart Energy Meter & CT Sensor (DDSU666) (Lower Left: X = -0.16, Y = -0.16)
    // -------------------------------------------------------------
    const zeroExportGroup = new THREE.Group();
    zeroExportGroup.position.set(-0.16, -0.16, 0);

    // DIN Rail enclosure body
    const zeBoxGeo = new THREE.BoxGeometry(0.16, 0.20, 0.085);
    const zeBox = new THREE.Mesh(zeBoxGeo, enclosureMat);
    zeBox.position.set(0, 0, -0.02);
    zeBox.castShadow = true;
    zeBox.userData.isZeroExportSensor = true;
    zeroExportGroup.add(zeBox);

    // DDSU666 Faceplate Texture
    this.zeroExportTex = createZeroExportSensorTexture();
    const zeFaceGeo = new THREE.PlaneGeometry(0.145, 0.185);
    const zeFaceMat = new THREE.MeshBasicMaterial({
      map: this.zeroExportTex,
      side: THREE.DoubleSide
    });
    this.fadeMaterials.push(zeFaceMat);
    const zeFaceMesh = new THREE.Mesh(zeFaceGeo, zeFaceMat);
    zeFaceMesh.position.set(0, 0, 0.023);
    zeFaceMesh.userData.isZeroExportSensor = true;
    zeroExportGroup.add(zeFaceMesh);

    // RS485 Modbus Active Communication LED
    const rs485LedGeo = new THREE.CircleGeometry(0.0035, 12);
    this.rs485LedMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, // Electric blue flashing Modbus communication
      transparent: true,
      opacity: 0.95
    });
    this.fadeMaterials.push(this.rs485LedMat);
    const rs485Led = new THREE.Mesh(rs485LedGeo, this.rs485LedMat);
    rs485Led.position.set(0.05, -0.065, 0.024);
    zeroExportGroup.add(rs485Led);

    // Split-Core Current Transformer (CT Clamp) clipped around incoming Phase conductor
    const ctGroup = new THREE.Group();
    ctGroup.position.set(-0.10, -0.08, 0.03);

    const ctBodyGeo = new THREE.BoxGeometry(0.036, 0.046, 0.024);
    const ctBodyMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Black molded ABS clamp
      roughness: 0.35,
      metalness: 0.3
    });
    this.fadeMaterials.push(ctBodyMat);
    const ctBody = new THREE.Mesh(ctBodyGeo, ctBodyMat);
    ctBody.userData.isZeroExportSensor = true;
    ctGroup.add(ctBody);

    // CT Clamp Latch Release Clip
    const ctLatchGeo = new THREE.BoxGeometry(0.012, 0.01, 0.028);
    const ctLatchMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 }); // Orange release tab
    this.fadeMaterials.push(ctLatchMat);
    const ctLatch = new THREE.Mesh(ctLatchGeo, ctLatchMat);
    ctLatch.position.set(0.016, 0, 0);
    ctGroup.add(ctLatch);

    // Through-hole conductor passing through center of CT clamp
    const ctWireGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.12, 12);
    const phaseWireMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4 }); // Red Phase L1
    this.fadeMaterials.push(phaseWireMat);
    const ctWire = new THREE.Mesh(ctWireGeo, phaseWireMat);
    ctWire.position.set(0, 0, 0);
    ctGroup.add(ctWire);

    // Twisted-pair RS485 sensor cable running from CT clamp to DDSU666 terminals
    const ctSignalCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.014, 0.018, 0),
      new THREE.Vector3(-0.025, 0.04, 0.01),
      new THREE.Vector3(0.03, 0.07, 0.01),
      new THREE.Vector3(0.06, 0.08, 0)
    ]);
    const ctSignalGeo = new THREE.TubeGeometry(ctSignalCurve, 16, 0.002, 8, false);
    const ctSignalMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
    this.fadeMaterials.push(ctSignalMat);
    const ctSignal = new THREE.Mesh(ctSignalGeo, ctSignalMat);
    ctGroup.add(ctSignal);

    zeroExportGroup.add(ctGroup);
    this.group.add(zeroExportGroup);

    // -------------------------------------------------------------
    // COMPONENT C: Automatic Transfer Switch (ATS) Changeover Unit (Upper Right: X = 0.16, Y = 0.28)
    // -------------------------------------------------------------
    const atsGroup = new THREE.Group();
    atsGroup.position.set(0.16, 0.28, 0);

    // ATS Weatherproof Metal Cabinet
    const atsBoxGeo = new THREE.BoxGeometry(0.26, 0.22, 0.09);
    const atsBox = new THREE.Mesh(atsBoxGeo, darkEnclosureMat);
    atsBox.position.set(0, 0, -0.025);
    atsBox.castShadow = true;
    atsBox.userData.isAtsSwitch = true;
    atsGroup.add(atsBox);

    // ATS Faceplate Texture
    this.atsFaceTex = createAtsSwitchTexture();
    const atsFaceGeo = new THREE.PlaneGeometry(0.24, 0.20);
    const atsFaceMat = new THREE.MeshBasicMaterial({
      map: this.atsFaceTex,
      side: THREE.DoubleSide
    });
    this.fadeMaterials.push(atsFaceMat);
    const atsFaceMesh = new THREE.Mesh(atsFaceGeo, atsFaceMat);
    atsFaceMesh.position.set(0, 0, 0.021);
    atsFaceMesh.userData.isAtsSwitch = true;
    atsGroup.add(atsFaceMesh);

    // ATS Mechanical Changeover Contact Indicator Lever (Rotates to show Position I vs II)
    this.atsLeverGroup = new THREE.Group();
    this.atsLeverGroup.position.set(0.005, -0.015, 0.024);

    const leverBaseGeo = new THREE.CylinderGeometry(0.016, 0.018, 0.012, 16);
    const leverBase = new THREE.Mesh(leverBaseGeo, metalMat);
    leverBase.rotation.x = Math.PI / 2;
    this.atsLeverGroup.add(leverBase);

    // Changeover Toggle Handle (Red Heavy-Duty Industrial Lever)
    const leverArmGeo = new THREE.BoxGeometry(0.01, 0.05, 0.016);
    const leverArmMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Industrial safety red
      roughness: 0.35,
      metalness: 0.2
    });
    this.fadeMaterials.push(leverArmMat);
    const leverArm = new THREE.Mesh(leverArmGeo, leverArmMat);
    leverArm.position.set(0, 0.02, 0.01);
    leverArm.userData.isAtsSwitch = true;
    this.atsLeverGroup.add(leverArm);

    // Initial angle: Position I (PLN Grid Normal: tilted -25 degrees)
    this.atsLeverGroup.rotation.z = -0.44;
    atsGroup.add(this.atsLeverGroup);

    // Dual ATS Status LEDs:
    // 1. Green LED: PLN GRID NORMAL
    const ledPlnGeo = new THREE.CircleGeometry(0.006, 16);
    this.atsPlnLedMat = new THREE.MeshBasicMaterial({
      color: 0x10b981, // Green
      transparent: true,
      opacity: 0.95
    });
    this.fadeMaterials.push(this.atsPlnLedMat);
    const ledPln = new THREE.Mesh(ledPlnGeo, this.atsPlnLedMat);
    ledPln.position.set(-0.065, 0.068, 0.024);
    ledPln.userData.isAtsSwitch = true;
    atsGroup.add(ledPln);

    // 2. Amber LED: INVERTER EPS ISLANDED (BESS BACKUP)
    const ledEpsGeo = new THREE.CircleGeometry(0.006, 16);
    this.atsEpsLedMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b, // Amber
      transparent: true,
      opacity: 0.15 // Dim when ongrid
    });
    this.fadeMaterials.push(this.atsEpsLedMat);
    const ledEps = new THREE.Mesh(ledEpsGeo, this.atsEpsLedMat);
    ledEps.position.set(0.065, 0.068, 0.024);
    ledEps.userData.isAtsSwitch = true;
    atsGroup.add(ledEps);

    this.group.add(atsGroup);

    // -------------------------------------------------------------
    // COMPONENT D: AC Protection & Distribution Combiner Panel (Lower Right: X = 0.16, Y = -0.16)
    // -------------------------------------------------------------
    const combinerGroup = new THREE.Group();
    combinerGroup.position.set(0.16, -0.16, 0);

    // Weatherproof Distribution Enclosure (IP65 with smoked transparent door)
    const distBoxGeo = new THREE.BoxGeometry(0.26, 0.24, 0.095);
    const distBox = new THREE.Mesh(distBoxGeo, enclosureMat);
    distBox.position.set(0, 0, -0.02);
    distBox.castShadow = true;
    distBox.userData.isAcCombiner = true;
    combinerGroup.add(distBox);

    // Smoked transparent DIN rail inspection door
    const doorGeo = new THREE.BoxGeometry(0.245, 0.225, 0.006);
    const door = new THREE.Mesh(doorGeo, smokedCoverMat);
    door.position.set(0, 0, 0.03);
    door.userData.isAcCombiner = true;
    combinerGroup.add(door);

    // Internal Galvanized DIN Rail
    const dinRailGeo = new THREE.BoxGeometry(0.22, 0.035, 0.008);
    const dinRail = new THREE.Mesh(dinRailGeo, unistrutMat);
    dinRail.position.set(0, 0.01, 0.005);
    combinerGroup.add(dinRail);

    // 1. Type 2 AC Surge Protective Device (SPD 275V Uc, In 20kA, Imax 40kA)
    const spdGroup = new THREE.Group();
    spdGroup.position.set(-0.075, 0.01, 0.018);

    const spdBodyGeo = new THREE.BoxGeometry(0.038, 0.08, 0.045);
    const spdBodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    this.fadeMaterials.push(spdBodyMat);
    const spdBody = new THREE.Mesh(spdBodyGeo, spdBodyMat);
    spdBody.userData.isAcCombiner = true;
    spdGroup.add(spdBody);

    // SPD Status Indicator Flags (Green = Healthy / Protected)
    [-0.008, 0.008].forEach((fx) => {
      const flagGeo = new THREE.PlaneGeometry(0.008, 0.012);
      const flagMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      this.fadeMaterials.push(flagMat);
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(fx, 0.015, 0.023);
      spdGroup.add(flag);
    });

    combinerGroup.add(spdGroup);

    // 2. RCD / ELCB 30mA Residual Current Earth Leakage Breaker (PUIL 2011 Personnel Protection)
    const rcdGroup = new THREE.Group();
    rcdGroup.position.set(-0.025, 0.01, 0.018);

    const rcdBodyGeo = new THREE.BoxGeometry(0.038, 0.08, 0.045);
    const rcdBody = new THREE.Mesh(rcdBodyGeo, spdBodyMat);
    rcdBody.userData.isAcCombiner = true;
    rcdGroup.add(rcdBody);

    // RCD Test Button (Yellow Pushbutton)
    const testBtnGeo = new THREE.BoxGeometry(0.01, 0.01, 0.008);
    const testBtnMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
    this.fadeMaterials.push(testBtnMat);
    const testBtn = new THREE.Mesh(testBtnGeo, testBtnMat);
    testBtn.position.set(0, 0.02, 0.025);
    rcdGroup.add(testBtn);

    combinerGroup.add(rcdGroup);

    // 3. Inverter AC Isolator MCB (2-Pole C25)
    const invMcbGroup = new THREE.Group();
    invMcbGroup.position.set(0.025, 0.01, 0.018);

    const invMcbBodyGeo = new THREE.BoxGeometry(0.036, 0.08, 0.045);
    const invMcbBody = new THREE.Mesh(invMcbBodyGeo, spdBodyMat);
    invMcbBody.userData.isAcCombiner = true;
    invMcbGroup.add(invMcbBody);

    // Dual Black Breaker Toggle
    const invToggleGeo = new THREE.BoxGeometry(0.022, 0.018, 0.016);
    const invToggleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    this.fadeMaterials.push(invToggleMat);
    const invToggle = new THREE.Mesh(invToggleGeo, invToggleMat);
    invToggle.position.set(0, 0.005, 0.028);
    invMcbGroup.add(invToggle);

    combinerGroup.add(invMcbGroup);

    // 4. Essential Loads Circuit Breakers (Lighting, Fridge, Internet)
    const loadsMcbGroup = new THREE.Group();
    loadsMcbGroup.position.set(0.075, 0.01, 0.018);

    const loadsMcbBodyGeo = new THREE.BoxGeometry(0.045, 0.08, 0.045);
    const loadsMcbBody = new THREE.Mesh(loadsMcbBodyGeo, spdBodyMat);
    loadsMcbBody.userData.isAcCombiner = true;
    loadsMcbGroup.add(loadsMcbBody);

    [-0.012, 0.0, 0.012].forEach((tx) => {
      const loadToggleGeo = new THREE.BoxGeometry(0.008, 0.018, 0.016);
      const loadToggle = new THREE.Mesh(loadToggleGeo, invToggleMat);
      loadToggle.position.set(tx, 0.005, 0.028);
      loadsMcbGroup.add(loadToggle);
    });

    combinerGroup.add(loadsMcbGroup);
    this.group.add(combinerGroup);

    // -------------------------------------------------------------
    // COMPONENT E: Interconnecting Galvanized Metallic EMT Conduits
    // -------------------------------------------------------------
    this.initConduitNetwork(emtConduitMat, brassGlandMat, copperGroundMat);

    // -------------------------------------------------------------
    // COMPONENT F: Household Consumer Main Distribution Panel (Beban Rumah)
    // -------------------------------------------------------------
    this.initConsumerLoadUnit(enclosureMat, darkEnclosureMat, smokedCoverMat, brassGlandMat, emtConduitMat);
  }

  /**
   * Builds realistic EMT conduit paths connecting the PLN Meter, DDSU666, ATS,
   * Combiner Box, and running across to the Central Inverter at X = 1.95m
   */
  initConduitNetwork(emtMat, brassMat, copperMat) {
    this.conduitGroup = new THREE.Group();

    // 1. Incoming Utility PLN Aerial Service Drop (Kabel Twisted NFA2X-T 2×10mm² dari Tiang Listrik PLN JTR 220V 50Hz)
    const aerialCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.62, 0.96, 0.12),
      new THREE.Vector3(-0.48, 0.90, 0.08),
      new THREE.Vector3(-0.32, 0.83, 0.04),
      new THREE.Vector3(-0.16, 0.74, 0.01)
    ]);
    this.plnAerialCurve = aerialCurve;

    const aerialGeo = new THREE.TubeGeometry(aerialCurve, 32, 0.0075, 12, false);
    const aerialMat = new THREE.MeshStandardMaterial({
      color: 0x181a1e,
      roughness: 0.85,
      metalness: 0.1
    });
    this.fadeMaterials.push(aerialMat);
    const aerialMesh = new THREE.Mesh(aerialGeo, aerialMat);
    aerialMesh.castShadow = true;
    aerialMesh.userData.isPlnAerialDrop = true;
    aerialMesh.userData.tooltipTitle = "Saluran Masuk Pelayanan PLN (NFA2X-T 2×10mm²)";
    aerialMesh.userData.tooltipDesc = "Kabel udara twisted 2-kawat dari Tiang Distribusi JTR PLN membawa daya 220V 50Hz ke kWh meter.";
    this.conduitGroup.add(aerialMesh);

    // Service Entrance Wedge Tension Dead-End Clamp (Wedge Clamp NFA2X)
    const wedgeGeo = new THREE.BoxGeometry(0.024, 0.045, 0.028);
    const wedgeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    this.fadeMaterials.push(wedgeMat);
    const wedge = new THREE.Mesh(wedgeGeo, wedgeMat);
    wedge.position.set(-0.46, 0.89, 0.08);
    wedge.rotation.z = Math.PI / 6;
    this.conduitGroup.add(wedge);

    // 1b. Service Entrance Conduit Mast & Weatherhead (Dropping to PLN Meter)
    const plnFeederGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.32, 16);
    const plnFeeder = new THREE.Mesh(plnFeederGeo, emtMat);
    plnFeeder.position.set(-0.16, 0.58, 0.01);
    plnFeeder.userData.isPlnSmartMeter = true;
    this.conduitGroup.add(plnFeeder);

    // Weatherproof service entrance weatherhead / gland
    const weatherheadGeo = new THREE.CylinderGeometry(0.022, 0.016, 0.03, 16);
    const weatherhead = new THREE.Mesh(weatherheadGeo, brassMat);
    weatherhead.position.set(-0.16, 0.74, 0.01);
    this.conduitGroup.add(weatherhead);

    // 2. Internal Conduit: PLN Meter bottom down to DDSU666 Smart Sensor
    const meterToZeGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.16, 16);
    const meterToZe = new THREE.Mesh(meterToZeGeo, emtMat);
    meterToZe.position.set(-0.16, 0.06, 0.01);
    this.conduitGroup.add(meterToZe);

    // 3. Internal Conduit: PLN Meter across to ATS Input 1 (PLN Normal)
    const meterToAtsCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.04, 0.28, 0.01),
      new THREE.Vector3(0.0, 0.28, 0.01),
      new THREE.Vector3(0.03, 0.28, 0.01)
    ]);
    const meterToAtsGeo = new THREE.TubeGeometry(meterToAtsCurve, 12, 0.011, 12, false);
    const meterToAts = new THREE.Mesh(meterToAtsGeo, emtMat);
    this.conduitGroup.add(meterToAts);

    // 4. Internal Conduit: ATS output down to AC Combiner / Distribution Panel
    const atsToCombGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.16, 16);
    const atsToComb = new THREE.Mesh(atsToCombGeo, emtMat);
    atsToComb.position.set(0.16, 0.06, 0.01);
    this.conduitGroup.add(atsToComb);

    // 5. Interconnection Conduit: AC Inverter Output from Central Inverter (X=1.95m) into ATS
    // Relative coordinates: Central Inverter AC port is at world (2.09, -0.18, -0.19)
    // In local coords of PLN board (X=1.15, Y=0.20, Z=-0.20):
    // Start at ATS right port (0.29, 0.24, 0.01) -> run down and right towards Central Inverter (0.94, -0.38, 0.01)
    const invAcInterconnectCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.29, 0.24, 0.01),
      new THREE.Vector3(0.36, 0.24, 0.01),
      new THREE.Vector3(0.42, 0.12, 0.01),
      new THREE.Vector3(0.42, -0.36, 0.01),
      new THREE.Vector3(0.55, -0.38, 0.01),
      new THREE.Vector3(0.94, -0.38, 0.01) // Directly mates to Central Inverter AC drop pipe at X=2.09m world (0 gap)
    ]);
    this.invAcConduitCurve = invAcInterconnectCurve;

    const invAcConduitGeo = new THREE.TubeGeometry(invAcInterconnectCurve, 36, 0.013, 14, false);
    this.invAcConduitMesh = new THREE.Mesh(invAcConduitGeo, emtMat);
    this.invAcConduitMesh.castShadow = true;
    this.invAcConduitMesh.userData.isAcCombiner = true;
    this.conduitGroup.add(this.invAcConduitMesh);

    // 5b. Microinverter Rooftop AC Drop Conduit (Solar Roof Trunk to AC Combiner Box)
    // Connects rooftop AC trunk at (-0.68, -0.306, 0.384) to AC Combiner Box top gland at (0.185, -0.04, 0.01)
    this.microAcConduitGroup = new THREE.Group();
    this.microAcConduitGroup.name = 'MicroAcConduitGroup';

    // Rooftop AC Transition Box (Weatherproof NEMA 4X enclosure mounted near roof eave)
    const acBoxGeo = new THREE.BoxGeometry(0.10, 0.048, 0.09);
    const acBoxMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.6 });
    this.fadeMaterials.push(acBoxMat);
    const acBox = new THREE.Mesh(acBoxGeo, acBoxMat);
    acBox.position.set(-0.68, -0.306, 0.384);
    acBox.rotation.x = 22 * (Math.PI / 180);
    acBox.userData.isAcCombiner = true;
    acBox.userData.tooltipTitle = 'Kotak Transisi AC Atap (Rooftop AC Transition Box)';
    acBox.userData.tooltipDesc = 'Titik transisi kabel rubber AC trunk dari microinverter menuju pipa konduit metalik EMT yang turun ke panel kombinator.';
    this.microAcConduitGroup.add(acBox);

    // Cable Grip Gland on left (receives Microinverter AC trunk cable)
    const gripGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.022, 16);
    const grip = new THREE.Mesh(gripGeo, brassMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(-0.73, -0.306, 0.384);
    grip.rotation.x = 22 * (Math.PI / 180);
    this.microAcConduitGroup.add(grip);

    // EMT Conduit Hub on right (starts metallic conduit run)
    const emtHub = new THREE.Mesh(gripGeo, emtMat);
    emtHub.rotation.z = Math.PI / 2;
    emtHub.position.set(-0.63, -0.306, 0.384);
    emtHub.rotation.x = 22 * (Math.PI / 180);
    this.microAcConduitGroup.add(emtHub);

    // 3D Path: Sweeping from roof transition box to AC Combiner top
    const microAcCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.62, -0.306, 0.384),
      new THREE.Vector3(-0.48, -0.22, 0.22),
      new THREE.Vector3(-0.30, -0.12, 0.02),
      new THREE.Vector3(-0.06, 0.02, 0.01),
      new THREE.Vector3(0.185, 0.02, 0.01),
      new THREE.Vector3(0.185, -0.04, 0.01) // Directly mates into Inverter AC Isolator MCB on Combiner Box
    ]);
    this.microAcConduitCurve = microAcCurve;

    const microAcGeo = new THREE.TubeGeometry(microAcCurve, 42, 0.013, 14, false);
    const microAcMesh = new THREE.Mesh(microAcGeo, emtMat);
    microAcMesh.castShadow = true;
    microAcMesh.userData.isAcCombiner = true;
    this.microAcConduitGroup.add(microAcMesh);

    // Top entry compression gland on Combiner Box
    const combGlandGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.02, 16);
    const combGland = new THREE.Mesh(combGlandGeo, brassMat);
    combGland.position.set(0.185, -0.04, 0.01);
    this.microAcConduitGroup.add(combGland);

    this.conduitGroup.add(this.microAcConduitGroup);

    // 6. RS485 Modbus Communication Conduit (DDSU666 to Inverter Comm Port)
    const rs485Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.08, -0.22, 0.02),
      new THREE.Vector3(-0.02, -0.28, 0.02),
      new THREE.Vector3(0.46, -0.28, 0.02),
      new THREE.Vector3(0.94, -0.28, 0.02)
    ]);
    this.rs485ConduitCurve = rs485Curve;

    const rs485ConduitGeo = new THREE.TubeGeometry(rs485Curve, 28, 0.006, 10, false);
    const rs485Mat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });
    this.fadeMaterials.push(rs485Mat);
    this.rs485Conduit = new THREE.Mesh(rs485ConduitGeo, rs485Mat);
    this.conduitGroup.add(this.rs485Conduit);

    // 7. Combined Solar + PLN AC Conduit entering Consumer Main Distribution Panel
    const essentialLoadsGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.11, 16);
    const essentialLoadsConduit = new THREE.Mesh(essentialLoadsGeo, emtMat);
    essentialLoadsConduit.position.set(0.16, -0.335, 0.01);
    essentialLoadsConduit.userData.isAcCombiner = true;
    this.conduitGroup.add(essentialLoadsConduit);

    // Compression coupling into Consumer Unit
    const coupGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.016, 16);
    const coupMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 });
    this.fadeMaterials.push(coupMat);
    const coup = new THREE.Mesh(coupGeo, coupMat);
    coup.position.set(0.16, -0.39, 0.01);
    this.conduitGroup.add(coup);

    // 8. Copper PE Grounding Busbar & Grounding Rod Conductor (PUIL 2011)
    const groundBarGeo = new THREE.BoxGeometry(0.18, 0.016, 0.008);
    const groundBar = new THREE.Mesh(groundBarGeo, copperMat);
    groundBar.position.set(0, -0.48, -0.06);
    this.conduitGroup.add(groundBar);

    // Copper grounding wire dropping to earth electrode
    const groundWireGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.35, 12);
    const groundWire = new THREE.Mesh(groundWireGeo, copperMat);
    groundWire.position.set(0, -0.65, -0.06);
    this.conduitGroup.add(groundWire);

    // 8b. Equipment Grounding Interconnections (Continuous PE Bonding PUIL 2011)
    // Left bonding wire: from groundBar (-0.48) curving up to roof array grounding lug
    const groundRoofCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.09, -0.48, -0.06),
      new THREE.Vector3(-0.35, -0.42, -0.02),
      new THREE.Vector3(-0.55, -0.34, 0.18),
      new THREE.Vector3(-0.68, -0.32, 0.36) // Connects to Rooftop Transition Grounding Lug
    ]);
    const groundRoofGeo = new THREE.TubeGeometry(groundRoofCurve, 24, 0.003, 8, false);
    const groundRoof = new THREE.Mesh(groundRoofGeo, copperMat);
    this.conduitGroup.add(groundRoof);

    // Right bonding wire: from groundBar (-0.48) to Central Inverter & Battery chassis lugs
    const groundEquipCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.09, -0.48, -0.06),
      new THREE.Vector3(0.45, -0.48, -0.04),
      new THREE.Vector3(0.75, -0.48, -0.02),
      new THREE.Vector3(0.94, -0.48, -0.02) // Connects to Inverter & Battery PE Bus
    ]);
    const groundEquipGeo = new THREE.TubeGeometry(groundEquipCurve, 20, 0.003, 8, false);
    const groundEquip = new THREE.Mesh(groundEquipGeo, copperMat);
    this.conduitGroup.add(groundEquip);

    // Wall mounting compression straps for conduits
    const strapGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.016, 14);
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.35 });
    this.fadeMaterials.push(strapMat);

    this.centralInvStraps = [];
    [
      { x: -0.16, y: 0.48, z: 0.01, rotZ: 0, isCentral: false },
      { x: 0.42, y: -0.12, z: 0.01, rotZ: 0, isCentral: true },
      { x: 0.65, y: -0.38, z: 0.01, rotZ: Math.PI / 2, isCentral: true },
      { x: 0.85, y: -0.38, z: 0.01, rotZ: Math.PI / 2, isCentral: true },
      { x: 0.16, y: -0.31, z: 0.01, rotZ: 0, isCentral: false }
    ].forEach((s) => {
      const strap = new THREE.Mesh(strapGeo, strapMat);
      strap.rotation.z = s.rotZ;
      strap.position.set(s.x, s.y, s.z);
      this.conduitGroup.add(strap);
      if (s.isCentral) {
        this.centralInvStraps.push(strap);
      }
    });

    // Wall mounting straps for micro AC pipe
    [-0.18, 0.06].forEach((sx) => {
      const strap = new THREE.Mesh(strapGeo, strapMat);
      strap.rotation.z = Math.PI / 2;
      strap.position.set(sx, 0.02, 0.01);
      this.microAcConduitGroup.add(strap);
    });

    this.group.add(this.conduitGroup);
  }

  /**
   * Builds the Household Consumer Main Distribution Panel (Kotak MCB Beban Rumah Tangga)
   * mounted below the AC Combiner / ATS board at Y = -0.48m.
   * Serves as the Point of Common Coupling (PCC) where PLN and Solar AC merge (Kirchhoff Law)
   * to power home appliances (Air Conditioner, Refrigerator, Lighting & Wi-Fi).
   */
  initConsumerLoadUnit(enclosureMat, darkMat, smokedMat, brassMat, emtMat) {
    this.consumerGroup = new THREE.Group();
    this.consumerGroup.position.set(0.16, -0.47, 0.01);

    // 1. Consumer Unit Main Enclosure (ABS/Polycarbonate)
    const boxW = 0.25;
    const boxH = 0.15;
    const boxD = 0.075;
    const boxGeo = new THREE.BoxGeometry(boxW, boxH, boxD);
    const boxMesh = new THREE.Mesh(boxGeo, enclosureMat);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    boxMesh.userData.isConsumerLoadUnit = true;
    boxMesh.userData.tooltipTitle = "Kotak MCB Distribusi Beban Rumah (900W)";
    boxMesh.userData.tooltipDesc = "Titik Temu Listrik (Point of Common Coupling / PCC): Daya PLTS dan Daya PLN bergabung menyuplai beban AC (600W), Kulkas (150W), dan Lampu/Wi-Fi (150W).";
    this.consumerGroup.add(boxMesh);

    // Front Trim Bezel
    const bezelGeo = new THREE.BoxGeometry(boxW + 0.01, boxH + 0.01, 0.01);
    const bezel = new THREE.Mesh(bezelGeo, darkMat);
    bezel.position.set(0, 0, boxD / 2);
    this.consumerGroup.add(bezel);

    // 2. Tinted Smoked Acrylic Inspection Window
    const winGeo = new THREE.BoxGeometry(0.19, 0.08, 0.016);
    const winMesh = new THREE.Mesh(winGeo, smokedMat);
    winMesh.position.set(0, 0.008, boxD / 2 + 0.006);
    winMesh.userData.isConsumerLoadUnit = true;
    this.consumerGroup.add(winMesh);

    // 3. Steel DIN Rail Inside Panel
    const dinGeo = new THREE.BoxGeometry(0.18, 0.015, 0.004);
    const dinMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    this.fadeMaterials.push(dinMat);
    const dinRail = new THREE.Mesh(dinGeo, dinMat);
    dinRail.position.set(0, 0.008, boxD / 2 - 0.01);
    this.consumerGroup.add(dinRail);

    // 4. Three Miniature Circuit Breakers (MCB 1P C10, C6, C4)
    this.loadCircuitLeds = [];
    const mcbW = 0.018;
    const mcbH = 0.046;
    const mcbD = 0.024;
    const mcbGeo = new THREE.BoxGeometry(mcbW, mcbH, mcbD);
    const mcbMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.1 });
    this.fadeMaterials.push(mcbMat);

    const toggleGeo = new THREE.BoxGeometry(0.007, 0.012, 0.01);
    const toggleMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.3 });
    this.fadeMaterials.push(toggleMat);

    const ledGeo = new THREE.SphereGeometry(0.0035, 12, 12);
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 2.2,
      roughness: 0.2
    });
    this.fadeMaterials.push(ledMat);
    this.loadLedMat = ledMat;

    this.circuitSwitches = [];
    this.loadCircuitLeds = [];

    const circuitDefs = [
      { name: 'AC (600W)', x: -0.05 },
      { name: 'Kulkas (150W)', x: 0.0 },
      { name: 'Lampu/Wi-Fi (150W)', x: 0.05 }
    ];

    circuitDefs.forEach((c, idx) => {
      // MCB body
      const mcb = new THREE.Mesh(mcbGeo, mcbMat);
      mcb.position.set(c.x, 0.008, boxD / 2);
      mcb.userData.isMcbToggle = true;
      mcb.userData.circuitIndex = idx;
      this.consumerGroup.add(mcb);

      // MCB toggle lever (ON position)
      const toggle = new THREE.Mesh(toggleGeo, toggleMat);
      toggle.position.set(c.x, 0.014, boxD / 2 + mcbD / 2);
      toggle.userData.isMcbToggle = true;
      toggle.userData.circuitIndex = idx;
      this.consumerGroup.add(toggle);
      this.circuitSwitches.push(toggle);

      // Active Circuit LED Status Light (Individual material for per-circuit control)
      const indLedMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 2.2,
        roughness: 0.2
      });
      this.fadeMaterials.push(indLedMat);
      const led = new THREE.Mesh(ledGeo, indLedMat);
      led.position.set(c.x, 0.034, boxD / 2 + 0.004);
      this.consumerGroup.add(led);
      this.loadCircuitLeds.push({ mesh: led, mat: indLedMat, active: true });
    });

    // 5. Three Bottom Branch Conduits (Feeding AC, Refrigerator, Lighting/Wi-Fi)
    this.loadBranchCurves = [];
    const inGlandGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.014, 16);
    const branchOffsets = [-0.06, 0.0, 0.06];

    branchOffsets.forEach((bx, idx) => {
      // Gland on bottom
      const bGland = new THREE.Mesh(inGlandGeo, brassMat);
      bGland.position.set(bx, -boxH / 2 - 0.007, 0);
      this.consumerGroup.add(bGland);

      // Branch conduit curve dropping into building
      const spreadX = (idx - 1) * 0.04;
      const bCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.16 + bx, -0.47 - boxH / 2 - 0.014, 0.01),
        new THREE.Vector3(0.16 + bx + spreadX * 0.5, -0.62, 0.01),
        new THREE.Vector3(0.16 + bx + spreadX, -0.74, 0.01)
      ]);
      this.loadBranchCurves.push(bCurve);

      const bGeo = new THREE.TubeGeometry(bCurve, 16, 0.008, 12, false);
      const bMesh = new THREE.Mesh(bGeo, emtMat);
      bMesh.castShadow = true;
      bMesh.userData.isConsumerUnit = true;
      this.group.add(bMesh);
    });

    this.group.add(this.consumerGroup);
  }

  /**
   * Sets individual branch circuit breaker state and indicator LED (Load Shedding)
   */
  setCircuitState(index, active) {
    if (this.circuitSwitches && this.circuitSwitches[index]) {
      const toggle = this.circuitSwitches[index];
      // Animate lever: ON (Y = 0.014, rot.x = 0) vs OFF (Y = 0.005, rot.x = 0.5)
      gsap.to(toggle.position, {
        y: active ? 0.014 : 0.005,
        duration: 0.25,
        ease: 'power2.out'
      });
      gsap.to(toggle.rotation, {
        x: active ? 0 : 0.45,
        duration: 0.25,
        ease: 'power2.out'
      });
    }

    if (this.loadCircuitLeds && this.loadCircuitLeds[index]) {
      const ledItem = this.loadCircuitLeds[index];
      ledItem.active = active;
      if (active) {
        ledItem.mat.color.setHex(0x10b981);
        ledItem.mat.emissive.setHex(0x10b981);
        ledItem.mat.emissiveIntensity = 2.2;
      } else {
        ledItem.mat.color.setHex(0x334155);
        ledItem.mat.emissive.setHex(0x000000);
        ledItem.mat.emissiveIntensity = 0.0;
      }
    }
  }

  /**
   * Switches grid operational mode: 'ongrid' (PLN Normal) vs 'offgrid' (EPS Islanded Backup)
   */
  setGridMode(mode) {
    this.gridMode = mode;
    const isOffGrid = (mode === 'offgrid');

    // 1. Update PLN Smart Meter LCD screen texture (Blackout 0V warning vs normal AMI)
    if (this.plnMeterTex && this.plnMeterTex.updateScreen) {
      this.plnMeterTex.updateScreen(mode);
    }

    // 2. Update ATS Switch faceplate texture (Posisi I PLN vs Posisi II EPS)
    if (this.atsFaceTex && this.atsFaceTex.updateScreen) {
      this.atsFaceTex.updateScreen(mode);
    }

    // 3. Mechanically throw ATS changeover lever arm
    if (this.atsLeverGroup) {
      // Position I (PLN Grid Normal: -25 deg / -0.44 rad) vs Position II (EPS Islanded: +25 deg / +0.44 rad)
      const targetRot = isOffGrid ? 0.44 : -0.44;
      gsap.to(this.atsLeverGroup.rotation, {
        z: targetRot,
        duration: 0.6,
        ease: 'back.out(1.8)'
      });
    }

    // 4. Update ATS indication LEDs
    if (this.atsPlnLedMat && this.atsEpsLedMat) {
      if (isOffGrid) {
        // PLN is blacked out / isolated
        this.atsPlnLedMat.opacity = 0.10;
        this.atsEpsLedMat.opacity = 0.95;
      } else {
        // PLN is healthy & synced
        this.atsPlnLedMat.opacity = 0.95;
        this.atsEpsLedMat.opacity = 0.15;
      }
    }

    // 5. Pulse PLN calibration LED only when on-grid (completely dark when off-grid blackout)
    if (this.plnPulseLedMat) {
      this.plnPulseLedMat.opacity = isOffGrid ? 0.0 : 0.95;
    }
  }

  /**
   * Reconfigures electrical conduits based on active inverter architecture ('micro' vs 'central')
   */
  setInverterMode(mode) {
    this.inverterMode = mode;
    const isCentral = (mode === 'central');

    if (this.microAcConduitGroup) {
      this.microAcConduitGroup.visible = !isCentral;
    }
    if (this.invAcConduitMesh) {
      this.invAcConduitMesh.visible = isCentral;
    }
    if (this.rs485Conduit) {
      this.rs485Conduit.visible = isCentral;
    }
    if (this.centralInvStraps) {
      this.centralInvStraps.forEach(s => s.visible = isCentral);
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
}
