import { StudioScene } from './scene/StudioScene.js';
import { SolarPanelModel } from './components/SolarPanelModel.js';
import { AnimationController } from './animation/AnimationController.js';
import { PowerFlowController } from './components/PowerFlowController.js';
import { CentralInverterModel } from './components/CentralInverterModel.js';
import { BatteryStorageModel } from './components/BatteryStorageModel.js';
import { PLNGridDistributionModel } from './components/PLNGridDistributionModel.js';

// Initialize application
function startApplication() {
  try {
    const canvasContainer = document.getElementById('canvas-container');
  const labelsContainer = document.getElementById('labels-container');

  // 1. Initialize 3D Studio Environment
  const studio = new StudioScene(canvasContainer);

  // 2. Initialize Solar Panel Model (8 sequential photorealistic layers)
  const solarPanel = new SolarPanelModel();
  studio.scene.add(solarPanel.group);

  // 3. Initialize Indonesian PLN Grid Distribution Board (Smart Meter AMI, Zero-Export DDSU666, ATS, AC Combiner)
  const plnDistribution = new PLNGridDistributionModel();
  studio.scene.add(plnDistribution.group);

  // 4. Initialize Wall-Mounted Central / Hybrid String Inverter (5.0kW)
  const centralInverter = new CentralInverterModel();
  studio.scene.add(centralInverter.group);

  // 5. Initialize Home Battery Energy Storage System (10.5kWh LiFePO4 BESS)
  const batteryStorage = new BatteryStorageModel();
  studio.scene.add(batteryStorage.group);

  // 6. Initialize Animation & Motion Controller
  const anim = new AnimationController(solarPanel, studio, labelsContainer);
  anim.setPlnDistribution(plnDistribution);
  anim.setCentralInverter(centralInverter);
  anim.setBatteryStorage(batteryStorage);

  // 7. Initialize Electrical Power Flow Controller (DC to AC Conversion)
  const powerFlow = new PowerFlowController(solarPanel, studio);
  powerFlow.setPlnDistribution(plnDistribution);
  powerFlow.setCentralInverter(centralInverter);
  powerFlow.setBatteryStorage(batteryStorage);

  // 8. UI Elements
  const btnModeOngrid = document.getElementById('btn-mode-ongrid');
  const btnModeOffgrid = document.getElementById('btn-mode-offgrid');
  const badgeGridMode = document.getElementById('badge-grid-mode');
  const btnToggleBreakdown = document.getElementById('btn-toggle-breakdown');
  const btnOrbitPan = document.getElementById('btn-orbit-pan');
  const btnToggleLabels = document.getElementById('btn-toggle-labels');
  const btnToggleSun = document.getElementById('btn-toggle-sun');
  const btnCloseSunCard = document.getElementById('btn-close-sun-card');
  const btnTogglePower = document.getElementById('btn-toggle-power');
  const btnToggleInverterMode = document.getElementById('btn-toggle-inverter-mode');
  const labelInverterMode = document.getElementById('label-inverter-mode');
  const btnTogglePln = document.getElementById('btn-toggle-pln');
  const btnToggleBattery = document.getElementById('btn-toggle-battery');
  const btnToggleView = document.getElementById('btn-toggle-view');
  const sunSimCard = document.querySelector('.sun-simulator-card');
  const mlpeAcWatts = document.getElementById('mlpe-ac-watts');
  const labelInvStat = document.getElementById('label-inv-stat');
  const labelGridStat = document.getElementById('label-grid-stat');
  const valGridStat = document.getElementById('val-grid-stat');
  const barSolarShare = document.getElementById('bar-solar-share');
  const barPlnShare = document.getElementById('bar-pln-share');
  const valSolarSplit = document.getElementById('val-solar-split');
  const valPlnSplit = document.getElementById('val-pln-split');
  const titleEnergyBalance = document.getElementById('title-energy-balance');
  const badgeEnergyBalance = document.getElementById('badge-energy-balance');
  const labelSolarSplit = document.getElementById('label-solar-split');
  const dotSecondarySource = document.getElementById('dot-secondary-source');
  const labelSecondarySplit = document.getElementById('label-secondary-split');
  const bessAutonomyRow = document.getElementById('bess-autonomy-row');
  const valBessRuntime = document.getElementById('val-bess-runtime');
  const btnCircuitAc = document.getElementById('btn-circuit-ac');
  const btnCircuitFridge = document.getElementById('btn-circuit-fridge');
  const btnCircuitLights = document.getElementById('btn-circuit-lights');

  // Consumer Load Unit Branch Circuits for Load Shedding Simulation
  const circuits = [
    { id: 'ac', name: 'AC Inverter', watts: 600, active: true, btn: btnCircuitAc },
    { id: 'fridge', name: 'Kulkas Inverter', watts: 150, active: true, btn: btnCircuitFridge },
    { id: 'lights', name: 'Lampu & Wi-Fi', watts: 150, active: true, btn: btnCircuitLights }
  ];

  function setCircuitState(index, active, suppressToast = false) {
    if (!circuits[index]) return;
    circuits[index].active = active;
    if (circuits[index].btn) {
      circuits[index].btn.classList.toggle('active', active);
    }
    plnDistribution.setCircuitState(index, active);
    powerFlow.setActiveLoads(circuits.map(c => c.active));
    updateSolarGeneration(currentSunAngle);

    if (!suppressToast) {
      const circuitName = circuits[index].name;
      const circuitWatts = circuits[index].watts;
      if (active) {
        showToast(`🟢 <strong>MCB ${circuitName} (${circuitWatts}W) Dihidupkan:</strong> Beban rumah bertambah.`);
      } else {
        showToast(`⚠️ <strong>Load Shedding: MCB ${circuitName} (${circuitWatts}W) Dimatikan:</strong> Mengurangi konsumsi daya cadangan.`);
      }
    }
  }

  function toggleCircuit(index) {
    if (!circuits[index]) return;
    setCircuitState(index, !circuits[index].active, false);
  }

  if (btnCircuitAc) btnCircuitAc.addEventListener('click', () => toggleCircuit(0));
  if (btnCircuitFridge) btnCircuitFridge.addEventListener('click', () => toggleCircuit(1));
  if (btnCircuitLights) btnCircuitLights.addEventListener('click', () => toggleCircuit(2));

  // Connect 3D MCB lever click from 3D scene directly to toggleCircuit
  anim.onCircuitToggle = (index) => toggleCircuit(index);

  let isSunSimulatorActive = false;
  let isPowerFlowActive = false;
  let isBatteryActive = false;
  let isPlnActive = false;
  let currentGridMode = 'ongrid'; // 'ongrid' or 'offgrid'
  let currentInverterMode = 'micro'; // 'micro' (rooftop MLPE) or 'central' (wall-mounted string)
  let isUndersideView = false;
  let currentWatts = 415;

  let currentSunAngle = 0;

  // Function to update physical PV generation based on ASHRAE IAM model
  function updateSolarGeneration(angle) {
    currentSunAngle = angle;
    sunAngleLabel.textContent = angle === 0 ? 'AOI: 0° (Normal 90°)' : `AOI: ${angle}°`;

    // 1. Update 3D studio sun position, parallel beam array, and Fresnel reflection rays
    const { cosVal, iam, fresnelReflection } = studio.setSunAngle(angle);

    // 2. Physical PV Calculation (ASHRAE / PVsyst model)
    // Direct Beam Irradiance with Fresnel Incidence Angle Modifier (IAM)
    const gDirect = 1000 * Math.max(0, cosVal) * iam;
    // Ambient Rayleigh scattered diffuse sky irradiance (flat panel on roof receives ~45W ambient)
    const gDiffuse = 45;
    const gTotal = Math.min(1000, gDirect + gDiffuse);
    const relG = Math.max(0.045, gTotal / 1000);

    // Shockley Diode equation: Tier-1 415Wp Half-Cut module (Vmp ~31.6V, Imp ~13.13A at STC)
    const vmp = (31.6 * (1.0 + 0.038 * Math.log(relG))).toFixed(1);
    // Operating current scales linearly with tropical photon flux
    const imp = (13.13 * relG).toFixed(1);
    // Real electrical power in Watts (415Wp max at STC)
    const watts = Math.min(415, Math.round(parseFloat(vmp) * parseFloat(imp)));
    currentWatts = watts;
    const pct = Math.round((watts / 415) * 100);

    sunWattsVal.textContent = watts;
    sunImpVal.textContent = `Imp: ${imp}A`;
    if (sunVmpVal) sunVmpVal.textContent = `Vmp: ${vmp}V`;
    if (sunEffVal) sunEffVal.textContent = `Eff: 21.3%`;
    if (sunIamVal) sunIamVal.textContent = `IAM: ${Math.round(iam * 100)}%`;
    const acSolarWatts = Math.min(415, Math.round(watts * 0.975));
    if (mlpeAcWatts) mlpeAcWatts.textContent = `${acSolarWatts}W AC`;
    powerGaugeFill.style.width = `${pct}%`;

    // Dual-Source Energy Balance calculation for Household Load
    // Sesuai Permen ESDM No. 2/2024: 100% konsumsi mandiri tanpa ekspor ke grid (Zero-Export PCC)
    const totalHomeLoad = circuits.reduce((sum, c) => c.active ? sum + c.watts : sum, 0);
    const isOffGrid = (currentGridMode === 'offgrid');

    if (titleEnergyBalance) {
      titleEnergyBalance.textContent = isOffGrid
        ? (totalHomeLoad === 0 ? 'EPS BEBAN: 0W (SHED)' : `EPS ESSENTIAL LOAD (${totalHomeLoad}W)`)
        : `LOAD MIX (${totalHomeLoad}W)`;
    }

    let solarShareWatts = 0;
    let plnShareWatts = 0;
    let solarSharePct = 0;
    let plnSharePct = 0;

    if (isOffGrid) {
      if (badgeEnergyBalance) {
        badgeEnergyBalance.textContent = 'EPS ISLANDED (PLN 0V)';
        badgeEnergyBalance.style.background = 'rgba(239, 68, 68, 0.15)';
        badgeEnergyBalance.style.color = '#ef4444';
      }
      if (dotSecondarySource) {
        dotSecondarySource.style.background = '#f59e0b';
        dotSecondarySource.style.boxShadow = '0 0 4px #f59e0b';
      }
      if (labelSecondarySplit) labelSecondarySplit.textContent = 'BESS:';
      if (bessAutonomyRow) bessAutonomyRow.style.display = 'flex';

      solarShareWatts = totalHomeLoad === 0 ? 0 : Math.min(totalHomeLoad, acSolarWatts);
      const bessDischarge = Math.max(0, totalHomeLoad - solarShareWatts);
      solarSharePct = totalHomeLoad === 0 ? 0 : Math.round((solarShareWatts / totalHomeLoad) * 100);
      const bessPct = totalHomeLoad === 0 ? 0 : (100 - solarSharePct);

      if (barSolarShare) barSolarShare.style.width = `${solarSharePct}%`;
      if (barPlnShare) {
        barPlnShare.style.width = `${bessPct}%`;
        barPlnShare.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
      }
      if (valSolarSplit) valSolarSplit.textContent = `${solarShareWatts}W (${solarSharePct}%)`;
      if (valPlnSplit) {
        valPlnSplit.textContent = `${bessDischarge}W (${bessPct}%)`;
        valPlnSplit.style.color = '#f59e0b';
      }

      // Autonomy calculation: 10.5 kWh usable capacity (85% SoC = 8,925 Wh reserve)
      if (valBessRuntime) {
        if (totalHomeLoad === 0) {
          valBessRuntime.textContent = 'Idle (0W)';
        } else if (bessDischarge > 0) {
          const hours = (8925 / bessDischarge).toFixed(1);
          valBessRuntime.textContent = `${hours} Jam`;
        } else {
          valBessRuntime.textContent = 'Surplus (Mengisi)';
        }
      }
    } else {
      if (badgeEnergyBalance) {
        badgeEnergyBalance.textContent = 'ZERO-EXPORT PCC';
        badgeEnergyBalance.style.background = 'rgba(2, 132, 199, 0.1)';
        badgeEnergyBalance.style.color = '#0284c7';
      }
      if (dotSecondarySource) {
        dotSecondarySource.style.background = '#10b981';
        dotSecondarySource.style.boxShadow = '0 0 4px #10b981';
      }
      if (labelSecondarySplit) labelSecondarySplit.textContent = 'PLN:';
      if (bessAutonomyRow) bessAutonomyRow.style.display = 'none';

      solarShareWatts = totalHomeLoad === 0 ? 0 : Math.min(totalHomeLoad, acSolarWatts);
      plnShareWatts = Math.max(0, totalHomeLoad - solarShareWatts);
      solarSharePct = totalHomeLoad === 0 ? 0 : Math.round((solarShareWatts / totalHomeLoad) * 100);
      plnSharePct = totalHomeLoad === 0 ? 0 : (100 - solarSharePct);

      if (barSolarShare) barSolarShare.style.width = `${solarSharePct}%`;
      if (barPlnShare) {
        barPlnShare.style.width = `${plnSharePct}%`;
        barPlnShare.style.background = 'linear-gradient(90deg, #10b981, #059669)';
      }
      if (valSolarSplit) valSolarSplit.textContent = `${solarShareWatts}W (${solarSharePct}%)`;
      if (valPlnSplit) {
        valPlnSplit.textContent = `${plnShareWatts}W (${plnSharePct}%)`;
        valPlnSplit.style.color = '#10b981';
      }
    }

    // 3. Update 3D silicon wafer photon absorption glow
    solarPanel.setSunAbsorption(relG);

    // 4. Update Central Inverter live telemetry if present
    if (centralInverter) {
      centralInverter.updateTelemetry(watts, currentGridMode);
    }
  }

  // Update UI & Sun Landing Height when separation progress changes
  anim.onProgressUpdate = (val) => {
    // Dynamically track the landing height of sunlight when layers explode
    const glassLayer = solarPanel.layers.find(l => l.id === 'glass');
    if (glassLayer) {
      studio.updateSunTargetY(glassLayer.currentY);
      studio.setSunAngle(currentSunAngle);
    }

    if (btnToggleBreakdown) {
      btnToggleBreakdown.classList.toggle('active', val > 0.5);
    }
  };

  // Toggle Layer Breakdown (Assembled 0.0 <-> Exploded 1.0)
  if (btnToggleBreakdown) {
    btnToggleBreakdown.addEventListener('click', () => {
      anim.toggleExplode();
    });
  }

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


  // Solar Irradiance Simulator (Sun Orb, Beams, HUD Widget)
  function setSunSimulatorState(active) {
    isSunSimulatorActive = active;
    if (btnToggleSun) btnToggleSun.classList.toggle('active', active);
    if (sunSimCard) sunSimCard.classList.toggle('active', active);
    studio.setSunSimulatorVisible(active);
    if (active) {
      updateSolarGeneration(currentSunAngle);
    } else {
      solarPanel.setSunAbsorption(1.0);
    }
  }

  if (btnToggleSun) {
    btnToggleSun.addEventListener('click', () => {
      setSunSimulatorState(!isSunSimulatorActive);
    });
  }

  // Close button inside Sun Simulator card
  if (btnCloseSunCard) {
    btnCloseSunCard.addEventListener('click', () => {
      setSunSimulatorState(false);
    });
  }

  // Power Flow Animation (DC from cells -> J-box -> Inverter -> Load & Grid)
  function setPowerFlowState(active) {
    isPowerFlowActive = active;
    if (btnTogglePower) btnTogglePower.classList.toggle('active', active);
    powerFlow.setVisible(active);
  }

  if (btnTogglePower) {
    btnTogglePower.addEventListener('click', () => {
      setPowerFlowState(!isPowerFlowActive);
    });
  }

  // Toast notification helper for engineering alerts
  const hudToast = document.getElementById('hud-toast');
  let toastTimer = null;
  function showToast(message, duration = 3500) {
    if (!hudToast) return;
    hudToast.innerHTML = message;
    hudToast.classList.add('active');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      hudToast.classList.remove('active');
    }, duration);
  }

  // Function to switch between Grid Operational Topologies (ON-GRID vs OFF-GRID / EPS)
  function setGridMode(mode, triggerCamera = true, suppressToast = false) {
    currentGridMode = mode;
    const isOffGrid = (mode === 'offgrid');

    // Update top header mode buttons
    if (btnModeOngrid) btnModeOngrid.classList.toggle('active', !isOffGrid);
    if (btnModeOffgrid) btnModeOffgrid.classList.toggle('active', isOffGrid);
    if (badgeGridMode) badgeGridMode.textContent = isOffGrid ? 'OFF-GRID EPS' : 'ON-GRID PLN';

    // 0. Update 3D annotation labels contextually (PLN, ATS, Zero-Export, Inverter, BESS)
    anim.setGridMode(mode);

    // Update Sun Simulator conversion card telemetry
    if (labelGridStat) {
      labelGridStat.textContent = isOffGrid ? 'PLN FEEDER' : 'PLN GRID';
    }
    if (valGridStat) {
      valGridStat.textContent = isOffGrid ? '0V (PADAM / EPS)' : '220V / 50Hz';
      valGridStat.style.color = isOffGrid ? '#f59e0b' : '#38bdf8';
    }
    if (labelInvStat) {
      labelInvStat.textContent = (currentInverterMode === 'central')
        ? (isOffGrid ? 'CENTRAL EPS INV' : 'CENTRAL INVERTER')
        : 'MLPE INVERTER';
    }

    if (isOffGrid) {
      // 1. Off-grid mode mandates Central Hybrid Inverter with ATS changeover
      setInverterArchitecture('central');
      if (btnToggleInverterMode) {
        btnToggleInverterMode.disabled = true;
        btnToggleInverterMode.classList.add('btn-disabled');
        btnToggleInverterMode.title = 'Mode Off-Grid mewajibkan Central Hybrid Inverter dengan port EPS untuk pembentukan microgrid';
      }

      // 2. Ensure PLN Grid Distribution Board is visible to see ATS Position II and disconnect
      isPlnActive = true;
      plnDistribution.setVisible(true);
      if (btnTogglePln) {
        btnTogglePln.classList.add('active');
        btnTogglePln.title = 'Panel Distribusi PLN (ATS Posisi II: EPS Islanded Disconnect <10ms • PLN 0V Blackout)';
      }

      // 3. BESS Battery Storage is ENFORCED & MANDATORY (Grid-Forming V-f stabilizer)
      isBatteryActive = true;
      batteryStorage.setVisible(true);
      batteryStorage.setInterconnectVisible(true);
      if (btnToggleBattery) {
        btnToggleBattery.classList.add('active');
        btnToggleBattery.disabled = true;
        btnToggleBattery.classList.add('btn-disabled');
        btnToggleBattery.title = 'BESS 10.5kWh wajib aktif pada mode Off-Grid sebagai pembentuk frekuensi (Grid-Forming V-f)';
      }

      // 4. Automatic Load Shedding: Shed heavy non-essential AC load (600W), keep essential loads (300W total)
      setCircuitState(0, false, true); // AC 600W shed
      setCircuitState(1, true, true);  // Fridge 150W essential ON
      setCircuitState(2, true, true);  // Lights 150W essential ON

      // 5. Update physical models & particle telemetry
      plnDistribution.setGridMode('offgrid');
      powerFlow.setGridTopology('offgrid');
      setPowerFlowState(true);
      centralInverter.updateTelemetry(currentWatts, 'offgrid');

      // 6. Ensure telemetry card is open to show EPS microgrid balance & autonomy
      setSunSimulatorState(true);

      // 7. Smooth cinematic camera fly-in towards the PLN ATS board & Battery microgrid
      if (triggerCamera) {
        anim.focusCameraOnPlnDistribution(1.5);
      }

      if (!suppressToast) {
        showToast('⚡ <strong>Mode OFF-GRID / EPS Mandiri Aktif:</strong> PLN padam (0V). ATS memutus kontak fisik utilitas (<10ms) per IEEE 1547. BESS 10.5kWh membentuk tegangan (Grid-Forming 220V/50Hz). Beban non-esensial (AC 600W) otomatis di-<em>shed</em> agar cadangan baterai bertahan hingga ~30 jam!', 6500);
      }
    } else {
      // 1. On-grid mode defaults: Rooftop Microinverter MLPE (220V)
      if (btnToggleInverterMode) {
        btnToggleInverterMode.disabled = false;
        btnToggleInverterMode.classList.remove('btn-disabled');
        btnToggleInverterMode.title = 'Switch between Rooftop Microinverter (MLPE) and Wall-Mounted Central String Inverter';
      }
      setInverterArchitecture('micro');

      // 2. PLN Board active with normal utility connection
      isPlnActive = true;
      plnDistribution.setVisible(true);
      if (btnTogglePln) {
        btnTogglePln.classList.add('active');
        btnTogglePln.title = 'Panel Distribusi PLN (Smart Meter AMI, Zero-Export DDSU666, ATS Posisi I, SPD Type 2)';
      }

      // 3. Battery is OFF by default in On-Grid (typical rooftop PV has no battery)
      isBatteryActive = false;
      batteryStorage.setVisible(false);
      batteryStorage.setInterconnectVisible(false);
      if (btnToggleBattery) {
        btnToggleBattery.classList.remove('active');
        btnToggleBattery.disabled = true;
        btnToggleBattery.classList.add('btn-disabled');
        btnToggleBattery.title = 'Baterai DC memerlukan Central Hybrid Inverter (DC-Coupled)';
      }

      // 4. Restore all household loads to normal full consumption (900W)
      setCircuitState(0, true, true); // AC ON
      setCircuitState(1, true, true); // Fridge ON
      setCircuitState(2, true, true); // Lights ON

      // 5. Update physical models & particle telemetry
      plnDistribution.setGridMode('ongrid');
      powerFlow.setGridTopology('ongrid');
      setPowerFlowState(true);
      centralInverter.updateTelemetry(currentWatts, 'ongrid');

      // 6. Smooth cinematic camera return to overview
      if (triggerCamera) {
        anim.focusCameraOnLayer('all', 1.5);
      }

      if (!suppressToast) {
        showToast('🌐 <strong>Mode ON-GRID PLN Aktif:</strong> Terhubung ke grid utilitas 220V/50Hz. Rooftop Microinverter (MLPE) aktif menyuplai konsumsi mandiri rumah (900W). Sesuai <em>Permen ESDM No. 2/2024</em>, Zero-Export DDSU666 membatasi ekspor selalu 0.00 kW.', 6000);
      }
    }

    // Update energy balance gauges immediately
    updateSolarGeneration(currentSunAngle);
  }

  // Function to switch between Inverter Architectures (Microinverter vs Central String Inverter)
  function setInverterArchitecture(mode) {
    if (mode === 'micro' && currentGridMode === 'offgrid') {
      showToast('⚠️ <strong>Microinverter Memerlukan Grid:</strong> Microinverter grid-tied standar akan mengalami anti-islanding trip tanpa tegangan PLN 220V/50Hz. Kembalikan ke mode ON-GRID terlebih dahulu.', 4500);
      return;
    }

    currentInverterMode = mode;
    const isCentral = (mode === 'central');

    // 1. Reconfigure 3D Solar Panel underside (show/hide microinverter & swap DC leads)
    solarPanel.setInverterMode(mode);

    // 2. Reconfigure electrical particle routing
    powerFlow.setInverterMode(mode);

    // 3. Update 3D annotation labels on screen
    anim.setInverterMode(mode);

    // 4. Show/hide Wall-Mounted Central Inverter, equipment board, Soladeck box & EMT conduit
    centralInverter.setVisible(isCentral);

    // 4b. Reconfigure PLN Distribution Board conduits (Micro AC drop vs Central ATS/RS485)
    plnDistribution.setInverterMode(mode);

    // 5. Update PLN Distribution Board visibility (Always active in On-Grid mode for utility connection & load)
    if (currentGridMode === 'ongrid' || isCentral) {
      isPlnActive = true;
      plnDistribution.setVisible(true);
      if (btnTogglePln) btnTogglePln.classList.add('active');
    } else {
      isPlnActive = false;
      plnDistribution.setVisible(false);
      if (btnTogglePln) btnTogglePln.classList.remove('active');
    }

    // 6. Update HUD switcher button
    if (btnToggleInverterMode) {
      btnToggleInverterMode.classList.toggle('active', isCentral);
    }
    if (labelInverterMode) {
      labelInverterMode.textContent = isCentral ? 'Inverter: Central' : 'Inverter: Micro';
    }

    // 8. Update Sun Card Inverter label
    if (labelInvStat) {
      labelInvStat.textContent = isCentral
        ? (currentGridMode === 'offgrid' ? 'CENTRAL EPS INV' : 'CENTRAL INVERTER')
        : 'MLPE INVERTER';
    }

    // 8. Update Central Inverter live telemetry if active
    if (isCentral) {
      centralInverter.updateTelemetry(currentWatts, currentGridMode);
    }

    // 9. Manage DC-Coupled Battery Storage availability
    if (isCentral) {
      // In Central Hybrid Inverter mode, DC Battery Storage is enabled
      if (btnToggleBattery) {
        btnToggleBattery.disabled = (currentGridMode === 'offgrid');
        if (currentGridMode !== 'offgrid') {
          btnToggleBattery.classList.remove('btn-disabled');
          btnToggleBattery.title = 'Toggle Home Battery Energy Storage System (10.5kWh LiFePO4 BESS)';
        }
      }
      if (batteryStorage) {
        batteryStorage.setInterconnectVisible(isBatteryActive);
      }
    } else {
      // In MLPE Microinverter mode, DC Battery Storage cannot operate (requires Central Hybrid Inverter)
      if (isBatteryActive) {
        isBatteryActive = false;
        if (btnToggleBattery) btnToggleBattery.classList.remove('active');
        if (batteryStorage) {
          batteryStorage.setVisible(false);
          batteryStorage.setInterconnectVisible(false);
        }
      }
      if (btnToggleBattery) {
        btnToggleBattery.disabled = true;
        btnToggleBattery.classList.add('btn-disabled');
        btnToggleBattery.title = 'Baterai DC memerlukan Central Hybrid Inverter (DC-Coupled)';
      }
    }
  }

  // Grid Mode Switcher Listeners
  if (btnModeOngrid) {
    btnModeOngrid.addEventListener('click', () => {
      if (currentGridMode !== 'ongrid') setGridMode('ongrid', true, false);
    });
  }
  if (btnModeOffgrid) {
    btnModeOffgrid.addEventListener('click', () => {
      if (currentGridMode !== 'offgrid') setGridMode('offgrid', true, false);
    });
  }

  // Inverter Architecture Switcher (Roof Microinverter vs Wall Central Inverter)
  if (btnToggleInverterMode) {
    btnToggleInverterMode.addEventListener('click', () => {
      if (currentGridMode === 'offgrid') {
        showToast('⚠️ <strong>Inverter Terkunci pada Mode EPS:</strong> Mode Off-Grid mewajibkan Central Hybrid Inverter untuk membentuk microgrid mandiri. Kembalikan ke mode ON-GRID untuk memilih Microinverter.', 4500);
        return;
      }
      const nextMode = (currentInverterMode === 'micro') ? 'central' : 'micro';
      setInverterArchitecture(nextMode);
    });
  }

  // PLN Grid Distribution Board Toggle
  if (btnTogglePln) {
    btnTogglePln.addEventListener('click', () => {
      if (currentGridMode === 'offgrid') {
        showToast('⚠️ <strong>Papan PLN & ATS Wajib Tampil di Off-Grid:</strong> Papan ini memuat saklar transfer otomatis (ATS) dan MCB beban esensial yang sedang aktif.', 4000);
        return;
      }
      isPlnActive = !isPlnActive;
      btnTogglePln.classList.toggle('active', isPlnActive);
      plnDistribution.setVisible(isPlnActive);
    });
  }

  // Home Battery Storage Toggle (10.5kWh LiFePO4 BESS)
  if (btnToggleBattery) {
    btnToggleBattery.addEventListener('click', () => {
      if (currentGridMode === 'offgrid') {
        showToast('⚠️ <strong>BESS Wajib Aktif di Mode Off-Grid:</strong> Baterai BESS adalah sumber pembentuk grid (Grid-Forming V-f) yang mutlak dibutuhkan untuk menstabilkan tegangan DC dan frekuensi AC saat PLN padam.', 4500);
        return;
      }

      // If user clicks in Microinverter mode, show educational toast notification
      if (currentInverterMode === 'micro') {
        showToast('💡 <strong>Baterai DC Nonaktif:</strong> Baterai 400V DC memerlukan arsitektur Central Hybrid Inverter untuk terhubung ke sistem PLTS Atap 220V PLN. Alihkan ke Central Inverter.');
        return;
      }

      isBatteryActive = !isBatteryActive;
      btnToggleBattery.classList.toggle('active', isBatteryActive);
      batteryStorage.setVisible(isBatteryActive);
      batteryStorage.setInterconnectVisible(isBatteryActive && (currentInverterMode === 'central'));
      updateSolarGeneration(currentSunAngle);
    });
  }

  // Camera View Toggle (Front Sun-Facing Cells vs Underside MLPE Microinverter & J-Box)
  if (btnToggleView) {
    btnToggleView.addEventListener('click', () => {
      isUndersideView = !isUndersideView;
      btnToggleView.classList.toggle('active', isUndersideView);
      btnToggleView.innerHTML = isUndersideView
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Front View`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Underside`;
      anim.setCameraView(isUndersideView ? 'underside' : 'front');
    });
  }


  // Sun Angle & Real-Time Power Generation Simulator
  const sliderSunAngle = document.getElementById('slider-sun-angle');
  const sunWattsVal = document.getElementById('sun-watts-val');
  const powerGaugeFill = document.getElementById('power-gauge-fill');
  const sunAngleLabel = document.getElementById('sun-angle-label');
  const sunImpVal = document.getElementById('sun-imp-val');
  const sunVmpVal = document.getElementById('sun-vmp-val');
  const sunEffVal = document.getElementById('sun-eff-val');
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
  solarPanel.setSunAbsorption(1.0);
  setGridMode('ongrid', false, true);
  setSunSimulatorState(true);
  setPowerFlowState(true);

  // Interactive 3D Hover Tooltip Card
  const hoverTooltip = document.getElementById('hover-tooltip');
  if (hoverTooltip) {
    anim.setupHoverTooltips(hoverTooltip);
  }



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
  } catch (err) {
    console.error('Fatal initialization error:', err);
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;top:80px;left:20px;right:20px;z-index:9999999;background:rgba(220,38,38,0.95);color:#fff;padding:16px 20px;border-radius:10px;font-family:monospace;font-size:13px;line-height:1.5;box-shadow:0 8px 30px rgba(0,0,0,0.5);white-space:pre-wrap;pointer-events:auto;';
    box.innerHTML = '<strong>❌ Fatal Initialization Error:</strong>\n' + (err.stack || err.message || err);
    document.body.appendChild(box);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApplication);
} else {
  startApplication();
}
