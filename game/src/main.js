// SPDX-License-Identifier: MIT
// LUMEN BLOOM — entrypoint: boots the game, runs the fixed-step loop, owns
// the screen transitions, and stages the screenshot scenes.

import { FIELD, STEP } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { makeStarfield } from './entities.js';
import { createWorld } from './world.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const audio = createAudio();
const input = createInput(canvas);
const renderer = createRenderer(canvas);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot') || '';
const seed = Number(params.get('seed') || 0);
const rand = seed ? mulberry32(seed) : Math.random;

const world = createWorld(audio, rand);
world.state.stars = makeStarfield(140);

function startPlaying() {
  audio.unlock();
  world.startGame();
}

window.addEventListener('keydown', (e) => {
  const screen = world.state.screen;
  if (e.code === 'KeyM') {
    audio.toggleMute();
    return;
  }
  if (screen === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
    startPlaying();
  } else if (screen === 'over' && (e.code === 'KeyR' || e.code === 'Enter' || e.code === 'Space')) {
    startPlaying();
  } else if (e.code === 'KeyP') {
    if (screen === 'play') {
      world.state.screen = 'pause';
    } else if (screen === 'pause') {
      world.state.screen = 'play';
    }
    audio.unlock();
  } else if (screen === 'pause' && e.code === 'KeyR') {
    startPlaying();
  }
});

canvas.addEventListener('mousedown', () => {
  audio.unlock();
  const screen = world.state.screen;
  if (screen === 'title' || screen === 'over') {
    startPlaying();
  }
});

let last = performance.now();
let acc = 0;
let staged = false;

function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (shot) {
    if (!staged) {
      staged = true;
      const out = stageShot(shot, world);
      world.state.screen = out.screen;
      world.state.time = 8;
      renderer.render(world.state, world.state.stars);
    }
    return;
  }
  if (world.state.screen === 'play') {
    acc += elapsed;
    let n = 0;
    while (acc >= STEP && n < 5) {
      world.step(STEP, input, null);
      acc -= STEP;
      n++;
    }
    if (n === 5) acc = 0;
  } else {
    world.step(elapsed, null, null);
  }
  renderer.render(world.state, world.state.stars);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
