/*
 * Renders maps/index.html (?map=spain / ?map=africa) to transparent PNG
 * frame sequences. Usage: node render.mjs [spain|africa|all] [fps]
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const which = process.argv[2] || 'all';
const FPS = Number(process.argv[3]) || 30;
const maps = which === 'all' ? ['spain', 'africa'] : [which];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  args: ['--force-color-profile=srgb', '--disable-lcd-text'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

for (const map of maps) {
  const framesDir = join(here, 'out', `frames-${map}`);
  mkdirSync(framesDir, { recursive: true });
  await page.goto('file://' + join(here, 'index.html') + `?map=${map}`);
  await page.evaluate(() => document.fonts.ready);
  const total = await page.evaluate(() => window.TOTAL);
  const frames = Math.ceil(total * FPS);
  console.log(`[${map}] rendering ${frames} frames @ ${FPS}fps...`);
  for (let f = 0; f < frames; f++) {
    await page.evaluate(t => window.seek(t), f / FPS);
    await page.screenshot({
      path: join(framesDir, `f_${String(f).padStart(4, '0')}.png`),
      omitBackground: true,
    });
    if (f % 60 === 0) console.log(`  frame ${f}/${frames}`);
  }
}

await browser.close();
console.log('Done.');
