"""Compile poster.typ to PDFs and preview.png (run via uvx --from typst). Only vendored fonts are used."""
import os
import sys
from pathlib import Path

import typst

here = Path(__file__).resolve().parent
tmp = Path(os.environ.get("POSTER_TMP", "/private/tmp/claude-503/receipts-trad-columns-galaxyplus-deps"))
tmp.mkdir(parents=True, exist_ok=True)
kw = dict(root=str(here), font_paths=[str(here / "fonts")], ignore_system_fonts=True)
src = str(here / "poster.typ")


def build(out, fmt="pdf", ppi=None, **inputs):
    extra = dict(format="png", ppi=ppi) if fmt == "png" else {}
    res = typst.compile_with_warnings(src, output=str(out), sys_inputs=inputs, **kw, **extra)
    for w in res[1]:
        print("warning:", w, file=sys.stderr)


if os.environ.get("POSTER_DEBUG") == "1":
    # debug render only: per-column slack, guards shown on the page instead of failing
    build(tmp / "poster-debug.png", fmt="png", ppi=34, debug="1", noguard="1")
    print("wrote", tmp / "poster-debug.png")
    sys.exit(0)
build(here / "poster.pdf")
build(here / "poster-bleed.pdf", bleed="1")
build(here / "preview.png", fmt="png", ppi=34)
# word-count render: title, authors, references and QR captions hidden
build(tmp / "poster-count.pdf", count="1")
print("wrote poster.pdf, poster-bleed.pdf, preview.png;", tmp / "poster-count.pdf")
