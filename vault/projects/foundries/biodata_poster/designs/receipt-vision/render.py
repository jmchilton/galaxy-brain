"""Compile poster.typ to poster.pdf and preview.png (run via uvx --from typst)."""
import sys
from pathlib import Path

import typst

here = Path(__file__).resolve().parent
kw = dict(root=str(here), font_paths=[str(here / "fonts")])
src = str(here / "poster.typ")
pdf, warnings = typst.compile_with_warnings(src, output=str(here / "poster.pdf"), **kw)
for w in warnings:
    print("warning:", w, file=sys.stderr)
typst.compile(src, output=str(here / "preview.png"), format="png", ppi=34, **kw)
print("wrote poster.pdf, preview.png")
