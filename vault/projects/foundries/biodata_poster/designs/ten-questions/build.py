# /// script
# requires-python = ">=3.10"
# dependencies = ["typst==0.15.0", "pyyaml", "segno", "pymupdf", "zxing-cpp", "pillow"]
# ///
"""One-command rebuild: data snapshot, QR codes, poster.pdf, poster-bleed.pdf, preview, checks, guards.

uv run build.py [--no-extract] [--hide-ask]
"""
import os
import re
import runpy
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

import pymupdf as fitz
import segno
import typst
import yaml

HERE = Path(__file__).resolve().parent
DEPS = Path(os.environ.get("POSTER_DEPS", "/private/tmp/claude-503/ten-questions-deps"))
FONTS = DEPS / "fonts"
CHECKS = HERE / "checks"
GF = "https://github.com/google/fonts/raw/main/ofl"
GOOGLE_FONTS = [
    "atkinsonhyperlegible/AtkinsonHyperlegible-Regular.ttf",
    "atkinsonhyperlegible/AtkinsonHyperlegible-Bold.ttf",
    "atkinsonhyperlegible/AtkinsonHyperlegible-Italic.ttf",
    "ibmplexmono/IBMPlexMono-Regular.ttf",
    "ibmplexmono/IBMPlexMono-Medium.ttf",
    "ibmplexmono/IBMPlexMono-SemiBold.ttf",
    "ibmplexmono/IBMPlexMono-Bold.ttf",
]
PUBLIC_SANS_ZIP = "https://github.com/uswds/public-sans/releases/download/v2.001/public-sans-v2.001.zip"
PUBLIC_SANS = ["Regular", "Medium", "SemiBold", "Bold", "ExtraBold", "Black"]
ALLOWED_FONTS = ("PublicSans", "AtkinsonHyperlegible", "IBMPlexMono")
QR_LINKS = {
    "repo": "https://github.com/galaxyproject/foundry",
    "usage": "https://galaxyproject.github.io/foundry/usage/",
    "preprint": "https://doi.org/10.64898/2026.10.26.761864",
}
MIN_PT = 24.0
SAFE_PT = 72.0  # 1 in
WORD_BUDGET = 550
errors = []


def fail(msg):
    errors.append(msg)
    print(f"GUARD FAIL: {msg}")


def ensure_fonts():
    FONTS.mkdir(parents=True, exist_ok=True)
    for rel in GOOGLE_FONTS:
        dst = FONTS / Path(rel).name
        if not dst.exists():
            print(f"fetching {dst.name}")
            urllib.request.urlretrieve(f"{GF}/{rel}", dst)
    missing = [w for w in PUBLIC_SANS if not (FONTS / f"PublicSans-{w}.ttf").exists()]
    if missing:
        z = DEPS / "public-sans.zip"
        if not z.exists():
            print("fetching Public Sans v2.001")
            urllib.request.urlretrieve(PUBLIC_SANS_ZIP, z)
        with zipfile.ZipFile(z) as zf:
            for w in missing:
                (FONTS / f"PublicSans-{w}.ttf").write_bytes(zf.read(f"fonts/ttf/PublicSans-{w}.ttf"))


def make_qr():
    out = HERE / "qr"
    out.mkdir(exist_ok=True)
    for name, url in QR_LINKS.items():
        segno.make(url, error="m").save(out / f"{name}.svg", scale=10, border=4, dark="#000000", light="#ffffff")


def words(node, skip=("meta", "board", "mark", "kind", "ref")):
    if isinstance(node, dict):
        return sum(words(v) for k, v in node.items() if k not in skip)
    if isinstance(node, list):
        return sum(words(v) for v in node)
    if isinstance(node, str):
        s = re.sub(r"#\w+(\([^)]*\))?", " ", node)  # helpers like #arr, #h8("…")
        return len([w for w in re.split(r"\s+", s) if re.search(r"\w", w)])
    return 0


