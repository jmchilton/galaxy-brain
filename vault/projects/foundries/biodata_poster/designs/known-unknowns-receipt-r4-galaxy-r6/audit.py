# /// script
# dependencies = ["pymupdf"]
# ///
"""Fail on non-vendored or unembedded fonts, text under 24 pt, or body words outside the round-5 band; report 24-28 pt spans."""
import json
import re
import sys
from pathlib import Path

import pymupdf

ALLOWED = {"AtkinsonHyperlegible-Regular", "AtkinsonHyperlegible-Bold", "AtkinsonHyperlegible-Italic",
           "AtkinsonHyperlegible-BoldItalic", "AtkinsonHyperlegibleMono-Regular", "AtkinsonHyperlegibleMono-SemiBold",
           "AtkinsonHyperlegibleMono-Bold", "IBMPlexMono-Regular", "IBMPlexMono-Bold", "Kalam-Regular", "Kalam-Bold"}
WORD_MIN, WORD_MAX = 539, 595  # round 5 restyle: source body 567 +/- 5%
here = Path(__file__).resolve().parent
pdf = Path(sys.argv[1] if len(sys.argv) > 1 else here / "poster.pdf")
page = pymupdf.open(pdf)[0]
errors = []

fonts = page.get_fonts(full=True)
names = {f[3].split("+")[-1] for f in fonts}
if names - ALLOWED:
    errors.append(f"non-vendored fonts: {sorted(names - ALLOWED)}")
unembedded = [f[3] for f in fonts if f[1] == "n/a"]
if unembedded:
    errors.append(f"unembedded fonts: {unembedded}")

small, tiny = [], []
for block in page.get_text("dict")["blocks"]:
    for line in block.get("lines", []):
        for span in line["spans"]:
            t = span["text"].strip()
            if not t:
                continue
            if span["size"] < 23.9:
                tiny.append((round(span["size"], 1), t[:50]))
            elif span["size"] < 27.9:
                small.append((round(span["size"], 1), t[:50]))
if tiny:
    errors.append(f"{len(tiny)} spans under 24 pt: {tiny[:8]}")


def words(text):
    return [w for w in text.split() if re.search(r"[A-Za-z0-9]", w)]


# body words = every word on the page minus the excluded copy in meta.json (title, authors, refs, QR captions)
meta = json.loads((here / "meta.json").read_text())
excluded = [meta["title"], meta["authors"], *meta["affils"], *meta["refs"], *meta["qr"].values()]
n_all = len(words(" ".join(w[4] for w in page.get_text("words"))))
n_excl = sum(len(words(s)) for s in excluded)
body = n_all - n_excl
if not WORD_MIN <= body <= WORD_MAX:
    errors.append(f"body words {body} outside {WORD_MIN}-{WORD_MAX}")

print(f"{pdf.name}: {page.rect.width:.0f} x {page.rect.height:.0f} pt; fonts {sorted(names)}; all embedded: {not unembedded}")
print(f"words: {n_all} on page, {n_excl} excluded, body {body} (band {WORD_MIN}-{WORD_MAX}); spans 24-28 pt: {len(small)}")
for s in small:
    print("  24-28pt:", s)
if errors:
    sys.exit("AUDIT FAILED: " + "; ".join(errors))
