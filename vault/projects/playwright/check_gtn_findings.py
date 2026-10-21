# /// script
# dependencies = ["pyyaml"]
# ///
"""Check gtn_findings_<ver>.yaml and gtn_screenshots_<ver>.yaml against faqs_<ver>.yaml.

Usage: uv run check_gtn_findings.py [26_2]
"""

import collections
import sys
from pathlib import Path

import yaml

HERE = Path(__file__).parent
FIELDS = {"label", "faqs", "target", "summary", "fix", "skip", "fixed_in"}
SHOT_FIELDS = {"image", "faqs", "used_in", "priority", "summary", "retake", "fixed_in"}


def main(ver: str) -> int:
    findings = yaml.safe_load((HERE / f"gtn_findings_{ver}.yaml").read_text()) or []
    faqs = {e["faq"]: e for e in yaml.safe_load((HERE / f"faqs_{ver}.yaml").read_text())}
    errors = []
    labels = collections.Counter(f.get("label") for f in findings)
    errors += [f"duplicate label {label}" for label, n in labels.items() if n > 1]
    linked = collections.defaultdict(set)
    for f in findings:
        label = f.get("label")
        if extra := set(f) - FIELDS:
            errors.append(f"{label}: unknown fields {sorted(extra)}")
        for field in ("label", "faqs", "target", "summary"):
            if not f.get(field):
                errors.append(f"{label}: missing {field}")
        if f.get("target") not in ("main", "version"):
            errors.append(f"{label}: target must be main or version")
        if "skip" in f and "fixed_in" in f:
            errors.append(f"{label}: both skip and fixed_in")
        for faq in f.get("faqs") or []:
            if faq not in faqs:
                errors.append(f"{label}: unknown faq {faq}")
            elif label not in (faqs[faq].get("faq_findings") or []):
                errors.append(f"{label}: {faq} doesn't list it in faq_findings")
            linked[faq].add(label)
    for faq, entry in faqs.items():
        for label in entry.get("faq_findings") or []:
            if label not in labels:
                errors.append(f"{faq}: faq_findings names unknown label {label}")
            elif label not in linked[faq]:
                errors.append(f"{faq}: {label} doesn't list this faq")
    shots_path = HERE / f"gtn_screenshots_{ver}.yaml"
    shots = yaml.safe_load(shots_path.read_text()) if shots_path.exists() else []
    images = collections.Counter(s.get("image") for s in shots or [])
    errors += [f"duplicate image {image}" for image, n in images.items() if n > 1]
    for s in shots or []:
        image = s.get("image")
        if extra := set(s) - SHOT_FIELDS:
            errors.append(f"{image}: unknown fields {sorted(extra)}")
        for field in ("image", "faqs", "priority", "summary"):
            if not s.get(field):
                errors.append(f"{image}: missing {field}")
        if s.get("priority") not in ("high", "medium", "low"):
            errors.append(f"{image}: priority must be high, medium or low")
        errors += [f"{image}: unknown faq {faq}" for faq in s.get("faqs") or [] if faq not in faqs]
    for error in errors:
        print(error)
    open_count = sum(1 for f in findings if "fixed_in" not in f and "skip" not in f)
    print(f"{len(findings)} findings, {open_count} open; {len(images)} screenshots; {len(errors)} errors")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "26_2"))
