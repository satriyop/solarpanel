import * as THREE from 'three';

/**
 * Procedural texture generators for photorealistic solar panel components.
 * Generates high-resolution textures dynamically without external image dependencies.
 */

// 1. Photorealistic Monocrystalline Silicon Solar Cell Texture (1024x1024)
export function createSolarCellTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Background backsheet white gap
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1024, 1024);

  // Monocrystalline pseudo-square wafer shape with precision 45-degree chamfered corners
  const margin = 14;
  const size = 1024 - margin * 2;
  const chamfer = 135; // Authentic M6/M10 wafer corner cut

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(margin + chamfer, margin);
  ctx.lineTo(margin + size - chamfer, margin);
  ctx.lineTo(margin + size, margin + chamfer);
  ctx.lineTo(margin + size, margin + size - chamfer);
  ctx.lineTo(margin + size - chamfer, margin + size);
  ctx.lineTo(margin + chamfer, margin + size);
  ctx.lineTo(margin, margin + size - chamfer);
  ctx.lineTo(margin, margin + chamfer);
  ctx.closePath();
  ctx.clip();

  // Deep navy / near-black anti-reflective silicon nitride (SiNx) coating
  const waferGrad = ctx.createRadialGradient(
    margin + size * 0.45,
    margin + size * 0.4,
    size * 0.1,
    margin + size * 0.5,
    margin + size * 0.5,
    size * 0.75
  );
  waferGrad.addColorStop(0.0, '#0d1d3d');
  waferGrad.addColorStop(0.35, '#0b1733');
  waferGrad.addColorStop(0.75, '#081126');
  waferGrad.addColorStop(1.0, '#050a17');
  ctx.fillStyle = waferGrad;
  ctx.fillRect(margin, margin, size, size);

  // Anisotropic crystalline grain noise (simulating monocrystalline etched pyramid micro-surface)
  const imgData = ctx.getImageData(margin, margin, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain * 1.1));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain * 1.8)); // subtle blue boost
  }
  ctx.putImageData(imgData, margin, margin);

  // Micro horizontal silver grid fingers (~105 ultra-fine printed lines)
  ctx.strokeStyle = 'rgba(230, 240, 255, 0.42)';
  ctx.lineWidth = 1.0;
  const numFingers = 105;
  const fingerStep = size / numFingers;
  for (let i = 1; i < numFingers; i++) {
    const y = margin + i * fingerStep;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(margin + size, y);
    ctx.stroke();
  }

  // 5 Main Silver Multi-Busbars (MBB) with continuous silver paste gradient
  const busbarPositions = [0.12, 0.31, 0.50, 0.69, 0.88];
  
  busbarPositions.forEach((pos) => {
    const x = margin + size * pos;
    const bbWidth = 8.5;

    // Busbar subtle shadow / edge relief
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(x - bbWidth / 2 - 1, margin, bbWidth + 2, size);

    // Silver metallic core gradient
    const bbGrad = ctx.createLinearGradient(x - bbWidth / 2, 0, x + bbWidth / 2, 0);
    bbGrad.addColorStop(0.0, '#b0b8c4');
    bbGrad.addColorStop(0.2, '#f2f6fc');
    bbGrad.addColorStop(0.5, '#ffffff');
    bbGrad.addColorStop(0.8, '#dce2ec');
    bbGrad.addColorStop(1.0, '#9aa4b2');
    ctx.fillStyle = bbGrad;
    ctx.fillRect(x - bbWidth / 2, margin, bbWidth, size);

    // Solder pad connection joints with realistic circular weld meniscus
    [0.12, 0.35, 0.5, 0.65, 0.88].forEach((padY) => {
      const cy = margin + size * padY;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, cy, 6.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(120, 135, 155, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Weld highlight core
      ctx.fillStyle = '#f0f5ff';
      ctx.beginPath();
      ctx.arc(x - 1.5, cy - 1.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// 2. Solar Cell Normal & Specular Roughness Map (Micro-Pyramid Etching)
export function createSolarCellNormalMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base normal pointing out (128, 128, 255)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 512, 512);

  // Micro-pyramids surface perturbations
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const nx = 128 + (Math.random() - 0.5) * 24;
    const ny = 128 + (Math.random() - 0.5) * 24;
    data[i] = nx;
    data[i + 1] = ny;
    data[i + 2] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // Vertical busbar ridges in normal map
  const busbarPositions = [0.12, 0.31, 0.50, 0.69, 0.88];
  busbarPositions.forEach((pos) => {
    const x = 512 * pos;
    ctx.fillStyle = 'rgb(160, 128, 255)';
    ctx.fillRect(x - 3, 0, 6, 512);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

// 3. Brushed Anodized Aerospace Aluminum Texture (Frame)
export function createBrushedAluminumTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#b8bec8';
  ctx.fillRect(0, 0, 1024, 256);

  // Micro linear brushing streaks
  for (let i = 0; i < 900; i++) {
    const y = Math.random() * 256;
    const opacity = 0.03 + Math.random() * 0.09;
    const isBright = Math.random() > 0.45;
    ctx.strokeStyle = isBright
      ? `rgba(255, 255, 255, ${opacity})`
      : `rgba(45, 52, 65, ${opacity})`;
    ctx.lineWidth = 0.4 + Math.random() * 1.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  return texture;
}

// 4. Tedlar Backsheet Texture with Technical Specifications Label
export function createBacksheetTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  // Matte white polymer base
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 2048, 2048);

  // Subtle polymer grain
  const imgData = ctx.getImageData(0, 0, 2048, 2048);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 6;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);

  // Subtle laser alignment grid marks
  ctx.strokeStyle = 'rgba(215, 222, 230, 0.35)';
  ctx.lineWidth = 2;
  const cols = 6;
  const rows = 10;
  for (let c = 0; c <= cols; c++) {
    const x = (2048 / cols) * c;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 2048);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    const y = (2048 / rows) * r;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(2048, y);
    ctx.stroke();
  }

  // Technical Specification Metalized Label on backsheet
  const labelX = 220;
  const labelY = 1380;
  const labelW = 520;
  const labelH = 380;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.fillRect(labelX, labelY, labelW, labelH);
  ctx.strokeRect(labelX, labelY, labelW, labelH);

  // Top header bar of label
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(labelX, labelY, labelW, 46);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TIER-1 MONO PERC 410Wp+ (PLTS ATAP)', labelX + 20, labelY + 31);

  // Electrical specs (Indonesian 410Wp+ STC Reference)
  ctx.font = '15px ui-monospace, SFMono-Regular, Menlo, Monaco, monospace';
  ctx.fillStyle = '#334155';
  ctx.fillText('Model: PV-M108-410W-ID (Half-Cut)', labelX + 24, labelY + 80);
  ctx.fillText('Max Power (Pmax):        410 Wp (STC)', labelX + 24, labelY + 110);
  ctx.fillText('Open-Circuit V (Voc):    37.8 V', labelX + 24, labelY + 135);
  ctx.fillText('Short-Circuit I (Isc):   13.6 A', labelX + 24, labelY + 160);
  ctx.fillText('Opt Operating V (Vmp):   31.6 V', labelX + 24, labelY + 185);
  ctx.fillText('Opt Operating I (Imp):   13.0 A', labelX + 24, labelY + 210);
  ctx.fillText('Max System Voltage:      1500 V DC | IP68 Split J-Box', labelX + 24, labelY + 235);
  ctx.fillText('Sertifikasi: SNI 04-3850.2 / IEC 61215 / IEC 61730', labelX + 24, labelY + 260);

  // Warning triangle badge
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.moveTo(labelX + labelW - 65, labelY + 85);
  ctx.lineTo(labelX + labelW - 35, labelY + 135);
  ctx.lineTo(labelX + labelW - 95, labelY + 135);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('!', labelX + labelW - 71, labelY + 128);

  // Barcode and SNI / TKDN compliance marks
  ctx.fillStyle = '#0f172a';
  for (let b = 0; b < 40; b++) {
    const bx = labelX + 24 + b * 11;
    const bw = (b % 3 === 0 || b % 7 === 0) ? 6 : 3;
    ctx.fillRect(bx, labelY + 290, bw, 42);
  }
  ctx.font = '13px monospace';
  ctx.fillText('SN: ID-PLTS-2026-410W-994182 | SNI & TKDN CERTIFIED', labelX + 24, labelY + 355);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  return texture;
}

// 5. Authentic Embossed Diamond Waffle Texture for Uncured EVA Film Encapsulant
export function createEVATexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base translucent frosted milky polymer tone
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, 512, 512);

  // Draw authentic diamond waffle embossing (diagonal cross-hatch pyramid grid)
  const step = 16;
  ctx.lineWidth = 1.2;

  // Diagonal 45 deg lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  for (let d = -512; d < 1024; d += step) {
    ctx.beginPath();
    ctx.moveTo(d, 0);
    ctx.lineTo(d + 512, 512);
    ctx.stroke();
  }

  // Diagonal -45 deg lines (forming diamonds)
  for (let d = -512; d < 1024; d += step) {
    ctx.beginPath();
    ctx.moveTo(d, 512);
    ctx.lineTo(d + 512, 0);
    ctx.stroke();
  }

  // Diamond waffle pyramid relief shadows
  ctx.strokeStyle = 'rgba(160, 175, 195, 0.4)';
  ctx.lineWidth = 1.0;
  for (let d = -512; d < 1024; d += step) {
    ctx.beginPath();
    ctx.moveTo(d + 1, 0);
    ctx.lineTo(d + 513, 512);
    ctx.stroke();
  }

  // Micro frosted polymer grain
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 20); // Authentic fine waffle scale across the panel
  return texture;
}

