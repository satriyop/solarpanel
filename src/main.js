import { StudioScene } from './scene/StudioScene.js';
import { SolarPanelModel } from './components/SolarPanelModel.js';
import { AnimationController } from './animation/AnimationController.js';
import { PowerFlowController } from './components/PowerFlowController.js';
import { CentralInverterModel } from './components/CentralInverterModel.js';

// Initialize application on DOM content loaded
window.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('canvas-container');
  const labelsContainer = document.getElementById('labels-container');

  // 1. Initialize 3D Studio Environment
  const studio = new StudioScene(canvasContainer);

  // 2. Initialize Solar Panel Model (8 sequential photorealistic layers)
  const solarPanel = new SolarPanelModel();
  studio.scene.add(solarPanel.group);

  // 3. Initialize Wall-Mounted Central / Hybrid String Inverter (5.0kW)
  const centralInverter = new CentralInverterModel();
  studio.scene.add(centralInverter.group);

  // 4. Initialize Animation & Motion Controller
  const anim = new AnimationController(solarPanel, studio, labelsContainer);
  anim.setCentralInverter(centralInverter);

  // 5. Initialize Electrical Power Flow Controller (DC to AC Conversion)
  const powerFlow = new PowerFlowController(solarPanel, studio);
  powerFlow.setCentralInverter(centralInverter);

  // 6. UI Elements
  const btnStartFrame = document.getElementById('btn-start-frame');
  const btnEndFrame = document.getElementById('btn-end-frame');
  const sliderExplode = document.getElementById('slider-explode');
  const labelExplodeVal = document.getElementById('label-explode-val');
  const btnAutoCycle = document.getElementById('btn-auto-cycle');
  const btnOrbitPan = document.getElementById('btn-orbit-pan');
  const btnToggleLabels = document.getElementById('btn-toggle-labels');
  const btnToggleSun = document.getElementById('btn-toggle-sun');
  const btnTogglePower = document.getElementById('btn-toggle-power');
  const btnToggleInverterMode = document.getElementById('btn-toggle-inverter-mode');
  const labelInverterMode = document.getElementById('label-inverter-mode');
  const btnToggleView = document.getElementById('btn-toggle-view');
  const btnToggleTheme = document.getElementById('btn-toggle-theme');
  const pillInverter = document.getElementById('pill-inverter');
  const sunSimCard = document.querySelector('.sun-simulator-card');
  const layerPills = document.querySelectorAll('.layer-pill');
  const mlpeAcWatts = document.getElementById('mlpe-ac-watts');

  let isAutoCycleRunning = true;
  let autoCycleTimer = null;
  let isDarkTheme = true;
  let isSunSimulatorActive = false;
  let isPowerFlowActive = false;
  let currentInverterMode = 'micro'; // 'micro' (rooftop MLPE) or 'central' (wall-mounted string)
  let isUndersideView = false;
  let currentWatts = 410;

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
    currentWatts = watts;
    const pct = Math.round((watts / 410) * 100);

    sunWattsVal.textContent = watts;
    sunImpVal.textContent = `Imp: ${imp}A`;
    if (sunVmpVal) sunVmpVal.textContent = `Vmp: ${vmp}V`;
    if (sunIamVal) sunIamVal.textContent = `IAM: ${Math.round(iam * 100)}%`;
    if (mlpeAcWatts) mlpeAcWatts.textContent = `${Math.round(watts * 0.975)}W AC`;
    powerGaugeFill.style.width = `${pct}%`;

    // 3. Update 3D silicon wafer photon absorption glow
    solarPanel.setSunAbsorption(relG);

    // 4. Update Central Inverter live telemetry if present
    if (centralInverter) {
      centralInverter.updateTelemetry(watts);
    }
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


  // Solar Irradiance Simulator Toggle (Sun Orb, Beams, HUD Widget)
  if (btnToggleSun) {
    btnToggleSun.addEventListener('click', () => {
      isSunSimulatorActive = !isSunSimulatorActive;
      btnToggleSun.classList.toggle('active', isSunSimulatorActive);
      if (sunSimCard) {
        sunSimCard.classList.toggle('active', isSunSimulatorActive);
      }
      studio.setSunSimulatorVisible(isSunSimulatorActive);
      if (isSunSimulatorActive) {
        updateSolarGeneration(currentSunAngle);
      } else {
        solarPanel.setSunAbsorption(1.0);
      }
    });
  }

  // Power Flow Animation Toggle (DC from cells -> J-box -> Microinverter -> 240V AC to grid)
  if (btnTogglePower) {
    btnTogglePower.addEventListener('click', () => {
      isPowerFlowActive = !isPowerFlowActive;
      btnTogglePower.classList.toggle('active', isPowerFlowActive);
      powerFlow.setVisible(isPowerFlowActive);
    });
  }

  // Function to switch between Inverter Architectures (Microinverter vs Central String Inverter)
  function setInverterArchitecture(mode) {
    currentInverterMode = mode;
    const isCentral = (mode === 'central');

    // 1. Reconfigure 3D Solar Panel underside (show/hide microinverter & swap DC leads)
    solarPanel.setInverterMode(mode);

    // 2. Reconfigure electrical particle routing
    powerFlow.setInverterMode(mode);

    // 3. Show/hide Wall-Mounted Central Inverter, equipment board, Soladeck box & EMT conduit
    centralInverter.setVisible(isCentral);

    // 4. Update HUD switcher button
    if (btnToggleInverterMode) {
      btnToggleInverterMode.classList.toggle('active', isCentral);
    }
    if (labelInverterMode) {
      labelInverterMode.textContent = isCentral ? 'Inverter: Central (5kW)' : 'Inverter: Micro (MLPE)';
    }

    // 5. Update Layer Pill label
    if (pillInverter) {
      pillInverter.textContent = isCentral ? '8. Central Inverter (5kW)' : '8. Microinverter (MLPE)';
      pillInverter.dataset.layer = isCentral ? 'centralInverter' : 'inverter';
    }

    // 6. Update Central Inverter live telemetry if active
    if (isCentral) {
      centralInverter.updateTelemetry(currentWatts);
    }
  }

  // Inverter Architecture Switcher (Roof Microinverter vs Wall Central Inverter)
  if (btnToggleInverterMode) {
    btnToggleInverterMode.addEventListener('click', () => {
      const nextMode = (currentInverterMode === 'micro') ? 'central' : 'micro';
      setInverterArchitecture(nextMode);
    });
  }

  // Camera View Toggle (Front Sun-Facing Cells vs Underside MLPE Microinverter & J-Box)
  if (btnToggleView) {
    btnToggleView.addEventListener('click', () => {
      isUndersideView = !isUndersideView;
      btnToggleView.classList.toggle('active', isUndersideView);
      btnToggleView.innerHTML = isUndersideView
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Front View`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Underside View`;
      anim.setCameraView(isUndersideView ? 'underside' : 'front');
    });
  }

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

  // Set default visual presets: Dark Studio & Microinverter MLPE architecture
  studio.setStudioTheme(true);
  studio.setSunSimulatorVisible(false);
  solarPanel.setSunAbsorption(1.0);
  setInverterArchitecture('micro');

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

      if (layerId === 'centralInverter') {
        solarPanel.focusLayer('all');
        anim.focusCameraOnCentralInverter();
      } else {
        // 1. Isolate layer opacity
        solarPanel.focusLayer(layerId);

        // 2. Cinematic Macro Camera Zoom: Fly right up to the component
        anim.focusCameraOnLayer(layerId);
      }
    });
  });

  // 5. Main Render Loop
  let lastTime = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    anim.update(delta);
    powerFlow.update(delta, currentWatts);
    studio.render();
  }

  requestAnimationFrame(animate);
});
