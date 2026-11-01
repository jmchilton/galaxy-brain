# /// script
# dependencies = ["pymupdf"]
# ///
"""Fail on non-vendored or unembedded fonts, text < 24 pt; with --count, also on body < 28 pt or > MAX_WORDS."""
import re
import sys
from pathlib import Path

import pymupdf

MAX_WORDS = 700
ALLOWED = {"AtkinsonHyperlegible-Regular", "AtkinsonHyperlegible-Bold", "AtkinsonHyperlegible-Italic",
           "AtkinsonHyperlegible-BoldItalic", "AtkinsonHyperlegibleMono-Regular", "AtkinsonHyperlegibleMono-Bold",
           "IBMPlexMono-Regular", "IBMPlexMono-SemiBold", "IBMPlexMono-Bold",
           "IBMPlexMono-Italic", "Kalam-Regular", "Kalam-Bold",
           "AtkinsonHyperlegibleNext-Regular", "AtkinsonHyperlegibleNext-Bold", "AtkinsonHyperlegibleNext-ExtraBold"}
args = [a for a in sys.argv[1:] if not a.startswith("--")]
count = "--count" in sys.argv
pdf = Path(args[0] if args else Path(__file__).with_name("poster.pdf"))
doc = pymupdf.open(pdf)
page = doc[0]
errors = []
fonts = page.get_fonts(full=True)
names = {f[3].split("+")[-1] for f in fonts}
if names - ALLOWED:
    errors.append(f"non-vendored fonts: {sorted(names - ALLOWED)}")
for xref, ext, *_ in fonts:
    if ext == "n/a" or not doc.extract_font(xref)[3]:
        errors.append(f"font xref {xref} not embedded")
spans = [s for b in page.get_text("dict")["blocks"] for ln in b.get("lines", []) for s in ln["spans"]
         if s["text"].strip()]
tiny = [(round(s["size"], 1), s["text"][:40]) for s in spans if s["size"] < 23.9]
if tiny:
    errors.append(f"{len(tiny)} spans under 24 pt: {tiny[:8]}")
print(f"{pdf.name}: {page.rect.width:.0f} x {page.rect.height:.0f} pt, fonts {sorted(names)}")
if count:
    small = [(round(s["size"], 1), s["text"][:40]) for s in spans if s["size"] < 27.9]
    if small:
        errors.append(f"{len(small)} body spans under 28 pt: {small[:8]}")
    words = [w[4] for w in page.get_text("words") if re.search(r"[0-9A-Za-z]", w[4])]
    print(f"body words: {len(words)} (limit {MAX_WORDS})")
    if len(words) > MAX_WORDS:
        errors.append(f"{len(words)} body words > {MAX_WORDS}")
if errors:
    sys.exit("AUDIT FAILED: " + "; ".join(errors))
