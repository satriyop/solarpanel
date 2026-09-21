import * as THREE from 'three';
import {
  createSolarCellTexture,
  createSolarCellNormalMap,
  createBrushedAluminumTexture,
  createBacksheetTexture,
  createEVATexture,
  createEVANormalMap
} from '../textures/solarTextures.js';

/**
 * SolarPanelModel - Procedurally creates the 7 photorealistic components of a residential solar panel.
 * Contains assembled and exploded vertical (Y-axis) coordinates for smooth transitions.
 */
export class SolarPanelModel {
  constructor() {
    this.group = new THREE.Group();
    this.layers = [];

    // Panel overall dimensions (Standard 60-cell residential module: ~1.05m x ~1.75m)
    this.panelWidth = 1.08;
    this.panelLength = 1.78;
    this.frameThickness = 0.04;
    this.frameWidth = 0.035;

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
      { id: 'jbox', name: '7. Junction Box & MC4 Cables', assembledY: -0.038, explodedY: -0.88 }
    ];

    this.showAlignmentGuides = true;
    this.initTextures();
    this.buildLayers();
    this.buildAlignmentGuides();
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
    [-0.45, -0.2, 0.2, 0.45].forEach((zOff) => {
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
    const cellWidth = 0.16;
    const cellLength = 0.16;
    const gapX = 0.005;
    const gapZ = 0.005;

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
        const busbarOffsets = [-0.06, -0.03, 0.0, 0.03, 0.06];
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

    // Realistic Curved Solar Cables
    const createCable = (startX, isPositive) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(startX, -boxH / 2, -0.45 + boxL / 2 + 0.02),
        new THREE.Vector3(startX * 1.3, -boxH * 1.4, -0.45 + boxL / 2 + 0.10),
        new THREE.Vector3(startX * 1.8, -boxH * 1.8, -0.45 + boxL / 2 + 0.22),
        new THREE.Vector3(startX * 1.4, -boxH * 1.6, -0.45 + boxL / 2 + 0.34),
        new THREE.Vector3(startX * 1.1, -boxH * 1.2, -0.45 + boxL / 2 + 0.44)
      ]);

      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.0055, 12, false);
      const cableMat = new THREE.MeshStandardMaterial({
        color: 0x181a1e,
        roughness: 0.52,
        metalness: 0.08
      });
      const cable = new THREE.Mesh(tubeGeo, cableMat);
      cable.castShadow = true;
      jboxGroup.add(cable);

      // Color Identification Band (Red = Positive, Blue/Black = Negative)
      const bandGeo = new THREE.CylinderGeometry(0.0062, 0.0062, 0.018, 16);
      const bandMat = new THREE.MeshStandardMaterial({
        color: isPositive ? 0xd92626 : 0x2563eb,
        roughness: 0.35,
        metalness: 0.1
      });
      const band = new THREE.Mesh(bandGeo, bandMat);
      const bandPos = curve.getPointAt(0.28);
      band.position.copy(bandPos);
      band.rotation.x = Math.PI / 2;
      jboxGroup.add(band);

      // MC4 Connector at end of cable
      const mc4EndPos = curve.getPointAt(1.0);
      const mc4Geo = new THREE.CylinderGeometry(0.009, 0.009, 0.048, 16);
      const mc4Mat = new THREE.MeshStandardMaterial({
        color: 0x141619,
        roughness: 0.32,
        metalness: 0.25
      });
      const mc4 = new THREE.Mesh(mc4Geo, mc4Mat);
      mc4.position.copy(mc4EndPos);
      mc4.rotation.x = Math.PI / 2;
      mc4.castShadow = true;
      jboxGroup.add(mc4);

      // MC4 Locking clip detail
      const clipGeo = new THREE.BoxGeometry(0.004, 0.004, 0.02);
      const clipMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 });
      const clip = new THREE.Mesh(clipGeo, clipMat);
      clip.position.set(mc4EndPos.x, mc4EndPos.y + 0.008, mc4EndPos.z);
      jboxGroup.add(clip);
    };

    createCable(-0.045, true);  // Positive (+)
    createCable(0.045, false);  // Negative (-)

    return jboxGroup;
  }

  /**
   * Build CAD 4-Corner Vertical Alignment Guide Lines connecting all layers in space.
   */
  buildAlignmentGuides() {
    this.guidesGroup = new THREE.Group();
    const W = this.panelWidth;
    const L = this.panelLength;
    const fw = this.frameWidth;

    const corners = [
      { x: -W / 2 + fw / 2, z: -L / 2 + fw / 2 },
      { x: W / 2 - fw / 2, z: -L / 2 + fw / 2 },
      { x: -W / 2 + fw / 2, z: L / 2 - fw / 2 },
      { x: W / 2 - fw / 2, z: L / 2 - fw / 2 }
    ];

    this.guideLines = [];
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x0088ff,
      dashSize: 0.03,
      gapSize: 0.02,
      transparent: true,
      opacity: 0.0
    });

    corners.forEach((corner) => {
      const points = [
        new THREE.Vector3(corner.x, 0.85, corner.z),
        new THREE.Vector3(corner.x, -0.65, corner.z)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, lineMat.clone());
      line.computeLineDistances();
      this.guidesGroup.add(line);
      this.guideLines.push({ line, corner, points });
    });

    this.group.add(this.guidesGroup);
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

    // Update CAD 4-Corner Alignment Guide Lines
    if (this.guideLines && this.guidesGroup) {
      const topY = 0.85 * p;
      const bottomY = -0.65 * p;
      const opacity = this.showAlignmentGuides ? Math.min(0.65, p * 1.2) : 0.0;

      this.guideLines.forEach(({ line, corner }) => {
        const positions = line.geometry.attributes.position.array;
        positions[1] = topY;
        positions[4] = bottomY;
        line.geometry.attributes.position.needsUpdate = true;
        line.computeLineDistances();
        line.material.opacity = opacity;
        line.visible = opacity > 0.02;
      });
    }
  }

  /**
   * Toggle CAD Alignment Guide Lines
   */
  setAlignmentGuidesVisible(visible) {
    this.showAlignmentGuides = visible;
    if (this.guidesGroup) {
      this.guidesGroup.visible = visible;
    }
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
}
