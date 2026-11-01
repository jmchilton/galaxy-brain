# /// script
# requires-python = ">=3.10"
# dependencies = ["segno"]
# ///
"""Write vector QR codes for the poster's verified links into qr/."""
from pathlib import Path

import segno

LINKS = {
    "repo": "https://github.com/galaxyproject/foundry",
    "usage": "https://galaxyproject.github.io/foundry/usage/",
    "preprint": "https://doi.org/10.64898/2026.10.26.761864",
}
out = Path(__file__).resolve().parent / "qr"
out.mkdir(exist_ok=True)
for name, url in LINKS.items():
    segno.make(url, error="m").save(out / f"{name}.svg", scale=10, border=4, dark="#1a1a1a", light="#ffffff")
    print(f"wrote qr/{name}.svg")
