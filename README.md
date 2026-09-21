# 3D Photorealistic Solar Panel Component Breakdown

A real-time, photorealistic 3D exploded view diagram of a residential solar panel created entirely in code using **Three.js** and **WebGL**.

## Features

- **7 Sequential Photorealistic Layers (Top to Bottom)**:
  1. **Aluminum Frame**: Anodized 6063-T5 extruded profile with inner lip channel, 45° corner miter joint seams, outer CNC drainage weep holes, and bottom flange mounting holes.
  2. **Tempered Glass Sheet**: 3.2mm low-iron solar glass with authentic emerald/cyan polished safety edges, thin-film anti-reflective iridescence, and beveled highlights.
  3. **Top EVA Film Encapsulant**: Flexible copolymer with embossed diamond waffle micro-pyramid texture and normal map.
  4. **Silicon Solar Cells**: 60-cell (6×10) monocrystalline wafer matrix with chamfered corners, deep navy anti-reflective coating, 5 polished silver busbars (MBB), fine horizontal grid fingers, and cross-bussing ribbons.
  5. **Bottom EVA Film Encapsulant**: Rear protective polymer film with embossed diamond texture and cell matrix indentations.
  6. **Tedlar Backsheet**: Weatherproof barrier (PVF/PET) with realistic matte polymer grain, technical specification metalized label, and 4 CNC ribbon feedthrough slits with flat copper busbar tabs.
  7. **Junction Box & MC4 Leads**: IP68 polycarbonate enclosure with heatsink cooling fins, 4 internal copper terminal blocks, 3 bypass diodes, cable glands, and curved positive/negative leads with MC4 locking connectors.
  8. **Microinverter & AC Trunk (MLPE)**: Die-cast natural aluminum enclosure with 12 heatsink cooling fins, laser-etched Enphase IQ8+ specification plate, pulsing status LED, DC MC4 input pigtails, AC Q-cable drop, and heavy-duty AC trunk line.

- **Cinematic Camera & Lighting**:
  - Slow, continuous 360-degree orbital camera pan with manual interaction override and smooth damping.
  - Procedural Studio Softbox Equirectangular HDR environment producing elongated studio reflections.
  - 3-point studio lighting with ACES Filmic Tone Mapping and soft contact shadows.
  - Responsive 16:9 motion graphic presentation viewport.

- **Interactive Engineering HUD**:
  - Smooth vertical separation slider (`0%` Assembled to `100%` Exploded diagram).
  - Quick-action presets for Start (Assembled) and End (Exploded) frames.
  - Automatic looping cycle and 360° orbital camera panning.
  - 3D screen-space projected annotations with leader lines.
  - Interactive Solar Irradiance simulator with real-time ASHRAE IAM power generation curves.
  - Real-time **Power Flow ⚡** animation visualizing DC-to-AC conversion along cell busbars, junction box, microinverter, and AC trunk line.
  - Layer isolation filter pills (`All`, `Frame`, `Glass`, `Cells`, `Microinverter`, etc.) with cinematic macro camera zoom.
  - Dark/Light studio theme switcher with native Retina high-DPI rendering.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/satriyop/solarpanel.git

# Navigate into the project directory
cd solarpanel

# Install dependencies
npm install

# Start local development server
npm run dev

# Or build and preview production bundle
npm run build
npm run preview
```