// 6. Normal Map for Embossed Diamond Waffle Relief on EVA
export function createEVANormalMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 256, 256);

  const step = 16;
  ctx.lineWidth = 2.0;

  // Slanted facets normal coloring
  ctx.strokeStyle = 'rgb(160, 128, 240)';
  for (let d = -256; d < 512; d += step) {
    ctx.beginPath();
    ctx.moveTo(d, 0);
    ctx.lineTo(d + 256, 256);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgb(96, 128, 240)';
  for (let d = -256; d < 512; d += step) {
    ctx.beginPath();
    ctx.moveTo(d, 256);
    ctx.lineTo(d + 256, 0);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 20);
  return texture;
}

// 7. Laser-Etched Nameplate for MLPE Microinverter Enclosure
export function createMicroinverterPlateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Brushed aluminum / silver base plate
  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, '#e2e8f0');
  grad.addColorStop(0.5, '#cbd5e1');
  grad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Outer border & rivet holes
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 240);

  // Corner mounting rivets
  ctx.fillStyle = '#64748b';
  [[16, 16], [496, 16], [16, 240], [496, 240]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.stroke();
  });

  // Header Brand & Model
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px "JetBrains Mono", monospace, sans-serif';
  ctx.fillText('ENPHASE IQ8+ (PLN 220V/50Hz)', 32, 48);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('Microinverter PLTS Atap with Anti-Islanding Protection', 32, 70);

  // Divider line
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(32, 82);
  ctx.lineTo(480, 82);
  ctx.stroke();

  // Electrical Specs Table
  ctx.font = 'bold 15px "JetBrains Mono", monospace, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('DC INPUT (PV 400Wp+):', 32, 110);
  ctx.font = '14px "JetBrains Mono", monospace, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('Vdc: 25 - 58V | Imax: 13.5A | Pmax: 440Wp+', 32, 130);

  ctx.font = 'bold 15px "JetBrains Mono", monospace, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('AC OUTPUT (PLN GRID):', 32, 160);
  ctx.font = '14px "JetBrains Mono", monospace, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('Vac: 220V (Single-Phase) | 50.0Hz | 300VA | 1.36A', 32, 180);

  // Efficiency & Certifications
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#047857';
  ctx.fillText('EFFICIENCY: 97.5% • IP67 OUTDOOR WEATHERPROOF', 32, 212);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('SNI / IEC 62116 / IEC 62109 • Grid Profile: ID-PLN-50Hz', 32, 232);

  // QR / Matrix Code Graphic
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(400, 100, 72, 72);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(408, 108, 56, 56);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(414, 114, 20, 20);
  ctx.fillRect(440, 114, 18, 18);
  ctx.fillRect(414, 140, 18, 18);
  ctx.fillRect(436, 136, 12, 12);
  ctx.fillRect(444, 148, 10, 10);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// 7. Central Hybrid Inverter OLED/LCD Telemetry Screen Texture (512x256)
