# /// script
# requires-python = ">=3.10"
# dependencies = ["typst==0.15.0", "pyyaml", "segno"]
# ///
"""One-command rebuild: refresh data (if run dirs exist), QR codes, poster.pdf, preview.png."""
import runpy
import subprocess
import sys
import urllib.request
from pathlib import Path

import typst

HERE = Path(__file__).resolve().parent
FONTS = HERE / ".tools" / "fonts"
FONT_FILES = {
    "ibmplexmono": ["Regular", "Medium", "SemiBold", "Bold", "Italic"],
    "ibmplexsanscondensed": ["Regular", "Medium", "SemiBold", "Bold", "Italic"],
}
FAMILY_PREFIX = {"ibmplexmono": "IBMPlexMono", "ibmplexsanscondensed": "IBMPlexSansCondensed"}


def ensure_fonts():
    FONTS.mkdir(parents=True, exist_ok=True)
    for fam, styles in FONT_FILES.items():
        for style in styles:
            name = f"{FAMILY_PREFIX[fam]}-{style}.ttf"
            dst = FONTS / name
            if not dst.exists():
                url = f"https://github.com/google/fonts/raw/main/ofl/{fam}/{name}"
                print(f"fetching {name}")
                urllib.request.urlretrieve(url, dst)


def main():
    skip_extract = "--no-extract" in sys.argv
    ensure_fonts()
    if not skip_extract:
        runpy.run_path(str(HERE / "extract.py"), run_name="__main__")
    runpy.run_path(str(HERE / "make_qr.py"), run_name="__main__")
    src = str(HERE / "poster.typ")
    kw = dict(root=str(HERE), font_paths=[str(FONTS)], ignore_system_fonts=True)
    typst.compile(src, output=str(HERE / "poster.pdf"), format="pdf", **kw)
    print("wrote poster.pdf")
    # 44in at ~34 ppi -> ~1500 px square
    typst.compile(src, output=str(HERE / "preview.png"), format="png", ppi=34.1, **kw)
    print("wrote preview.png")
    if "--gray" in sys.argv:
        out = Path(sys.argv[sys.argv.index("--gray") + 1])
        subprocess.run(["pdftoppm", "-gray", "-r", "34", "-png", "-singlefile", str(HERE / "poster.pdf"), str(out)], check=True)
        print(f"wrote {out}.png")


if __name__ == "__main__":
    main()
