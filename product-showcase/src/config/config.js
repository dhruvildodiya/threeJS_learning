// Configuration constants for KRONOS Showroom
export const APP_CONFIG = {
  hdriPath: './HDRI/studio_kominka_02_2k.hdr',
  modelPath: './models/watch/digital_wrist_watch_2k.gltf',
  bgColor: 0x0a0d14,
  fogDensity: 0.035,
};

export const PART_METADATA = {
  body: {
    category: 'CHASSIS MODULE',
    title: 'KRONOS Digital Core',
    desc: 'Machined 316L stainless steel case housing the high-precision quartz movement and tactile micro-switch pushers.',
    spec: '316L Solid Steel Chassis',
  },
  dial: {
    category: 'DISPLAY CORE',
    title: 'Precision LCD Dial Plate',
    desc: 'High-contrast electro-luminescent digital movement dial plate calibrated with ultra-low latency quartz crystal oscillator.',
    spec: 'Optoelectronic LCD Core',
  },
  glass: {
    category: 'OPTICAL ELEMENT',
    title: 'Domed Sapphire Crystal',
    desc: 'Scratch-resistant mineral sapphire crystal protecting the LCD display with anti-reflective optical clarity.',
    spec: 'Anti-Reflective Sapphire',
  },
  strapA: {
    category: 'ERGONOMIC BRACELET',
    title: 'Upper Articulated Bracelet',
    desc: 'Solid-link tapered steel bracelet engineered with precision pin friction tolerances for wrist contouring.',
    spec: 'Segmented Upper Link',
  },
  strapB: {
    category: 'ERGONOMIC BRACELET',
    title: 'Lower Articulated Bracelet',
    desc: 'Reinforced lower bracelet link segment balancing weight distribution and ergonomics.',
    spec: 'Segmented Lower Link',
  },
  clasp: {
    category: 'LOCKING MECHANISM',
    title: 'Deployant Security Clasp',
    desc: 'Dual-pusher folding clasp with micro-adjustment holes ensuring secure wrist locking under high activity.',
    spec: 'Folding Safety Clasp',
  },
};

export const FINISH_PALETTES = {
  silver: {
    metalColor: 0xd8dce4,
    metalness: 0.98,
    roughness: 0.22,
  },
  onyx: {
    metalColor: 0x242830,
    metalness: 0.85,
    roughness: 0.38,
  },
  gold: {
    metalColor: 0xdfb470,
    metalness: 0.95,
    roughness: 0.24,
  },
};
