# /// script
# dependencies = ["segno"]
# ///
"""Write vector QR codes (SVG, 4-module quiet zone, white tile) plus assets/qr.json module counts."""
import json
from pathlib import Path

import segno

BORDER = 4
LINKS = {
    "qr-foundry": "https://galaxyproject.github.io/foundry/",
    "qr-usage": "https://galaxyproject.github.io/foundry/usage/",
    "qr-preprint": "https://doi.org/10.64898/2026.10.26.761864",
}
out = Path(__file__).with_name("assets")
out.mkdir(exist_ok=True)
meta = {"border": BORDER}
for name, url in LINKS.items():
    qr = segno.make(url, error="m")
    qr.save(out / f"{name}.svg", scale=10, border=BORDER, dark="#000000", light="#ffffff")
    meta[name] = {"url": url, "modules": qr.symbol_size(border=0)[0]}
    print(name, url, meta[name]["modules"], "modules")
(out / "qr.json").write_text(json.dumps(meta, indent=2) + "\n")
