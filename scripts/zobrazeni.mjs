// Kontrola zobrazení webu Majáles HB na různých obrazovkách (agent Tom Bombadil).
// Projde stránky na mobilech, tabletech a PC, udělá snímky a sám najde typické chyby:
// přetečení do strany, texty přes sebe, useknutý text, malá tlačítka, malé písmo, rozbité obrázky.
//
// Použití (statická kopie musí běžet, viz README → „Ověření“):
//   node scripts/zobrazeni.mjs [adresa] [složka] [zařízení]
//     adresa   výchozí http://127.0.0.1:4322, pro živý web https://majaleshb.cz
//     složka   výchozí render/bombadil (render/ je v .gitignore)
//     zařízení volitelně čárkou oddělený výběr, třeba mobil-320,mobil-390 (jinak všech 11)
// Výstup ve složce: zprava.json (všechny nálezy), nalezy/*.png (výřez kolem každého nálezu),
// rezy/<zařízení>/*.jpg (stránka po obrazovkách) a archy/<zařízení>-<stránka>.jpg (všechny obrazovky na jednom obrázku).
// Hero video se kvůli stabilním snímkům nespouští (prefers-reduced-motion), je vidět jeho plakát.
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [adresa = 'http://127.0.0.1:4322', slozka = 'render/bombadil', vyber = ''] = process.argv.slice(2);

const ZARIZENI = [
  { jm: 'mobil-320', w: 320, h: 640, dpr: 2, dotyk: true }, // malý telefon (iPhone SE 1. gen., levné Androidy)
  { jm: 'mobil-360', w: 360, h: 780, dpr: 3, dotyk: true }, // nejčastější Android
  { jm: 'mobil-390', w: 390, h: 844, dpr: 3, dotyk: true }, // iPhone 12–15
  { jm: 'mobil-412', w: 412, h: 915, dpr: 2.625, dotyk: true }, // Pixel, Samsung
  { jm: 'mobil-430', w: 430, h: 932, dpr: 3, dotyk: true }, // iPhone Pro Max / Plus
  { jm: 'mobil-na-sirku', w: 844, h: 390, dpr: 3, dotyk: true }, // telefon na šířku
  { jm: 'tablet-768', w: 768, h: 1024, dpr: 2, dotyk: true }, // iPad na výšku
  { jm: 'tablet-1024', w: 1024, h: 1366, dpr: 2, dotyk: true }, // iPad Pro na výšku
  { jm: 'notebook-1280', w: 1280, h: 720, dpr: 1.5, dotyk: false },
  { jm: 'pc-1440', w: 1440, h: 900, dpr: 1, dotyk: false },
  { jm: 'pc-1920', w: 1920, h: 1080, dpr: 1, dotyk: false },
].filter((z) => !vyber || vyber.split(',').includes(z.jm));

const STRANKY = [
  ['uvod', '/'],
  ['partneri', '/partneri/'],
  ['404', '/tahle-adresa-neexistuje/'],
];

