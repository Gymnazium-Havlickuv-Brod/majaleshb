# majaleshb.cz

Prezentační web studentského Majálesu v Havlíčkově Brodě (Gymnázium HB × SPŠ stavební). Pracovní podklady, rozpočet a úkoly jsou v sousedním repu `c:\dev\ghb\majales`. Tady je jen veřejný web.

Stack jako learningtriangle.cz: **Astro 5** (statický výstup), **Tailwind 4** přes Vite, sitemap. Žádný klientský framework, jen pár řádků JS (odpočet, galerie, mobilní menu).

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # → dist/
npm run preview
```

**Texty a fakta o Majálesu** (co je potvrzené, co plánujeme, co jsou jen nápady, co nepsat): [O-MAJALESU.md](O-MAJALESU.md). Než něco změníš na webu, přepiš to tam.

## Stránky

| URL | Soubor | Co tam je |
|---|---|---|
| `/` | `src/pages/index.astro` | hero video (render 3D scény) s odpočtem, o Majálesu, program, line-up (6 × ?), loga partnerů, galerie, výzva pro partnery |
| `/partneri/` | `src/pages/partneri.astro` | úrovně partnerství (5 000 / 10 000 / 25 000 Kč, dar), nabídka na míru, postup |
| `/archiv/hero-3d/` | `src/pages/archiv/hero-3d.astro` | archiv: úvodní stránka s živou 3D hero (three.js) – zároveň zdroj pro render videa, noindex, mimo sitemap |
| `/archiv/puvodni-hero/` | `src/pages/archiv/puvodni-hero.astro` | archiv: úvodní stránka s původní plakátovou hero sekcí (`src/components/archiv/HeroPlakat.astro`), noindex, mimo sitemap |

## Kde se mění obsah

- `src/data/akce.ts`: datum, místo, kontakt, program, line-up. **Jen potvrzené věci.** Časy programu a jména kapel sem přijdou, až budou jisté.
- `src/data/partneri.ts`: úrovně partnerství, co za ně partner dostane, a **seznam potvrzených partnerů** (`PARTNERI`).
- `src/styles/global.css`: barvy (`@theme`) a fonty, všechno na jednom místě.
- E-mailové odkazy (`mailto:`) neotevírají rovnou poštovní aplikaci, ale okno s volbou Gmail / Outlook / poštovní aplikace / zkopírovat adresu (`src/components/NapsatEmail.astro`). Předmět a text konceptu se berou z odkazu (`subject`, `body`), pro partnery je skládá funkce `mail()` v `src/pages/partneri.astro`.

### Přidání partnera (logo na web)

1. Logo ulož do `src/assets/partneri/`. Nejlépe SVG, jinak PNG s průhledným pozadím a šířkou aspoň 600 px.
2. Do `PARTNERI` v `src/data/partneri.ts` přidej řádek, např. `{ nazev: 'Firma s.r.o.', logo: 'firma.svg', url: 'https://www.firma.cz', uroven: 'hlavni' }`. Úroveň je `hlavni` (hlavní partner, 25 000 Kč), nebo `partner` (do `partner` patří i partner za 10 000, podporovatel a dar).
3. Commit a push na `main`. Vercel web nasadí sám.

Loga se ukazují na hlavní stránce (sekce Partneři, `/#partneri`) i na `/partneri/`. Volná místa se doplní rámečky „Vaše logo“ (počty jsou v `MISTA`). Logo dávej na web až po potvrzení a se souhlasem partnera.

## Fotky

