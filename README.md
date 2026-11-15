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
| `/` | `src/pages/index.astro` | hero s odpočtem, o Majálesu, program, line-up (6 × ?), galerie, loga partnerů, výzva pro partnery |
| `/partneri/` | `src/pages/partneri.astro` | úrovně partnerství, barter, nabídka na míru, postup |

## Kde se mění obsah

- `src/data/akce.ts`: datum, místo, kontakt, program, line-up. **Jen potvrzené věci.** Časy programu a jména kapel sem přijdou, až budou jisté.
- `src/data/partneri.ts`: úrovně partnerství, co za ně partner dostane, a **seznam potvrzených partnerů** (`PARTNERI`).

### Přidání partnera (logo na web)

1. Logo ulož do `src/assets/partneri/`. Nejlépe SVG, jinak PNG s průhledným pozadím a šířkou aspoň 600 px.
2. Do `PARTNERI` v `src/data/partneri.ts` přidej řádek, např. `{ nazev: 'Firma s.r.o.', logo: 'firma.svg', url: 'https://www.firma.cz', uroven: 'hlavni' }`. Úroveň je `generalni`, `hlavni`, nebo `partner` (do `partner` patří i podporovatel a barter).
3. Commit a push na `main`. Vercel web nasadí sám.

Loga se ukazují na hlavní stránce (sekce Partneři, `/#partneri`) i na `/partneri/`. Volná místa se doplní rámečky „Vaše logo“ (počty jsou v `MISTA`). Logo dávej na web až po potvrzení a se souhlasem partnera.
- `src/styles/global.css`: barvy (`@theme`) a fonty, všechno na jednom místě.

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
