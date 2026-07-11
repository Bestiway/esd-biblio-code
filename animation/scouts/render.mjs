/*
 * Renders pathway/index.html (1080x1920, 9:16) to a transparent PNG
 * frame sequence. Usage: node render-vertical.mjs [fps]
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const framesDir = join(here, 'out', 'frames');
mkdirSync(framesDir, { recursive: true });

const FPS = Number(process.argv[2]) || 30;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  args: ['--force-color-profile=srgb', '--disable-lcd-text'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto('file://' + join(here, 'index.html'));
await page.evaluate(() => document.fonts.ready);

const total = await page.evaluate(() => window.TOTAL);
const frames = Math.ceil(total * FPS);
console.log(`Rendering ${frames} vertical frames @ ${FPS}fps (${total}s)...`);

for (let f = 0; f < frames; f++) {
  await page.evaluate(t => window.seek(t), f / FPS);
  await page.screenshot({
    path: join(framesDir, `f_${String(f).padStart(4, '0')}.png`),
    omitBackground: true,
  });
  if (f % 60 === 0) console.log(`  frame ${f}/${frames}`);
}

await browser.close();
console.log('Done:', framesDir);