def content_guards(content, run):
    n = words(content) + words(run["provenance"]["rule"])  # the quoted wiki rule prints from run.json
    print(f"word count (excluding meta): {n} / {WORD_BUDGET}")
    if n > WORD_BUDGET:
        fail(f"word budget exceeded: {n} > {WORD_BUDGET}")
    qs = content["questions"]
    if sorted(int(k) for k in qs) != list(range(1, 11)):
        fail("content.yml must have questions 1..10")
    for k, v in qs.items():
        if len(v["q"]) > 70:
            fail(f"question {k} longer than 70 characters")
    fixes = [k for k, v in qs.items() if "fix" in v]
    edited = [str(q["n"]) for q in run["questions"] if q["review"] == "expert-edited"]
    if [str(k) for k in fixes] != edited:
        fail(f"content corrections {fixes} do not match ledger expert-edited {edited}")
    led = run["ledger"]
    items = content["open"]["items"]
    if len(items) != led["open"] or sum(i["kind"] == "cut" for i in items) != led["dropped"]:
        fail("open items in content.yml no longer match the ledger")
    if sum(i["ref"] == "new" for i in items) != len(led["recommendations"]):
        fail("NEW items must match the ledger's brief-change recommendations")
    tally = content["open"]["tally"]
    for v in (led["entries"], led["resolved"], led["open"]):
        if str(v) not in tally:
            fail(f"tally line lacks ledger count {v}")
    if "5 LOW" not in content["form"]["footer"] or run["brief"]["low_before"] != 5:
        fail("LOW count in form footer drifted")
    if run["brief"]["sha_before"][:8] not in content["form"]["footer"] or run["brief"]["sha_after"][:8] not in content["form"]["footer"]:
        fail("brief hashes in form footer drifted")
    if run["provenance"]["note_src_hash"][:8] not in content["wiki"]["hashline"]:
        fail("note hash drifted")
    for r, d in zip(content["recompile"]["rows"], run["recompile"]):
        if (r["before"], r["after"]) != (d["before"][:8], d["after"][:8]):
            fail(f"recompile hash pair drifted for {d['commit']}")
    if run["planemo"]["galaxy_head"][:8] not in content["tools"]["rows"][2]["detail"]:
        fail("Galaxy head drifted")


def compile_pdf(out, show_ask, bleed=False):
    typst.compile(str(HERE / "poster.typ"), output=str(out), format="pdf", root=str(HERE),
                  font_paths=[str(FONTS)], ignore_system_fonts=True,
                  sys_inputs={"show-ask": "1" if show_ask else "0", "bleed": "1" if bleed else "0"})


def pdf_guards(pdf, name, inset=0.0):
    info = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True).stdout
    if not re.search(r"^Pages:\s+1$", info, re.M):
        fail(f"{name}: not a single page")
    fonts = subprocess.run(["pdffonts", str(pdf)], capture_output=True, text=True, check=True).stdout.splitlines()[2:]
    for ln in fonts:
        cols = ln.split()
        fam = cols[0].split("+")[-1]
        emb = cols[-5]
        if not fam.startswith(ALLOWED_FONTS):
            fail(f"{name}: unexpected font {fam}")
        if emb != "yes":
            fail(f"{name}: font {fam} not embedded")
    imgs = subprocess.run(["pdfimages", "-list", str(pdf)], capture_output=True, text=True, check=True).stdout.splitlines()[2:]
    if imgs:
        fail(f"{name}: {len(imgs)} raster images")
    doc = fitz.open(pdf)
    page = doc[0]
    w, h = page.rect.width, page.rect.height
    small, outside = [], []
    for b in page.get_text("dict")["blocks"]:
        for ln in b.get("lines", []):
            for sp in ln["spans"]:
                if not sp["text"].strip():
                    continue
                if sp["size"] < MIN_PT - 0.05:
                    small.append((round(sp["size"], 1), sp["text"][:40]))
                # ink extent: bbox x, and cap-height/descender from the baseline (font bboxes overstate it)
                x0, _, x1, _ = sp["bbox"]
                y0 = sp["origin"][1] - 0.72 * sp["size"]
                y1 = sp["origin"][1] + 0.24 * sp["size"]
                lo = SAFE_PT + inset - 1
                if x0 < lo or y0 < lo or x1 > w - lo or y1 > h - lo:
                    outside.append(sp["text"][:40])
    if small:
        fail(f"{name}: {len(small)} text runs under {MIN_PT} pt, e.g. {small[:5]}")
    if outside:
        fail(f"{name}: text outside the 1 in safe area: {outside[:5]}")
    # drawn shapes: nothing may start or end in the 0.25-0.9 in band from the trim (full-page fills excepted)
    near = []
    for dr in page.get_drawings():
        r = dr["rect"]
        if r.width >= w - 1 and r.height >= h - 1:
            continue
        for edge in (r.x0, r.y0, w - r.x1, h - r.y1):
            if 18 + inset <= edge < 65 + inset:
                near.append((round(edge - inset, 1), [round(v) for v in r]))
                break
    if near:
        fail(f"{name}: shapes within 0.25-0.9 in of the trim: {near[:4]}")
    return page.get_text()