1. Originály leží v `c:\dev\ghb\majales\media` (mimo git, soupis v `media/INDEX.md`).
2. `c:\dev\ghb\majales\media\HODNOCENI-FOTEK.json` (privátní, mimo tohle repo) obsahuje hodnocení všech 334 fotek: skóre 1–10, typ, příznaky (dítě zblízka, alkohol, duplicita) a český alt text.
3. `scripts/fotky-vyber.json` je výběr na web: klíč, zdroj, rok, role (`hero`, `og`, `partneri`, `program:*`, `o-majalesu`, `o-majalesu-2`), alt text a volitelně `orez` (výřez `[x1, y1, x2, y2]` v podílech originálu, když web ořezáním od středu schová hlavní motiv). Fotku přidáš nebo vyměníš tady.
4. `python scripts/fotky.py` vyexportuje výběr do `src/assets/foto/`: max 2000 px, bez EXIF/GPS. Zároveň vygeneruje `src/data/fotky.ts` (ten se needituje ručně).
5. **`fotky-balik/`** obsahuje 78 zajímavých fotek (skóre 7+), i ty, které na webu zatím nejsou, pro toho, kdo bude web upravovat. Náhledy jsou v `fotky-balik/index.html` (dvojklik), tabulka v `fotky-balik/README.md`. Přegeneruje se příkazem `python scripts/fotky-balik.py`.
6. Při buildu z nich Astro (`astro:assets`) vyrobí WebP v několika šířkách. Stránka pak přes `srcset`/`sizes` načte jen velikost, kterou zařízení potřebuje, a fotky mimo obrazovku načítá líně.
7. **Hodnocení fotek:** `python scripts/hodnoceni-fotek.py <složka> --arch render/archy --detaily render/detaily` změří technickou kvalitu (přepálení, tma, ostrost, kontrast, rozlišení, skoro stejné záběry), dá skóre 0–10 a vyrobí kontaktní archy a výřezy nejostřejšího místa. Krásu nezměří – tu posoudí agent Balrog (viz níž).

Od 25. 11. 2026 jsou na webu jen fotky z let 2025 a 2026 (Majáles 2025, Color Run 2026 a Majáles 2026). Originály nových fotek jsou zatím jen ve složkách „Majales 2025“, „MAJALES - COLOR RUN“ a „05 majales/edit“ (ve `zdroj` jako `2026/foto/05 majales/…`), do `media/` v pracovním repu je potřeba je teprve nahrát; do té doby `scripts/fotky.py` nové fotky znovu nevyexportuje. `fotky-balik/` je ještě ze starého výběru.

## Agenti (Claude Code)

V `.claude/agents/` jsou dva pomocníci, Claude Code je načte sám, když se pracuje v tomhle repu:

- **Morgoth** (`morgoth.md`) – kontrolor před nasazením: build, barvy, nadpisy, texty a pravidla z O-MAJALESU.md, fotky na webu (alkohol, děti, jmenovky, reklamy), snímky na PC i mobilu a po nasazení živý web. Jen hlásí, nic neopravuje. Stačí napsat „zkontroluj to Morgothem“.
- **Balrog** (`balrog.md`) – fotoeditor: změří fotky skriptem `scripts/hodnoceni-fotek.py`, prohlédne si je a ke každé řekne 🟢 hezká / 🟡 ujde / 🔴 na hovno s konkrétním důvodem a doporučí výběr na web. Taky jen radí. Stačí napsat „ať Balrog projde fotky ve složce …“.

## Vizuál

Čtyři barvy, bez odstínů a průhledností (výjimka: fotky, video a clona přes video). Žádná černá ani stíny. Tokeny jsou v `src/styles/global.css` (`@theme` vypíná výchozí paletu Tailwindu, takže jiná barva se do webu nedostane ani omylem).

| Token | Barva | Použití |
|---|---|---|
| `bila` | `#FFFFFF` | základní pozadí obsahu |
| `modra` | `#004AFD` Electric Blue | text na bílé; pozadí jen na vybraných místech (hero, menu, běžící pás, line-up, patička, zvýrazněná karta, panel „Podpořte Majáles“, kroky „Jak to probíhá“, lightbox) |
| `ruzova` | `#FAC7E1` Flamingo Pink | text na modré, plné tlačítko na modré |
| `hot` | `#FF4FA3` Hot Pink | doplňky: linky, rámečky karet, přerušované rámečky, oddělovače sekcí, odrážky, šipky →, okvětní lístky květu v běžícím pásu (střed květu je světle růžový), „’27“ v logu (nápis Majáles je světle růžový), podtržení odkazů, focus. Nikdy na text |

