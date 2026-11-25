"""Technické hodnocení fotek pro agenta Balrog: expozice, ostrost, kontrast, rozlišení a skoro stejné záběry.

Hezkost se změřit nedá, technické vady ano. Skript dá každé fotce technické skóre 0–10 a štítky
(PŘEPÁLENÁ, TMAVÁ, NEOSTRÁ, …). Kompozici, výrazy a atmosféru pak posoudí Balrog očima.

Použití:
  python scripts/hodnoceni-fotek.py <složka nebo soubory…> [--json vysledky.json] [--arch slozka-na-nahledy]

Jen čte fotky, nic nemění. Potřebuje Pillow (pip install pillow).
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageStat

PRIPONY = {'.jpg', '.jpeg', '.png', '.webp'}
SIRKA = 1024  # expozice se měří na zmenšenině, výsledky jsou pak srovnatelné mezi fotoaparáty
SIRKA_OSTROST = 1600

# Prahy (vyladěné na fotkách z Majálesu 2025 a Color Run 2026)
# Přepal = podíl čistě bílých pixelů (všechny tři kanály ≥ 254), tam už není žádná kresba.
# Bílé tričko, nápis nebo šachovnice mají většinou kresbu ještě zachovanou, spálené okno nebo nebe ne.
PREPAL = 0.06  # od 6 % je to vidět (spálené okno, nebe, reflektor)
PREPAL_MISTA = 0.025  # 2,5–6 %: spálená místa, ale může jít i o bílé předměty → ověřit očima
TMA = 0.12  # podíl skoro černých pixelů (jas ≤ 5)
# Ostrost = síla nejsilnějších hran (99,5. percentil |Laplace| na 1600 px, 0–128). Ostrá fotka má aspoň
# někde silnou hranu, i když je pozadí rozmazané. Pozor: málo kontrastní věci (plyš, pleť, mlha) mají
# hrany slabé i ostré → pásmo MĚKKÁ je jen podezření a musí se ověřit na výřezu (--detaily).
OSTROST_NEOSTRA = 45
OSTROST_MEKKA = 55
MIN_STRANA = 1800  # delší strana v px; web zmenšuje fotky na 2000 px, menší originál by byl rozmazaný
DUPLICITA = 8  # Hammingova vzdálenost dHash, do které jsou dvě fotky skoro stejný záběr


def otevri(p: Path) -> tuple[Image.Image, int, int]:
    im = Image.open(p)
    w, h = im.size
    if im.getexif().get(274) in (5, 6, 7, 8):  # otočení podle EXIF prohazuje strany
        w, h = h, w
    im.draft('RGB', (SIRKA, SIRKA))  # JPEG se rovnou dekóduje zmenšený, je to výrazně rychlejší
    im = ImageOps.exif_transpose(im).convert('RGB')
    im.thumbnail((SIRKA, SIRKA), Image.LANCZOS)
    return im, w, h


def dhash(sede: Image.Image) -> int:
    m = sede.resize((9, 8), Image.LANCZOS)
    px = list(m.getdata())
    bity = 0
    for r in range(8):
        for c in range(8):
            bity = (bity << 1) | (px[r * 9 + c] > px[r * 9 + c + 1])
    return bity


def ostrost(p: Path) -> dict:
    """Ostrost na zmenšenině 1600 px (kratší než web, ale dost na hrany vlasů a textu).
    - hrany: 99,5. percentil síly hran (|Laplace|). Ostrý objekt má silné hrany, i když je pozadí
      rozmazané; rozmazaná fotka nemá silnou hranu nikde.
    - dlazdice: rozptyl Laplace v nejostřejší dlaždici mřížky 8×8 a kde ta dlaždice leží (0–1),
      aby šlo vyříznout detail a ověřit, jestli je ostrý objekt, nebo jen pozadí."""
    im = Image.open(p)
    im.draft('L', (SIRKA_OSTROST, SIRKA_OSTROST))
    im = ImageOps.exif_transpose(im).convert('L')
    im.thumbnail((SIRKA_OSTROST, SIRKA_OSTROST), Image.LANCZOS)
    lap = im.filter(ImageFilter.Kernel((3, 3), (0, 1, 0, 1, -4, 1, 0, 1, 0), scale=1, offset=128))
    absh = [0] * 129
    for v, c in enumerate(lap.histogram()):
        absh[min(128, abs(v - 128))] += c
    cil, acc, hrany = sum(absh) * 0.995, 0, 128
    for d, c in enumerate(absh):
        acc += c
        if acc >= cil:
            hrany = d
            break
    w, h = lap.size
    nej, kde = -1.0, (0.5, 0.5)
    for i in range(8):
        for j in range(8):
            box = (j * w // 8 + 2, i * h // 8 + 2, (j + 1) * w // 8 - 2, (i + 1) * h // 8 - 2)
            var = ImageStat.Stat(lap.crop(box)).var[0]
            if var > nej:
                nej, kde = var, ((j + 0.5) / 8, (i + 0.5) / 8)
    return {'hrany': hrany, 'dlazdice': round(nej), 'kde': kde}


def zmer(p: Path) -> dict:
    im, w, h = otevri(p)
    sede = im.convert('L')
    hist = sede.histogram()
    n = sum(hist)
    st = ImageStat.Stat(sede)
    r_, g_, b_ = im.split()
    nejtmavsi_kanal = ImageChops.darker(ImageChops.darker(r_, g_), b_).histogram()
    o = ostrost(p)
    syt = ImageStat.Stat(im.convert('HSV')).mean[1]
    r = {
        'soubor': str(p),
        'sirka': w,
        'vyska': h,
        'jas': round(st.mean[0], 1),
        'kontrast': round(st.stddev[0], 1),
        'prepal': round(sum(nejtmavsi_kanal[254:]) / n, 4),
        'skoro_bile': round(sum(hist[250:]) / n, 4),
        'tma': round(sum(hist[:6]) / n, 4),
        'ostrost': o['hrany'],
        'ostrost_dlazdice': o['dlazdice'],
        'nejostrejsi_misto': [round(o['kde'][0], 3), round(o['kde'][1], 3)],
        'sytost': round(syt, 1),
        'dhash': dhash(sede),
    }
    return r


def ohodnot(r: dict) -> None:
    skore = 10.0
    stitky = []
    if r['prepal'] > PREPAL:
        skore -= min(4, 1.5 + (r['prepal'] - PREPAL) * 25)
        stitky.append(f"PŘEPÁLENÁ ({r['prepal'] * 100:.0f} % čistě bílé, bez kresby)")
    elif r['prepal'] > PREPAL_MISTA:
        skore -= 0.5
        stitky.append(f"SPÁLENÁ MÍSTA? ({r['prepal'] * 100:.0f} % čistě bílé – nebe, okno, nebo jen bílý předmět?)")
    if r['jas'] > 185:
        skore -= 1.5
        stitky.append(f"PŘESVĚTLENÁ (průměrný jas {r['jas']:.0f})")
    if r['tma'] > TMA:
        skore -= min(3, 1 + (r['tma'] - TMA) * 15)
        stitky.append(f"SLITÉ STÍNY ({r['tma'] * 100:.0f} % skoro černé)")
    if r['jas'] < 55:
        skore -= 1.5
        stitky.append(f"TMAVÁ (průměrný jas {r['jas']:.0f})")
    if r['ostrost'] < OSTROST_NEOSTRA:
        skore -= 3
        stitky.append(f"NEOSTRÁ (síla hran {r['ostrost']})")
    elif r['ostrost'] < OSTROST_MEKKA:
        skore -= 1
        stitky.append(f"MĚKKÁ? (síla hran {r['ostrost']}, ověř na výřezu)")
    if r['kontrast'] < 35:
        skore -= 1
        stitky.append(f"MDLÁ (nízký kontrast {r['kontrast']:.0f})")
    if max(r['sirka'], r['vyska']) < MIN_STRANA:
        skore -= 2
        stitky.append(f"MALÁ ({r['sirka']}×{r['vyska']} px)")
    r['skore'] = round(max(0, skore), 1)
    r['stitky'] = stitky


def duplicity(vysledky: list[dict]) -> None:
    """Skoro stejné záběry: horší z dvojice dostane −1 a odkaz na lepší."""
    for i, a in enumerate(vysledky):
        for b in vysledky[i + 1:]:
            if bin(a['dhash'] ^ b['dhash']).count('1') <= DUPLICITA:
                horsi, lepsi = (a, b) if (a['skore'], a['ostrost']) < (b['skore'], b['ostrost']) else (b, a)
                if 'duplicita_s' not in horsi:
                    horsi['duplicita_s'] = Path(lepsi['soubor']).name
                    horsi['skore'] = round(max(0, horsi['skore'] - 1), 1)
                    horsi['stitky'].append(f"SKORO STEJNÁ jako {Path(lepsi['soubor']).name}")


def arch(vysledky: list[dict], slozka: Path) -> None:
    """Kontaktní archy 5×4 se skóre a štítky – pro rychlé posouzení očima."""
    slozka.mkdir(parents=True, exist_ok=True)
    try:
        font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 20)
        maly = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
    except OSError:
        font = maly = ImageFont.load_default()
    TW, TH, COLS, ROWS = 360, 240, 5, 4
    for a in range(0, len(vysledky), COLS * ROWS):
        list_ = Image.new('RGB', (COLS * TW, ROWS * (TH + 56)), (30, 30, 30))
        d = ImageDraw.Draw(list_)
        for k, r in enumerate(vysledky[a:a + COLS * ROWS]):
            im, _, _ = otevri(Path(r['soubor']))
            im.thumbnail((TW - 6, TH - 6))
            x, y = (k % COLS) * TW, (k // COLS) * (TH + 56)
            list_.paste(im, (x + (TW - im.width) // 2, y + 28 + (TH - im.height) // 2))
            barva = (120, 220, 120) if r['skore'] >= 8 else (250, 210, 90) if r['skore'] >= 6 else (255, 110, 110)
            d.text((x + 6, y + 3), f"{a + k}  {r['skore']:.1f}  {Path(r['soubor']).name[:22]}", font=font, fill=barva)
            d.text((x + 6, y + TH + 30), ', '.join(s.split(' (')[0] for s in r['stitky'])[:44], font=maly, fill=barva)
        list_.save(slozka / f'arch-{a // (COLS * ROWS):02d}.jpg', quality=82)


def detaily(vysledky: list[dict], slozka: Path) -> None:
    """Výřez nejostřejšího místa každé fotky v měřítku webu (delší strana 2000 px), 600×400 px.
    Když je nejostřejší místo tráva nebo zeď a ne člověk, je fotka zaostřená vedle."""
    slozka.mkdir(parents=True, exist_ok=True)
    for r in vysledky:
        im = ImageOps.exif_transpose(Image.open(r['soubor'])).convert('RGB')
        W, H = im.size
        m = max(W, H) / 2000
        cx, cy = W * r['nejostrejsi_misto'][0], H * r['nejostrejsi_misto'][1]
        box = (int(cx - 300 * m), int(cy - 200 * m), int(cx + 300 * m), int(cy + 200 * m))
        im.crop(box).resize((600, 400), Image.LANCZOS).save(slozka / f"{Path(r['soubor']).stem}-detail.jpg", quality=88)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cesty', nargs='+', type=Path)
    ap.add_argument('--json', type=Path, help='uložit všechna měření do JSON')
    ap.add_argument('--arch', type=Path, help='složka pro kontaktní archy s náhledy')
    ap.add_argument('--detaily', type=Path, help='složka pro výřezy nejostřejšího místa (ověření ostrosti)')
    a = ap.parse_args()

    soubory = []
    for c in a.cesty:
        if c.is_dir():
            soubory += sorted({p.resolve() for p in c.rglob('*') if p.suffix.lower() in PRIPONY})
        elif c.suffix.lower() in PRIPONY:
            soubory.append(c.resolve())
    if not soubory:
        sys.exit('Žádné fotky (.jpg, .jpeg, .png, .webp) nenalezeny.')

    vysledky = []
    for i, p in enumerate(soubory):
        r = zmer(p)
        ohodnot(r)
        vysledky.append(r)
        print(f'\r  měřím {i + 1}/{len(soubory)}', end='', file=sys.stderr)
    print(file=sys.stderr)
    duplicity(vysledky)
    vysledky.sort(key=lambda r: -r['skore'])

    sys.stdout.reconfigure(encoding='utf-8')
    print('| # | skóre | soubor | rozměr | jas | kontrast | přepal % | tma % | síla hran | štítky |')
    print('|---|---|---|---|---|---|---|---|---|---|')
    for i, r in enumerate(vysledky):
        print(f"| {i} | {r['skore']:.1f} | {Path(r['soubor']).name} | {r['sirka']}×{r['vyska']} | {r['jas']:.0f} | {r['kontrast']:.0f} | "
              f"{r['prepal'] * 100:.1f} | {r['tma'] * 100:.1f} | {r['ostrost']} | {'; '.join(r['stitky']) or 'OK'} |")
    if a.json:
        a.json.write_text(json.dumps(vysledky, ensure_ascii=False, indent=1), encoding='utf-8')
    if a.arch:
        arch(vysledky, a.arch)
    if a.detaily:
        detaily(vysledky, a.detaily)


if __name__ == '__main__':
    main()
