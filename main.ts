// SPDX-License-Identifier: MIT
// LUMEN BLOOM — hand-in program for make.fun best-game-01.
// Copies game/ and screenshots/ into the output directory and writes
// dossier.json with the kit's buildDossier routine. Node standard library
// only: no clock, no randomness, no network, so repeated runs write
// identical bytes.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });

const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

const dossierPath = join(outDir, 'dossier.json');
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(dossierPath, dossier);
console.log(`LUMEN BLOOM dossier written: ${dossierPath} (${dossier.length} bytes)`);
