import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * StudioScene - Professional studio environment with 3-point lighting,
 * neutral studio gray background, soft contact shadows, and ACES tone mapping.
 */
export class StudioScene {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    // Dimensions
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLighting();
    this.initStudioFloor();
    this.initControls();
    this.initSunVisualizer();

    // Responsive resize listener
    window.addEventListener('resize', () => this.onResize());
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  initScene() {
    this.scene = new THREE.Scene();
    // Dark studio background (0x131518)
    this.scene.background = new THREE.Color(0x131518);
    this.scene.fog = new THREE.Fog(0x131518, 6, 18);
  }

  initCamera() {
    // 46° FOV gives optimal framing capturing both the 3D Sun in the sky and the solar panel
    this.camera = new THREE.PerspectiveCamera(46, this.width / this.height, 0.1, 100);
    // Isometric studio framing: elevated, angled 48°
    this.camera.position.set(2.6, 2.1, 3.4);
    this.camera.lookAt(0, 0.15, 0);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 8.5;
    this.controls.minDistance = 1.5;
    this.controls.target.set(0, 0.15, 0);
    this.controls.update();
  }

  initLighting() {
    // 1. Ambient / Hemisphere Light (Natural soft sky & ground bounce)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8a929e, 0.9);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    // 2. Key Light (Soft directional sunlight / studio softbox)
    this.keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.keyLight.position.set(4.0, 7.0, 4.5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 15;
    this.keyLight.shadow.camera.left = -2.2;
    this.keyLight.shadow.camera.right = 2.2;
    this.keyLight.shadow.camera.top = 2.2;
    this.keyLight.shadow.camera.bottom = -2.2;
    this.keyLight.shadow.bias = -0.0002;
    this.keyLight.shadow.radius = 2.5;
    this.scene.add(this.keyLight);

    // 3. Fill Light (Soft cool fill from opposite side)
    const fillLight = new THREE.DirectionalLight(0xdde8f8, 1.4);
    fillLight.position.set(-4.5, 3.5, -3.5);
    this.scene.add(fillLight);

    // 4. Rim / Kicker Light (Highlights beveled edges of glass & aluminum frame)
    const rimLight = new THREE.DirectionalLight(0xffffff, 2.0);
    rimLight.position.set(-3.0, 5.0, -5.0);
    this.scene.add(rimLight);

    // 5. Underside Kicker Light (Brings out junction box and cable details)
    const underLight = new THREE.DirectionalLight(0xf0f4f9, 1.2);
    underLight.position.set(1.2, -3.5, 2.2);
    this.scene.add(underLight);

    // 6. High-End Procedural Studio Softbox Equirectangular Environment Map
    this.initStudioHDREnvironment();
  }

  initStudioHDREnvironment() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Studio base ambient background (warm-cool studio gray)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    bgGrad.addColorStop(0.0, '#383d47');
    bgGrad.addColorStop(0.35, '#282c34');
    bgGrad.addColorStop(0.5, '#1e2127');
    bgGrad.addColorStop(0.85, '#16181d');
    bgGrad.addColorStop(1.0, '#101215');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // A. Massive Overhead Ceiling Softbox Bank (Simulates key top illumination)
    const topSoftbox = ctx.createRadialGradient(1024, 180, 20, 1024, 180, 420);
    topSoftbox.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    topSoftbox.addColorStop(0.3, 'rgba(255, 255, 255, 0.85)');
    topSoftbox.addColorStop(0.7, 'rgba(240, 245, 255, 0.3)');
    topSoftbox.addColorStop(1.0, 'rgba(240, 245, 255, 0.0)');
    ctx.fillStyle = topSoftbox;
    ctx.fillRect(400, 0, 1248, 480);

    // B. Left Vertical Strip Softbox (Creates razor-sharp edge glints on aluminum & glass)
    const leftStrip = ctx.createLinearGradient(350, 0, 480, 0);
    leftStrip.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
    leftStrip.addColorStop(0.3, 'rgba(255, 255, 255, 0.95)');
    leftStrip.addColorStop(0.7, 'rgba(255, 255, 255, 0.95)');
    leftStrip.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = leftStrip;
    ctx.fillRect(350, 200, 130, 600);

    // C. Right Key Softbox Panel
    const rightPanel = ctx.createRadialGradient(1550, 400, 10, 1550, 400, 280);
    rightPanel.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    rightPanel.addColorStop(0.4, 'rgba(250, 252, 255, 0.8)');
    rightPanel.addColorStop(0.8, 'rgba(230, 240, 255, 0.2)');
    rightPanel.addColorStop(1.0, 'rgba(230, 240, 255, 0.0)');
    ctx.fillStyle = rightPanel;
    ctx.fillRect(1250, 150, 600, 500);

    // D. Horizon Kicker Rim Light (Thin crisp accent line)
    const horizonRim = ctx.createLinearGradient(0, 490, 0, 530);
    horizonRim.addColorStop(0.0, 'rgba(200, 220, 255, 0.0)');
    horizonRim.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
    horizonRim.addColorStop(1.0, 'rgba(200, 220, 255, 0.0)');
    ctx.fillStyle = horizonRim;
    ctx.fillRect(0, 490, 2048, 40);

    const hdrTexture = new THREE.CanvasTexture(canvas);
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    hdrTexture.colorSpace = THREE.SRGBColorSpace;

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    this.scene.environment = pmremGenerator.fromEquirectangular(hdrTexture).texture;
    hdrTexture.dispose();
  }