// Kontroly přímo ve stránce. Souřadnice nálezů jsou v pixelech dokumentu (CSS px).
function zkontrolovat(dotyk) {
  const vw = document.documentElement.clientWidth;
  const nalezy = [];
  const popis = (el) => {
    const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 50);
    const tridy = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 3).join('.');
    return `<${el.tagName.toLowerCase()}${tridy ? '.' + tridy : ''}>${text ? ` „${text}“` : ''}`;
  };
  const dok = (r) => ({ x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height });
  const skryty = (el) => {
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return true;
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return true;
      // obsah zavřeného <details> (třeba mobilní menu) není vidět, i když má rozměry
      if (a.tagName === 'DETAILS' && !a.open && !el.closest('summary')) return true;
    }
    const r = el.getBoundingClientRect();
    return r.width <= 1 || r.height <= 1; // i „sr-only“ texty pro čtečky
  };
  const vlastniText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());

  // 1) přetečení do strany: stránka jde posunout vodorovně
  if (document.documentElement.scrollWidth > vw + 1) {
    const ven = [...document.body.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > vw + 1 && !skryty(el));
    const priciny = ven.filter((el) => !ven.some((d) => d !== el && el.contains(d))).slice(0, 8);
    for (const el of priciny) {
      const r = el.getBoundingClientRect();
      nalezy.push({ typ: 'pretece-do-strany', vaha: 'chyba', popis: `${popis(el)} přesahuje pravý okraj o ${Math.round(r.right - vw)} px, stránka jde posunout do strany`, ...dok(r) });
    }
  }

  // 2) texty přes sebe: obdélníky řádků textu z různých prvků se protínají.
  // Obdélník řádku je výška písma včetně rezervy nad a pod písmeny, proto se zmenší (nahoře 18 %, dole 12 %).
  const radky = [];
  const chodec = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = chodec.nextNode()); ) {
    const el = n.parentElement;
    if (!n.nodeValue.trim() || !el || el.closest('script, style, noscript, template') || skryty(el)) continue;
    const rozsah = document.createRange();
    rozsah.selectNodeContents(n);
    for (const r of rozsah.getClientRects()) {
      if (r.width < 3 || r.height < 3) continue;
      radky.push({ n, el, x1: r.left + scrollX, x2: r.right + scrollX, y1: r.top + scrollY + r.height * 0.18, y2: r.bottom + scrollY - r.height * 0.12 });
    }
  }
  radky.sort((a, b) => a.y1 - b.y1);
  const nahlasene = new Set();
  for (let i = 0; i < radky.length; i++) {
    const a = radky[i];
    for (let j = i + 1; j < radky.length && radky[j].y1 < a.y2; j++) {
      const b = radky[j];
      if (a.n === b.n || a.el === b.el) continue;
      const sirka = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
      const vyska = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
      if (sirka < 3 || vyska < 3) continue;
      const klic = [popis(a.el), popis(b.el)].sort().join(' × ');
      if (nahlasene.has(klic)) continue;
      nahlasene.add(klic);
      const x = Math.min(a.x1, b.x1), y = Math.min(a.y1, b.y1);
      nalezy.push({ typ: 'texty-pres-sebe', vaha: 'chyba', popis: `text ${popis(a.el)} a text ${popis(b.el)} se překrývají (${Math.round(sirka)} × ${Math.round(vyska)} px)`, x, y, w: Math.max(a.x2, b.x2) - x, h: Math.max(a.y2, b.y2) - y });
    }
  }

  // 3) useknutý text: prvek s vlastním textem schovává přetékající obsah
  for (const el of document.body.querySelectorAll('*')) {
    if (!vlastniText(el) || skryty(el)) continue;
    const cs = getComputedStyle(el);
    const schovava = ['hidden', 'clip'].includes(cs.overflowX) || ['hidden', 'clip'].includes(cs.overflowY) || cs.textOverflow === 'ellipsis';
    if (schovava && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)) {
      nalezy.push({ typ: 'useknuty-text', vaha: 'chyba', popis: `${popis(el)} má víc textu, než se vejde (${el.scrollWidth}×${el.scrollHeight} v ${el.clientWidth}×${el.clientHeight} px)`, ...dok(el.getBoundingClientRect()) });
    }
  }

  // 4) malé cíle pro prst (jen dotyková zařízení): pod 24 px (WCAG 2.5.8); odkazy uvnitř věty se nepočítají
  if (dotyk) {
    for (const el of document.body.querySelectorAll('a[href], button, summary, [role="button"], input:not([type="hidden"]), select, textarea')) {
      if (skryty(el)) continue;
      const r = el.getBoundingClientRect();
      const veVete = getComputedStyle(el).display === 'inline' && el.parentElement && vlastniText(el.parentElement);
      if (!veVete && (r.width < 24 || r.height < 24)) {
        nalezy.push({ typ: 'maly-cil-pro-prst', vaha: 'varovani', popis: `${popis(el)} je jen ${Math.round(r.width)} × ${Math.round(r.height)} px, prstem se špatně trefuje (aspoň 24 px, ideálně 44 px)`, ...dok(r) });
      }
    }
  }

  // 5) malé písmo: pod 12 px (souhrn podle prvku a velikosti)
  const male = new Map();
  for (const el of document.body.querySelectorAll('*')) {
    if (!vlastniText(el) || skryty(el)) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px < 12) {
      const klic = `${px.toFixed(1)} px ${popis(el).replace(/ „.*$/, '')}`;
      if (!male.has(klic)) male.set(klic, el);
    }
  }
  for (const [klic, el] of male) nalezy.push({ typ: 'male-pismo', vaha: 'info', popis: `písmo ${klic}, např. ${popis(el)}`, ...dok(el.getBoundingClientRect()) });

  // 6) obrázky: rozbité a viditelně zvětšené (rozmazané).
  // U srcset s „w“ vrací naturalWidth šířku přepočtenou na hustotu, skutečné pixely jsou v popisu vybrané varianty.
  const pixely = (img) => {
    const zdroje = [img.srcset, ...(img.parentElement?.tagName === 'PICTURE' ? [...img.parentElement.querySelectorAll('source')].map((s) => s.srcset) : [])];
    for (const varianta of zdroje.join(',').split(',')) {
      const [url, popisek] = varianta.trim().split(/\s+/);
      if (url && popisek?.endsWith('w') && new URL(url, location.href).href === img.currentSrc) return parseInt(popisek, 10);
    }
    return img.naturalWidth;
  };
  for (const img of document.querySelectorAll('img')) {
    if (skryty(img)) continue;
    const r = img.getBoundingClientRect();
    const px = pixely(img);
    if (img.complete && img.naturalWidth === 0) {
      nalezy.push({ typ: 'rozbity-obrazek', vaha: 'chyba', popis: `obrázek ${img.currentSrc || img.src} se nenačetl`, ...dok(r) });
    } else if (px && r.width * devicePixelRatio > px * 1.6) {
      nalezy.push({ typ: 'rozmazany-obrazek', vaha: 'info', popis: `obrázek „${img.alt.slice(0, 40)}“ má ${px} px, zobrazený je na ${Math.round(r.width * devicePixelRatio)} px displeje`, ...dok(r) });
    }
  }

  return { nalezy, sirka: document.documentElement.scrollWidth, vyska: document.documentElement.scrollHeight, vw };
}

