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

  let isAutoCycleRunning = false;
  let autoCycleTimer = null;
  let isDarkTheme = false;
  let is4kEnabled = false;

  // Update UI when progress changes from tween
  anim.onProgressUpdate = (val) => {
    const pct = Math.round(val * 100);
    sliderExplode.value = pct;
    labelExplodeVal.textContent = `${pct}%`;

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

  // Separation Slider
  sliderExplode.addEventListener('input', (e) => {
    stopAutoCycle();
    const val = parseFloat(e.target.value) / 100;
    anim.setProgress(val);
    labelExplodeVal.textContent = `${e.target.value}%`;
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

  // Layer Filter Pills
  layerPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      layerPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const layerId = pill.dataset.layer;
      solarPanel.focusLayer(layerId);
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
