"""Ikony webu z loga (src/assets/ikona/ikona-zdroj.png, čtverec na modrém pozadí):
favicon.ico pro záložku prohlížeče, apple-touch-icon.png pro plochu iPhonu
a ikony 192 / 512 px (+ maskable) pro plochu Androidu (public/site.webmanifest).

Spuštění: python scripts/ikony.py
"""
from pathlib import Path
from PIL import Image

KOREN = Path(__file__).resolve().parent.parent
ZDROJ = KOREN / 'src' / 'assets' / 'ikona' / 'ikona-zdroj.png'
VEN = KOREN / 'public'
MODRA = (0, 74, 253)  # #004AFD, pozadí loga

logo = Image.open(ZDROJ).convert('RGB')
assert logo.width == logo.height, 'logo musí být čtverec'


def zmensit(velikost: int, obsah: float = 1.0) -> Image.Image:
    """Logo zmenšené na velikost × velikost; obsah < 1 = logo menší uprostřed modré plochy."""
    vnitrek = round(velikost * obsah)
    im = logo.resize((vnitrek, vnitrek), Image.LANCZOS)
    if vnitrek == velikost:
        return im
    plocha = Image.new('RGB', (velikost, velikost), MODRA)
    plocha.paste(im, ((velikost - vnitrek) // 2, (velikost - vnitrek) // 2))
    return plocha


# záložka prohlížeče: víc velikostí v jednom .ico
zmensit(256).save(VEN / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
# iPhone / iPad: plocha (iOS si zaoblí rohy sám)
zmensit(180).save(VEN / 'apple-touch-icon.png', optimize=True)
# Android / Chrome (site.webmanifest)
zmensit(192).save(VEN / 'ikona-192.png', optimize=True)
zmensit(512).save(VEN / 'ikona-512.png', optimize=True)
# maskable: Android ořízne do kruhu nebo zaobleného čtverce, bezpečná zóna je 80 % uprostřed
zmensit(512, 0.78).save(VEN / 'ikona-maskable-512.png', optimize=True)
print('hotovo:', ', '.join(p.name for p in sorted(VEN.glob('*')) if p.suffix in {'.ico', '.png'}))
