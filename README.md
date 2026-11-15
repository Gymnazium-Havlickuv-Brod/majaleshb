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
| `/` | `src/pages/index.astro` | 3D hero s odpočtem, o Majálesu, program, line-up (6 × ?), loga partnerů, galerie, výzva pro partnery |
| `/partneri/` | `src/pages/partneri.astro` | úrovně partnerství, barter, nabídka na míru, postup |
| `/archiv/puvodni-hero/` | `src/pages/archiv/puvodni-hero.astro` | archiv: úvodní stránka s původní plakátovou hero sekcí (`src/components/archiv/HeroPlakat.astro`), noindex, mimo sitemap |

## Kde se mění obsah

- `src/data/akce.ts`: datum, místo, kontakt, program, line-up. **Jen potvrzené věci.** Časy programu a jména kapel sem přijdou, až budou jisté.
- `src/data/partneri.ts`: úrovně partnerství, co za ně partner dostane, a **seznam potvrzených partnerů** (`PARTNERI`).
- `src/styles/global.css`: barvy (`@theme`) a fonty, všechno na jednom místě.

### Přidání partnera (logo na web)

1. Logo ulož do `src/assets/partneri/`. Nejlépe SVG, jinak PNG s průhledným pozadím a šířkou aspoň 600 px.
2. Do `PARTNERI` v `src/data/partneri.ts` přidej řádek, např. `{ nazev: 'Firma s.r.o.', logo: 'firma.svg', url: 'https://www.firma.cz', uroven: 'hlavni' }`. Úroveň je `generalni`, `hlavni`, nebo `partner` (do `partner` patří i podporovatel a barter).
3. Commit a push na `main`. Vercel web nasadí sám.

Loga se ukazují na hlavní stránce (sekce Partneři, `/#partneri`) i na `/partneri/`. Volná místa se doplní rámečky „Vaše logo“ (počty jsou v `MISTA`). Logo dávej na web až po potvrzení a se souhlasem partnera.

## Fotky

1. Originály leží v `c:\dev\ghb\majales\media` (mimo git, soupis v `media/INDEX.md`).
2. `c:\dev\ghb\majales\media\HODNOCENI-FOTEK.json` (privátní, mimo tohle repo) obsahuje hodnocení všech 334 fotek: skóre 1–10, typ, příznaky (dítě zblízka, alkohol, duplicita) a český alt text.
3. `scripts/fotky-vyber.json` je výběr na web: klíč, zdroj, rok, role (`hero`, `og`, `program:*`, `o-majalesu`) a alt text. Fotku přidáš nebo vyměníš tady.
4. `python scripts/fotky.py` vyexportuje výběr do `src/assets/foto/`: max 2000 px, bez EXIF/GPS. Zároveň vygeneruje `src/data/fotky.ts` (ten se needituje ručně).
5. **`fotky-balik/`** obsahuje 78 zajímavých fotek (skóre 7+), i ty, které na webu zatím nejsou, pro toho, kdo bude web upravovat. Náhledy jsou v `fotky-balik/index.html` (dvojklik), tabulka v `fotky-balik/README.md`. Přegeneruje se příkazem `python scripts/fotky-balik.py`.
6. Při buildu z nich Astro (`astro:assets`) vyrobí WebP v několika šířkách. Stránka pak přes `srcset`/`sizes` načte jen velikost, kterou zařízení potřebuje, a fotky mimo obrazovku načítá líně.

## Vizuál

Vychází z plakátu A1 (paleta P6 Electric Blue × Flamingo z `majales/grafika/`):

| Token | Barva | Použití |
|---|---|---|
| `modra` | `#3044F3` | hero a line-up, nadpisy na světlém pozadí |
| `ruzova` | `#FFC2E2` | velký text na modré a tmavé, tlačítka |
| `pulnoc` | `#0B0F4A` | text, galerie, patička |
| `krida` | `#FFF5FA` | podklad obsahových sekcí |
| `hot` | `#FF4FA3` | jen drobné akcenty (odznak, hvězdička) |

Barvy jsou v poměru zhruba 60–30–10: obsah nese světlý podklad, modrá je podpisová barva a růžové akcenty jsou jen střídmě. Růžová na modré má kontrast 4,3 : 1, proto se používá jen na velký text. Běžný text na modré je `mlecna`. Fonty jsou Anton a Space Grotesk, oba hostované lokálně přes `@fontsource` (bez Google Fonts).

## Otevřené (TODO)

- Kontaktní e-mail `info@majaleshb.cz` je zatím placeholder. Instagram a Facebook doplnit do `KONTAKT` v `akce.ts`.
- Úrovně partnerů nesedí s tabulkou `majales/partneri/tabulka-partneru-2027.xlsx` (tam je do 5 000 / 10 000 / 25 000+). Sjednotit.
- Hosting a doména (Cloudflare Pages jako learningtriangle?) zatím nejsou nastavené.

## 3D hero

Od 15. 11. 2026 je na hlavní stránce místo plakátové hero sekce živé low-poly náměstí (vzniklo ve větvi `prototyp-3d`, původní hero je v archivu na `/archiv/puvodni-hero/`): pódium s kapelou, publikum, stánky, radnici a LED stěnu s partnery. Scéna je v `src/scripts/hero3d.js` (three.js), komponenta v `src/components/Hero3D.astro`.

**Načítání:**
- hned se ukáže **plakát**, tedy vyrenderovaný první snímek scény (`src/assets/hero3d/plakat-{desktop,tablet,mobil}.jpg`, na webu jako AVIF/WebP);
- three.js se stáhne až po načtení stránky a živé plátno se přes plakát prolne. Plakát je stejný snímek (čas 1,3 s), takže přechod není vidět;
- bez WebGL plakát zůstane.

**Přegenerování plakátu** (po změně scény):
1. `npm run build` a `npx astro preview`.
2. V prohlížeči otevři `/`. V konzoli nastav `__hero3d.cas = 1.3; __hero3d.snimek = 0` a skryj `.hero3d-obsah, .hero3d-clona, .hero3d-pauza, header`.
3. Vyfoť element `.hero3d` ve třech velikostech:

   | Varianta | Okno | Pixel ratio |
   |---|---|---|
   | desktop | 1440×900 | 1,34 |
   | tablet | 820×1180 | 2 |
   | mobil | 390×844 | 2,5 |

4. Ulož snímky jako JPEG (q 92) do `src/assets/hero3d/`.
