// LUMEN BLOOM — tuning and palette. One place holds every number the
// rest of the game reads, so balancing is editing this file alone.
export const FIELD = { width: 960, height: 600 };
export const STEP = 1 / 60;

export const PALETTE = {
  deep: '#070b1e',
  deep2: '#0d1330',
  bloom: '#7dffd4',
  petal: '#ff7ad9',
  gold: '#ffd166',
  spore: '#b388ff',
  danger: '#ff5d5d',
  ink: '#eaf6ff',
  dim: '#8fa3c8',
};

export const PLAYER = {
  radius: 14,
  speed: 330,
  accel: 2600,
  drag: 6.5,
  fireInterval: 0.14,
  bulletSpeed: 640,
  bulletRadius: 5,
  lives: 3,
  shieldSeconds: 2.2,
  orbMagnet: 130,
};

export const ENEMY = {
  mite: { radius: 13, speed: 95, hp: 1, score: 50, color: '#b388ff' },
  weaver: { radius: 15, speed: 130, hp: 2, score: 100, color: '#ff9de2' },
  spitter: { radius: 17, speed: 70, hp: 3, score: 150, color: '#ff8a5c' },
  titan: { radius: 54, speed: 42, hp: 60, score: 1500, color: '#ff5d5d' },
};

export const WAVE = {
  baseCount: 5,
  perWave: 2,
  maxAlive: 16,
  spawnGap: 0.6,
  bossEvery: 5,
  orbChance: 0.55,
};

// Combo: each orb raises the multiplier by one step, up to x8; taking a
// hit halves it. The multiplier applies to every score award.
export const COMBO = { max: 8, orbStep: 1, hitPenalty: 0.5 };

export const SHOT_NAMES = ['start', 'play', 'boss', 'end'];