  initStudioFloor() {
    // Soft shadow receiver plane floating underneath the exploded stack
    const floorGeo = new THREE.PlaneGeometry(16, 16);
    floorGeo.rotateX(-Math.PI / 2);

    const shadowMat = new THREE.ShadowMaterial({
      opacity: 0.5
    });
    this.shadowFloor = new THREE.Mesh(floorGeo, shadowMat);
    this.shadowFloor.position.y = -1.45;
    this.shadowFloor.receiveShadow = true;
    this.scene.add(this.shadowFloor);

    // Studio ground gradient disk for subtle vignette
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
    grad.addColorStop(0, 'rgba(210, 215, 222, 0.7)');
    grad.addColorStop(0.5, 'rgba(220, 224, 230, 0.35)');
    grad.addColorStop(1, 'rgba(220, 224, 230, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const vignetteTex = new THREE.CanvasTexture(canvas);
    const vignetteMat = new THREE.MeshBasicMaterial({
      map: vignetteTex,
      transparent: true,
      depthWrite: false
    });
    const vignetteFloor = new THREE.Mesh(floorGeo, vignetteMat);
    vignetteFloor.position.y = -1.44;
    this.scene.add(vignetteFloor);
  }

  onResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  setStudioTheme(isDark) {
    if (isDark) {
      this.scene.background.setHex(0x131518);
      this.scene.fog.color.setHex(0x131518);
      this.renderer.toneMappingExposure = 1.35;
      this.shadowFloor.material.opacity = 0.5;
    } else {
      this.scene.background.setHex(0xdce0e6);
      this.scene.fog.color.setHex(0xdce0e6);
      this.renderer.toneMappingExposure = 1.2;
      this.shadowFloor.material.opacity = 0.22;
    }
  }

  setSuperResolution(enabled) {
    const dpr = enabled ? Math.min(window.devicePixelRatio * 1.5, 3.0) : Math.min(window.devicePixelRatio, 2.0);
    this.renderer.setPixelRatio(dpr);
  }

  /**
   * Helper to create a crisp 2D canvas sprite for CAD HUD annotations
   */
  createBadgeSprite(text, color = '#06b6d4', bgColor = 'rgba(15, 23, 42, 0.88)') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const draw = (txt) => {
      ctx.clearRect(0, 0, 256, 64);
      // Pill rounded rectangle
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(6, 6, 244, 52, 12);
      ctx.fill();
      ctx.stroke();

      // Text label
      ctx.font = 'bold 22px "JetBrains Mono", monospace, sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, 128, 32);
    };

    draw(text);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.38, 0.095, 1.0);
    sprite.renderOrder = 999;

