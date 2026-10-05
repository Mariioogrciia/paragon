"""Genera las variantes del icono de la app (Ajustes → Apariencia → Icono).

Parte de la P de siempre (mipmap-xxxhdpi/ic_launcher_foreground.png) y
saca, para cada variante: los mipmaps de Android (icono adaptativo +
los PNG de antes de Android 8), el AppIcon-<Nombre> de iOS y la miniatura
que enseña el selector. Uso: `python3 kmp/iconos/generar.py` (Pillow).
"""
import colorsys, json, os
from PIL import Image, ImageDraw

KMP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = f"{KMP}/androidApp/src/main/res"
XCASSETS = f"{KMP}/iosApp/iosApp/Assets.xcassets"
MINIS = f"{KMP}/shared/src/commonMain/composeResources/drawable"
BASE = Image.open(f"{RES}/mipmap-xxxhdpi/ic_launcher_foreground.png").convert("RGBA")
FONDO_PARAGON = (10, 13, 19)

# clave -> (nombre en iOS, fondo [color o (arriba, abajo)], tono de la P)
VARIANTES = {
    "oro": ("Oro", (12, 10, 6), ("tono", 32, 52)),
    "claro": ("Claro", (244, 246, 250), None),
    "neon": ("Neon", ((74, 158, 255), (139, 92, 246)), "blanca"),
    "esmeralda": ("Esmeralda", (3, 16, 10), ("tono", 125, 170)),
}
DENSIDADES = {"ldpi": 0.75, "mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def recolorear(img, modo):
    if modo is None:
        return img.copy()
    out = Image.new("RGBA", img.size)
    px, po = img.load(), out.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if modo == "blanca":
                # El trazo oscuro de dentro se vuelve hueco: se ve el degradado.
                k = max(0.0, min(1.0, (v - 0.25) / 0.35))
                po[x, y] = (255, 255, 255, int(a * k))
                continue
            _, h0, h1 = modo
            t = max(0.0, min(1.0, (h * 360 - 185) / 90))
            nh = ((h0 + t * (h1 - h0)) % 360) / 360
            nr, ng, nb = colorsys.hsv_to_rgb(nh, s, v)
            po[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    return out


def fondo(lado, color):
    if isinstance(color[0], int):
        return Image.new("RGBA", (lado, lado), color + (255,))
    (r0, g0, b0), (r1, g1, b1) = color
    im = Image.new("RGBA", (lado, lado))
    d = ImageDraw.Draw(im)
    for y in range(lado):
        t = y / max(1, lado - 1)
        d.line([(0, y), (lado, y)], fill=(int(r0 + (r1 - r0) * t), int(g0 + (g1 - g0) * t), int(b0 + (b1 - b0) * t), 255))
    return im


def completo(lado, color, p, recorte=None):
    """Icono cuadrado entero: fondo + P (la capa de 108dp ocupa el lado entero)."""
    im = fondo(lado, color)
    im.alpha_composite(p.resize((lado, lado), Image.LANCZOS))
    if recorte == "redondo":
        m = Image.new("L", (lado, lado), 0)
        ImageDraw.Draw(m).ellipse([0, 0, lado - 1, lado - 1], fill=255)
        im.putalpha(m)
    elif recorte == "esquinas":
        m = Image.new("L", (lado, lado), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, lado - 1, lado - 1], radius=lado // 5, fill=255)
        im.putalpha(m)
    return im


ADAPTATIVO = """<?xml version="1.0" encoding="utf-8"?>
<!-- Variante "{k}" del icono (Ajustes → Apariencia → Icono). Generado por kmp/iconos/generar.py. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_{k}_fondo" />
    <foreground android:drawable="@mipmap/ic_launcher_{k}_p" />
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
"""

for k, (nombre, color, modo) in VARIANTES.items():
    p = recolorear(BASE, modo)
    for dens, f in DENSIDADES.items():
        d = f"{RES}/mipmap-{dens}"
        capa = round(108 * f)
        p.resize((capa, capa), Image.LANCZOS).save(f"{d}/ic_launcher_{k}_p.png", optimize=True)
        fondo(capa, color).save(f"{d}/ic_launcher_{k}_fondo.png", optimize=True)
        leg = round(48 * f)
        completo(leg, color, p, "esquinas").save(f"{d}/ic_launcher_{k}.png", optimize=True)
        completo(leg, color, p, "redondo").save(f"{d}/ic_launcher_{k}_round.png", optimize=True)
    for suf in ("", "_round"):
        with open(f"{RES}/mipmap-anydpi-v26/ic_launcher_{k}{suf}.xml", "w") as fh:
            fh.write(ADAPTATIVO.format(k=k))
    dset = f"{XCASSETS}/AppIcon-{nombre}.appiconset"
    os.makedirs(dset, exist_ok=True)
    completo(1024, color, p).convert("RGB").save(f"{dset}/icono-1024.png", optimize=True)
    with open(f"{dset}/Contents.json", "w") as fh:
        json.dump({"images": [{"filename": "icono-1024.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"}],
                   "info": {"author": "xcode", "version": 1}}, fh, indent=2)
        fh.write("\n")
    completo(144, color, p, "esquinas").save(f"{MINIS}/icono_{k}.png", optimize=True)

completo(144, FONDO_PARAGON, BASE, "esquinas").save(f"{MINIS}/icono_paragon.png", optimize=True)
print("ok")