def check_qr(pdf):
    """Every QR on the page must decode to one of QR_LINKS, and all of them must be found."""
    import zxingcpp
    from PIL import Image
    pix = fitz.open(pdf)[0].get_pixmap(dpi=100, colorspace=fitz.csGRAY)
    img = Image.frombytes("L", (pix.width, pix.height), pix.samples)
    found = sorted(r.text for r in zxingcpp.read_barcodes(img) if r.format == zxingcpp.BarcodeFormat.QRCode)
    if found != sorted(QR_LINKS.values()):
        fail(f"QR codes decode to {found}, expected {sorted(QR_LINKS.values())}")
    else:
        print(f"qr ok: {len(found)} codes decode to their URLs")


def render(pdf):
    def ppm(stem, *args):
        subprocess.run(["pdftoppm", "-png", "-singlefile", *args, str(pdf), str(stem)], check=True)
    CHECKS.mkdir(exist_ok=True)
    ppm(HERE / "preview", "-scale-to", "1500")
    ppm(CHECKS / "preview-25", "-r", "24")  # 44 in at 24 dpi = 1056 px
    ppm(CHECKS / "preview-200", "-scale-to", "200")
    ppm(CHECKS / "preview-gray", "-gray", "-r", "24")


def main():
    hide_ask = "--hide-ask" in sys.argv
    ensure_fonts()
    if "--no-extract" not in sys.argv:
        runpy.run_path(str(HERE / "extract.py"), run_name="__main__")
    make_qr()
    content = yaml.safe_load((HERE / "content.yml").read_text())
    run = yaml.safe_load((HERE / "data/run.json").read_text())
    content_guards(content, run)
    if errors:
        sys.exit(f"{len(errors)} guard failure(s); no PDF written")

    pdf, bleed = HERE / "poster.pdf", HERE / "poster-bleed.pdf"
    compile_pdf(pdf, show_ask=not hide_ask)
    compile_pdf(bleed, show_ask=not hide_ask, bleed=True)
    text = pdf_guards(pdf, "poster.pdf")
    pdf_guards(bleed, "poster-bleed.pdf", inset=9.0)
    if not hide_ask and "[[ASK]]" not in text:
        fail("ASK slot missing from the default build")
    # the hide-ask variant must drop every ASK slot and still pass every guard
    with tempfile.TemporaryDirectory() as td:
        hidden = Path(td) / "hidden.pdf"
        compile_pdf(hidden, show_ask=False)
        htext = pdf_guards(hidden, "hide-ask variant")
        for needle in ("[[ASK]]", "nf-core", "Nekrutenko lab"):
            if needle in htext:
                fail(f"hide-ask variant still contains {needle!r}")
        if "--keep-hidden" in sys.argv:
            shutil.copy(hidden, DEPS / "poster-hide-ask.pdf")
            subprocess.run(["pdftoppm", "-png", "-singlefile", "-r", "24", str(hidden),
                            str(DEPS / "poster-hide-ask-25")], check=True)
    if "[[QR: live results]]" not in text.replace("\n", " "):
        fail("live-results QR slot missing")
    check_qr(pdf)
    render(pdf)
    if errors:
        sys.exit(f"{len(errors)} guard failure(s)")
    print("ok: poster.pdf, poster-bleed.pdf (44.25 in), preview.png, checks/preview-{25,200,gray}.png")


if __name__ == "__main__":
    main()
