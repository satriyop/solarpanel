import { StudioScene } from './scene/StudioScene.js';
import { SolarPanelModel } from './components/SolarPanelModel.js';
import { AnimationController } from './animation/AnimationController.js';

// Initialize application on DOM content loaded
window.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('canvas-container');
  const labelsContainer = document.getElementById('labels-container');

  // 1. Initialize 3D Studio Environment
  const studio = new StudioScene(canvasContainer);

  // 2. Initialize Solar Panel Model (7 sequential photorealistic layers)
  const solarPanel = new SolarPanelModel();
  studio.scene.add(solarPanel.group);

  // 3. Initialize Animation & Motion Controller
  const anim = new AnimationController(solarPanel, studio, labelsContainer);

  // 4. UI Elements
  const btnStartFrame = document.getElementById('btn-start-frame');
  const btnEndFrame = document.getElementById('btn-end-frame');
  const sliderExplode = document.getElementById('slider-explode');
  const labelExplodeVal = document.getElementById('label-explode-val');
  const btnAutoCycle = document.getElementById('btn-auto-cycle');
  const btnOrbitPan = document.getElementById('btn-orbit-pan');
  const btnToggleLabels = document.getElementById('btn-toggle-labels');
  const btnToggleGuides = document.getElementById('btn-toggle-guides');
  const btnToggleTheme = document.getElementById('btn-toggle-theme');
  const btnToggle4k = document.getElementById('btn-toggle-4k');
  const layerPills = document.querySelectorAll('.layer-pill');

  let isAutoCycleRunning = true;
  let autoCycleTimer = null;
  let isDarkTheme = false;
  let is4kEnabled = true;

  let currentSunAngle = 0;

  // Function to update physical PV generation based on ASHRAE IAM model
  function updateSolarGeneration(angle) {
    currentSunAngle = angle;
    sunAngleLabel.textContent = `Angle: ${angle}°`;

    // 1. Update 3D studio sun position, parallel beam array, and Fresnel reflection rays
    const { cosVal, iam, fresnelReflection } = studio.setSunAngle(angle);

    // 2. Physical PV Calculation (ASHRAE / PVsyst model)
    // Direct Beam Irradiance with Fresnel Incidence Angle Modifier (IAM)
    const gDirect = 1000 * Math.max(0, cosVal) * iam;
    // Ambient Rayleigh scattered diffuse sky irradiance (flat panel on roof receives ~45W ambient)
    const gDiffuse = 45;
    const gTotal = Math.min(1000, gDirect + gDiffuse);
    const relG = Math.max(0.045, gTotal / 1000);

    // Shockley Diode equation: Voltage drops logarithmically with irradiance
    const vmp = (35.6 * (1.0 + 0.038 * Math.log(relG))).toFixed(1);
    // Short-circuit & operating current scales linearly with photon flux
    const imp = (11.5 * relG).toFixed(1);
    // Real electrical power in Watts
    const watts = Math.min(410, Math.round(parseFloat(vmp) * parseFloat(imp)));
    const pct = Math.round((watts / 410) * 100);

    sunWattsVal.textContent = watts;
    sunImpVal.textContent = `Imp: ${imp}A`;
    if (sunVmpVal) sunVmpVal.textContent = `Vmp: ${vmp}V`;
    if (sunIamVal) sunIamVal.textContent = `IAM: ${Math.round(iam * 100)}%`;
    powerGaugeFill.style.width = `${pct}%`;

    // 3. Update 3D silicon wafer photon absorption glow
    solarPanel.setSunAbsorption(relG);
  }

  // Update UI & Sun Landing Height when separation progress changes
  anim.onProgressUpdate = (val) => {
    const pct = Math.round(val * 100);
    sliderExplode.value = pct;
    labelExplodeVal.textContent = `${pct}%`;

    // Dynamically track the landing height of sunlight when layers explode
    const glassLayer = solarPanel.layers.find(l => l.id === 'glass');
    if (glassLayer) {
      studio.updateSunTargetY(glassLayer.currentY);
      studio.setSunAngle(currentSunAngle);
    }

    if (pct < 10) {
      btnStartFrame.classList.add('active');
      btnEndFrame.classList.remove('active');
    } else if (pct > 90) {
      btnStartFrame.classList.remove('active');
      btnEndFrame.classList.add('active');
    } else {
      btnStartFrame.classList.remove('active');
      btnEndFrame.classList.remove('active');
    }
  };

  // Separation Slider
  sliderExplode.addEventListener('input', (e) => {
    stopAutoCycle();
    const val = parseFloat(e.target.value) / 100;
    anim.setProgress(val);
    labelExplodeVal.textContent = `${e.target.value}%`;

    // Dynamically track sunlight landing height
    const glassLayer = solarPanel.layers.find(l => l.id === 'glass');
    if (glassLayer) {
      studio.updateSunTargetY(glassLayer.currentY);
      studio.setSunAngle(currentSunAngle);
    }

    if (val < 0.1) {
      btnStartFrame.classList.add('active');
      btnEndFrame.classList.remove('active');
    } else if (val > 0.9) {
      btnStartFrame.classList.remove('active');
      btnEndFrame.classList.add('active');
    } else {
      btnStartFrame.classList.remove('active');
      btnEndFrame.classList.remove('active');
    }
  });

  // Auto Cycle Animation (Loop between Assembled & Exploded)
  function stopAutoCycle() {
    if (isAutoCycleRunning) {
      isAutoCycleRunning = false;
      btnAutoCycle.classList.remove('active');
      if (autoCycleTimer) clearTimeout(autoCycleTimer);
    }
  }

  function runCycleStep() {
    if (!isAutoCycleRunning) return;
    const target = anim.explodeProgress > 0.5 ? 0.0 : 1.0;
    anim.animateTo(target, 2.5, 'power2.inOut');

    // Wait for animation + hold time (4.5s total)
    autoCycleTimer = setTimeout(() => {
      runCycleStep();
    }, 4500);
  }

  btnAutoCycle.addEventListener('click', () => {
    isAutoCycleRunning = !isAutoCycleRunning;
    btnAutoCycle.classList.toggle('active', isAutoCycleRunning);
    if (isAutoCycleRunning) {
      runCycleStep();
    } else {
      stopAutoCycle();
    }
  });

  // Orbit Pan Toggle
  btnOrbitPan.addEventListener('click', () => {
    const active = !anim.isAutoOrbit;
    anim.setOrbitPan(active);
    btnOrbitPan.classList.toggle('active', active);
  });

  // Labels Toggle
  btnToggleLabels.addEventListener('click', () => {
    const visible = !anim.labelsVisible;
    anim.setLabelsVisible(visible);
    btnToggleLabels.classList.toggle('active', visible);
  });

  // CAD Alignment Guides Toggle
  btnToggleGuides.addEventListener('click', () => {
    const visible = !solarPanel.showAlignmentGuides;
    solarPanel.setAlignmentGuidesVisible(visible);
    solarPanel.setExplodeProgress(anim.explodeProgress);
    studio.setIncidentGizmoVisible(visible);
    btnToggleGuides.classList.toggle('active', visible);
  });

  // Studio Theme Toggle (Neutral Light Gray vs Dark Studio)
  btnToggleTheme.addEventListener('click', () => {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('studio-dark', isDarkTheme);
    btnToggleTheme.classList.toggle('active', isDarkTheme);
    btnToggleTheme.innerHTML = isDarkTheme
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg> Light Studio`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> Dark Studio`;
    studio.setStudioTheme(isDarkTheme);
  });

  // 4K Super Resolution Toggle
  btnToggle4k.addEventListener('click', () => {
    is4kEnabled = !is4kEnabled;
    btnToggle4k.classList.toggle('active', is4kEnabled);
    studio.setSuperResolution(is4kEnabled);
  });

  // Start Frame: Fully Assembled
  btnStartFrame.addEventListener('click', () => {
    stopAutoCycle();
    anim.animateTo(0.0, 2.0);
  });

  // End Frame: Exploded Diagram
  btnEndFrame.addEventListener('click', () => {
    stopAutoCycle();
    anim.animateTo(1.0, 2.0);
  });

  // Sun Angle & Real-Time Power Generation Simulator
  const sliderSunAngle = document.getElementById('slider-sun-angle');
  const sunWattsVal = document.getElementById('sun-watts-val');
  const powerGaugeFill = document.getElementById('power-gauge-fill');
  const sunAngleLabel = document.getElementById('sun-angle-label');
  const sunImpVal = document.getElementById('sun-imp-val');
  const sunVmpVal = document.getElementById('sun-vmp-val');
  const sunIamVal = document.getElementById('sun-iam-val');

  if (sliderSunAngle) {
    sliderSunAngle.addEventListener('input', (e) => {
      const angle = parseFloat(e.target.value);
      updateSolarGeneration(angle);
    });
  }

  // Initialize at 0° High Noon
  updateSolarGeneration(0);

  // Set default visual presets: Light Studio & 4K Super Resolution
  studio.setStudioTheme(false);
  studio.setSuperResolution(true);

  // Kick off Auto Cycle animation after a brief 1.2s initial view of the assembled panel
  autoCycleTimer = setTimeout(() => {
    runCycleStep();
  }, 1200);

  // Interactive 3D Hover Tooltip Card
  const hoverTooltip = document.getElementById('hover-tooltip');
  if (hoverTooltip) {
    anim.setupHoverTooltips(hoverTooltip);
  }

  // Layer Filter Pills with Cinematic Macro Camera Fly-In
  layerPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      stopAutoCycle();
      layerPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const layerId = pill.dataset.layer;

      // 1. Isolate layer opacity
      solarPanel.focusLayer(layerId);

      // 2. Cinematic Macro Camera Zoom: Fly right up to the component
      anim.focusCameraOnLayer(layerId);
    });
  });

  // 5. Main Render Loop
  let lastTime = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    anim.update(delta);
    studio.render();
  }

  requestAnimationFrame(animate);
});
