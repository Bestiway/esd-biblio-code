/**
 * College Access — rend le carton titre en une séquence d'images à couche alpha.
 *
 *   node tools/render-frames.js --title "LA NCAA" --index "1/" --out ./build
 *
 * Options : --title --index --kicker --w --h --fps --duration --out --no-stamp
 *
 * Le rendu passe par le mode `?capture` de animations/carton-titre.html :
 * fond réellement transparent, échelle 1:1, et window.__seek(ms) qui fige
 * toutes les animations à un instant donné. Les images sont donc exactes,
 * indépendamment de la vitesse de la machine.
 *
 * Prérequis : npm i playwright  (ou un Chromium déjà installé, cf. CHROMIUM)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
}

const options = {
  title:    arg('title', 'LA NCAA'),
  index:    arg('index', '1/'),
  kicker:   arg('kicker', ''),
  width:    Number(arg('w', 1080)),
  height:   Number(arg('h', 1920)),
  fps:      Number(arg('fps', 30)),
  duration: Number(arg('duration', 4)),
  out:      path.resolve(arg('out', './build')),
  stamp:    !process.argv.includes('--no-stamp')
};

(async () => {
  const frames = path.join(options.out, 'frames');
  fs.mkdirSync(frames, { recursive: true });
  for (const f of fs.readdirSync(frames)) fs.unlinkSync(path.join(frames, f));

  const browser = await chromium.launch(
    process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}
  );
  const page = await browser.newPage({
    viewport: { width: options.width, height: options.height },
    deviceScaleFactor: 1
  });
  page.on('pageerror', e => console.error('Erreur page :', e.message));

  const params = new URLSearchParams({
    capture: '1',
    w: String(options.width),
    h: String(options.height),
    title: options.title,
    index: options.index,
    kicker: options.kicker
  });
  if (!options.stamp) params.set('stamp', 'off');

  const file = path.resolve(__dirname, '..', 'animations', 'carton-titre.html');
  await page.goto('file://' + file + '?' + params.toString());

  /* La police est embarquée dans la page : on attend qu'elle soit posée,
     sinon le calage du titre se ferait sur la police de repli. */
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const stage = await page.$('#stage');
  const total = Math.round(options.fps * options.duration);

  for (let i = 0; i < total; i++) {
    await page.evaluate(ms => window.__seek(ms), (i / options.fps) * 1000);
    await stage.screenshot({
      path: path.join(frames, `f${String(i).padStart(4, '0')}.png`),
      omitBackground: true          /* c'est ici que naît la transparence */
    });
  }

  await browser.close();
  console.log(`${total} images ${options.width}×${options.height} → ${frames}`);
})();
