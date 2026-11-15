"""Balíček fotek pro další práci na webu (fotky-balik/).

Vezme z hodnocení všech fotek (privátní soubor v pracovním repu) to zajímavé: skóre 7+,
bez duplicit a bez fotek s příznakem (dítě zblízka, alkohol, trapná chvíle, otočené).
Exportuje je zmenšené (max 2000 px, bez EXIF/GPS) do fotky-balik/<rok>/ a napíše
fotky-balik/README.md (tabulka) a fotky-balik/index.html (náhledová galerie, otevřít dvojklikem).

Spuštění:  python scripts/fotky-balik.py
"""
import html
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
HODNOCENI = MEDIA / "HODNOCENI-FOTEK.json"
VYBER = KOREN / "scripts" / "fotky-vyber.json"
BALIK = KOREN / "fotky-balik"
MAX = 2000
MIN_SKORE = 7
VYRADIT_PRIZNAKY = {"minor_closeup", "alcohol", "awkward", "rotated"}
# ručně vyřazené (kelímky, čitelné jmenovky, selfie dospělého, koruna s plechovkou)
VYRADIT_RUCNE = {
    "2017/2017__Sobota__IMG_0333.jpg",
    "2022/2022__VPP08056.jpg",
    "2025/2025__Král-a-královna__DSC_0152.jpg",
    "2025/2025__Král-a-královna__DSC_0170.jpg",
    "2025/2025__Král-a-královna__DSC_0298.jpg",
    "2026/2026__Wyrvál__IMG_1022.jpg",
}
# portréty z afterparty – před zveřejněním ověřit souhlas
SCHVALIT = {"afterparty", "portrait"}

TYPY = {
    "crowd": "dav", "stage": "pódium", "band": "kapela", "run": "běh", "kids": "děti",
    "king_queen": "král a královna", "portrait": "portrét", "detail": "detail", "square": "náměstí",
    "afterparty": "afterparty", "lecture": "přednáška", "parade": "průvod", "other": "jiné",
}


