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
  ctx.fillText('SOLARSPEC TITAN MONO 410W', labelX + 20, labelY + 31);

  // Electrical specs
  ctx.font = '15px ui-monospace, SFMono-Regular, Menlo, Monaco, monospace';
  ctx.fillStyle = '#334155';
  ctx.fillText('Model: PV-M60-410-PRO', labelX + 24, labelY + 80);
  ctx.fillText('Max Power (Pmax):        410 W', labelX + 24, labelY + 110);
  ctx.fillText('Open-Circuit V (Voc):    42.3 V', labelX + 24, labelY + 135);
  ctx.fillText('Short-Circuit I (Isc):   12.4 A', labelX + 24, labelY + 160);
  ctx.fillText('Opt Operating V (Vmp):   35.6 V', labelX + 24, labelY + 185);
  ctx.fillText('Opt Operating I (Imp):   11.5 A', labelX + 24, labelY + 210);
  ctx.fillText('Max System Voltage:      1500 V DC', labelX + 24, labelY + 235);
  ctx.fillText('Class II / IP68 / Fire Rating: Type 1', labelX + 24, labelY + 260);

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

  // Barcode and CE/TUV compliance marks
  ctx.fillStyle = '#0f172a';
  for (let b = 0; b < 40; b++) {
    const bx = labelX + 24 + b * 11;
    const bw = (b % 3 === 0 || b % 7 === 0) ? 6 : 3;
    ctx.fillRect(bx, labelY + 290, bw, 42);
  }
  ctx.font = '13px monospace';
  ctx.fillText('SN: PV-2026-TITAN-994182-EU | TUV IEC 61215 / 61730', labelX + 24, labelY + 355);

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
