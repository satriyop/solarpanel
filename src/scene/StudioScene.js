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
    const aspect = this.width / this.height;
    const baseFov = 46;
    let initialFov = baseFov;
    if (aspect < 1.0) {
      initialFov = THREE.MathUtils.clamp(baseFov / aspect * 0.72, 46, 64);
    }
    // Dynamic FOV gives optimal framing on both portrait mobile and widescreen desktop
    this.camera = new THREE.PerspectiveCamera(initialFov, aspect, 0.1, 100);
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

    const aspect = this.width / this.height;
    this.camera.aspect = aspect;

    // Dynamic FOV adaptation for mobile portrait & tablets so solar panel remains in full view
    const baseFov = 46;
    if (aspect < 1.0) {
      this.camera.fov = THREE.MathUtils.clamp(baseFov / aspect * 0.72, 46, 64);
    } else if (aspect < 1.35) {
      this.camera.fov = THREE.MathUtils.clamp(baseFov / aspect * 0.88, 46, 52);
    } else {
      this.camera.fov = baseFov;
    }

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



  /**
   * Computes the exact 3D world coordinates of any aperture point (ox, oz)
   * on the 22° tilted solar panel, dynamically tracking layer explosion separation.
   */
  getPanelWorldPoint(ox = 0, oz = 0) {
    const tiltRad = THREE.MathUtils.degToRad(22);
    const sinTilt = Math.sin(tiltRad);
    const cosTilt = Math.cos(tiltRad);
    const baseY = 0.08; // Base elevation of SolarPanelModel group
    const yLayer = this.sunTargetY !== undefined ? this.sunTargetY : 0.012;

    // Local point (ox, yLayer, oz) rotated by 22° around X-axis, translated by (0, baseY, 0)
    return new THREE.Vector3(
      ox,
      baseY + yLayer * cosTilt - oz * sinTilt,
      yLayer * sinTilt + oz * cosTilt
    );
  }

  /**
   * Calculate 3D position of Sun in the visible sky dome for any incident angle (0° to 80°).
   * 
   * Strictly synchronized with the 22° rooftop panel tilt and celestial diurnal motion:
   * - At angle 0° (Solar Noon STC): Direct Normal Incidence (AOI = 0°). Sun ray is 100% perpendicular to panel.
   * - At angle theta (0°..80°): dot(panelNormal, sunDir) == cos(theta) EXACTLY.
   * - As afternoon progresses, Sun drops along authentic celestial arc toward Western horizon (sunset).
   */
  calculateSunPosition(angleDeg) {
    const tiltRad = THREE.MathUtils.degToRad(22);
    const panelCenter = this.getPanelWorldPoint(0, 0);

    // Surface normal vector of the 22° tilted panel in world space
    const panelNormal = new THREE.Vector3(0, Math.cos(tiltRad), Math.sin(tiltRad));

    // Transverse westward unit vector (azimuthal sun path)
    const westDir = new THREE.Vector3(-1, 0, 0);

    // Incidence angle in radians
    const theta = THREE.MathUtils.degToRad(angleDeg);

    // Sun direction vector pointing from panel center toward Sun:
    // dot(panelNormal, sunDir) == cos(theta) * dot(panelNormal, panelNormal) + sin(theta) * 0 == cos(theta)
    const sunDir = new THREE.Vector3()
      .addScaledVector(panelNormal, Math.cos(theta))
      .addScaledVector(westDir, Math.sin(theta))
      .normalize();

    // 3D celestial distance in sky dome
    const sunDistance = 3.35;
    return new THREE.Vector3().copy(panelCenter).addScaledVector(sunDir, sunDistance);
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

    this.sunTargetY = 0.012; // Dynamically tracks top layer

    // 1. Glowing 3D Sun Orb (White core + golden corona halo + radiant glare disc)
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

    // 2. Collimated Parallel Sunbeam Array (Covering the full 1.134m x 1.722m aperture)
    this.incomingBeamsGroup = new THREE.Group();
    this.incomingRays = [];

    // 3x3 grid of target points across the rectangular solar panel aperture (1.134m x 1.722m)
    this.apertureOffsets = [
      [-0.50, -0.78], [0.0, -0.78], [0.50, -0.78],
      [-0.50,  0.00], [0.0,  0.00], [0.50,  0.00],
      [-0.50,  0.78], [0.0,  0.78], [0.50,  0.78]
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

    // 3. Dynamic Volumetric Sunlight Shaft (Pyramidal Frustum from Sun Orb to Panel Corners)
    const volGeo = new THREE.BufferGeometry();
    const volPositions = new Float32Array(8 * 3);
    volGeo.setAttribute('position', new THREE.BufferAttribute(volPositions, 3));
    const volIndices = [
      0, 1, 5,  0, 5, 4, // North face
      1, 2, 6,  1, 6, 5, // East face
      2, 3, 7,  2, 7, 6, // South face
      3, 0, 4,  3, 4, 7, // West face
      4, 5, 6,  4, 6, 7  // Base cap on panel
    ];
    volGeo.setIndex(volIndices);

    const volMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.07,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.lightVolume = new THREE.Mesh(volGeo, volMat);
    this.incomingBeamsGroup.add(this.lightVolume);

    // 4. Normal Vector & Angle-of-Incidence (AOI) CAD Gizmo on panel center
    this.aoiGizmoGroup = new THREE.Group();

    // Surface Normal Arrow (Cyan/Electric Blue)
    const normalLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.52, 0)
    ]);
    const normalLineMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4, // Cyan
      linewidth: 2,
      transparent: true,
      opacity: 0.90
    });
    this.normalArrowLine = new THREE.Line(normalLineGeo, normalLineMat);
    this.aoiGizmoGroup.add(this.normalArrowLine);

    const normalConeGeo = new THREE.ConeGeometry(0.014, 0.042, 16);
    const normalConeMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    this.normalCone = new THREE.Mesh(normalConeGeo, normalConeMat);
    this.aoiGizmoGroup.add(this.normalCone);

    // Sun Vector Arrow (Warm Solar Gold)
    const sunRayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.52, 0)
    ]);
    const sunRayMat = new THREE.LineBasicMaterial({
      color: 0xfbbf24, // Gold
      linewidth: 2,
      transparent: true,
      opacity: 0.92
    });
    this.sunRayLine = new THREE.Line(sunRayGeo, sunRayMat);
    this.aoiGizmoGroup.add(this.sunRayLine);

    const sunConeGeo = new THREE.ConeGeometry(0.014, 0.042, 16);
    const sunConeMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    this.sunCone = new THREE.Mesh(sunConeGeo, sunConeMat);
    this.aoiGizmoGroup.add(this.sunCone);

    // Degree Arc between Normal and Sun Vector
    const arcPoints = [];
    for (let i = 0; i <= 24; i++) {
      arcPoints.push(new THREE.Vector3(0, 0, 0));
    }
    const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMat = new THREE.LineBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.85
    });
    this.aoiArcLine = new THREE.Line(arcGeo, arcMat);
    this.aoiGizmoGroup.add(this.aoiArcLine);

    // Anchor ring disc flush with panel surface
    const anchorGeo = new THREE.RingGeometry(0.02, 0.04, 24);
    anchorGeo.rotateX(-Math.PI / 2);
    const anchorMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    this.aoiAnchor = new THREE.Mesh(anchorGeo, anchorMat);
    this.aoiGizmoGroup.add(this.aoiAnchor);

    this.incomingBeamsGroup.add(this.aoiGizmoGroup);
    this.sunGroup.add(this.incomingBeamsGroup);

    // 5. Fresnel Reflected Specular Rays (Simulating optical losses bouncing off glass into sky)
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

    // Initialize at 0° (High Noon)
    this.setSunAngle(0);

    // Default to hidden so initial view focuses purely on solar panel component breakdown
    this.setSunSimulatorVisible(false);
  }

  /**
   * Set Sun Zenith Angle (0° = Direct Normal Overhead, 80° = Low Grazing Sunset)
   * Visually animates parallel ray wavefronts, Fresnel specular reflections, and layer tracking!
   */
  setSunAngle(angleDeg) {
    this.currentSunAngle = angleDeg;
    const rad = THREE.MathUtils.degToRad(angleDeg);
    const cosVal = Math.cos(rad);
    const sinVal = Math.sin(rad);

    const tiltRad = THREE.MathUtils.degToRad(22);
    const panelCenter = this.getPanelWorldPoint(0, 0);
    const panelNormal = new THREE.Vector3(0, Math.cos(tiltRad), Math.sin(tiltRad));
    const westDir = new THREE.Vector3(-1, 0, 0);

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

    // Direction vector from sun toward panel center
    const sunToPanel = new THREE.Vector3().subVectors(panelCenter, sunPos);
    const rayDir = sunToPanel.clone().normalize(); // Points from Sun toward panel
    const sunVector = rayDir.clone().negate(); // Points from panel toward Sun

    // 2. Update Directional Key Light
    this.keyLight.position.set(sunPos.x * 2.0, sunPos.y * 2.0, sunPos.z * 2.0);
    this.keyLight.target.position.copy(panelCenter);
    this.keyLight.target.updateMatrixWorld();
    this.keyLight.intensity = Math.max(0.5, 2.8 * Math.pow(cosVal, 0.6));

    // Dynamic light color: Crisp 6000K daylight -> Warm 3200K sunset gold
    const warmFactor = Math.min(1.0, angleDeg / 80);
    this.keyLight.color.setRGB(1.0, 1.0 - warmFactor * 0.15, 1.0 - warmFactor * 0.35);

    // 3. Update Collimated Parallel Incoming Rays (landing precisely on the 22° tilted panel aperture)
    if (this.incomingRays) {
      this.incomingRays.forEach(({ line, ox, oz }) => {
        const target = this.getPanelWorldPoint(ox, oz);

        // Source: Originates directly inside the glowing 3D Sun Orb
        const source = new THREE.Vector3(
          sunPos.x + (ox / 0.50) * 0.08,
          sunPos.y,
          sunPos.z + (oz / 0.78) * 0.08
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

    // 4. Update Volumetric Sunlight Shaft (Pyramidal Frustum from Sun Orb to Panel Corners)
    if (this.lightVolume) {
      const posArr = this.lightVolume.geometry.attributes.position.array;
      const sunR = 0.12; // Emitter radius around Sun Orb

      // Top quad around Sun
      posArr[0] = sunPos.x - sunR;
      posArr[1] = sunPos.y;
      posArr[2] = sunPos.z - sunR;

      posArr[3] = sunPos.x + sunR;
      posArr[4] = sunPos.y;
      posArr[5] = sunPos.z - sunR;

      posArr[6] = sunPos.x + sunR;
      posArr[7] = sunPos.y;
      posArr[8] = sunPos.z + sunR;

      posArr[9] = sunPos.x - sunR;
      posArr[10] = sunPos.y;
      posArr[11] = sunPos.z + sunR;

      // Bottom quad at 4 corners of 415Wp tilted panel (hw = 0.55m, hl = 0.84m)
      const hw = 0.55;
      const hl = 0.84;
      const cTL = this.getPanelWorldPoint(-hw, -hl);
      const cTR = this.getPanelWorldPoint(hw, -hl);
      const cBR = this.getPanelWorldPoint(hw, hl);
      const cBL = this.getPanelWorldPoint(-hw, hl);

      // 4: Top-Left
      posArr[12] = cTL.x;
      posArr[13] = cTL.y;
      posArr[14] = cTL.z;
      // 5: Top-Right
      posArr[15] = cTR.x;
      posArr[16] = cTR.y;
      posArr[17] = cTR.z;
      // 6: Bottom-Right
      posArr[18] = cBR.x;
      posArr[19] = cBR.y;
      posArr[20] = cBR.z;
      // 7: Bottom-Left
      posArr[21] = cBL.x;
      posArr[22] = cBL.y;
      posArr[23] = cBL.z;

      this.lightVolume.geometry.attributes.position.needsUpdate = true;
      this.lightVolume.geometry.computeVertexNormals();
      this.lightVolume.material.opacity = Math.max(0.015, 0.08 * cosVal);
    }

    // 5. Update Fresnel Reflected Rays (θ_refl = θ_inc, bouncing away from front glass)
    const b0 = 0.05;
    const iam = Math.max(0.05, 1.0 - b0 * (1.0 / Math.max(0.1, cosVal) - 1.0));
    const fresnelReflection = Math.min(1.0, Math.max(0.02, 1.0 - iam + Math.pow(sinVal, 5) * 0.8));

    if (this.reflectedRays) {
      const reflLength = 2.4;
      // Mirror reflection: incoming rayDir bounced across panel normal
      const reflDir = rayDir.clone().reflect(panelNormal).normalize();

      this.reflectedRays.forEach(({ line, ox, oz }) => {
        const start = this.getPanelWorldPoint(ox, oz);
        const end = new THREE.Vector3().copy(start).addScaledVector(reflDir, reflLength);

        const posArr = line.geometry.attributes.position.array;
        posArr[0] = start.x;
        posArr[1] = start.y;
        posArr[2] = start.z;
        posArr[3] = end.x;
        posArr[4] = end.y;
        posArr[5] = end.z;
        line.geometry.attributes.position.needsUpdate = true;

        // At grazing angles (>10°), reflection brightness surges!
        line.material.opacity = angleDeg > 10 ? fresnelReflection * 0.8 : 0.0;
      });
    }

    // 6. Update Normal Vector & AOI CAD Gizmo on Panel
    if (this.aoiGizmoGroup) {
      const gLen = 0.52;
      const normTip = new THREE.Vector3().copy(panelCenter).addScaledVector(panelNormal, gLen);
      const sunTip = new THREE.Vector3().copy(panelCenter).addScaledVector(sunVector, gLen);

      // Normal arrow line & cone
      const nPos = this.normalArrowLine.geometry.attributes.position.array;
      nPos[0] = panelCenter.x;
      nPos[1] = panelCenter.y;
      nPos[2] = panelCenter.z;
      nPos[3] = normTip.x;
      nPos[4] = normTip.y;
      nPos[5] = normTip.z;
      this.normalArrowLine.geometry.attributes.position.needsUpdate = true;

      this.normalCone.position.copy(normTip);
      this.normalCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), panelNormal);

      // Sun vector line & cone
      const sPos = this.sunRayLine.geometry.attributes.position.array;
      sPos[0] = panelCenter.x;
      sPos[1] = panelCenter.y;
      sPos[2] = panelCenter.z;
      sPos[3] = sunTip.x;
      sPos[4] = sunTip.y;
      sPos[5] = sunTip.z;
      this.sunRayLine.geometry.attributes.position.needsUpdate = true;

      this.sunCone.position.copy(sunTip);
      this.sunCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sunVector);

      // Anchor disc flush with panel surface
      this.aoiAnchor.position.copy(panelCenter);
      this.aoiAnchor.rotation.x = tiltRad;

      // Arc between Normal and Sun Vector
      const arcPos = this.aoiArcLine.geometry.attributes.position.array;
      const arcRadius = 0.32;
      const segCount = 24;
      for (let i = 0; i <= segCount; i++) {
        const subAngle = (rad * i) / segCount;
        const arcDir = new THREE.Vector3()
          .addScaledVector(panelNormal, Math.cos(subAngle))
          .addScaledVector(westDir, Math.sin(subAngle))
          .normalize();
        const pt = new THREE.Vector3().copy(panelCenter).addScaledVector(arcDir, arcRadius);
        arcPos[i * 3] = pt.x;
        arcPos[i * 3 + 1] = pt.y;
        arcPos[i * 3 + 2] = pt.z;
      }
      this.aoiArcLine.geometry.attributes.position.needsUpdate = true;
      this.aoiArcLine.visible = (angleDeg > 2);
      this.sunRayLine.visible = (angleDeg > 2);
      this.sunCone.visible = (angleDeg > 2);
    }

    return { cosVal, iam, fresnelReflection };
  }

  /**
   * Toggle Solar Irradiance 3D Simulation Elements Visibility
   */
  setSunSimulatorVisible(visible) {
    this.sunSimulatorVisible = visible;
    if (this.sunOrb) this.sunOrb.visible = visible;
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
