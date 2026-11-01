# /// script
# dependencies = ["pymupdf"]
# ///
"""Fail on non-vendored fonts, unembedded fonts, text under --min-size pt, or (with --words) body words over the cap."""
import argparse
import re
import sys

import pymupdf

ALLOWED = {"ArchivoBlack-Regular", "IBMPlexMono-Regular", "IBMPlexMono-SemiBold", "IBMPlexMono-Bold",
           "IBMPlexMono-Italic", "Kalam-Regular", "Kalam-Bold"}
ap = argparse.ArgumentParser()
ap.add_argument("pdf")
ap.add_argument("--words", type=int, help="fail if the PDF holds more than this many words")
ap.add_argument("--min-size", type=float, default=24, help="fail on text smaller than this (pt)")
args = ap.parse_args()
doc = pymupdf.open(args.pdf)
page = doc[0]
errors = []
fonts = page.get_fonts(full=True)
names = {f[3].split("+")[-1] for f in fonts}
if names - ALLOWED:
    errors.append(f"non-vendored fonts: {sorted(names - ALLOWED)}")
unembedded = [f[3] for f in fonts if not doc.extract_font(f[0])[3]]
if unembedded:
    errors.append(f"unembedded fonts: {unembedded}")
small, tiny = [], []
for block in page.get_text("dict")["blocks"]:
    for line in block.get("lines", []):
        for span in line["spans"]:
            t = span["text"].strip()
            if not t:
                continue
            if span["size"] < args.min_size - 0.1:
                tiny.append((round(span["size"], 1), t[:50]))
            elif span["size"] < 27.9:
                small.append((round(span["size"], 1), t[:50]))
if tiny:
    errors.append(f"{len(tiny)} spans under {args.min_size:g} pt: {tiny[:8]}")
words = [w[4] for w in page.get_text("words") if re.search(r"[A-Za-z0-9]", w[4])]
print(f"{args.pdf}: {page.rect.width / 72:.3f} x {page.rect.height / 72:.3f} in, {len(names)} fonts embedded")
print(f"words: {len(words)}; spans 24-28 pt: {len(small)}")
if args.words is not None and len(words) > args.words:
    errors.append(f"{len(words)} body words > {args.words}")
if errors:
    sys.exit("AUDIT FAILED: " + "; ".join(errors))
