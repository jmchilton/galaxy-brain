# /// script
# dependencies = ["pillow"]
# ///
"""Write *-aged.png copies of the slide crops: lifted blacks, warm whites, light desaturation; same pixel size."""
from pathlib import Path

from PIL import Image

LO = (0x2B, 0x27, 0x22)  # os-ink
HI = (0xFB, 0xF6, 0xE6)  # os-qr-ground
DESAT = 0.2
assets = Path(__file__).with_name("assets")
for name in ("rnaseq-nfcore-arrows", "rnaseq-gx-arrows"):
    src = Image.open(assets / f"{name}.png").convert("RGBA")
    flat = Image.new("RGBA", src.size, (255, 255, 255, 255))
    flat.alpha_composite(src)
    rgb = flat.convert("RGB")
    grey = rgb.convert("L").convert("RGB")
    mixed = Image.blend(rgb, grey, DESAT)
    bands = [b.point(lambda v, lo=lo, hi=hi: round(lo + (hi - lo) * v / 255)) for b, lo, hi in zip(mixed.split(), LO, HI)]
    out = Image.merge("RGB", bands)
    assert out.size == src.size
    out.save(assets / f"{name}-aged.png", optimize=True)
