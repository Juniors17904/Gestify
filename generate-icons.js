const sharp = require('sharp');

const svgIcon = (size) => {
  const s = size;
  return Buffer.from(`<svg width="${s}" height="${s}" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7B73FF"/>
      <stop offset="100%" stop-color="#4A43CC"/>
    </linearGradient>
    <linearGradient id="bar1b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.6)"/>
    </linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>

  <!-- Fondo morado -->
  <rect width="220" height="220" rx="48" fill="url(#bg)"/>

  <!-- Barras -->
  <rect x="26" y="110" width="22" height="60" rx="4" fill="url(#bar1b)" filter="url(#sh)"/>
  <rect x="54" y="82"  width="22" height="88" rx="4" fill="url(#bar1b)" filter="url(#sh)"/>
  <rect x="82" y="50"  width="22" height="120" rx="4" fill="url(#bar1b)" filter="url(#sh)"/>
  <rect x="110" y="68" width="22" height="102" rx="4" fill="url(#bar1b)" filter="url(#sh)"/>
  <rect x="138" y="34" width="22" height="136" rx="4" fill="url(#bar1b)" filter="url(#sh)"/>

  <!-- Línea de tendencia -->
  <polyline points="37,108 65,80 93,48 121,66 149,30" stroke="white" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="37,108 65,80 93,48 121,66 149,30" stroke="#6C63FF" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Punta de flecha -->
  <polygon points="155,22 141,29 152,37" fill="white"/>
  <polygon points="155,22 142,30 151,36" fill="#6C63FF"/>

  <!-- Línea base -->
  <line x1="20" y1="178" x2="200" y2="178" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.6"/>

  <!-- Texto GESTIFY -->
  <text x="110" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="white" letter-spacing="3">GESTIFY</text>
</svg>`);
};

async function generate() {
  await sharp(svgIcon(192)).png().toFile('icons/icon-192.png');
  console.log('icon-192.png generado');

  await sharp(svgIcon(512)).png().toFile('icons/icon-512.png');
  console.log('icon-512.png generado');
}

generate().catch(console.error);
