import * as THREE from 'three';
import {
  createSolarCellTexture,
  createSolarCellNormalMap,
  createBrushedAluminumTexture,
  createBacksheetTexture,
  createEVATexture,
  createEVANormalMap,
  createMicroinverterPlateTexture
} from '../textures/solarTextures.js';

/**
 * SolarPanelModel - Procedurally creates the 8 photorealistic components of a residential solar panel system.
 * Contains assembled and exploded vertical (Y-axis) coordinates for smooth transitions.
 */
export class SolarPanelModel {
  constructor() {
    this.group = new THREE.Group();
    this.layers = [];

    // Panel overall dimensions (Tier-1 108-Cell M10 Residential Module: 1722mm x 1134mm x 35mm)
    this.panelWidth = 1.134;
    this.panelLength = 1.722;
    this.frameThickness = 0.035;
    this.frameWidth = 0.030;

    // Separation configuration along vertical Y-axis
    // Start Frame: Assembled (close contact)
    // End Frame: Exploded diagram (floating cleanly with equal visual hierarchy)
    this.layerConfigs = [
      { id: 'frame', name: '1. Aluminum Frame', assembledY: 0.0, explodedY: 0.85 },
      { id: 'glass', name: '2. Tempered Glass Sheet', assembledY: 0.012, explodedY: 0.58 },
      { id: 'topEva', name: '3. Top EVA Encapsulant', assembledY: 0.006, explodedY: 0.30 },
      { id: 'cells', name: '4. Silicon Solar Cells & Busbars', assembledY: 0.0, explodedY: 0.0 },
      { id: 'bottomEva', name: '5. Bottom EVA Encapsulant', assembledY: -0.006, explodedY: -0.30 },
      { id: 'backsheet', name: '6. Tedlar Backsheet', assembledY: -0.012, explodedY: -0.58 },
      { id: 'jbox', name: '7. Junction Box & MC4 Cables', assembledY: -0.038, explodedY: -0.88 },
      { id: 'inverter', name: '8. Microinverter & AC Trunk (MLPE)', assembledY: -0.09, explodedY: -1.18 }
    ];

    // Authentic residential rooftop installation tilt angle (~22°)
    // Tilts the top/rear of the panel upward so both the front cells and rear MLPE microinverter
    // are naturally visible from 3/4 perspective
    this.tiltAngle = THREE.MathUtils.degToRad(22);
    this.group.rotation.x = this.tiltAngle;
    this.group.position.set(0, 0.08, 0);

    this.initTextures();
    this.buildLayers();
  }

  setTiltAngle(angleDeg) {
    this.tiltAngle = THREE.MathUtils.degToRad(angleDeg);
    this.group.rotation.x = this.tiltAngle;
  }

  initTextures() {
    this.cellTexture = createSolarCellTexture();
    this.cellNormalMap = createSolarCellNormalMap();
    this.aluminumTexture = createBrushedAluminumTexture();
    this.backsheetTexture = createBacksheetTexture();
    this.evaTexture = createEVATexture();
    this.evaNormalMap = createEVANormalMap();
  }

  buildLayers() {
    // 1. Aluminum Frame
    const frameMesh = this.createAluminumFrame();
    this.registerLayer('frame', frameMesh);

    // 2. Tempered Glass Sheet
    const glassMesh = this.createTemperedGlass();
    this.registerLayer('glass', glassMesh);

    // 3. Top EVA Film Encapsulant
    const topEvaMesh = this.createEVAFilm('top');
    this.registerLayer('topEva', topEvaMesh);

    // 4. Matrix of Silicon Solar Cells (60 cells) with Silver Busbars & Interconnects
    const cellMatrixGroup = this.createSolarCellMatrix();
    this.registerLayer('cells', cellMatrixGroup);

    // 5. Bottom EVA Film Encapsulant
    const bottomEvaMesh = this.createEVAFilm('bottom');
    this.registerLayer('bottomEva', bottomEvaMesh);

    // 6. Tedlar Backsheet
    const backsheetMesh = this.createTedlarBacksheet();
    this.registerLayer('backsheet', backsheetMesh);

    // 7. Junction Box attached underneath
    const jboxGroup = this.createJunctionBox();
    this.registerLayer('jbox', jboxGroup);

    // 8. Microinverter & AC Trunk (MLPE) attached beneath
    const inverterGroup = this.createMicroinverter();
    this.registerLayer('inverter', inverterGroup);
  }

  registerLayer(id, object3D) {
    const config = this.layerConfigs.find(c => c.id === id);
    const layerData = {
      id: config.id,
      name: config.name,
      object: object3D,
      assembledY: config.assembledY,
      explodedY: config.explodedY,
      currentY: config.assembledY,
      targetY: config.assembledY
    };

    object3D.position.y = config.assembledY;
    this.group.add(object3D);
    this.layers.push(layerData);
  }