export function createCentralInverterScreenTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  function renderScreen(watts = 410) {
    // Background: Deep obsidian glass
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, 512, 256);

    // Subtle LCD pixel raster grid
    ctx.fillStyle = 'rgba(16, 185, 129, 0.03)';
    for (let y = 0; y < 256; y += 4) {
      ctx.fillRect(0, y, 512, 2);
    }

    // Top status header bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(8, 8, 496, 36);

    // Online Status Indicator Dot & Pill
    ctx.beginPath();
    ctx.arc(28, 26, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981'; // Bright green
    ctx.fill();

    ctx.font = 'bold 13px "JetBrains Mono", monospace, sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.fillText('PLN GRID-TIED ONLINE', 42, 30);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "JetBrains Mono", monospace, sans-serif';
    ctx.fillText('MPPT 1 & 2 • 220V/50Hz', 220, 30);
    ctx.fillText('12:45 WIB', 420, 30);

    // Scale residential array wattage (simulate a typical 4kW residential string array based on current panel wattage)
    const arrayMultiplier = 9.8; // ~4.0 kW array at 410W panel reference
    const totalWatts = Math.round(watts * arrayMultiplier);
    const kwStr = (totalWatts / 1000).toFixed(2);
    const eff = 98.4;
    const acKw = ((totalWatts * eff) / 100000).toFixed(2);

    // Main Power Readout
    ctx.font = 'bold 48px "JetBrains Mono", monospace, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`${acKw}`, 24, 106);

    ctx.font = 'bold 22px "JetBrains Mono", monospace, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('kW AC', 168, 106);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('OUTPUT DAYA PLTS ATAP (PAC) KE BEBAN & PLN', 24, 126);

    // Horizontal divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 138);
    ctx.lineTo(492, 138);
    ctx.stroke();

    // 4-Column Live Electrical Telemetry Grid
    const colY = 164;
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('DC INPUT (V/I)', 24, colY);
    ctx.fillText('TEGANGAN PLN', 150, colY);
    ctx.fillText('DAY YIELD', 270, colY);
    ctx.fillText('EFISIENSI CEC', 380, colY);

    ctx.font = 'bold 15px "JetBrains Mono", monospace, sans-serif';
    ctx.fillStyle = '#e2e8f0';

    const dcV = (380 + (watts / 410) * 35).toFixed(0);
    const dcA = ((totalWatts / dcV) || 0).toFixed(1);
    ctx.fillText(`${dcV}V / ${dcA}A`, 24, colY + 22);
    ctx.fillText('220V / 50Hz', 150, colY + 22);
    ctx.fillText('18.4 kWh', 270, colY + 22);

    ctx.fillStyle = '#10b981';
    ctx.fillText('98.4%', 380, colY + 22);

    // Power Output Gauge Bar
    const barWidth = 472;
    const fillRatio = Math.min(1.0, Math.max(0.05, totalWatts / 4500));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(20, 218, barWidth, 14);

    const grad = ctx.createLinearGradient(20, 0, 20 + barWidth * fillRatio, 0);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.7, '#06b6d4');
    grad.addColorStop(1, '#10b981');
    ctx.fillStyle = grad;
    ctx.fillRect(20, 218, barWidth * fillRatio, 14);

    // High-tech screen border glow
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 508, 252);

    texture.needsUpdate = true;
  }

  // Initial render
  renderScreen(410);
  texture.updateScreen = renderScreen;

  return texture;
}