rmSync(slozka, { recursive: true, force: true });
for (const d of ['nalezy', 'rezy', 'archy']) mkdirSync(join(slozka, d), { recursive: true });

const browser = await chromium.launch();
const zprava = [];
let cislo = 0;
for (const z of ZARIZENI) {
  const ctx = await browser.newContext({ viewport: { width: z.w, height: z.h }, deviceScaleFactor: z.dpr, isMobile: z.dotyk, hasTouch: z.dotyk });
  const page = await ctx.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  mkdirSync(join(slozka, 'rezy', z.jm), { recursive: true });
  for (const [stranka, cesta] of STRANKY) {
    await page.goto(adresa + cesta, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // projet stránku, ať se načtou líné obrázky a galerie se rozloží
    const vyska = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < vyska; y += Math.round(z.h * 0.8)) {
      await page.evaluate((y) => scrollTo(0, y), y);
      await page.waitForTimeout(120);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    const v = await page.evaluate(zkontrolovat, z.dotyk);
    // výřezy kolem nálezů (kromě souhrnu malého písma), nejvýš 15 na stránku
    for (const n of v.nalezy.filter((n) => n.typ !== 'male-pismo').slice(0, 15)) {
      const x = Math.max(0, Math.floor(n.x - 24)), y = Math.max(0, Math.floor(n.y - 24));
      const clip = { x, y, width: Math.max(8, Math.min(v.sirka - x, Math.ceil(n.w + 48))), height: Math.max(8, Math.min(v.vyska - y, Math.ceil(n.h + 48), 1400)) };
      n.vyrez = join(slozka, 'nalezy', `${String(++cislo).padStart(3, '0')}-${z.jm}-${stranka}-${n.typ}.png`);
      await page.screenshot({ path: n.vyrez, clip, fullPage: true, scale: 'css' }).catch(() => (n.vyrez = null));
    }
    // stránka po obrazovkách (s menu, jak ji vidí člověk při scrollování)
    const rezy = [];
    const vyskaTed = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0, i = 0; y < vyskaTed && i < 24; y += z.h, i++) {
      await page.evaluate((y) => scrollTo(0, y), y);
      await page.waitForTimeout(150);
      const soubor = join('rezy', z.jm, `${stranka}-${String(i + 1).padStart(2, '0')}.jpg`);
      await page.screenshot({ path: join(slozka, soubor), type: 'jpeg', quality: 70, scale: 'css' });
      rezy.push(soubor);
    }
    zprava.push({ zarizeni: z.jm, sirka: z.w, stranka, cesta, preteceni: v.sirka > v.vw + 1, nalezy: v.nalezy, rezy });
    const pocty = v.nalezy.reduce((a, n) => ((a[n.typ] = (a[n.typ] || 0) + 1), a), {});
    console.log(`${z.jm.padEnd(15)} ${stranka.padEnd(9)} ${Object.entries(pocty).map(([t, c]) => `${t} ${c}`).join(', ') || 'bez nálezů'}`);
  }
  await ctx.close();
}