    return {
      sprite,
      updateText: (newTxt) => {
        draw(newTxt);
        texture.needsUpdate = true;
      }
    };
  }

  /**
   * Calculate 3D position of Sun in the visible sky dome for any zenith angle (0° to 80°).
   * Framed to be prominently visible in the upper sky from the start (angle 0°)
   * and smoothly traverse across the celestial arc down towards the sunset horizon.
   */
  calculateSunPosition(angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    const sinVal = Math.sin(rad);
    // At 0° (High Noon): Sun sits at (-0.35, 2.22, -1.25) directly in the upper sky above the panel
    // At 80° (Sunset): Sun sits at (-2.40, 0.65, -1.55) near the sunset horizon
    const x = -0.35 - 2.05 * sinVal;
    const y = 2.10 * Math.cos(rad * 0.95) + 0.12;
    const z = -1.25 - 0.35 * sinVal;
    return new THREE.Vector3(x, y, z);
  }

  /**
   * Initialize Physically-Accurate Sun Visualizer:
   * 1. Celestial Arc Trajectory in sky
   * 2. Glowing Sun Orb with corona halo and radiant lens flare
   * 3. Collimated Parallel Sunbeam Array (spanning full 1.0m x 1.7m rectangular module aperture)
   * 4. Fresnel Reflected Specular Rays (physically illustrating grazing reflection losses)
   * 5. Normal Vector & Incident Angle (θ) CAD Gizmo on panel
   */
  initSunVisualizer() {
    this.sunGroup = new THREE.Group();
    this.scene.add(this.sunGroup);

    this.sunTargetY = 0.02; // Dynamically tracks top layer

    // 1. Celestial Arc Path (0° to 80°)
    const arcPoints = [];
    for (let deg = 0; deg <= 80; deg += 2) {
      arcPoints.push(this.calculateSunPosition(deg));
    }
    const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 0.06,
      gapSize: 0.04,
      transparent: true,
      opacity: 0.65
    });
    this.sunArc = new THREE.Line(arcGeo, arcMat);
    this.sunArc.computeLineDistances();
    this.sunGroup.add(this.sunArc);

    // 2. Glowing 3D Sun Orb (White core + golden corona halo + radiant glare disc)
    this.sunOrb = new THREE.Group();

    const coreGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.sunOrb.add(coreMesh);

    const coronaGeo = new THREE.SphereGeometry(0.32, 24, 24);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.65
    });
    this.coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    this.sunOrb.add(this.coronaMesh);

    const ringGeo = new THREE.RingGeometry(0.32, 0.68, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    this.sunRing = new THREE.Mesh(ringGeo, ringMat);
    this.sunOrb.add(this.sunRing);

    // Soft radiant lens flare billboard disc
    const flareCanvas = document.createElement('canvas');
    flareCanvas.width = 256;
    flareCanvas.height = 256;
    const fctx = flareCanvas.getContext('2d');
    const fGrad = fctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    fGrad.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
    fGrad.addColorStop(0.3, 'rgba(245, 158, 11, 0.25)');
    fGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    fctx.fillStyle = fGrad;
    fctx.fillRect(0, 0, 256, 256);
    const flareTex = new THREE.CanvasTexture(flareCanvas);
    const flareMat = new THREE.MeshBasicMaterial({
      map: flareTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.sunFlare = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), flareMat);
    this.sunOrb.add(this.sunFlare);

    this.sunGroup.add(this.sunOrb);

    // 3. Collimated Parallel Sunbeam Array (Covering the full 1.0m x 1.7m rectangular module)
    this.incomingBeamsGroup = new THREE.Group();
    this.incomingRays = [];

    // 3x3 grid of target points across the rectangular solar panel aperture
    this.apertureOffsets = [
      [-0.45, -0.75], [0.0, -0.75], [0.45, -0.75],
      [-0.45,  0.00], [0.0,  0.00], [0.45,  0.00],
      [-0.45,  0.75], [0.0,  0.75], [0.45,  0.75]
    ];

    const rayMat = new THREE.LineDashedMaterial({
      color: 0xfef08a,
      dashSize: 0.08,
      gapSize: 0.04,
      transparent: true,
      opacity: 0.65
    });

    this.apertureOffsets.forEach(([ox, oz]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(ox, 3.6, oz),
        new THREE.Vector3(ox, 0, oz)
      ]);
      const rayLine = new THREE.Line(geo, rayMat.clone());
      this.incomingBeamsGroup.add(rayLine);
      this.incomingRays.push({ line: rayLine, ox, oz });
    });

    // Rectangular soft translucent light volume bounding the incoming rays
    const volGeo = new THREE.BoxGeometry(1.02, 1, 1.72);
    volGeo.translate(0, 0.5, 0);
    const volMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.lightVolume = new THREE.Mesh(volGeo, volMat);
    this.incomingBeamsGroup.add(this.lightVolume);

    this.sunGroup.add(this.incomingBeamsGroup);

    // 4. Fresnel Reflected Specular Rays (Simulating optical losses bouncing off glass into sky)
    this.reflectedBeamsGroup = new THREE.Group();
    this.reflectedRays = [];

    const reflMat = new THREE.LineBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.0
    });

    this.apertureOffsets.forEach(([ox, oz]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(ox, 0, oz),
        new THREE.Vector3(ox, 1, oz)
      ]);
      const line = new THREE.Line(geo, reflMat.clone());
      this.reflectedBeamsGroup.add(line);
      this.reflectedRays.push({ line, ox, oz });
    });

    this.sunGroup.add(this.reflectedBeamsGroup);

    // 5. Incident Angle (θ) CAD Gizmo on Panel Surface
    this.incidentGizmo = new THREE.Group();
    this.incidentGizmo.position.set(0, 0.03, 0);
    this.incidentGizmo.visible = false; // Hidden by default, controlled via CAD Guides toggle

    // Normal vector line (pointing straight up 90°)
    const normalPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.72, 0)];
    const normalGeo = new THREE.BufferGeometry().setFromPoints(normalPoints);
    const normalMat = new THREE.LineDashedMaterial({
      color: 0x06b6d4,
      dashSize: 0.03,
      gapSize: 0.02,
      transparent: true,
      opacity: 0.85
    });
    this.normalLine = new THREE.Line(normalGeo, normalMat);
    this.normalLine.computeLineDistances();
    this.incidentGizmo.add(this.normalLine);

    // Normal Vector Arrow Tip (Cyan Cone)
    const normalConeGeo = new THREE.ConeGeometry(0.022, 0.065, 12);
    const normalConeMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const normalCone = new THREE.Mesh(normalConeGeo, normalConeMat);
    normalCone.position.set(0, 0.72, 0);
    this.incidentGizmo.add(normalCone);

    // Normal Vector Badge Sprite: "Normal (90°)"
    this.normalBadge = this.createBadgeSprite('Normal (90°)', '#06b6d4');
    this.normalBadge.sprite.position.set(0, 0.82, 0);
    this.incidentGizmo.add(this.normalBadge.sprite);

    // CAD Right-Angle (90°) Perpendicular Mark at Base
    const rightAngleGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.07, 0),
      new THREE.Vector3(0.07, 0.07, 0),
      new THREE.Vector3(0.07, 0, 0)
    ]);
    const rightAngleMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.7
    });
    this.rightAngleMark = new THREE.Line(rightAngleGeo, rightAngleMat);
    this.incidentGizmo.add(this.rightAngleMark);

    // Incident ray line on panel (Golden amber)
    const incRayPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.7, 0)];
    this.incRayGeo = new THREE.BufferGeometry().setFromPoints(incRayPoints);
    const incRayMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });
    this.incRayLine = new THREE.Line(this.incRayGeo, incRayMat);
    this.incidentGizmo.add(this.incRayLine);

    // Sun Ray Arrow Tip (Golden Amber Cone)
    const rayConeGeo = new THREE.ConeGeometry(0.022, 0.065, 12);
    const rayConeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    this.incRayArrow = new THREE.Mesh(rayConeGeo, rayConeMat);
    this.incidentGizmo.add(this.incRayArrow);

    // Curved Angle Arc (θ) measuring angle between Normal and Sun Ray
    this.ARC_SEGMENTS = 32;
    const thetaArcPoints = [];
    for (let i = 0; i <= this.ARC_SEGMENTS; i++) {
      thetaArcPoints.push(new THREE.Vector3(0, 0, 0));
    }
    this.arcGeo = new THREE.BufferGeometry().setFromPoints(thetaArcPoints);
    const thetaArcMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 0.02,
      gapSize: 0.015,
      transparent: true,
      opacity: 0.95
    });
    this.arcLine = new THREE.Line(this.arcGeo, thetaArcMat);
    this.incidentGizmo.add(this.arcLine);

    // Angle θ Badge Sprite: "θ = 0°"
    this.thetaBadge = this.createBadgeSprite('θ = 0°', '#f59e0b');
    this.incidentGizmo.add(this.thetaBadge.sprite);

    // Full rectangular aperture illuminated target boundary on solar panel
    const targetGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.02, 1.72));
    targetGeo.rotateX(-Math.PI / 2);
    this.targetFrameMat = new THREE.LineBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.7
    });
    this.targetFrame = new THREE.LineSegments(targetGeo, this.targetFrameMat);
    this.incidentGizmo.add(this.targetFrame);

    this.sunGroup.add(this.incidentGizmo);

    // Initialize at 0° (High Noon)
    this.setSunAngle(0);

    // Default to hidden so initial view focuses purely on solar panel component breakdown
    this.setSunSimulatorVisible(false);
  }

  /**
   * Set Sun Zenith Angle (0° = Direct Overhead High Noon, 80° = Low Grazing Sunset)
   * Visually animates parallel ray wavefronts, Fresnel specular reflections, and layer tracking!
   */
  setSunAngle(angleDeg) {
    this.currentSunAngle = angleDeg;
    const rad = (angleDeg * Math.PI) / 180;
    const cosVal = Math.cos(rad);
    const sinVal = Math.sin(rad);

    // 1. Position 3D Sun Orb in the sky along the celestial arc
    const sunPos = this.calculateSunPosition(angleDeg);
    if (this.sunOrb) {
      this.sunOrb.position.copy(sunPos);
      if (this.sunRing) {
        this.sunRing.lookAt(this.camera.position);
      }
      if (this.sunFlare) {
        this.sunFlare.lookAt(this.camera.position);
      }
    }

    // Direction vector from sun towards panel center
    const landingY = this.sunTargetY;
    const centerTarget = new THREE.Vector3(0, landingY, 0);
    const sunToPanel = new THREE.Vector3().subVectors(centerTarget, sunPos);
    const beamLength = sunToPanel.length();
    const rayDir = sunToPanel.clone().normalize(); // Points from Sun toward panel

    // 2. Update Directional Key Light
    this.keyLight.position.set(sunPos.x * 2.5, sunPos.y * 2.5, sunPos.z * 2.5);
    this.keyLight.target.position.set(0, landingY, 0);
    this.keyLight.target.updateMatrixWorld();
    this.keyLight.intensity = Math.max(0.5, 2.8 * Math.pow(cosVal, 0.6));

    // Dynamic light color: Crisp 6000K daylight -> Warm 3200K sunset gold
    const warmFactor = Math.min(1.0, angleDeg / 80);
    this.keyLight.color.setRGB(1.0, 1.0 - warmFactor * 0.15, 1.0 - warmFactor * 0.35);

    // 3. Update Collimated Parallel Incoming Rays (originating from the Sun Orb)
    if (this.incomingRays) {
      this.incomingRays.forEach(({ line, ox, oz }) => {
        const target = new THREE.Vector3(ox, landingY, oz);
        const source = new THREE.Vector3(
          target.x - rayDir.x * beamLength,
          target.y - rayDir.y * beamLength,
          target.z - rayDir.z * beamLength
        );

        const posArr = line.geometry.attributes.position.array;
        posArr[0] = source.x;
        posArr[1] = source.y;
        posArr[2] = source.z;
        posArr[3] = target.x;
        posArr[4] = target.y;
        posArr[5] = target.z;
        line.geometry.attributes.position.needsUpdate = true;
        line.computeLineDistances();
        line.material.opacity = Math.max(0.20, 0.75 * cosVal);
      });
    }

    // Update light volume orientation
    if (this.lightVolume) {
      this.lightVolume.position.set(0, landingY, 0);
      this.lightVolume.scale.set(1.0, beamLength * 0.8, 1.0);
      this.lightVolume.material.opacity = Math.max(0.02, 0.08 * cosVal);
    }

    // 4. Update Fresnel Reflected Rays (Mirror reflection: θ_refl = θ_inc)
    const b0 = 0.05;
    const iam = Math.max(0.05, 1.0 - b0 * (1.0 / Math.max(0.1, cosVal) - 1.0));
    const fresnelReflection = Math.min(1.0, Math.max(0.02, 1.0 - iam + Math.pow(sinVal, 5) * 0.8));

    if (this.reflectedRays) {
      const reflLength = 2.4;
      const reflDir = new THREE.Vector3(rayDir.x, -rayDir.y, rayDir.z).normalize();

      this.reflectedRays.forEach(({ line, ox, oz }) => {
        const start = new THREE.Vector3(ox, landingY, oz);
        const end = new THREE.Vector3(
          ox + reflDir.x * reflLength,
          landingY + reflDir.y * reflLength,
          oz + reflDir.z * reflLength
        );

        const posArr = line.geometry.attributes.position.array;
        posArr[0] = start.x;
        posArr[1] = start.y;
        posArr[2] = start.z;
        posArr[3] = end.x;
        posArr[4] = end.y;
        posArr[5] = end.z;
        line.geometry.attributes.position.needsUpdate = true;

        // At grazing angles (>15°), reflection brightness surges!
        line.material.opacity = angleDeg > 15 ? fresnelReflection * 0.8 : 0.0;
      });
    }

    // 5. Update Incident Ray Line on Gizmo (CAD mode)
    if (this.incRayLine && this.incRayGeo) {
      const rayLen = 0.70;
      const posArr = this.incRayGeo.attributes.position.array;
      // Points toward incoming light source: -rayDir
      posArr[3] = -rayDir.x * rayLen;
      posArr[4] = -rayDir.y * rayLen;
      posArr[5] = -rayDir.z * rayLen;
      this.incRayGeo.attributes.position.needsUpdate = true;

      if (this.incRayArrow) {
        this.incRayArrow.position.set(-rayDir.x * rayLen, -rayDir.y * rayLen, -rayDir.z * rayLen);
        this.incRayArrow.lookAt(
          this.incRayArrow.position.x - rayDir.x,
          this.incRayArrow.position.y - rayDir.y,
          this.incRayArrow.position.z - rayDir.z
        );
      }
    }

    // Update curved angle arc & live θ badge
    if (this.arcLine && this.arcGeo) {
      if (angleDeg < 3) {
        this.arcLine.visible = false;
        if (this.thetaBadge) this.thetaBadge.sprite.visible = false;
      } else {
        this.arcLine.visible = true;
        if (this.thetaBadge) this.thetaBadge.sprite.visible = true;
        const arcRadius = 0.38;
        const norm = new THREE.Vector3(0, 1, 0);
        const sunDirVec = new THREE.Vector3(-rayDir.x, -rayDir.y, -rayDir.z).normalize();
        const pos = this.arcGeo.attributes.position.array;
        for (let i = 0; i <= this.ARC_SEGMENTS; i++) {
          const t = i / this.ARC_SEGMENTS;
          const pt = new THREE.Vector3().copy(norm).lerp(sunDirVec, t).normalize().multiplyScalar(arcRadius);
          pos[i * 3] = pt.x;
          pos[i * 3 + 1] = pt.y;
          pos[i * 3 + 2] = pt.z;
        }
        this.arcGeo.attributes.position.needsUpdate = true;
        this.arcLine.computeLineDistances();

        if (this.thetaBadge) {
          const midPt = new THREE.Vector3().copy(norm).lerp(sunDirVec, 0.5).normalize().multiplyScalar(0.52);
          this.thetaBadge.sprite.position.copy(midPt);
          this.thetaBadge.updateText(`θ = ${Math.round(angleDeg)}°`);
        }
      }
    }

    // 6. Update Target Aperture Frame on Panel
    if (this.targetFrameMat) {
      this.targetFrameMat.opacity = Math.max(0.15, 0.7 * cosVal);
    }

    if (this.incidentGizmo) {
      this.incidentGizmo.position.y = landingY + 0.01;
    }

    return { cosVal, iam, fresnelReflection };
  }

  /**
   * Toggle CAD Incident Angle Gizmo Visibility
   */
  setIncidentGizmoVisible(visible) {
    if (this.incidentGizmo) {
      this.incidentGizmo.visible = visible;
    }
  }

  /**
   * Toggle Solar Irradiance 3D Simulation Elements Visibility
   */
  setSunSimulatorVisible(visible) {
    this.sunSimulatorVisible = visible;
    if (this.sunOrb) this.sunOrb.visible = visible;
    if (this.sunArc) this.sunArc.visible = visible;
    if (this.incomingBeamsGroup) this.incomingBeamsGroup.visible = visible;
    if (this.reflectedBeamsGroup) this.reflectedBeamsGroup.visible = visible;

    if (!visible) {
      // Restore clean default studio softbox illumination
      this.keyLight.position.set(4.0, 7.0, 4.5);
      this.keyLight.target.position.set(0, 0.15, 0);
      this.keyLight.target.updateMatrixWorld();
      this.keyLight.intensity = 2.5;
      this.keyLight.color.setRGB(1.0, 1.0, 1.0);
    } else {
      // Re-apply current sun angle lighting and beam calculations
      this.setSunAngle(this.currentSunAngle !== undefined ? this.currentSunAngle : 0);
    }
  }

  /**
   * Dynamically track the landing height of sunlight when layers explode
   */
  updateSunTargetY(y) {
    this.sunTargetY = y;
  }

  render() {
    if (this.sunRing) {
      this.sunRing.lookAt(this.camera.position);
    }
    if (this.sunFlare) {
      this.sunFlare.lookAt(this.camera.position);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
