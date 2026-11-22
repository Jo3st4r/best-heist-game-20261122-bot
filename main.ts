// Hand in The Gilded Vault (Node 22, standard library only).
//
// The game lives in game/ beside this file: plain static files a desktop
// browser loads offline — game/index.html and its ES modules, no library, no
// network request. This program copies game/ and screenshots/ into /output
// and writes /output/dossier.json, the summary the judge reads, using the
// vendored make.fun library (vendor/makefun-game.ts).
//
// Play it locally first: `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's caps: text_max_bytes shapes the dossier's bytes, and the rest
// refuse an entry the scorer would refuse — more than 4 screenshots, one over
// 256 KiB, more than 993 files in game/ or 48 MiB of game files in all, or a
// path under game/ over 1000 bytes. game/ counts beside /output's own
// 1000-entry cap, together with screenshots/ and dossier.json.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn() {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(out, { recursive: true });
  cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  }
  writeFileSync(join(out, 'dossier.json'), buildDossier(out, CAPS));
  console.log(`handed in to ${out}`);
}

handIn();