// archy: všechny obrazovky jedné stránky na jednom obrázku (vyrobí se přes HTML a snímek v prohlížeči)
const archPage = await browser.newPage();
for (const zaznam of zprava) {
  const z = ZARIZENI.find((x) => x.jm === zaznam.zarizeni);
  const naRadek = z.w < 700 ? 6 : 3;
  const sirkaRezu = z.w < 700 ? 230 : 520;
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:16px;background:#fff;font:14px sans-serif}
    .m{display:grid;grid-template-columns:repeat(${naRadek},${sirkaRezu}px);gap:14px}img{width:100%;display:block;outline:1px solid #ccc}
    p{margin:2px 0 0}</style><h3>${zaznam.zarizeni} (${z.w} × ${z.h}) · ${zaznam.cesta}</h3><div class="m">${zaznam.rezy
    .map((r, i) => `<div><img src="../${r.replace(/\\/g, '/')}"><p>${i + 1}</p></div>`)
    .join('')}</div>`;
  const soubor = resolve(slozka, 'archy', `${zaznam.zarizeni}-${zaznam.stranka}.html`);
  writeFileSync(soubor, html);
  await archPage.setViewportSize({ width: naRadek * (sirkaRezu + 14) + 32, height: 800 });
  await archPage.goto(pathToFileURL(soubor).href, { waitUntil: 'load' });
  await archPage.screenshot({ path: soubor.replace(/\.html$/, '.jpg'), type: 'jpeg', quality: 72, fullPage: true });
  rmSync(soubor);
}
await browser.close();

writeFileSync(join(slozka, 'zprava.json'), JSON.stringify(zprava, null, 1));
const vse = zprava.flatMap((z) => z.nalezy.map((n) => ({ ...n, zarizeni: z.zarizeni, stranka: z.stranka })));
const chyby = vse.filter((n) => n.vaha === 'chyba');
console.log(`\nhotovo: ${zprava.length} kombinací zařízení × stránka, nálezů ${vse.length} (chyb ${chyby.length}), zpráva ${join(slozka, 'zprava.json')}`);
for (const n of chyby.slice(0, 40)) console.log(`  ✗ ${n.zarizeni} ${n.stranka}: ${n.popis}${n.vyrez ? `  → ${n.vyrez}` : ''}`);
