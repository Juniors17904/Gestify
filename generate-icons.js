const sharp = require('sharp');

const svgIcon = (size) => {
  const s = size;
  return Buffer.from(`<svg width="${s}" height="${s}" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8B83FF"/><stop offset="100%" stop-color="#4A43CC"/></linearGradient>
    <linearGradient id="bar2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7B73FF"/><stop offset="100%" stop-color="#3A33BB"/></linearGradient>
    <linearGradient id="bar3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6C63FF"/><stop offset="100%" stop-color="#4A43CC"/></linearGradient>
    <linearGradient id="bar4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#9B93FF"/><stop offset="100%" stop-color="#5A53DD"/></linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="4" stdDeviation="4" flood-color="#4A43CC" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Fondo blanco -->
  <rect width="220" height="220" fill="white"/>

  <!-- Barras moradas -->
  <rect x="30" y="112" width="20" height="52" rx="4" fill="url(#bar1)" filter="url(#sh)"/>
  <rect x="56" y="86"  width="20" height="78" rx="4" fill="url(#bar2)" filter="url(#sh)"/>
  <rect x="82" y="54"  width="20" height="110" rx="4" fill="url(#bar3)" filter="url(#sh)"/>
  <rect x="108" y="72" width="20" height="92" rx="4" fill="url(#bar4)" filter="url(#sh)"/>
  <rect x="134" y="40" width="20" height="124" rx="4" fill="url(#bar1)" filter="url(#sh)"/>

  <!-- Línea de tendencia -->
  <polyline points="40,110 66,84 92,52 118,70 144,36" stroke="white" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="40,110 66,84 92,52 118,70 144,36" stroke="#6C63FF" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Punta de flecha -->
  <polygon points="150,28 136,35 147,43" fill="white"/>
  <polygon points="150,28 137,36 146,42" fill="#6C63FF"/>

  <!-- Línea base -->
  <line x1="22" y1="172" x2="198" y2="172" stroke="#6C63FF" stroke-width="3" stroke-linecap="round"/>

  <!-- Texto -->
  <text x="110" y="194" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="20" font-weight="800" fill="#6C63FF" letter-spacing="3">GESTIFY</text>
  <text x="110" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" font-weight="600" fill="#94A3B8" letter-spacing="2">TU NEGOCIO BAJO CONTROL</text>
</svg>`);
};

async function generate() {
  await sharp(svgIcon(192)).png().toFile('icons/icon-192.png');
  console.log('icon-192.png generado');

  await sharp(svgIcon(512)).png().toFile('icons/icon-512.png');
  console.log('icon-512.png generado');
}

generate().catch(console.error);