// 8. Laser-Etched Specification Rating Plate Texture for Central Inverter (512x256)
export function createCentralInverterSpecPlateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Brushed aluminum metallic plate
  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, '#f1f5f9');
  grad.addColorStop(0.5, '#cbd5e1');
  grad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Border & rivets
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 496, 240);

  [[16, 16], [496, 16], [16, 240], [496, 240]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#64748b';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.stroke();
  });

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px "JetBrains Mono", monospace, sans-serif';
  ctx.fillText('HYBRID STRING INVERTER 5.0kW (PLN GRID)', 28, 44);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('Single-Phase 220V/50Hz Hybrid Inverter with EPS Backup & Zero-Export', 28, 66);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(28, 78);
  ctx.lineTo(484, 78);
  ctx.stroke();

  // DC Input Ratings (400Wp+ String compatible)
  ctx.font = 'bold 14px "JetBrains Mono", monospace, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('PV DC INPUT (DUAL MPPT FOR 400Wp+):', 28, 102);
  ctx.font = '13px "JetBrains Mono", monospace, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('Max Voc: 550Vdc | MPPT: 120 - 500Vdc | Imax: 2x 14.0A', 28, 122);

  // AC Output Ratings (PLN 220V Grid & EPS Backup)
  ctx.font = 'bold 14px "JetBrains Mono", monospace, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('AC OUTPUT (PLN GRID & BACKUP EPS):', 28, 150);
  ctx.font = '13px "JetBrains Mono", monospace, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('PLN: 220V Single-Phase | 50Hz | 5000VA | EPS: <10ms UPS Backup', 28, 170);

  // Standards & Compliance
  ctx.font = 'bold 12.5px sans-serif';
  ctx.fillStyle = '#047857';
  ctx.fillText('CEC EFFICIENCY: 98.4% • IP65 OUTDOOR • ZERO-EXPORT READY', 28, 204);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('SNI / IEC 62109-1/2 • IEC 62116 Anti-Islanding • Permen ESDM Compliant', 28, 224);

  // QR Code Graphic
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(410, 95, 68, 68);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(416, 101, 56, 56);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(422, 107, 18, 18);
  ctx.fillRect(448, 107, 16, 16);
  ctx.fillRect(422, 133, 16, 16);
  ctx.fillRect(444, 129, 12, 12);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// 9. Rotary DC Disconnect Switch Faceplate Texture (256x256)
