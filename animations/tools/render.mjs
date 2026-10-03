/*
 * Rendu d'une animation HTML en .mov pour CapCut.
 *
 *   node tools/render.mjs src/titre-trois-piliers.html --nom titre-trois-piliers
 *
 * Produit dans out/ :
 *   <nom>_ALPHA.mov    ProRes 4444, fond transparent → incrustation directe
 *
 * L'option --tout ajoute les variantes de secours : fond noir (pour le mode de
 * fusion « Écran » de CapCut), version aplatie sur navy, et aperçu léger.
 *
 * Le navigateur rend chaque frame à un temps exact (CA.seek) : l'export est
 * reproductible, sans frame sautée, quelle que soit la machine.
 */
import { chromium } from 'playwright-core';
import ffmpegPath from 'ffmpeg-static';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const run = promisify(execFile);

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ROOT = path.resolve(import.meta.dirname, '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const source = process.argv[2];
if (!source) {
  console.error('Usage : node tools/render.mjs <fichier.html> [--nom x] [--fps 30] [--w 1080] [--h 1920] [--params "n=1&titre=..."] [--tout]');
  process.exit(1);
}

const nom = arg('nom', path.basename(source, '.html'));
const fps = Number(arg('fps', 30));
const width = Number(arg('w', 1080));
const height = Number(arg('h', 1920));
const outDir = path.join(ROOT, 'out');
const framesDir = path.join(ROOT, '.frames', nom);

await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });
await mkdir(outDir, { recursive: true });

/* ---- 1. Rendu des frames ------------------------------------------------- */

const browser = await chromium.launch({
  executablePath: CHROME,
  args: [
    '--force-color-profile=srgb',
    '--disable-lcd-text',          // anticrénelage en niveaux de gris : indispensable sur fond transparent
    '--font-render-hinting=none',
    '--hide-scrollbars',
  ],
});

const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 1,
});

/* --params "n=1&titre=LE%20CARDIO" alimente les gabarits paramétrables */
const params = arg('params', '');
const url = pathToFileURL(path.resolve(source)).href + (params ? `?${params}` : '');
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

const duration = await page.evaluate(() => window.CA_DURATION ?? 5);
const total = Math.round(duration * fps);
console.log(`→ ${nom} : ${width}×${height}, ${duration}s, ${total} frames à ${fps} fps`);

for (let i = 0; i < total; i++) {
  await page.evaluate((time) => window.CA.seek(time), i / fps);
  await page.screenshot({
    path: path.join(framesDir, String(i).padStart(5, '0') + '.png'),
    omitBackground: true,            // conserve le canal alpha
  });
  if (i % 30 === 0) process.stdout.write(`   frame ${i}/${total}\r`);
}
await browser.close();
console.log(`   ${total}/${total} frames rendues        `);

const input = ['-framerate', String(fps), '-i', path.join(framesDir, '%05d.png')];

/* ---- 2. ProRes 4444, le livrable ----------------------------------------- */
/* Seul profil ProRes qui transporte l'alpha, et celui que lit CapCut.
   La qualité est dégradée d'un cran tant que le fichier dépasse la cible :
   au-delà de ~30 Mo le transfert vers le téléphone devient pénible, et sur
   des aplats de couleur la perte reste invisible. */

const alphaOut = path.join(outDir, `${nom}_ALPHA.mov`);
const maxBytes = Number(arg('max-mo', 29)) * 1024 * 1024;
let taille = 0;

for (const q of [6, 9, 13, 18]) {
  await run(ffmpegPath, [
    '-y', ...input,
    '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le',
    '-qscale:v', String(q), '-alpha_bits', '8', '-vendor', 'ap4h',
    alphaOut,
  ]);
  taille = (await stat(alphaOut)).size;
  console.log(`   ProRes qscale ${q} → ${(taille / 1048576).toFixed(1)} Mo`);
  if (taille <= maxBytes) break;
}
if (taille > maxBytes) {
  console.warn(`   ! ${(taille / 1048576).toFixed(1)} Mo : au-dessus de la cible, raccourcis le plan ou baisse le fps`);
}

/* ---- 3. Variantes de secours, uniquement avec --tout --------------------- */

const extras = [];
if (process.argv.includes('--tout')) {
  /* Fond noir : dans CapCut, le mode de fusion « Écran » rend le noir transparent.
     Fichier minuscule, lisible par n'importe quel téléphone. */
  const screenOut = path.join(outDir, `${nom}_FOND-NOIR.mp4`);
  await run(ffmpegPath, [
    '-y',
    '-f', 'lavfi', '-i', `color=c=black:s=${width}x${height}:r=${fps}:d=${duration}`,
    ...input,
    '-filter_complex', '[0:v][1:v]overlay=shortest=1,format=yuv420p[v]',
    '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
    '-movflags', '+faststart',
    screenOut,
  ]);

  /* Aplati sur navy : carton de titre plein écran autonome */
  const navyOut = path.join(outDir, `${nom}_NAVY.mov`);
  await run(ffmpegPath, [
    '-y',
    '-f', 'lavfi', '-i', `color=c=0x001057:s=${width}x${height}:r=${fps}:d=${duration}`,
    ...input,
    '-filter_complex', '[0:v][1:v]overlay=shortest=1,format=yuv420p[v]',
    '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
    '-movflags', '+faststart',
    navyOut,
  ]);

  /* Aperçu léger, fond gris foncé pour visualiser la zone transparente */
  const previewOut = path.join(outDir, `${nom}_apercu.mp4`);
  await run(ffmpegPath, [
    '-y',
    '-f', 'lavfi', '-i', `color=c=0x1A1D26:s=${width}x${height}:r=${fps}:d=${duration}`,
    ...input,
    '-filter_complex', '[0:v][1:v]overlay=shortest=1,scale=540:960,format=yuv420p[v]',
    '-map', '[v]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '26',
    '-movflags', '+faststart',
    previewOut,
  ]);

  extras.push(screenOut, navyOut, previewOut);
}

await rm(framesDir, { recursive: true, force: true });
for (const f of [alphaOut, ...extras]) {
  console.log(`✓ ${path.relative(ROOT, f)}`);
}