  /**
   * 1. Extruded Aluminum Frame with 45° corner miters, drainage weep slots, and inner lip channel.
   */
  createAluminumFrame() {
    const frameGroup = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xdde2ea,
      metalness: 0.94,
      roughness: 0.24,
      map: this.aluminumTexture,
      roughnessMap: this.aluminumTexture,
      envMapIntensity: 2.2
    });

    const W = this.panelWidth;
    const L = this.panelLength;
    const fw = this.frameWidth;
    const fh = this.frameThickness;

    // Frame rail profiles: Top, Bottom, Left, Right
    // Left & Right rails (along Z-axis)
    const lrGeo = new THREE.BoxGeometry(fw, fh, L);
    const leftRail = new THREE.Mesh(lrGeo, mat);
    leftRail.position.set(-(W / 2 - fw / 2), 0, 0);
    leftRail.castShadow = true;
    leftRail.receiveShadow = true;

    const rightRail = new THREE.Mesh(lrGeo, mat);
    rightRail.position.set(W / 2 - fw / 2, 0, 0);
    rightRail.castShadow = true;
    rightRail.receiveShadow = true;

    // Top & Bottom rails (along X-axis)
    const tbGeo = new THREE.BoxGeometry(W - fw * 2, fh, fw);
    const topRail = new THREE.Mesh(tbGeo, mat);
    topRail.position.set(0, 0, -(L / 2 - fw / 2));
    topRail.castShadow = true;
    topRail.receiveShadow = true;

    const bottomRail = new THREE.Mesh(tbGeo, mat);
    bottomRail.position.set(0, 0, L / 2 - fw / 2);
    bottomRail.castShadow = true;
    bottomRail.receiveShadow = true;

    // Inner holding lip channel (where laminate glass rests)
    const lipMat = new THREE.MeshStandardMaterial({
      color: 0xa8b0bc,
      metalness: 0.92,
      roughness: 0.32
    });
    const lipThickness = 0.005;
    const lipWidth = 0.012;

    const lipLRGeo = new THREE.BoxGeometry(lipWidth, lipThickness, L - fw * 2);
    const lipLeft = new THREE.Mesh(lipLRGeo, lipMat);
    lipLeft.position.set(-(W / 2 - fw - lipWidth / 2), 0.008, 0);

    const lipRight = new THREE.Mesh(lipLRGeo, lipMat);
    lipRight.position.set(W / 2 - fw - lipWidth / 2, 0.008, 0);

    // 45° Corner Miter Joint Seams (Authentic hairline factory joint)
    const miterMat = new THREE.MeshBasicMaterial({ color: 0x3a404a });
    const miterGeo = new THREE.BoxGeometry(0.001, fh * 1.02, fw * 1.414);

    const cornerConfigs = [
      { x: -W / 2 + fw / 2, z: -L / 2 + fw / 2, rot: Math.PI / 4 },
      { x: W / 2 - fw / 2, z: -L / 2 + fw / 2, rot: -Math.PI / 4 },
      { x: -W / 2 + fw / 2, z: L / 2 - fw / 2, rot: -Math.PI / 4 },
      { x: W / 2 - fw / 2, z: L / 2 - fw / 2, rot: Math.PI / 4 }
    ];

    cornerConfigs.forEach(cfg => {
      const miter = new THREE.Mesh(miterGeo, miterMat);
      miter.position.set(cfg.x, 0, cfg.z);
      miter.rotation.y = cfg.rot;
      frameGroup.add(miter);
    });

    // CNC Water Drainage Weep Holes (slots at outer edge of frame near corners to prevent pooling)
    const weepGeo = new THREE.BoxGeometry(0.008, 0.004, 0.03);
    const weepMat = new THREE.MeshBasicMaterial({ color: 0x1e2229 });

    [-W / 2 + fw * 0.1, W / 2 - fw * 0.1].forEach(wx => {
      [-L / 2 + 0.12, L / 2 - 0.12].forEach(wz => {
        const weep = new THREE.Mesh(weepGeo, weepMat);
        weep.position.set(wx, fh * 0.2, wz);
        frameGroup.add(weep);
      });
    });

    // Rear Mounting Oval Slots (Standard 9x14mm slots on bottom flange)
    const slotGeo = new THREE.CylinderGeometry(0.0045, 0.0045, fh * 1.1, 16);
    const slotMat = new THREE.MeshBasicMaterial({ color: 0x181a1f });
    [-0.43, -0.20, 0.20, 0.43].forEach((zOff) => {
      [-W / 2 + fw / 2, W / 2 - fw / 2].forEach((xOff) => {
        const slot = new THREE.Mesh(slotGeo, slotMat);
        slot.position.set(xOff, 0, zOff);
        slot.scale.set(1.0, 1.0, 1.6); // Oval elongation
        frameGroup.add(slot);
      });
    });

    // Grounding Indicator Symbol hole
    const groundGeo = new THREE.CylinderGeometry(0.003, 0.003, fh * 1.1, 16);
    const groundHole = new THREE.Mesh(groundGeo, slotMat);
    groundHole.position.set(-W / 2 + fw / 2, 0, L / 2 - 0.08);
    frameGroup.add(groundHole);

    frameGroup.add(leftRail, rightRail, topRail, bottomRail, lipLeft, lipRight);
    return frameGroup;
  }

  /**
   * 2. Tempered Glass Sheet - Low-iron ultra-clear solar glass with authentic emerald-cyan safety edges and thin-film AR iridescence.
   */
  createTemperedGlass() {
    const glassGroup = new THREE.Group();
    const W = this.panelWidth - this.frameWidth * 1.2;
    const L = this.panelLength - this.frameWidth * 1.2;
    const thickness = 0.0035; // 3.5mm solar tempered glass

    // Main low-iron solar glass pane
    const geo = new THREE.BoxGeometry(W, thickness, L);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xf4f9ff,
      transmission: 0.98,
      opacity: 1.0,
      transparent: true,
      roughness: 0.015,
      metalness: 0.0,
      ior: 1.52, // Standard low-iron solar glass
      thickness: 0.005,
      attenuationColor: new THREE.Color(0xdbeafe),
      attenuationDistance: 0.45,
      // Anti-Reflective (AR) Coating Thin-Film Iridescence
      iridescence: 0.9,
      iridescenceIOR: 1.33,
      iridescenceThicknessRange: [120, 360],
      reflectivity: 0.75,
      clearcoat: 1.0,
      clearcoatRoughness: 0.01,
      envMapIntensity: 3.0,
      depthWrite: false
    });

    const mainPane = new THREE.Mesh(geo, mat);
    mainPane.castShadow = true;
    mainPane.receiveShadow = true;
    glassGroup.add(mainPane);

    // Authentic Emerald/Cyan Refractive Polished Edge Trim (distinct signature of thick tempered glass)
    const edgeTrimMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.2,
      transmission: 0.75,
      roughness: 0.06,
      ior: 1.52,
      thickness: 0.008,
      transparent: true,
      opacity: 0.9
    });

    const ew = 0.006;
    // Left & Right glass edges
    const edgeLRGeo = new THREE.BoxGeometry(ew, thickness * 1.01, L);
    const leftEdge = new THREE.Mesh(edgeLRGeo, edgeTrimMat);
    leftEdge.position.set(-W / 2 + ew / 2, 0, 0);
    const rightEdge = new THREE.Mesh(edgeLRGeo, edgeTrimMat);
    rightEdge.position.set(W / 2 - ew / 2, 0, 0);

    // Top & Bottom glass edges
    const edgeTBGeo = new THREE.BoxGeometry(W - ew * 2, thickness * 1.01, ew);
    const topEdge = new THREE.Mesh(edgeTBGeo, edgeTrimMat);
    topEdge.position.set(0, 0, -L / 2 + ew / 2);
    const bottomEdge = new THREE.Mesh(edgeTBGeo, edgeTrimMat);
    bottomEdge.position.set(0, 0, L / 2 - ew / 2);

    glassGroup.add(leftEdge, rightEdge, topEdge, bottomEdge);

    // Beveled glass edge highlight
    const edgeGeo = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7
    });
    const edgeLines = new THREE.LineSegments(edgeGeo, lineMat);
    glassGroup.add(edgeLines);

    return glassGroup;
  }

  /**
   * 3 & 5. EVA Film Encapsulant (Ethylene Vinyl Acetate).
   * Embossed diamond waffle micro-pyramid texture to distinguish flexible polymer from rigid glass.
   */
  createEVAFilm(type) {
    const evaGroup = new THREE.Group();
    const W = this.panelWidth - this.frameWidth * 1.25;
    const L = this.panelLength - this.frameWidth * 1.25;
    const thickness = 0.0015;

    const geo = new THREE.BoxGeometry(W, thickness, L);
    const isTop = type === 'top';

    const mat = new THREE.MeshPhysicalMaterial({
      color: isTop ? 0xf8fafc : 0xf1f5f9,
      transmission: isTop ? 0.72 : 0.60,
      roughness: isTop ? 0.38 : 0.45,
      metalness: 0.0,
      ior: 1.48,
      transparent: true,
      opacity: isTop ? 0.82 : 0.88,
      map: this.evaTexture,
      normalMap: this.evaNormalMap,
      normalScale: new THREE.Vector2(1.6, 1.6),
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    evaGroup.add(mesh);

    // Subtle technical perimeter seam line (shows it's a cut polymer sheet)
    const seamGeo = new THREE.EdgesGeometry(geo);
    const seamMat = new THREE.LineBasicMaterial({
      color: isTop ? 0x94a3b8 : 0xcbd5e1,
      transparent: true,
      opacity: 0.5
    });
    const seamLines = new THREE.LineSegments(seamGeo, seamMat);
    evaGroup.add(seamLines);

    return evaGroup;
  }

  /**
   * 4. Matrix of Silicon Solar Cells (60 cells: 6 cols x 10 rows).
   * Monocrystalline wafers with chamfered corners, silver busbars, and interconnect ribbons.
   */
  createSolarCellMatrix() {
    const group = new THREE.Group();

    const cols = 6;
    const rows = 10;
    const cellWidth = 0.174;
    const cellLength = 0.158;
    const gapX = 0.004;
    const gapZ = 0.004;

    const totalW = cols * cellWidth + (cols - 1) * gapX;
    const totalL = rows * cellLength + (rows - 1) * gapZ;

    const startX = -totalW / 2 + cellWidth / 2;
    const startZ = -totalL / 2 + cellLength / 2;

    this.cellMat = new THREE.MeshPhysicalMaterial({
      map: this.cellTexture,
      normalMap: this.cellNormalMap,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughness: 0.16,
      metalness: 0.42,
      clearcoat: 0.5,
      clearcoatRoughness: 0.06,
      envMapIntensity: 2.4
    });
    const cellMat = this.cellMat;

    const cellGeo = new THREE.PlaneGeometry(cellWidth, cellLength);
    cellGeo.rotateX(-Math.PI / 2); // Lay flat on X-Z plane

    // Highly Polished Silver Interconnect Ribbons (linking cells in strings)
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0xf4f8fc,
      metalness: 0.98,
      roughness: 0.12,
      envMapIntensity: 2.5
    });

    const ribbonGeo = new THREE.BoxGeometry(0.0018, 0.0006, cellLength + gapZ);

    for (let c = 0; c < cols; c++) {
      const x = startX + c * (cellWidth + gapX);
      for (let r = 0; r < rows; r++) {
        const z = startZ + r * (cellLength + gapZ);

        // Individual cell mesh
        const cell = new THREE.Mesh(cellGeo, cellMat);
        cell.position.set(x, 0, z);
        cell.castShadow = true;
        cell.receiveShadow = true;
        group.add(cell);

        // Interconnect silver busbar ribbons (5 busbars per cell)
        const busbarOffsets = [-0.066, -0.033, 0.0, 0.033, 0.066];
        busbarOffsets.forEach((bOff) => {
          const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
          ribbon.position.set(x + bOff, 0.0004, z);
          group.add(ribbon);
        });
      }

      // String Cross-Bussing ribbons at top and bottom ends
      const crossRibbonGeo = new THREE.BoxGeometry(cellWidth * 0.92, 0.0008, 0.004);
      const topCross = new THREE.Mesh(crossRibbonGeo, ribbonMat);
      topCross.position.set(x, 0.0006, startZ - cellLength / 2);
      group.add(topCross);

      const bottomCross = new THREE.Mesh(crossRibbonGeo, ribbonMat);
      bottomCross.position.set(x, 0.0006, startZ + (rows - 1) * (cellLength + gapZ) + cellLength / 2);
      group.add(bottomCross);
    }

    return group;
  }

  /**
   * 6. Tedlar Backsheet (PVF / PET composite barrier).
   * Features 4 precision CNC ribbon feedthrough slits with flat copper bussing ribbons.
   */
  createTedlarBacksheet() {
    const backsheetGroup = new THREE.Group();
    const W = this.panelWidth - this.frameWidth * 1.25;
    const L = this.panelLength - this.frameWidth * 1.25;
    const thickness = 0.002;

    const geo = new THREE.BoxGeometry(W, thickness, L);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.05,
      map: this.backsheetTexture,
      roughnessMap: this.backsheetTexture,
      envMapIntensity: 0.9
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    backsheetGroup.add(mesh);

    // 4 CNC Feedthrough Slits for internal bussing ribbons
    const slitMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const slitGeo = new THREE.BoxGeometry(0.0025, thickness * 1.2, 0.018);

    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.95,
      roughness: 0.22,
      envMapIntensity: 1.8
    });
    const copperGeo = new THREE.BoxGeometry(0.002, 0.008, 0.014);

    const slitPositions = [-0.045, -0.015, 0.015, 0.045];
    slitPositions.forEach((sx) => {
      // Black rectangular slit cut in backsheet
      const slit = new THREE.Mesh(slitGeo, slitMat);
      slit.position.set(sx, 0, -0.45);
      backsheetGroup.add(slit);

      // Flat copper ribbon tab protruding through to underneath
      const copperTab = new THREE.Mesh(copperGeo, copperMat);
      copperTab.position.set(sx, -0.004, -0.45);
      backsheetGroup.add(copperTab);
    });

    return backsheetGroup;
  }

  /**
   * 7. Junction Box & MC4 Solar Output Cables attached underneath.
   */
  createJunctionBox() {
    const jboxGroup = new THREE.Group();

    // Box enclosure (IP68 black polycarbonate)
    const boxW = 0.15;
    const boxL = 0.14;
    const boxH = 0.032;

    const boxGeo = new THREE.BoxGeometry(boxW, boxH, boxL);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x16181b,
      roughness: 0.38,
      metalness: 0.18,
      envMapIntensity: 1.2
    });

    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, -boxH / 2, -0.45);
    box.castShadow = true;
    box.receiveShadow = true;
    jboxGroup.add(box);

    // 4 Copper Ribbon Terminal Clamps entering top of junction box
    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.95,
      roughness: 0.22
    });
    const terminalGeo = new THREE.BoxGeometry(0.003, 0.006, 0.014);
    [-0.045, -0.015, 0.015, 0.045].forEach(tx => {
      const term = new THREE.Mesh(terminalGeo, copperMat);
      term.position.set(tx, 0.003, -0.45);
      jboxGroup.add(term);
    });

    // 3 Bypass Diodes mounted between terminal poles
    const diodeGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.024, 12);
    const diodeMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.3 });
    [-0.03, 0.0, 0.03].forEach(dx => {
      const diode = new THREE.Mesh(diodeGeo, diodeMat);
      diode.rotation.z = Math.PI / 2;
      diode.position.set(dx, -0.008, -0.45);
      jboxGroup.add(diode);
    });

    // Heatsink cooling fins on the box cover
    const finMat = new THREE.MeshStandardMaterial({
      color: 0x22252a,
      roughness: 0.32,
      metalness: 0.35
    });
    for (let f = -3; f <= 3; f++) {
      const finGeo = new THREE.BoxGeometry(boxW * 0.86, 0.005, 0.006);
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.set(0, -boxH - 0.002, -0.45 + f * 0.015);
      jboxGroup.add(fin);
    }

    // Two Cable Glands with Hex Nut Threading & Strain Relief Ribs
    const glandMat = new THREE.MeshStandardMaterial({
      color: 0x101114,
      roughness: 0.32,
      metalness: 0.22
    });

    const glandGeo = new THREE.CylinderGeometry(0.01, 0.012, 0.024, 16);
    const collarGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.006, 6); // Hex nut

    [-0.045, 0.045].forEach((gx) => {
      const gland = new THREE.Mesh(glandGeo, glandMat);
      gland.rotation.x = Math.PI / 2;
      gland.position.set(gx, -boxH / 2, -0.45 + boxL / 2 + 0.012);
      jboxGroup.add(gland);

      const collar = new THREE.Mesh(collarGeo, glandMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(gx, -boxH / 2, -0.45 + boxL / 2 + 0.004);
      jboxGroup.add(collar);
    });

    // Cable groups for Microinverter vs Central Inverter architecture
    this.jboxMicroCables = new THREE.Group();
    this.jboxCentralCables = new THREE.Group();
    this.jboxCentralCables.visible = false;
    jboxGroup.add(this.jboxMicroCables);
    this.group.add(this.jboxCentralCables); // Add to panel group so cables don't move rigidly with jboxGroup

    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x181a1e,
      roughness: 0.52,
      metalness: 0.08
    });
    const mc4Mat = new THREE.MeshStandardMaterial({
      color: 0x141619,
      roughness: 0.32,
      metalness: 0.25
    });
    const clipMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 });

    // 1. Cables routing to rooftop Microinverter (at Z = +0.06m)
    const createMicroCable = (startX, isPositive) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(startX, -boxH / 2, -0.45 + boxL / 2 + 0.02),
        new THREE.Vector3(startX * 1.3, -boxH * 1.4, -0.45 + boxL / 2 + 0.10),
        new THREE.Vector3(startX * 1.8, -boxH * 1.8, -0.45 + boxL / 2 + 0.22),
        new THREE.Vector3(startX * 1.4, -boxH * 1.6, -0.45 + boxL / 2 + 0.34),
        new THREE.Vector3(startX * 1.1, -boxH * 1.2, -0.45 + boxL / 2 + 0.44)
      ]);

      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.0055, 12, false);
      const cable = new THREE.Mesh(tubeGeo, cableMat);
      cable.castShadow = true;
      this.jboxMicroCables.add(cable);

      const bandMat = new THREE.MeshStandardMaterial({
        color: isPositive ? 0xd92626 : 0x2563eb,
        roughness: 0.35,
        metalness: 0.1
      });
      const bandGeo = new THREE.CylinderGeometry(0.0062, 0.0062, 0.018, 16);
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.copy(curve.getPointAt(0.28));
      band.rotation.x = Math.PI / 2;
      this.jboxMicroCables.add(band);

      const mc4EndPos = curve.getPointAt(1.0);
      const mc4Geo = new THREE.CylinderGeometry(0.009, 0.009, 0.048, 16);
      const mc4 = new THREE.Mesh(mc4Geo, mc4Mat);
      mc4.position.copy(mc4EndPos);
      mc4.rotation.x = Math.PI / 2;
      mc4.castShadow = true;
      this.jboxMicroCables.add(mc4);

      const clipGeo = new THREE.BoxGeometry(0.004, 0.004, 0.02);
      const clip = new THREE.Mesh(clipGeo, clipMat);
      clip.position.set(mc4EndPos.x, mc4EndPos.y + 0.008, mc4EndPos.z);
      this.jboxMicroCables.add(clip);
    };

    createMicroCable(-0.045, true);  // Positive (+)
    createMicroCable(0.045, false);  // Negative (-)

    // 2. Cables routing to Rooftop Transition Box (Soladeck) at module edge (X = +0.535m)
    // Dynamic Spline: Continuously bridges between moving JBox and fixed Soladeck box
    this.centralCableMeshes = [];
    const createCentralCable = (startX, isPositive) => {
      const zOffset = isPositive ? -0.012 : 0.012;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(startX, -0.054, -0.368),
        new THREE.Vector3(startX + 0.08, -0.075, -0.34 + zOffset),
        new THREE.Vector3(0.24, -0.065, -0.32 + zOffset),
        new THREE.Vector3(0.40, -0.045, -0.31 + zOffset),
        new THREE.Vector3(0.535, -0.038, -0.31 + zOffset)
      ]);

      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.0055, 12, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, cableMat);
      tubeMesh.castShadow = true;
      this.jboxCentralCables.add(tubeMesh);

      const bandMat = new THREE.MeshStandardMaterial({
        color: isPositive ? 0xd92626 : 0x2563eb,
        roughness: 0.35,
        metalness: 0.1
      });
      const bandGeo = new THREE.CylinderGeometry(0.0062, 0.0062, 0.018, 16);
      const bandMesh = new THREE.Mesh(bandGeo, bandMat);
      bandMesh.position.copy(curve.getPointAt(0.30));
      bandMesh.rotation.z = Math.PI / 2;
      this.jboxCentralCables.add(bandMesh);

      const mc4EndPos = curve.getPointAt(1.0);
      const mc4Geo = new THREE.CylinderGeometry(0.009, 0.009, 0.048, 16);
      const mc4Mesh = new THREE.Mesh(mc4Geo, mc4Mat);
      mc4Mesh.position.copy(mc4EndPos);
      mc4Mesh.rotation.z = Math.PI / 2;
      mc4Mesh.castShadow = true;
      this.jboxCentralCables.add(mc4Mesh);

      this.centralCableMeshes.push({
        startX,
        isPositive,
        tubeMesh,
        bandMesh,
        mc4Mesh
      });
    };

    createCentralCable(-0.045, true);  // Positive (+)
    createCentralCable(0.045, false);  // Negative (-)

    this.updateCentralCables(-0.038);

    return jboxGroup;
  }

  /**
   * 8. Module-Level Power Electronics (MLPE) - Enphase-Style Microinverter & AC Trunk
   * High-detail die-cast natural aluminum enclosure, heatsink cooling fins,
   * laser-etched specification plate, pulsing status LED, DC MC4 input pigtails,
   * and heavy-duty AC trunk cable.
   */
  createMicroinverter() {
    const inverterGroup = new THREE.Group();
    this.inverterGroup = inverterGroup;

    // The microinverter is positioned downstream of the junction box in Z space
    // Junction box is at Z = -0.45; MC4 cable ends extend to Z = +0.06
    const invX = 0;
    const invY = 0;
    const invZ = 0.16;

    // Materials
    const castAlumMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.35
    });

    const darkAlumMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.75,
      roughness: 0.42
    });

    const steelBoltMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.92,
      roughness: 0.22
    });

    const rubberCableMat = new THREE.MeshStandardMaterial({
      color: 0x15181c,
      metalness: 0.08,
      roughness: 0.58
    });

    // 1. Main Die-Cast Aluminum Enclosure Body
    const bodyW = 0.25;
    const bodyH = 0.038;
    const bodyL = 0.17;
    const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyL);
    const bodyMesh = new THREE.Mesh(bodyGeo, castAlumMat);
    bodyMesh.position.set(invX, invY, invZ);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    inverterGroup.add(bodyMesh);

    // Top Perimeter Cast Bezel
    const bezelGeo = new THREE.BoxGeometry(bodyW + 0.01, 0.006, bodyL + 0.01);
    const bezelMesh = new THREE.Mesh(bezelGeo, darkAlumMat);
    bezelMesh.position.set(invX, invY + bodyH / 2 - 0.003, invZ);
    inverterGroup.add(bezelMesh);

    // 2. Extruded Heatsink Cooling Fin Array (12 parallel fins on top)
    const finCount = 12;
    const finW = 0.0035;
    const finH = 0.018;
    const finL = bodyL - 0.016;
    const finSpacing = (bodyW - 0.05) / (finCount - 1);
    const startFinX = - (bodyW - 0.05) / 2;

    const finGeo = new THREE.BoxGeometry(finW, finH, finL);
    for (let i = 0; i < finCount; i++) {
      const fx = startFinX + i * finSpacing;
      if (Math.abs(fx) < 0.042) continue; // Spec plate cutout

      const finMesh = new THREE.Mesh(finGeo, castAlumMat);
      finMesh.position.set(fx, invY + bodyH / 2 + finH / 2, invZ);
      finMesh.castShadow = true;
      inverterGroup.add(finMesh);
    }

    // 3. Laser-Etched Nameplate Specification Plate
    const plateGeo = new THREE.PlaneGeometry(0.11, 0.065);
    const plateTex = createMicroinverterPlateTexture();
    const plateMat = new THREE.MeshStandardMaterial({
      map: plateTex,
      roughness: 0.35,
      metalness: 0.65
    });
    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    plateMesh.position.set(invX, invY + bodyH / 2 + 0.001, invZ);
    plateMesh.rotation.x = -Math.PI / 2;
    inverterGroup.add(plateMesh);

    // 4. Mounting Flange Ears & Rail Attachment Hardware (left & right)
    [-1, 1].forEach((dir) => {
      const earW = 0.045;
      const earH = 0.009;
      const earL = 0.12;
      const earGeo = new THREE.BoxGeometry(earW, earH, earL);
      const earMesh = new THREE.Mesh(earGeo, castAlumMat);
      earMesh.position.set(invX + dir * (bodyW / 2 + earW / 2), invY + bodyH / 2 - earH / 2, invZ);
      inverterGroup.add(earMesh);

      // Slotted bolt hole (inner cutout visual)
      const slotGeo = new THREE.BoxGeometry(0.014, earH + 0.002, 0.04);
      const slotMesh = new THREE.Mesh(slotGeo, darkAlumMat);
      slotMesh.position.set(invX + dir * (bodyW / 2 + earW / 2), invY + bodyH / 2 - earH / 2, invZ);
      inverterGroup.add(slotMesh);

      // Stainless Steel M8 Racking Clamp Bolt & Washer
      const boltHeadGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.012, 16);
      const boltMesh = new THREE.Mesh(boltHeadGeo, steelBoltMat);
      boltMesh.position.set(invX + dir * (bodyW / 2 + earW / 2), invY + bodyH / 2 + 0.006, invZ);
      inverterGroup.add(boltMesh);

      const washerGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.003, 16);
      const washerMesh = new THREE.Mesh(washerGeo, steelBoltMat);
      washerMesh.position.set(invX + dir * (bodyW / 2 + earW / 2), invY + bodyH / 2 + 0.0015, invZ);
      inverterGroup.add(washerMesh);
    });

    // 5. Ground Bonding Lug (Brass/Copper terminal boss)
    const groundBossGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.014, 12);
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.88, roughness: 0.28 });
    const groundBoss = new THREE.Mesh(groundBossGeo, brassMat);
    groundBoss.position.set(invX - bodyW / 2 - 0.01, invY, invZ + 0.04);
    groundBoss.rotation.z = Math.PI / 2;
    inverterGroup.add(groundBoss);

    // 6. Active Multi-Color Status LED (Pulsing Green for MPPT Grid-Tie)
    const ledGeo = new THREE.SphereGeometry(0.0045, 16, 16);
    this.inverterLedMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 2.5,
      roughness: 0.1
    });
    this.inverterStatusLed = new THREE.Mesh(ledGeo, this.inverterLedMat);
    this.inverterStatusLed.position.set(invX + 0.075, invY + bodyH / 2 + 0.003, invZ + 0.055);
    inverterGroup.add(this.inverterStatusLed);

    // Soft point light emitted by the LED
    this.inverterLedLight = new THREE.PointLight(0x10b981, 0.5, 0.25);
    this.inverterLedLight.position.copy(this.inverterStatusLed.position);
    inverterGroup.add(this.inverterLedLight);

    // 7. DC Input Pigtails & Mating MC4 Connectors (plugging into panel J-Box leads)
    const createDCPigtail = (pX, isPos) => {
      const startPt = new THREE.Vector3(pX, invY - 0.008, invZ - bodyL / 2);
      const midPt = new THREE.Vector3(pX, invY - 0.014, invZ - bodyL / 2 - 0.025);
      const endPt = new THREE.Vector3(pX, invY - 0.008, 0.06);

      const curve = new THREE.CatmullRomCurve3([startPt, midPt, endPt]);
      const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.005, 12, false);
      const cable = new THREE.Mesh(tubeGeo, rubberCableMat);
      cable.castShadow = true;
      inverterGroup.add(cable);

      // Polarity Identification Band
      const bandGeo = new THREE.CylinderGeometry(0.0058, 0.0058, 0.014, 16);
      const bandMat = new THREE.MeshStandardMaterial({
        color: isPos ? 0xd92626 : 0x2563eb,
        metalness: 0.2,
        roughness: 0.3
      });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.copy(curve.getPointAt(0.4));
      band.rotation.x = Math.PI / 2;
      inverterGroup.add(band);

      // Matching Mating MC4 Socket
      const mc4Geo = new THREE.CylinderGeometry(0.0088, 0.0088, 0.042, 16);
      const mc4Mat = new THREE.MeshStandardMaterial({ color: 0x181a1f, metalness: 0.2, roughness: 0.4 });
      const mc4Socket = new THREE.Mesh(mc4Geo, mc4Mat);
      mc4Socket.position.copy(endPt);
      mc4Socket.rotation.x = Math.PI / 2;
      inverterGroup.add(mc4Socket);
    };

    createDCPigtail(-0.045, true);  // DC Input (+)
    createDCPigtail(0.045, false);  // DC Input (-)

    // 8. AC Output Drop Cable & Heavy-Duty Array Trunk Bus Line
    const acDropGlandGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.028, 16);
    const acDropGland = new THREE.Mesh(acDropGlandGeo, darkAlumMat);
    acDropGland.position.set(invX, invY - bodyH / 2 - 0.014, invZ);
    inverterGroup.add(acDropGland);

    const acDropCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(invX, invY - bodyH / 2 - 0.028, invZ),
      new THREE.Vector3(invX + 0.04, invY - bodyH / 2 - 0.065, invZ + 0.04),
      new THREE.Vector3(invX + 0.08, invY - bodyH / 2 - 0.085, invZ + 0.08)
    ]);
    const acDropTubeGeo = new THREE.TubeGeometry(acDropCurve, 20, 0.0065, 12, false);
    const acDropCable = new THREE.Mesh(acDropTubeGeo, rubberCableMat);
    acDropCable.castShadow = true;
    inverterGroup.add(acDropCable);

    const tJunctionGeo = new THREE.BoxGeometry(0.038, 0.032, 0.042);
    const tJunctionMat = new THREE.MeshStandardMaterial({ color: 0x1f242b, roughness: 0.45, metalness: 0.2 });
    const tJunction = new THREE.Mesh(tJunctionGeo, tJunctionMat);
    tJunction.position.set(invX + 0.08, invY - bodyH / 2 - 0.085, invZ + 0.08);
    inverterGroup.add(tJunction);

    const trunkLen = 0.94;
    const trunkGeo = new THREE.CylinderGeometry(0.0075, 0.0075, trunkLen, 16);
    const trunkMesh = new THREE.Mesh(trunkGeo, rubberCableMat);
    trunkMesh.position.set(invX, invY - bodyH / 2 - 0.085, invZ + 0.08);
    trunkMesh.rotation.z = Math.PI / 2;
    trunkMesh.castShadow = true;
    inverterGroup.add(trunkMesh);

    const termGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.032, 16);
    const termMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35, metalness: 0.3 });
    const termMesh = new THREE.Mesh(termGeo, termMat);
    termMesh.position.set(invX - trunkLen / 2, invY - bodyH / 2 - 0.085, invZ + 0.08);
    termMesh.rotation.z = Math.PI / 2;
    inverterGroup.add(termMesh);

    // 9. AC Field Wireable Connector (Q-CONN-R-10M) & Transition Conduit to Equipment Board
    const qConnGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.055, 16);
    const qConnMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.3, roughness: 0.4 });
    const qConnMesh = new THREE.Mesh(qConnGeo, qConnMat);
    qConnMesh.position.set(invX + trunkLen / 2, invY - bodyH / 2 - 0.085, invZ + 0.08);
    qConnMesh.rotation.z = Math.PI / 2;
    qConnMesh.castShadow = true;
    inverterGroup.add(qConnMesh);

    const acExitCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(invX + trunkLen / 2 + 0.028, invY - bodyH / 2 - 0.085, invZ + 0.08),
      new THREE.Vector3(0.53, invY - bodyH / 2 - 0.07, invZ + 0.08),
      new THREE.Vector3(0.58, -0.04, invZ + 0.06)
    ]);
    this.microAcExitCurve = acExitCurve;
    const acExitGeo = new THREE.TubeGeometry(acExitCurve, 16, 0.007, 12, false);
    const acExitMesh = new THREE.Mesh(acExitGeo, darkAlumMat);
    acExitMesh.castShadow = true;
    inverterGroup.add(acExitMesh);

    return inverterGroup;
  }

  /**
   * Set Status LED Pulse Intensity on Microinverter
   */
  setInverterLedPulse(intensity) {
    if (this.inverterLedMat) {
      this.inverterLedMat.emissiveIntensity = intensity;
    }
    if (this.inverterLedLight) {
      this.inverterLedLight.intensity = intensity * 0.25;
    }
  }

  /**
   * Set the separation progress between 0.0 (Assembled) and 1.0 (Exploded).
   */
  setExplodeProgress(progress) {
    const p = Math.max(0, Math.min(1, progress));
    this.layers.forEach((layer) => {
      // Lerp between assembledY and explodedY
      const targetY = layer.assembledY + (layer.explodedY - layer.assembledY) * p;
      layer.object.position.y = targetY;
      layer.currentY = targetY;
    });

    // Dynamically update central inverter cables so they remain connected to the Soladeck box at all separation heights
    const jboxLayer = this.layers.find(l => l.id === 'jbox');
    if (jboxLayer) {
      this.updateCentralCables(jboxLayer.currentY);
    }
  }

  /**
   * Dynamically recomputes the Catmull-Rom spline bridging from the moving J-Box
   * to the stationary Soladeck roof transition box.
   */
  updateCentralCables(jboxY = -0.038) {
    if (!this.centralCableMeshes || this.centralCableMeshes.length === 0) return;

    this.centralCurves = [];

    this.centralCableMeshes.forEach((item, idx) => {
      const { startX, isPositive, tubeMesh, bandMesh, mc4Mesh } = item;
      const zOffset = isPositive ? -0.012 : 0.012;

      // P0: Exit of JBox gland (moves with JBox during breakdown)
      const p0 = new THREE.Vector3(startX, jboxY - 0.016, -0.368);
      // P1: Service drip loop just below JBox (moves with JBox during breakdown)
      const p1 = new THREE.Vector3(startX + 0.08, jboxY - 0.04, -0.34 + zOffset);
      // P2: Ascending mid-cable span bridging between jboxY and roof plane (-0.038)
      const p2 = new THREE.Vector3(0.24, THREE.MathUtils.lerp(jboxY - 0.02, -0.055, 0.45), -0.32 + zOffset);
      // P3: Approaching Soladeck level near module right edge
      const p3 = new THREE.Vector3(0.40, THREE.MathUtils.lerp(jboxY - 0.01, -0.042, 0.85), -0.31 + zOffset);
      // P4: Entering Soladeck input MC4 port at roof plane (STATIONARY!)
      const p4 = new THREE.Vector3(0.535, -0.038, -0.31 + zOffset);

      const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4]);
      this.centralCurves[idx] = curve;

      // Update tube geometry smoothly
      if (tubeMesh) {
        tubeMesh.geometry.dispose();
        tubeMesh.geometry = new THREE.TubeGeometry(curve, 32, 0.0055, 12, false);
      }

      // Update band position
      if (bandMesh) {
        bandMesh.position.copy(curve.getPointAt(0.30));
      }

      // MC4 connector stays at curve end P4 (Soladeck input receptacle)
      if (mc4Mesh) {
        mc4Mesh.position.copy(p4);
      }
    });
  }

  /**
   * Samples a point along the dynamic central inverter cable for particle tracking
   */
  getCentralCablePoint(t, isPositive) {
    const idx = isPositive ? 0 : 1;
    if (this.centralCurves && this.centralCurves[idx]) {
      return this.centralCurves[idx].getPoint(t);
    }
    return new THREE.Vector3(0.535 * t, -0.038, -0.31);
  }

  /**
   * Focus or isolate a specific layer by index or ID.
   */
  focusLayer(layerId) {
    this.layers.forEach((layer) => {
      if (!layerId || layerId === 'all') {
        layer.object.traverse((child) => {
          if (child.isMesh) child.material.opacity = child.userData.defaultOpacity ?? child.material.opacity;
        });
      } else if (layer.id === layerId) {
        layer.object.traverse((child) => {
          if (child.isMesh) {
            if (child.userData.defaultOpacity === undefined) child.userData.defaultOpacity = child.material.opacity;
            child.material.opacity = 1.0;
          }
        });
      } else {
        layer.object.traverse((child) => {
          if (child.isMesh) {
            if (child.userData.defaultOpacity === undefined) child.userData.defaultOpacity = child.material.opacity;
            child.material.opacity = 0.18;
            child.material.transparent = true;
          }
        });
      }
    });
  }

  /**
   * Modulate cell wafer absorption luminescence based on incident sunlight angle
   */
  setSunAbsorption(cosVal) {
    if (this.cellMat) {
      this.cellMat.emissive = new THREE.Color(0x0284c7);
      this.cellMat.emissiveIntensity = Math.max(0, 0.28 * Math.pow(cosVal, 1.2));
    }
  }

  /**
   * Switch between Microinverter (MLPE) architecture and Central / String Inverter architecture
   */
  setInverterMode(mode) {
    this.inverterMode = mode; // 'micro' or 'central'
    const isMicro = (mode === 'micro');

    if (this.inverterGroup) {
      this.inverterGroup.visible = isMicro;
    }
    if (this.jboxMicroCables) {
      this.jboxMicroCables.visible = isMicro;
    }
    if (this.jboxCentralCables) {
      this.jboxCentralCables.visible = !isMicro;
      if (!isMicro) {
        const jboxLayer = this.layers.find(l => l.id === 'jbox');
        this.updateCentralCables(jboxLayer ? jboxLayer.currentY : -0.038);
      }
    }
  }
}

