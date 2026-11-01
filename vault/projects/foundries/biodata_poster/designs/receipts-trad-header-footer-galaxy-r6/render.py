"""Compile poster.typ to PDFs and preview.png (run via uvx --from typst). Only vendored fonts are used."""
import os
import sys
from pathlib import Path

import typst

here = Path(__file__).resolve().parent
tmp = Path(os.environ.get("POSTER_TMP", "/private/tmp/claude-503/receipts-trad-header-footer-galaxy-deps"))
tmp.mkdir(parents=True, exist_ok=True)
kw = dict(root=str(here), font_paths=[str(here / "fonts")], ignore_system_fonts=True)
src = str(here / "poster.typ")


def build(out, fmt="pdf", ppi=None, **inputs):
    extra = dict(format="png", ppi=ppi) if fmt == "png" else {}
    res = typst.compile_with_warnings(src, output=str(out), sys_inputs=inputs, **kw, **extra)
    for w in res[1]:
        print("warning:", w, file=sys.stderr)


build(here / "poster.pdf")
build(here / "poster-bleed.pdf", bleed="1")
build(here / "preview.png", fmt="png", ppi=34)
# word-count render: title, authors, references and QR captions hidden
build(tmp / "poster-count.pdf", count="1")
# SHOW_ASK=1 variant (the [[ASK]] stub); poster.pdf itself is the SHOW_ASK=0 render
build(tmp / "poster-ask.pdf", SHOW_ASK="1")
build(tmp / "poster-ask-count.pdf", SHOW_ASK="1", count="1")
print("wrote poster.pdf, poster-bleed.pdf, preview.png;", tmp / "poster-count.pdf")
