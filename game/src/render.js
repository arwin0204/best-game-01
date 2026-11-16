// LUMEN BLOOM — render. Draws the field, every entity, the HUD and the
// screens. It reads world state and never changes it. All art is drawn
// with canvas paths, so the game ships no image files.
import { FIELD, PALETTE, PLAYER } from './config.js';
import { KIND } from './entities.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, stars, time) {
  const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  g.addColorStop(0, PALETTE.deep);
  g.addColorStop(1, PALETTE.deep2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  // Slow nebula blobs, drawn additively so they glow.
  ctx.globalCompositeOperation = 'lighter';
  const blobs = [
    { x: 180, y: 140, r: 190, c: 'rgba(125, 255, 212, 0.05)' },
    { x: 780, y: 420, r: 220, c: 'rgba(255, 122, 217, 0.05)' },
    { x: 500, y: 300, r: 260, c: 'rgba(179, 136, 255, 0.04)' },
  ];
  for (const b of blobs) {
    const rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    rg.addColorStop(0, b.c);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  // Parallax starfield with a gentle twinkle.
  for (const s of stars) {
    const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 1.5 + s.tw));
    ctx.globalAlpha = a * s.z;
    ctx.fillStyle = '#cfe8ff';
    ctx.beginPath();
    ctx.arc(s.x, (s.y + time * 6 * s.z) % FIELD.height, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(ctx, player, time) {
  // Engine trail.
  for (let i = 0; i < player.trail.length; i += 1) {
    const p = player.trail[i];
    const a = (i / player.trail.length) * 0.35;
    ctx.globalAlpha = a;
    ctx.fillStyle = PALETTE.bloom;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4 + (i / player.trail.length) * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Shield ring while invulnerable.
  if (player.shield > 0 && Math.floor(time * 12) % 2 === 0) {
    ctx.strokeStyle = 'rgba(125, 255, 212, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  // The seed-ship: a bloom petal hull with a bright core.
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle + Math.PI / 2);
  ctx.fillStyle = PALETTE.bloom;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.quadraticCurveTo(12, -4, 9, 10);
  ctx.quadraticCurveTo(0, 15, -9, 10);
  ctx.quadraticCurveTo(-12, -4, 0, -17);
  ctx.fill();
  ctx.fillStyle = PALETTE.petal;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.quadraticCurveTo(6, -2, 4, 7);
  ctx.quadraticCurveTo(0, 10, -4, 7);
  ctx.quadraticCurveTo(-6, -2, 0, -10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -1, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx, enemy, time) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.flash > 0) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 18;
  }
  if (enemy.kind === KIND.MITE) {
    ctx.rotate(Math.sin(time * 2 + enemy.seed) * 0.3);
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * enemy.radius;
      const y = Math.sin(a) * enemy.radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a0b2e';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === KIND.WEAVER) {
    ctx.rotate(enemy.t * 1.4);
    ctx.strokeStyle = enemy.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      const x = Math.cos(a) * enemy.radius;
      const y = Math.sin(a) * enemy.radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === KIND.SPITTER) {
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2e1200';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.danger;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Titan: a ringed bloom with a pulsing core and a health arc.
    ctx.rotate(Math.sin(time * 0.7) * 0.15);
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * enemy.radius;
      const y = Math.sin(a) * enemy.radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3d0a1e';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);
    ctx.fillStyle = `rgba(255, 93, 93, ${0.5 + pulse * 0.5})`;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * (0.28 + pulse * 0.1), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius + 8, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * enemy.hp) / enemy.maxHp);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHud(ctx, state) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText(`SCORE ${state.score.toLocaleString('en-US')}`, 16, 12);
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`BEST ${state.best.toLocaleString('en-US')}`, 16, 44);

  ctx.textAlign = 'center';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillStyle = state.combo > 1 ? PALETTE.gold : PALETTE.dim;
  ctx.fillText(state.combo > 1 ? `COMBO x${state.combo}` : 'COMBO x1', FIELD.width / 2, 14);
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`WAVE ${Math.max(1, state.wave)}`, FIELD.width / 2, 42);

  // Lives as petals, top right.
  ctx.textAlign = 'right';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.petal;
  let petals = '';
  for (let i = 0; i < state.lives; i += 1) petals += '✿ ';
  ctx.fillText(petals || '—', FIELD.width - 16, 14);
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`✦ ${state.orbs} orbs`, FIELD.width - 16, 44);
  ctx.textAlign = 'left';
}

