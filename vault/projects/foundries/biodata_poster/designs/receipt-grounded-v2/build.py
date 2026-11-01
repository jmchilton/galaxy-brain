# /// script
# requires-python = ">=3.10"
# dependencies = ["typst==0.15.0", "pyyaml", "segno"]
# ///
"""One-command rebuild: data (if run dirs exist), QR codes, poster.pdf, poster-bleed.pdf, previews, checks."""
import os
import runpy
import subprocess
import sys
import urllib.request
from pathlib import Path

import typst

HERE = Path(__file__).resolve().parent
# font cache lives outside the vault; override with POSTER_FONTS
FONTS = Path(os.environ.get("POSTER_FONTS", "/private/tmp/claude-503/receipt-grounded-v2/fonts"))
FONT_FILES = {
    "ibmplexmono": ["Regular", "Medium", "SemiBold", "Bold", "Italic"],
    "ibmplexsanscondensed": ["Regular", "Medium", "SemiBold", "Bold", "Italic"],
}
FAMILY_PREFIX = {"ibmplexmono": "IBMPlexMono", "ibmplexsanscondensed": "IBMPlexSansCondensed"}
CHECKS = HERE / "checks"


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


def check_fonts(pdf):
    out = subprocess.run(["pdffonts", str(pdf)], capture_output=True, text=True, check=True).stdout
    names = [ln.split()[0].split("+")[-1] for ln in out.splitlines()[2:] if ln.strip()]
    bad = [n for n in names if not n.startswith("IBMPlex")]
    if bad:
        sys.exit(f"non-Plex fonts embedded in {pdf.name}: {bad}")
    print(f"fonts ok: {sorted(set(names))}")


def ppm(pdf, stem, *args):
    subprocess.run(["pdftoppm", "-png", "-singlefile", *args, str(pdf), str(stem)], check=True)


def main():
    show_ask = "0" if "--hide-ask" in sys.argv else "1"
    ensure_fonts()
    if "--no-extract" not in sys.argv:
        runpy.run_path(str(HERE / "extract.py"), run_name="__main__")
    runpy.run_path(str(HERE / "make_qr.py"), run_name="__main__")
    src = str(HERE / "poster.typ")
    kw = dict(root=str(HERE), font_paths=[str(FONTS)], ignore_system_fonts=True)
    pdf = HERE / "poster.pdf"
    typst.compile(src, output=str(pdf), format="pdf", sys_inputs={"show-ask": show_ask}, **kw)
    print("wrote poster.pdf")
    typst.compile(src, output=str(HERE / "poster-bleed.pdf"), format="pdf",
                  sys_inputs={"show-ask": show_ask, "bleed": "1"}, **kw)
    print("wrote poster-bleed.pdf (44.25 in, 0.125 in bleed)")
    pages = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True).stdout
    if "Pages:           1\n" not in pages:
        sys.exit("poster.pdf is not a single page: something overflowed")
    check_fonts(pdf)
    CHECKS.mkdir(exist_ok=True)
    ppm(pdf, HERE / "preview", "-scale-to", "1500")
    ppm(pdf, CHECKS / "preview-25", "-r", "24")  # 44 in at 24 dpi = 1056 px
    ppm(pdf, CHECKS / "preview-200", "-scale-to", "200")
    ppm(pdf, CHECKS / "preview-gray", "-gray", "-r", "24")
    print("wrote preview.png and checks/preview-{25,200,gray}.png")


if __name__ == "__main__":
    main()
