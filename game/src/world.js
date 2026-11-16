// SPDX-License-Identifier: MIT
// LUMEN BLOOM — the simulation: the ship, every entity list, the waves,
// the scoring, and the combo.

import { COMBO, ENEMY, FIELD, PALETTE, PLAYER, STEP, WAVE } from './config.js';
import {
  KIND,
  dist2,
  makeBullet,
  makeEnemy,
  makeFloater,
  makeOrb,
  makeParticle,
  makePlayer,
  makeSporeShot,
  steerEnemy,
} from './entities.js';

export const EVENT_OVER = 1;
export const EVENT_WAVE_CLEAR = 2;
export { STEP };

export function createWorld(audio, rand) {
  let s = freshState();

  function freshState() {
    return {
      screen: 'title',
      time: 0,
      score: 0,
      best: 0,
      combo: 1,
      comboKills: 0,
      wave: 0,
      lives: PLAYER.lives,
      kills: 0,
      orbs: 0,
      shotsFired: 0,
      shake: 0,
      banner: '',
      bannerTimer: 0,
      waveState: 'idle',
      spawnQueue: [],
      spawnTimer: 0,
      bossSpawned: false,
      player: makePlayer(),
      bullets: [],
      enemies: [],
      enemyShots: [],
      orbsList: [],
      particles: [],
      floaters: [],
      stars: null,
    };
  }

  function loadBest() {
    try {
      const v = Number(window.localStorage.getItem('lumen-bloom-best'));
      s.best = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
    } catch (e) {
      s.best = 0;
    }
  }

  function saveBest() {
    try {
      window.localStorage.setItem('lumen-bloom-best', String(s.best));
    } catch (e) {
      // Storage can be unavailable; the best score is best-effort.
    }
  }

  function reset() {
    // Every field returns to its starting value, except the best score and
    // the starfield: the entrypoint assigns the stars once, and a restart
    // must not wipe the sky.
    const best = s.best;
    const stars = s.stars;
    s = freshState();
    s.best = best;
    s.stars = stars;
  }

  function startGame() {
    reset();
    s.screen = 'play';
    startWave(1);
  }

  function buildQueue(n) {
    const count = WAVE.baseCount + WAVE.perWave * (n - 1);
    const pool = [KIND.MITE, KIND.MITE, KIND.WEAVER, KIND.SPITTER];
    if (n >= 3) {
      pool.push(KIND.WEAVER, KIND.SPITTER);
    }
    const queue = [];
    for (let i = 0; i < count; i++) {
      queue.push(pool[Math.floor(rand() * pool.length)]);
    }
    if (n % WAVE.bossEvery === 0) {
      queue.push(KIND.TITAN);
    }
    return queue;
  }

  function startWave(n) {
    s.wave = n;
    s.spawnQueue = buildQueue(n);
    s.spawnTimer = 0.5;
    s.waveState = 'spawning';
    s.bossSpawned = s.spawnQueue.includes(KIND.TITAN);
    if (s.bossSpawned) {
      s.banner = 'WAVE ' + n + ' TITAN WAKES';
      s.bannerTimer = 2.2;
      audio.boss();
    } else {
      s.banner = 'WAVE ' + n;
      s.bannerTimer = 2.2;
      audio.wave();
    }
  }

  function spawnNext() {
    const kind = s.spawnQueue.shift();
    let x;
    let y;
    if (kind === KIND.TITAN) {
      x = FIELD.width / 2;
      y = -ENEMY.titan.radius;
    } else {
      x = 30 + rand() * (FIELD.width - 60);
      y = 50 + rand() * 130;
    }
    s.enemies.push(makeEnemy(kind, x, y, s.wave));
  }

  function addScore(base, x, y, label) {
    const pts = base * s.combo;
    s.score += pts;
    if (s.score > s.best) {
      s.best = s.score;
      saveBest();
    }
    s.floaters.push(makeFloater(x, Math.max(84, y), label || ('+' + pts)));
    return pts;
  }

  function maybeComboStep() {
    if (s.comboKills >= 6 && s.combo < COMBO.max) {
      s.combo += 1;
      s.comboKills = 0;
      s.floaters.push(makeFloater(
        s.player.x,
        Math.max(84, s.player.y - 40),
        'COMBO x' + s.combo,
        PALETTE.gold,
      ));
    }
  }

  function killEnemy(e) {
    e.dead = true;
    s.kills += 1;
    s.comboKills += 1;
    maybeComboStep();
    addScore(e.score, e.x, e.y);
    const burst = e.kind === KIND.TITAN ? 80 : 18;
    s.particles.push(...makeParticle(e.x, e.y, PALETTE.bloom, burst, 260));
    audio.hit();
    s.shake = Math.max(s.shake, e.kind === KIND.TITAN ? 18 : 5);
    if (rand() < WAVE.orbChance) {
      s.orbsList.push(makeOrb(e.x, e.y));
    }
    if (e.kind === KIND.TITAN) {
      s.banner = 'TITAN BLOOMED';
      s.bannerTimer = 2.2;
      for (let i = 0; i < 5; i++) {
        s.orbsList.push(makeOrb(
          e.x + (rand() * 2 - 1) * 60,
          e.y + (rand() * 2 - 1) * 30,
        ));
      }
    }
  }

  function hurtPlayer() {
    const p = s.player;
    if (p.shield > 0 || !p.alive) return;
    s.lives -= 1;
    s.combo = Math.max(1, Math.floor(s.combo * COMBO.hitPenalty));
    s.comboKills = 0;
    s.shake = 14;
    s.particles.push(...makeParticle(p.x, p.y, PALETTE.danger, 26, 300));
    audio.hurt();
    if (s.lives <= 0) {
      p.alive = false;
      s.particles.push(...makeParticle(p.x, p.y, PALETTE.bloom, 60, 380));
      audio.over();
      s.screen = 'over';
    } else {
      p.shield = PLAYER.shieldSeconds;
      p.x = FIELD.width / 2;
      p.y = FIELD.height - 90;
      p.vx = 0;
      p.vy = 0;
      p.trail.length = 0;
    }
  }

  function normPair(pair) {
    if (!pair) return { x: 0, y: 0 };
    if (Array.isArray(pair)) return { x: pair[0] || 0, y: pair[1] || 0 };
    return { x: pair.x || 0, y: pair.y || 0 };
  }

  function step(dt, input, autopilot) {
    s.time += dt;
    if (s.bannerTimer > 0) s.bannerTimer -= dt;
    if (s.shake > 0) s.shake = Math.max(0, s.shake - 30 * dt);
    for (const pt of s.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.985;
      pt.vy *= 0.985;
      pt.life -= dt;
      if (pt.life <= 0) pt.dead = true;
    }
    for (const f of s.floaters) {
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) f.dead = true;
    }
    s.particles = s.particles.filter((pt) => !pt.dead);
    s.floaters = s.floaters.filter((f) => !f.dead);
    if (s.screen !== 'play') return 0;

    const p = s.player;
    if (p.shield > 0) p.shield = Math.max(0, p.shield - dt);

    let mx = 0;
    let my = 0;
    let aimX = p.x;
    let aimY = p.y - 1;
    let firing = false;
    let hasAim = false;
    if (autopilot) {
      const pilot = autopilot(s);
      const mv = normPair(pilot.move);
      mx = mv.x;
      my = mv.y;
      if (pilot.aim) {
        aimX = pilot.aim.x;
        aimY = pilot.aim.y;
        hasAim = true;
      }
      firing = !!pilot.firing;
    } else if (input) {
      const mv = normPair(input.move());
      mx = mv.x;
      my = mv.y;
      if (input.mouse && input.mouse.inside) {
        aimX = input.mouse.x;
        aimY = input.mouse.y;
        hasAim = true;
      }
      firing = input.firing();
    }
    if (hasAim) {
      p.angle = Math.atan2(aimY - p.y, aimX - p.x);
    } else if (!autopilot && !input) {
      p.angle = -Math.PI / 2;
    }

    const mag = Math.hypot(mx, my);
    if (mag > 0) {
      p.vx += (mx / mag) * PLAYER.accel * dt;
      p.vy += (my / mag) * PLAYER.accel * dt;
    }
    const damp = Math.exp(-PLAYER.drag * dt);
    p.vx *= damp;
    p.vy *= damp;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > PLAYER.speed) {
      p.vx = (p.vx / sp) * PLAYER.speed;
      p.vy = (p.vy / sp) * PLAYER.speed;
    }
    p.x = Math.max(p.radius, Math.min(FIELD.width - p.radius, p.x + p.vx * dt));
    p.y = Math.max(p.radius, Math.min(FIELD.height - p.radius, p.y + p.vy * dt));
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 14) p.trail.shift();

    p.fireTimer -= dt;
    if (firing && p.fireTimer <= 0 && p.alive) {
      const a = p.angle;
      const bx = p.x + Math.cos(a) * (p.radius + 10);
      const by = p.y + Math.sin(a) * (p.radius + 10);
      s.bullets.push(makeBullet(bx, by, a));
      s.shotsFired += 1;
      audio.shoot();
      p.fireTimer = PLAYER.fireInterval;
    }

    if (s.waveState === 'spawning') {
      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) {
        if (s.spawnQueue.length === 0) {
          s.waveState = 'fighting';
        } else if (s.enemies.length < WAVE.maxAlive) {
          spawnNext();
          s.spawnTimer = WAVE.spawnGap;
        }
      }
    }

    for (const e of s.enemies) {
      if (e.flash > 0) e.flash -= dt;
      steerEnemy(e, p, dt, s.time);
      if (e.kind === KIND.SPITTER) {
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          if (p.alive) {
            const a = Math.atan2(p.y - e.y, p.x - e.x);
            s.enemyShots.push(makeSporeShot(e.x, e.y, a));
          }
          e.fireTimer = 2.2 + rand() * 0.8;
        }
      } else if (e.kind === KIND.TITAN) {
        e.burstTimer -= dt;
        if (e.burstTimer <= 0) {
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 + s.time;
            s.enemyShots.push(makeSporeShot(e.x, e.y, a));
          }
          e.burstTimer = 2.6;
        }
      }
    }

    for (const b of s.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) {
        b.dead = true;
      }
    }
    for (const sh of s.enemyShots) {
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.life -= dt;
      if (sh.life <= 0 || sh.x < -20 || sh.x > FIELD.width + 20 || sh.y < -20 || sh.y > FIELD.height + 20) {
        sh.dead = true;
      }
    }
    for (const o of s.orbsList) {
      o.t += dt;
      o.life -= dt;
      if (p.alive) {
        const d2 = dist2(o, p);
        const md = PLAYER.orbMagnet;
        if (d2 < md * md) {
          const d = Math.sqrt(d2) || 1;
          o.vx += ((p.x - o.x) / d) * 500 * dt;
          o.vy += ((p.y - o.y) / d) * 500 * dt;
        }
      }
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (o.life <= 0 || o.y > FIELD.height + 20) o.dead = true;
    }

    for (const b of s.bullets) {
      if (b.dead) continue;
      for (const e of s.enemies) {
        if (e.dead) continue;
        const rr = b.radius + e.radius;
        if (dist2(b, e) < rr * rr) {
          b.dead = true;
          e.hp -= 1;
          e.flash = 0.12;
          s.particles.push(...makeParticle(e.x, e.y, PALETTE.bloom, 4, 180));
          if (e.hp <= 0) killEnemy(e);
          break;
        }
      }
    }

    if (p.alive) {
      for (const e of s.enemies) {
        if (e.dead) continue;
        const rr = e.radius + p.radius;
        if (dist2(e, p) < rr * rr) {
          e.dead = true;
          hurtPlayer();
          if (!p.alive) break;
        }
      }
      for (const sh of s.enemyShots) {
        if (sh.dead) continue;
        const rr = sh.radius + p.radius;
        if (dist2(sh, p) < rr * rr) {
          sh.dead = true;
          hurtPlayer();
          if (!p.alive) break;
        }
      }
      for (const o of s.orbsList) {
        if (o.dead) continue;
        const rr = o.radius + p.radius;
        if (dist2(o, p) < rr * rr) {
          o.dead = true;
          s.orbs += 1;
          s.comboKills += 1;
          maybeComboStep();
          addScore(25, o.x, o.y);
          s.particles.push(...makeParticle(o.x, o.y, PALETTE.gold, 6, 160));
          audio.pickup(s.combo);
        }
      }
    }

    s.bullets = s.bullets.filter((b) => !b.dead);
    s.enemies = s.enemies.filter((e) => !e.dead);
    s.enemyShots = s.enemyShots.filter((sh) => !sh.dead);
    s.orbsList = s.orbsList.filter((o) => !o.dead);

    if (s.waveState === 'fighting' && s.enemies.length === 0) {
      const base = 200 + 50 * s.wave;
      const pts = base * s.combo;
      s.score += pts;
      if (s.score > s.best) {
        s.best = s.score;
        saveBest();
      }
      s.floaters.push(makeFloater(FIELD.width / 2, FIELD.height / 2, 'WAVE CLEAR +' + pts, PALETTE.gold));
      s.waveState = 'idle';
      startWave(s.wave + 1);
      return EVENT_WAVE_CLEAR;
    }
    if (s.screen === 'over') return EVENT_OVER;
    return 0;
  }

  loadBest();

  return {
    get state() {
      return s;
    },
    set state(v) {
      s = v;
    },
    reset,
    startGame,
    startWave,
    step,
    loadBest,
  };
}
