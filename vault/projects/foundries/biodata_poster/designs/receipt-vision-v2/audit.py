# /// script
# dependencies = ["pymupdf"]
# ///
"""Fail the build on non-vendored fonts or text under 24 pt; report text under 28 pt and word count."""
import sys
from pathlib import Path

import pymupdf

ALLOWED = {"ArchivoBlack-Regular", "IBMPlexMono-Regular", "IBMPlexMono-SemiBold", "IBMPlexMono-Bold",
           "IBMPlexMono-Italic", "Kalam-Regular", "Kalam-Bold"}
pdf = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).with_name("poster.pdf"))
doc = pymupdf.open(pdf)
page = doc[0]
errors = []
fonts = {f[3].split("+")[-1] for f in page.get_fonts(full=True)}
if fonts - ALLOWED:
    errors.append(f"non-vendored fonts: {sorted(fonts - ALLOWED)}")
small, tiny, words = [], [], 0
for block in page.get_text("dict")["blocks"]:
    for line in block.get("lines", []):
        for span in line["spans"]:
            t = span["text"].strip()
            if not t:
                continue
            words += len(t.split())
            if span["size"] < 23.9:
                tiny.append((round(span["size"], 1), t[:50]))
            elif span["size"] < 27.9:
                small.append((round(span["size"], 1), t[:50]))
if tiny:
    errors.append(f"{len(tiny)} spans under 24 pt: {tiny[:8]}")
print(f"{pdf.name}: {page.rect.width:.0f} x {page.rect.height:.0f} pt, fonts {sorted(fonts)}")
print(f"words (span count): {words}; spans 24-28 pt: {len(small)}")
for s in small:
    print("  24-28pt:", s)
if errors:
    sys.exit("AUDIT FAILED: " + "; ".join(errors))
