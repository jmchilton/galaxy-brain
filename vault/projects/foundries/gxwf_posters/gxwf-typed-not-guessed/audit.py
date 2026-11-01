# /// script
# dependencies = ["pymupdf"]
# ///
"""Fail on non-vendored or unembedded fonts, text under 24 pt, or (with --words) body over the word budget."""
import re
import sys
from pathlib import Path

import pymupdf

ALLOWED = {"AtkinsonHyperlegible-Regular", "AtkinsonHyperlegible-Bold",
           "AtkinsonHyperlegibleMono-Regular", "AtkinsonHyperlegibleMono-Bold",
           "IBMPlexMono-Regular", "IBMPlexMono-Bold", "Kalam-Regular", "Kalam-Bold"}
BUDGET = 700
args = sys.argv[1:]
words_mode = "--words" in args
args = [a for a in args if a != "--words"]
pdf = Path(args[0] if args else Path(__file__).with_name("poster.pdf"))
page = pymupdf.open(pdf)[0]
errors = []
fonts = page.get_fonts(full=True)
names = {f[3].split("+")[-1] for f in fonts}
if names - ALLOWED:
    errors.append(f"non-vendored fonts: {sorted(names - ALLOWED)}")
unembedded = [f[3] for f in fonts if f[1] in ("n/a", "")]
if unembedded:
    errors.append(f"unembedded fonts: {unembedded}")
small, tiny, tokens = [], [], []
for block in page.get_text("dict")["blocks"]:
    for line in block.get("lines", []):
        for span in line["spans"]:
            t = span["text"].strip()
            if not t:
                continue
            # a word is a whitespace token with a letter or digit (leader dots don't count)
            tokens += [w for w in t.split() if re.search(r"[A-Za-z0-9]", w)]
            if span["size"] < 23.9:
                tiny.append((round(span["size"], 1), t[:50]))
            elif span["size"] < 27.9:
                small.append((round(span["size"], 1), t[:50]))
if tiny:
    errors.append(f"{len(tiny)} spans under 24 pt: {tiny[:8]}")
print(f"{pdf.name}: {page.rect.width / 72:.3f} in square, fonts {sorted(names)}, all embedded: {not unembedded}")
print(f"tokens: {len(tokens)}; spans 24-28 pt: {len(small)}")
for s in small:
    print("  24-28pt:", s)
if words_mode:
    print(f"BODY WORDS (title and refs hidden): {len(tokens)} / {BUDGET}")
    if len(tokens) > BUDGET:
        errors.append(f"body is {len(tokens)} words, budget {BUDGET}")
if errors:
    sys.exit("AUDIT FAILED: " + "; ".join(errors))
