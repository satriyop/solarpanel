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
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  initScene() {
    this.scene = new THREE.Scene();
    // Neutral studio gray background
    this.scene.background = new THREE.Color(0xdce0e6);
    this.scene.fog = new THREE.Fog(0xdce0e6, 6, 18);
  }

  initCamera() {
    // 40° FOV gives a sleek isometric-like telephoto engineering diagram look
    this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 0.1, 100);
    // Isometric angle: elevated 35°, angled 45°
    this.camera.position.set(3.0, 2.6, 3.4);
    this.camera.lookAt(0, 0, 0);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 8.5;
    this.controls.minDistance = 1.5;
    this.controls.target.set(0, 0, 0);
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
      opacity: 0.22
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
   * Initialize 3D Sun Visualizer:
   * 1. Celestial Arc Trajectory in sky
   * 2. Glowing Sun Orb with corona halo
   * 3. Volumetric Sunbeam pointing directly at the solar panel
   * 4. Normal Vector & Incident Angle (θ) CAD Gizmo on panel center
   */
  initSunVisualizer() {
    this.sunGroup = new THREE.Group();
    this.scene.add(this.sunGroup);

    const R = 3.6; // Visual celestial radius

    // 1. Celestial Arc Path (0° to 80°)
    const arcPoints = [];
    for (let deg = 0; deg <= 80; deg += 2) {
      const rad = (deg * Math.PI) / 180;
      arcPoints.push(new THREE.Vector3(
        R * Math.sin(rad),
        R * Math.cos(rad) + 0.3,
        (R * 0.35) * Math.cos(rad)
      ));
    }
    const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 0.06,
      gapSize: 0.04,
      transparent: true,
      opacity: 0.6
    });
    this.sunArc = new THREE.Line(arcGeo, arcMat);
    this.sunArc.computeLineDistances();
    this.sunGroup.add(this.sunArc);

    // 2. Glowing 3D Sun Orb (White core + amber corona halo)
    this.sunOrb = new THREE.Group();

    const coreGeo = new THREE.SphereGeometry(0.12, 20, 20);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.sunOrb.add(coreMesh);

    const coronaGeo = new THREE.SphereGeometry(0.24, 20, 20);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.55
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    this.sunOrb.add(coronaMesh);

    const ringGeo = new THREE.RingGeometry(0.24, 0.48, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    this.sunRing = new THREE.Mesh(ringGeo, ringMat);
    this.sunOrb.add(this.sunRing);

    this.sunGroup.add(this.sunOrb);

    // 3. Volumetric Sunbeam Cone (Connecting Sun Orb to Solar Panel Surface)
    this.sunBeamGroup = new THREE.Group();

    // Translucent light cone
    const coneGeo = new THREE.CylinderGeometry(0.15, 0.75, 1, 24, 1, true);
    coneGeo.translate(0, 0.5, 0); // Origin at top
    coneGeo.rotateX(Math.PI / 2);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.beamCone = new THREE.Mesh(coneGeo, coneMat);
    this.sunBeamGroup.add(this.beamCone);

    // Central bright ray lines
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 1)
    ]);
    const rayMat = new THREE.LineBasicMaterial({
      color: 0xffe082,
      transparent: true,
      opacity: 0.6
    });
    this.beamCenterRay = new THREE.Line(rayGeo, rayMat);
    this.sunBeamGroup.add(this.beamCenterRay);

    this.sunGroup.add(this.sunBeamGroup);

    // 4. Incident Angle (θ) CAD Gizmo on Panel Surface
    this.incidentGizmo = new THREE.Group();
    this.incidentGizmo.position.set(0, 0.03, 0);

    // Normal vector arrow (pointing straight up 90°)
    const normalPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.6, 0)];
    const normalGeo = new THREE.BufferGeometry().setFromPoints(normalPoints);
    const normalMat = new THREE.LineDashedMaterial({
      color: 0x06b6d4,
      dashSize: 0.03,
      gapSize: 0.02,
      transparent: true,
      opacity: 0.8
    });
    this.normalLine = new THREE.Line(normalGeo, normalMat);
    this.normalLine.computeLineDistances();
    this.incidentGizmo.add(this.normalLine);

    // Incident ray line on panel
    const incRayPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.6, 0)];
    this.incRayGeo = new THREE.BufferGeometry().setFromPoints(incRayPoints);
    const incRayMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });
    this.incRayLine = new THREE.Line(this.incRayGeo, incRayMat);
    this.incidentGizmo.add(this.incRayLine);

    // Center illuminated target disk on solar panel
    const diskGeo = new THREE.RingGeometry(0.04, 0.12, 32);
    diskGeo.rotateX(-Math.PI / 2);
    this.spotDiskMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    this.spotDisk = new THREE.Mesh(diskGeo, this.spotDiskMat);
    this.incidentGizmo.add(this.spotDisk);

    this.sunGroup.add(this.incidentGizmo);

    // Initialize at 0° (High Noon)
    this.setSunAngle(0);
  }

  /**
   * Set Sun Zenith Angle (0° = Direct Overhead High Noon, 80° = Low Grazing Sunset)
   * Visually animates the Sun Orb, Sunbeam Cone, and Incident Angle Gizmo in 3D!
   */
  setSunAngle(angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    const cosVal = Math.cos(rad);
    const sinVal = Math.sin(rad);

    // 1. Update Key Directional Light
    const lightRadius = 9.0;
    const lx = lightRadius * sinVal;
    const ly = Math.max(1.5, lightRadius * cosVal);
    const lz = 3.5 * cosVal + 1.0;
    this.keyLight.position.set(lx, ly, lz);
    this.keyLight.intensity = Math.max(0.4, 2.6 * Math.pow(cosVal, 0.6));

    // Dynamic light color: Crisp 6000K daylight -> Warm 3200K sunset gold
    const warmFactor = Math.min(1.0, angleDeg / 80);
    this.keyLight.color.setRGB(1.0, 1.0 - warmFactor * 0.15, 1.0 - warmFactor * 0.35);

    // 2. Position 3D Sun Orb in the sky
    const R = 3.6;
    const sunX = R * sinVal;
    const sunY = R * cosVal + 0.3;
    const sunZ = (R * 0.35) * cosVal;

    if (this.sunOrb) {
      this.sunOrb.position.set(sunX, sunY, sunZ);
      if (this.sunRing) {
        this.sunRing.lookAt(this.camera.position);
      }
    }

    // 3. Orient & Scale Volumetric Sunbeam from Sun Orb to Panel Center
    if (this.sunBeamGroup && this.beamCone) {
      const targetPos = new THREE.Vector3(0, 0.05, 0);
      const sunPos = new THREE.Vector3(sunX, sunY, sunZ);
      const dist = sunPos.distanceTo(targetPos);

      this.sunBeamGroup.position.copy(sunPos);
      this.sunBeamGroup.lookAt(targetPos);
      this.beamCone.scale.set(1.0, 1.0, dist);
      this.beamCenterRay.scale.set(1.0, 1.0, dist);

      // Beam opacity decreases at sunset
      this.beamCone.material.opacity = Math.max(0.04, 0.18 * cosVal);
    }

    // 4. Update Incident Ray Line on Gizmo
    if (this.incRayLine && this.incRayGeo) {
      const posArr = this.incRayGeo.attributes.position.array;
      posArr[3] = 0.6 * sinVal;
      posArr[4] = 0.6 * cosVal;
      posArr[5] = (0.6 * 0.35) * cosVal;
      this.incRayGeo.attributes.position.needsUpdate = true;
    }

    // 5. Update Center Spot Absorption Disk on Panel
    if (this.spotDiskMat) {
      this.spotDiskMat.opacity = Math.max(0.08, 0.55 * cosVal);
    }

    return cosVal;
  }

  render() {
    if (this.sunRing) {
      this.sunRing.lookAt(this.camera.position);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