def main():
    hodnoceni = json.loads(HODNOCENI.read_text(encoding="utf-8"))
    na_webu = {f["zdroj"] for f in json.loads(VYBER.read_text(encoding="utf-8"))}
    manifest = {m["thumb"]: m for m in json.loads((MEDIA / "_nahledy-manifest.json").read_text(encoding="utf-8"))}

    vyber = [
        r for r in hodnoceni
        if r["score"] >= MIN_SKORE and not r.get("dup_of")
        and not set(r.get("flags") or []) & VYRADIT_PRIZNAKY and r["path"] not in VYRADIT_RUCNE
    ]
    vyber.sort(key=lambda r: (-int(r["path"][:4]), -r["score"], r["path"]))

    radky = []
    for r in vyber:
        zdroj = manifest[r["path"]]["src"]
        rok = r["path"][:4]
        nazev = r["path"].split("/")[-1].split("__", 1)[1].replace("__", "-").replace(" ", "-").lower()
        cil = BALIK / rok / f"{r['type']}-{nazev}"
        cil.parent.mkdir(parents=True, exist_ok=True)
        if not cil.exists():
            im = ImageOps.exif_transpose(Image.open(MEDIA / zdroj)).convert("RGB")
            im.thumbnail((MAX, MAX), Image.LANCZOS)
            im.save(cil, "JPEG", quality=84, optimize=True, progressive=True)
        radky.append({
            "soubor": cil.relative_to(BALIK).as_posix(), "rok": rok, "typ": TYPY.get(r["type"], r["type"]),
            "skore": r["score"], "hero": r.get("hero"), "web": zdroj in na_webu,
            "schvalit": r["type"] in SCHVALIT, "alt": r["alt_cs"], "originál": f"media/{zdroj}",
        })

    md = [
        "# Balíček fotek Majálesu",
        "",
        f"{len(radky)} vybraných fotek z ročníků 2017–2026 (skóre {MIN_SKORE}+ z 10, bez duplicit, bez dětí zblízka a alkoholu).",
        "Zmenšené na max 2000 px, bez EXIF/GPS. **Náhledy: otevři `index.html` dvojklikem.**",
        "",
        "- **web** = fotka je použitá na webu (`scripts/fotky-vyber.json`).",
        "- **hero** = hodí se jako velká fotka přes celou šířku.",
        "- **⚠** = portrét nebo afterparty: před zveřejněním ověřit, že to lidem na fotce nevadí.",
        "",
        "Na web se fotka dostane přidáním do `scripts/fotky-vyber.json` (zdroj = sloupec originál bez `media/`) a spuštěním `python scripts/fotky.py`.",
        "Originály v plném rozlišení jsou v pracovním repu `c:\\dev\\ghb\\majales\\media\\` (mimo git).",
        "",
        "| Soubor | Rok | Typ | Skóre | | Popis | Originál |",
        "|---|---|---|---:|---|---|---|",
    ]
    for r in radky:
        znacky = " ".join(x for x in ["web" if r["web"] else "", "hero" if r["hero"] else "", "⚠" if r["schvalit"] else ""] if x)
        md.append(f"| [{r['soubor']}]({r['soubor']}) | {r['rok']} | {r['typ']} | {r['skore']} | {znacky} | {r['alt']} | `{r['originál']}` |")
    (BALIK / "README.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    karty = "\n".join(
        f'<figure data-rok="{r["rok"]}"><a href="{r["soubor"]}" target="_blank"><img src="{r["soubor"]}" loading="lazy" alt="{html.escape(r["alt"])}"></a>'
        f'<figcaption><b>{r["rok"]} · {html.escape(r["typ"])} · {r["skore"]}</b>'
        f'{" <span class=w>web</span>" if r["web"] else ""}{" <span class=h>hero</span>" if r["hero"] else ""}{" <span class=s>⚠ schválit</span>" if r["schvalit"] else ""}'
        f'<br>{html.escape(r["alt"])}<br><code>{r["soubor"]}</code></figcaption></figure>'
        for r in radky
    )
    roky = sorted({r["rok"] for r in radky}, reverse=True)
    tlacitka = '<button data-r="vse" class="on">Vše</button>' + "".join(f'<button data-r="{r}">{r}</button>' for r in roky)
    (BALIK / "index.html").write_text(f"""<!doctype html>
<html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Balíček fotek Majálesu</title>
<style>
body{{margin:0;padding:24px;font:14px/1.4 system-ui,sans-serif;background:#0b0f4a;color:#ffe9f4}}
h1{{margin:0 0 4px;color:#ffc2e2}} p{{opacity:.8;margin:0 0 16px}}
nav{{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}}
button{{background:none;border:2px solid #ffc2e255;color:#ffc2e2;border-radius:99px;padding:6px 14px;font-weight:700;cursor:pointer}}
button.on{{background:#ffc2e2;color:#0b0f4a}}
main{{columns:280px;gap:14px}}
figure{{break-inside:avoid;margin:0 0 14px;background:#161b63;border-radius:12px;overflow:hidden}}
img{{width:100%;display:block}} figcaption{{padding:8px 10px;font-size:12px}}
code{{opacity:.6}} span{{border-radius:99px;padding:1px 7px;font-size:11px;font-weight:700;margin-left:4px}}
.w{{background:#3044f3}} .h{{background:#ff4fa3;color:#0b0f4a}} .s{{background:#ffe164;color:#0b0f4a}}
</style></head><body>
<h1>Balíček fotek Majálesu</h1>
<p>{len(radky)} fotek, klik otevře plnou velikost. Seznam s popisky je v README.md.</p>
<nav>{tlacitka}</nav>
<main>{karty}</main>
<script>
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{{
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('figure').forEach(f=>f.hidden=b.dataset.r!=='vse'&&f.dataset.rok!==b.dataset.r);
}});
</script></body></html>
""", encoding="utf-8")
    vel = sum(p.stat().st_size for p in BALIK.rglob("*.jpg")) / 1e6
    print(f"{len(radky)} fotek -> {BALIK} ({vel:.1f} MB)")


if __name__ == "__main__":
    main()
