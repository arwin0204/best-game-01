// SPDX-License-Identifier: MIT
// LUMEN BLOOM — screenshot scenes: each scene plays the real rules forward
// from a fresh world for a fixed number of steps, steered by an autopilot,
// so each frame shows what a short real game looks like and the same seed
// always gives the same frame.

import { FIELD, STEP } from './config.js';
import { KIND, dist2, makeEnemy } from './entities.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

export { FIELD };

const START_SECONDS = 6;
const PLAY_SECONDS = 24;
const BOSS_LIMIT = 150;
const END_LIMIT = 600;
const SAMPLE = 1 / 30;

function nearestEnemy(state) {
  let best = null;
  let bestD = Infinity;
  for (const e of state.enemies) {
    if (e.dead) continue;
    const d = dist2(e, state.player);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

export function autopilotFor(skill) {
  return function pilot(state) {
    const p = state.player;
    if (skill <= 0) {
      return {
        move: { x: Math.cos(state.time * 0.5), y: Math.sin(state.time * 0.5) },
        aim: { x: p.x, y: p.y - 100 },
        firing: false,
      };
    }
    const target = nearestEnemy(state);
    if (!target) {
      return {
        move: { x: 0, y: 0 },
        aim: { x: p.x, y: p.y - 100 },
        firing: false,
      };
    }
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    let mx = 0;
    let my = 0;
    if (dist > 260) {
      mx = dx / dist;
      my = dy / dist;
    } else if (dist < 160) {
      mx = -dx / dist;
      my = -dy / dist;
    }
    for (const sh of state.enemyShots) {
      const sx = sh.x - p.x;
      const sy = sh.y - p.y;
      const d2 = sx * sx + sy * sy;
      if (d2 < 90 * 90) {
        const sd = Math.sqrt(d2) || 1;
        mx += -sy / sd;
        my += sx / sd;
      }
    }
    return {
      move: { x: mx, y: my },
      aim: { x: target.x, y: target.y },
      firing: true,
    };
  };
}

function playForward(world, seconds, skill) {
  const pilot = autopilotFor(skill);
  const steps = Math.floor(seconds / STEP);
  let busiest = null;
  let busyScore = -1;
  for (let i = 0; i < steps; i++) {
    const ev = world.step(STEP, null, pilot);
    const st = world.state;
    const busy = st.enemies.length * 3 + st.bullets.length
      + st.enemyShots.length * 2 + st.particles.length * 0.5;
    if (busy > busyScore) {
      busyScore = busy;
      busiest = structuredClone(st);
    }
    if (ev === EVENT_OVER) break;
  }
  if (busiest) Object.assign(world.state, busiest);
  return 0;
}

export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    world.startGame();
    playForward(world, PLAY_SECONDS, 1);
    return { screen: world.state.player.alive ? SCREEN_PLAY : SCREEN_OVER };
  }
  if (name === 'boss') {
    world.startGame();
    const pilot = autopilotFor(1);
    let t = 0;
    while (world.state.wave < 5 && t < BOSS_LIMIT && world.state.player.alive) {
      const ev = world.step(STEP, null, pilot);
      t += STEP;
      if (ev === EVENT_OVER) break;
    }
    if (world.state.player.alive) {
      playForward(world, 12, 1);
    }
    return { screen: world.state.player.alive ? SCREEN_PLAY : SCREEN_OVER };
  }
  if (name === 'end') {
    world.startGame();
    playForward(world, END_LIMIT, 0);
    if (world.state.player.alive) {
      world.state.lives = 0;
      world.state.player.alive = false;
      world.state.screen = 'over';
    }
    return { screen: SCREEN_OVER };
  }
  world.state.screen = SCREEN_TITLE;
  for (let i = 0; i < Math.floor(START_SECONDS / STEP); i++) {
    world.step(STEP, null, null);
  }
  const decoys = [
    [KIND.MITE, 150, 420],
    [KIND.WEAVER, 820, 130],
    [KIND.SPITTER, 700, 470],
    [KIND.MITE, 260, 120],
    [KIND.WEAVER, 90, 250],
  ];
  for (const [kind, x, y] of decoys) {
    world.state.enemies.push(makeEnemy(kind, x, y, 1));
  }
  return { screen: SCREEN_TITLE };
}
