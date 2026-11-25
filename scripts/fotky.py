"""Export vybraných fotek z archivu do webu.

Zdroj: pracovní repo c:\\dev\\ghb\\majales\\media (originály, 10+ MB, mimo git).
Výběr: scripts/fotky-vyber.json (klíč, zdrojová cesta, rok, role, alt text).
Výstup:
  - src/assets/foto/<klic>.jpg  – zmenšené (max 2000 px delší strana), bez EXIF/GPS, otočené podle EXIF.
    Finální AVIF/WebP v několika šířkách z nich vyrobí Astro při buildu (astro:assets).
  - src/data/fotky.ts            – vygenerovaný seznam importů (needitovat ručně).

Spuštění:  python scripts/fotky.py   (potřebuje Pillow a pillow-heif)
"""
import json
from pathlib import Path

from PIL import Image, ImageOps

try:
    import pillow_heif

    pillow_heif.register_heif_opener()
except ImportError:
    pass

KOREN = Path(__file__).resolve().parent.parent
MEDIA = Path(r"c:\dev\ghb\majales\media")
VYBER = KOREN / "scripts" / "fotky-vyber.json"
CIL = KOREN / "src" / "assets" / "foto"
TS = KOREN / "src" / "data" / "fotky.ts"
MAX = 2000


def export(f):
    cil = CIL / f"{f['klic']}.jpg"
    if cil.exists() and cil.stat().st_mtime > (MEDIA / f["zdroj"]).stat().st_mtime:
        return cil
    im = ImageOps.exif_transpose(Image.open(MEDIA / f["zdroj"])).convert("RGB")
    if "orez" in f:
        # volitelný výřez [x1, y1, x2, y2] v podílech šířky a výšky originálu, např. ať hlavní motiv
        # neschová malá fotka přes roh (web ořezává od středu)
        w, h = im.size
        x1, y1, x2, y2 = f["orez"]
        im = im.crop((round(x1 * w), round(y1 * h), round(x2 * w), round(y2 * h)))
    im.thumbnail((MAX, MAX), Image.LANCZOS)
    # bez exif= → žádná metadata (GPS, fotoaparát) se neuloží
    im.save(cil, "JPEG", quality=84, optimize=True, progressive=True)
    return cil


def main():
    vyber = json.loads(VYBER.read_text(encoding="utf-8"))
    CIL.mkdir(parents=True, exist_ok=True)
    platne = {f"{f['klic']}.jpg" for f in vyber}
    for stary in CIL.glob("*.jpg"):
        if stary.name not in platne:
            stary.unlink()

    radky = ["// VYGENEROVÁNO scripts/fotky.py ze scripts/fotky-vyber.json – needitovat ručně.", ""]
    for i, f in enumerate(vyber):
        export(f)
        radky.append(f"import f{i} from '../assets/foto/{f['klic']}.jpg';")
    radky += [
        "",
        "export type Foto = { klic: string; img: ImageMetadata; rok: number; typ: string; role: string[]; alt: string };",
        "",
        "export const FOTKY: Foto[] = [",
    ]
    for i, f in enumerate(vyber):
        radky.append(
            f"  {{ klic: {json.dumps(f['klic'])}, img: f{i}, rok: {f['rok']}, typ: {json.dumps(f['typ'])}, "
            f"role: {json.dumps(f['role'], ensure_ascii=False)}, alt: {json.dumps(f['alt'], ensure_ascii=False)} }},"
        )
    radky += [
        "];",
        "",
        "export const podleRole = (role: string) => FOTKY.find((f) => f.role.includes(role))!;",
        "export const HERO = FOTKY.filter((f) => f.role.includes('hero'));",
        "export const OG_FOTO = podleRole('og').img;",
        "",
    ]
    TS.write_text("\n".join(radky), encoding="utf-8")
    vel = sum(p.stat().st_size for p in CIL.glob("*.jpg")) / 1e6
    print(f"{len(vyber)} fotek -> {CIL} ({vel:.1f} MB zdrojů), {TS.name} vygenerován")


if __name__ == "__main__":
    main()
