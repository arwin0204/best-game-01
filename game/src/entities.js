// SPDX-License-Identifier: MIT
// LUMEN BLOOM — entity shapes: what each kind is, how it is built, how it
// steers, and how far apart two things are.

import { ENEMY, FIELD, PALETTE, PLAYER } from './config.js';

export const KIND = {
  MITE: 'mite',
  WEAVER: 'weaver',
  SPITTER: 'spitter',
  TITAN: 'titan',
};

export function makePlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height - 90,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    lives: PLAYER.lives,
    shield: 0,
    fireTimer: 0,
    alive: true,
    trail: [],
  };
}

export function makeBullet(x, y, angle) {
  return {
    x,
    y,
    vx: Math.cos(angle) * PLAYER.bulletSpeed,
    vy: Math.sin(angle) * PLAYER.bulletSpeed,
    radius: PLAYER.bulletRadius,
    life: 1.1,
    dead: false,
  };
}

export function makeEnemy(kind, x, y, wave) {
  const table = ENEMY[kind];
  const scale = 1 + Math.floor(wave / 4);
  const hp = kind === KIND.TITAN
    ? table.hp + 2 * wave
    : table.hp + scale - 1;
  return {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: table.radius,
    speed: table.speed * (1 + 0.03 * wave),
    hp,
    maxHp: hp,
    score: table.score,
    color: table.color,
    t: Math.random() * Math.PI * 2,
    seed: Math.random() * 1000,
    fireTimer: 1.5 + Math.random(),
    burstTimer: 4,
    dead: false,
    flash: 0,
  };
}

export function makeOrb(x, y) {
  return {
    x,
    y,
    vx: (Math.random() * 2 - 1) * 30,
    vy: 40 + Math.random() * 40,
    radius: 9,
    t: Math.random() * Math.PI * 2,
    life: 9,
    dead: false,
  };
}

export function makeSporeShot(x, y, angle) {
  return {
    x,
    y,
    vx: Math.cos(angle) * 190,
    vy: Math.sin(angle) * 190,
    radius: 6,
    life: 4,
    dead: false,
  };
}

export function makeParticle(x, y, color, count, speed = 220) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = speed * (0.3 + Math.random() * 0.7);
    parts.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      radius: 1 + Math.random() * 3,
      color,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 1,
      dead: false,
    });
  }
  return parts;
}

export function makeFloater(x, y, text, color = PALETTE.gold) {
  return {
    x,
    y,
    text,
    color,
    life: 1.1,
    dead: false,
  };
}

export function makeStarfield(count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * FIELD.width,
      y: Math.random() * FIELD.height,
      z: 0.25 + Math.random() * 0.75,
      r: 0.6 + Math.random() * 1.6,
      tw: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

export function steerEnemy(e, player, dt, now) {
  e.t += dt;
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const dirX = dx / dist;
  const dirY = dy / dist;
  if (e.kind === KIND.MITE) {
    e.vx = dirX * e.speed;
    e.vy = dirY * e.speed;
  } else if (e.kind === KIND.WEAVER) {
    const sway = Math.sin(e.t * 3 + e.seed) * 140 * 0.4;
    e.vx = dirX * e.speed * 0.6 + sway;
    e.vy = dirY * e.speed * 0.7 + 40;
  } else if (e.kind === KIND.SPITTER) {
    const s = dist > 260 ? 1 : -0.6;
    e.vx = dirX * e.speed * s;
    e.vy = dirY * e.speed * s * 0.5;
  } else {
    e.vx = Math.sign(dx) * e.speed;
    e.vy = Math.sin(e.t * 0.8) * 30;
  }
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  e.x = Math.max(e.radius, Math.min(FIELD.width - e.radius, e.x));
  e.y = Math.max(e.radius, e.y);
  if (e.kind !== KIND.TITAN && e.y > FIELD.height + 40) {
    e.y = -40;
  }
  return false;
}

export function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
