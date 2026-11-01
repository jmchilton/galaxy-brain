# /// script
# dependencies = ["segno"]
# ///
"""Write vector QR codes (SVG) for the poster's real links."""
from pathlib import Path

import segno

LINKS = {
    "qr-repo": "https://github.com/galaxyproject/foundry",
    "qr-usage": "https://galaxyproject.github.io/foundry/usage/",
    "qr-preprint": "https://doi.org/10.64898/2026.10.26.761864",
}
out = Path(__file__).with_name("assets")
out.mkdir(exist_ok=True)
for name, url in LINKS.items():
    segno.make(url, error="m").save(out / f"{name}.svg", scale=10, border=0, dark="#1d1d1b", light=None)
    print(name, url)