export function createRotarySwitchTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Yellow warning safety plate
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(128, 128, 122, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Outer warning border ring
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(128, 128, 108, 0, Math.PI * 2);
  ctx.stroke();

  // Labels: Top "ON", Left "OFF"
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px "JetBrains Mono", monospace, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ON', 128, 42);
  ctx.fillText('OFF', 46, 136);

  // Safety Text
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('DC DISCONNECT', 128, 204);
  ctx.font = '9px sans-serif';
  ctx.fillStyle = '#713f12';
  ctx.fillText('RAPID SHUTDOWN', 128, 222);

  // Red pointer indicator circle
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(128, 54, 5, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// 10. Home Battery Energy Storage System (BESS) Rating Plate Texture (512x256)
export function createBatterySpecPlateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Brushed aluminum dark finish
  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, '#334155');
  grad.addColorStop(0.5, '#1e293b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Border & corner rivets
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 496, 240);

  [[16, 16], [496, 16], [16, 240], [496, 240]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#64748b';
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.stroke();
  });

  // Header Title
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 24px "JetBrains Mono", monospace, sans-serif';
  ctx.fillText('ENERGYPACK 10.5kWh BESS (LiFePO4)', 28, 44);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Lithium Iron Phosphate Storage for PLN Peak Tariff Shaving & Backup', 28, 66);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(28, 78);
  ctx.lineTo(484, 78);
  ctx.stroke();

  // Ratings
  ctx.font = 'bold 14px "JetBrains Mono", monospace, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('ELECTRICAL SPECIFICATIONS:', 28, 102);
  ctx.font = '13px "JetBrains Mono", monospace, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Capacity: 10.5 kWh | Power: 5.0kW Cont. / 7.0kW Peak', 28, 122);
  ctx.fillText('Nominal Voltage: 400Vdc | Operating: 350 - 450Vdc', 28, 144);
  ctx.fillText('Max Charge / Discharge Current: 25.0A Continuous', 28, 166);

  // Safety & Efficiency
  ctx.font = 'bold 12.5px sans-serif';
  ctx.fillStyle = '#10b981';
  ctx.fillText('ROUND-TRIP EFFICIENCY: 90.5% • NEMA TYPE 3R OUTDOOR', 28, 202);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('SNI / IEC 62619 / UN 38.3 • PLN R-1/TR Tariff Shaving & EPS UPS Backup', 28, 224);

  // QR Code Graphic
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(410, 95, 68, 68);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(416, 101, 56, 56);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(422, 107, 18, 18);
  ctx.fillRect(448, 107, 16, 16);
  ctx.fillRect(422, 133, 16, 16);
  ctx.fillRect(444, 129, 12, 12);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// 11. Battery Management System (BMS) PCB Circuit Board Texture (512x256)
export function createBatteryBmsTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Matte dark green solder mask PCB
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, 512, 256);

  // Gold-plated copper routing traces
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  for (let i = 20; i < 490; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 20);
    ctx.lineTo(i + 12, 60);
    ctx.lineTo(i + 12, 190);
    ctx.lineTo(i + 24, 230);
    ctx.stroke();
  }

  // Microcontroller QFP Chip (Central Processor)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(200, 80, 80, 80);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(200, 80, 80, 80);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ARM CORTEX', 240, 116);
  ctx.fillText('BMS MCU', 240, 132);

  // Surface Mount Balance Resistors & FETs
  ctx.fillStyle = '#1e293b';
  for (let c = 0; c < 14; c++) {
    const rx = 30 + (c % 7) * 48;
    const ry = c < 7 ? 40 : 180;
    ctx.fillRect(rx, ry, 28, 14);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(rx - 2, ry + 2, 3, 10);
    ctx.fillRect(rx + 27, ry + 2, 3, 10);
    ctx.fillStyle = '#1e293b';
  }

  // Multi-pin cell balance harness header
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(320, 20, 160, 24);
  ctx.fillStyle = '#d97706';
  for (let p = 0; p < 14; p++) {
    ctx.fillRect(326 + p * 11, 24, 6, 16);
  }

  // Status LED indicators
  [[120, 120, '#10b981'], [140, 120, '#38bdf8'], [160, 120, '#f59e0b']].forEach(([lx, ly, col]) => {
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}