Dva režimy, v každém má typ prvku pevnou barvu:

- **Bílý (výchozí):** modrý text, tlačítko s modrým obrysem, plné tlačítko = modrá výplň s růžovým textem.
- **Modrý (`.na-modre`):** růžový text, tlačítko s růžovým obrysem, plné tlačítko = růžová výplň s modrým textem.
- V obou: karta má rámeček 2 px sytě růžový (`.karta`), dvě bílé sekce za sebou odděluje sytě růžová linka (`.predel`), odkaz v textu má sytě růžové podtržení (`.odkaz`), štítek („jen jeden“, rok u fotky) je růžový s modrým textem (`.stitek`).

Kontrast: modrá na bílé 6,2 : 1, růžová na modré 4,2 : 1 (proto je běžný text v řezu 500). Fonty jsou Anton a Space Grotesk, oba hostované lokálně přes `@fontsource` (bez Google Fonts).

Hero video zůstává vyrenderované ze 3D scény v původních barvách. Clona přes něj je modrá `#004AFD`, aby video plynule přešlo do pozadí hero sekce.

## Otevřené (TODO)

- Kontaktní e-mail `info@majaleshb.cz` je zatím placeholder. Instagram a Facebook doplnit do `KONTAKT` v `akce.ts`.
- Hosting a doména (Cloudflare Pages jako learningtriangle?) zatím nejsou nastavené.

## Hero video (3D scéna)

Od 17. 11. 2026 je na hlavní stránce místo živé three.js scény **smyčkové video** vyrenderované z téže scény (živá verze se na slabších počítačích sekala). Komponenta `src/components/HeroVideo.astro`, videa `public/hero/majales-{desktop,tablet,mobil}.mp4` (36 s, H.264), plakáty = první snímek smyčky v `src/assets/hero-video/`.

**Zdroj (model) zůstává:** scéna `src/scripts/hero3d.js` + komponenta `src/components/Hero3D.astro`. Živě běží na archivní stránce `/archiv/hero-3d/` (noindex), původní plakátová hero je dál na `/archiv/puvodni-hero/`.

**Načítání:** hned se ukáže plakát (AVIF/WebP), video se začne stahovat po načtení stránky a prolne se, až opravdu hraje. Varianta podle šířky (≥ 1024 desktop, ≥ 640 tablet, jinak mobil). Při omezeném pohybu nebo zablokovaném autoplay zůstane plakát. Tlačítko pauzy, mimo obrazovku se pauzuje.

**Přerenderování** (po změně scény nebo partnerů – loga na LED stěně jsou ve videu „zapečená“, změna v `src/data/partneri.ts` se na hlavní stránce projeví až po renderu):
1. `npm run dev` (nebo build + `npx astro preview`) běží na `localhost:4321`.
2. `npm run render-hero` (případně jen jedna varianta: `node scripts/render-hero.mjs desktop`). Prvně možná `npx playwright install chromium`.
3. Skript otevře `/archiv/hero-3d/?smycka`, kde jsou všechny pohyby zaokrouhlené na délku smyčky (poslední snímek navazuje na první; délka = celé kolo snímků LED stěny, ≥ 30 s), projde scénu snímek po snímku přes `window.__hero3d.vykresli(t)`, uloží JPEGy do `render/` (gitignore) a ffmpegem udělá MP4 + plakát. Jen překódovat bez renderu: `--jen-kodovat`. Volby `--fps`, `--smycka`, `--url`, `--ffmpeg`.
4. Zkontrolovat velikost (teď desktop 2560 px 34 MB, tablet 1640 px 30 MB, mobil 1080 px 21 MB; CRF 22, render ve vyšším rozlišení a zmenšený) a commitnout videa + plakáty.

Mouse parallax (kamera za myší) ve videu není, živě je jen v archivu.
