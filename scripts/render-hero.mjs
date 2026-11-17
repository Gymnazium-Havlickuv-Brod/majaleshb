// Render 3D hero do smyčkového videa.
//
// Zdroj = živá scéna (src/scripts/hero3d.js) na archivní stránce /archiv/hero-3d/ v režimu ?smycka:
// všechny pohyby jsou zaokrouhlené na délku smyčky, takže poslední snímek plynule navazuje na první.
// Skript projde scénu snímek po snímku (zamčený čas, žádné záseky), uloží JPEG snímky do render/<varianta>/
// a ffmpegem z nich udělá public/hero/majales-<varianta>.mp4 + plakát src/assets/hero-video/plakat-<varianta>.jpg.
//
// Použití (v jiném terminálu běží `npm run dev` nebo `npx astro preview`):
//   node scripts/render-hero.mjs                      # všechny varianty
//   node scripts/render-hero.mjs desktop --fps 30     # jen jedna
//   node scripts/render-hero.mjs --jen-kodovat        # snímky už jsou v render/, jen znovu zakódovat
//   --url http://localhost:4321  --smycka 36  --ffmpeg C:\cesta\ffmpeg.exe
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

// okno a pixel ratio prohlížeče při renderu; plátno = sekce hero (okno bez hlavičky)
// sirka = šířka videa (render je o něco ostřejší, zmenšení vyhladí hrany a ušetří data)
const VARIANTY = {
  // desktop širší (≈ 2 : 1): široké monitory pak neuříznou věž radnice, užší ořežou jen okraje
  desktop: { width: 1920, height: 1000, dpr: 1, sirka: 1920 },
  tablet: { width: 820, height: 1180, dpr: 1.5, sirka: 1080 },
  mobil: { width: 390, height: 844, dpr: 2, sirka: 720 },
};

const args = process.argv.slice(2);
const volba = (jmeno, vychozi) => {
  const i = args.indexOf(`--${jmeno}`);
  return i >= 0 ? args[i + 1] : vychozi;
};
const URL_BASE = volba('url', 'http://localhost:4321');
const FPS = Number(volba('fps', 30));
const SMYCKA = volba('smycka', '');
const JEN_KODOVAT = args.includes('--jen-kodovat');
const FFMPEG =
  volba('ffmpeg', '') ||
  ['C:/dev/_tools/tools/ffmpeg/ffmpeg-8.0.1-essentials_build/bin/ffmpeg.exe'].find((p) => existsSync(p)) ||
  'ffmpeg';
const hodnotyVoleb = new Set(['url', 'fps', 'smycka', 'ffmpeg'].map((j) => volba(j)));
const vybrane = args.filter((a) => VARIANTY[a] && !hodnotyVoleb.has(a));
const varianty = vybrane.length ? vybrane : Object.keys(VARIANTY);

function ffmpeg(...a) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg selhal (${r.status}): ${a.join(' ')}`);
}

async function vyrenderuj(browser, jmeno) {
  const v = VARIANTY[jmeno];
  const slozka = join('render', jmeno);
  rmSync(slozka, { recursive: true, force: true });
  mkdirSync(slozka, { recursive: true });

  const page = await browser.newPage({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.dpr });
  page.on('pageerror', (e) => console.error('  chyba stránky:', e.message));
  await page.goto(`${URL_BASE}/archiv/hero-3d/?smycka${SMYCKA ? `=${SMYCKA}` : ''}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__hero3d?.vykresli, null, { timeout: 60000 });
  const { smycka, gpu, w, h } = await page.evaluate(() => {
    const c = document.querySelector('.hero3d-platno');
    return { smycka: window.__hero3d.smycka, gpu: window.__hero3d.gpu, w: c.width, h: c.height };
  });
  const n = Math.round(smycka * FPS);
  console.log(`${jmeno}: plátno ${w}×${h}, smyčka ${smycka} s = ${n} snímků @ ${FPS} fps, GPU ${gpu || '?'}`);

  const start = Date.now();
  for (let i = 0; i < n; i++) {
    const url = await page.evaluate((t) => {
      window.__hero3d.vykresli(t);
      // hned po vykreslení ve stejné úloze je buffer ještě platný i bez preserveDrawingBuffer
      return document.querySelector('.hero3d-platno').toDataURL('image/jpeg', 0.95);
    }, i / FPS);
    writeFileSync(join(slozka, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    if (i % 60 === 0) process.stdout.write(`  ${i}/${n} (${((Date.now() - start) / 1000).toFixed(0)} s)\r`);
  }
  console.log(`  ${n}/${n} hotovo za ${((Date.now() - start) / 1000).toFixed(0)} s`);
  await page.close();
}

function zakoduj(jmeno) {
  const vstup = ['-framerate', String(FPS), '-i', join('render', jmeno, 'f%05d.jpg')];
  const sude = ['-vf', `scale=${VARIANTY[jmeno].sirka}:-2:flags=lanczos`];
  mkdirSync('public/hero', { recursive: true });
  mkdirSync('src/assets/hero-video', { recursive: true });
  const mp4 = `public/hero/majales-${jmeno}.mp4`;
  // H.264 hraje všude (i Safari); VP9 i AV1 vyšly u téhle scény (dav, konfety) stejně velké nebo větší.
  // CRF 32 ≈ 1,6 Mbit/s na desktopu – streamuje se plynule, faststart = začne hrát hned při stahování.
  ffmpeg(...vstup, ...sude, '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '32', '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-movflags', '+faststart', '-an', mp4);
  // plakát = první snímek smyčky (Astro z něj udělá AVIF/WebP)
  copyFileSync(join('render', jmeno, 'f00000.jpg'), `src/assets/hero-video/plakat-${jmeno}.jpg`);
  const mb = (p) => (statSync(p).size / 1e6).toFixed(1);
  console.log(`  ${mp4} ${mb(mp4)} MB`);
}

if (!JEN_KODOVAT) {
  const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] });
  try {
    for (const jmeno of varianty) await vyrenderuj(browser, jmeno);
  } finally {
    await browser.close();
  }
}
for (const jmeno of varianty) zakoduj(jmeno);