function drawBanner(ctx, state) {
  if (state.bannerTimer <= 0 || !state.banner) return;
  const a = Math.min(1, state.bannerTimer);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 44px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.bloom;
  ctx.shadowColor = PALETTE.bloom;
  ctx.shadowBlur = 24;
  ctx.fillText(state.banner, FIELD.width / 2, FIELD.height * 0.32);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawTitle(ctx, state, time) {
  ctx.fillStyle = 'rgba(7, 11, 30, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const bob = Math.sin(time * 1.6) * 6;
  ctx.font = '800 64px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.bloom;
  ctx.shadowColor = PALETTE.bloom;
  ctx.shadowBlur = 30;
  ctx.fillText('LUMEN BLOOM', FIELD.width / 2, 150 + bob);
  ctx.shadowBlur = 0;
  ctx.font = '600 21px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('A neon garden defence — bloom, shoot, survive the spores.', FIELD.width / 2, 205 + bob);
  ctx.font = '500 17px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('WASD / arrows — fly      Mouse — aim      Click / Space — fire', FIELD.width / 2, 285);
  ctx.fillText('Collect bloom orbs to raise your combo · Every 5th wave a Titan wakes', FIELD.width / 2, 314);
  ctx.fillText('P — pause      M — mute      R — restart', FIELD.width / 2, 343);
  const pulse = 0.55 + 0.45 * Math.sin(time * 3.2);
  ctx.globalAlpha = pulse;
  ctx.font = '800 26px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('CLICK OR PRESS ENTER TO PLAY', FIELD.width / 2, 430);
  ctx.globalAlpha = 1;
  if (state.best > 0) {
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(`Best score ${state.best.toLocaleString('en-US')}`, FIELD.width / 2, 478);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(7, 11, 30, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 48px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 20);
  ctx.font = '500 18px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('Press P to resume · R to restart', FIELD.width / 2, FIELD.height / 2 + 30);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawOver(ctx, state) {
  ctx.fillStyle = 'rgba(7, 11, 30, 0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 54px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.danger;
  ctx.shadowColor = PALETTE.danger;
  ctx.shadowBlur = 26;
  ctx.fillText('THE GARDEN FADES', FIELD.width / 2, 170);
  ctx.shadowBlur = 0;
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText(`Score ${state.score.toLocaleString('en-US')}`, FIELD.width / 2, 250);
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`Wave ${Math.max(1, state.wave)}  ·  ${state.kills} spores bloomed  ·  ${state.orbs} orbs gathered`, FIELD.width / 2, 296);
  ctx.fillText(`Best ${state.best.toLocaleString('en-US')}`, FIELD.width / 2, 330);
  const pulse = 0.55 + 0.45 * Math.sin(state.time * 3.2);
  ctx.globalAlpha = pulse;
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('PRESS R OR CLICK TO BLOOM AGAIN', FIELD.width / 2, 410);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function render(state, stars) {
    ctx.save();
    if (state.shake > 0) {
      const s = state.shake;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    drawBackground(ctx, stars, state.time);

    // Orbs: gold rings with a bright heart.
    for (const orb of state.orbsList) {
      const pulse = 0.7 + 0.3 * Math.sin(orb.t * 5);
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Enemy spore shots.
    for (const s of state.enemyShots) {
      ctx.fillStyle = PALETTE.danger;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const enemy of state.enemies) drawEnemy(ctx, enemy, state.time);

    // Pollen bolts.
    for (const b of state.bullets) {
      ctx.strokeStyle = 'rgba(125, 255, 212, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.player.alive && (state.screen === 'play' || state.screen === 'pause')) {
      drawPlayer(ctx, state.player, state.time);
    }

    // Particles, additive.
    ctx.globalCompositeOperation = 'lighter';
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Floating score text.
    ctx.textAlign = 'center';
    for (const f of state.floaters) {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    ctx.restore();

    if (state.screen === 'play' || state.screen === 'pause') drawHud(ctx, state);
    drawBanner(ctx, state);
    if (state.screen === 'title') drawTitle(ctx, state, state.time);
    if (state.screen === 'pause') drawPause(ctx);
    if (state.screen === 'over') drawOver(ctx, state);
  }

  return { render };
}

export { FIELD, PALETTE, PLAYER };
