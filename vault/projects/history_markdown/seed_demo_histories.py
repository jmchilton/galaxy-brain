#!/usr/bin/env python3
"""Seed a Galaxy instance with pre-named histories for the Galaxy Notebooks screencast.

Each scenario maps to one of the screencast clips outlined in HISTORY_MARKDOWN_ARCHITECTURE.md:

  notebook-from-scratch   minimal RNA-seq-flavored history (head + cat outputs)
  methods-draft           ChIP-seq pilot (mapper + head + cat)  - for AI Methods draft clip
  per-section-diff        same as methods-draft, second history for diff demo
  revisions               variant-calling pilot (mapper -> pileup) - rollback clip
  reports-vs-notebooks    plain mini-history for the Reports vs Notebooks compare

Requires the for_workflows test tools (cat, head, mapper, pileup) to be loaded.
Most dev Galaxy instances pick those up via test/functional/tools/sample_tool_conf.xml.

Usage:
    pip install bioblend
    export GALAXY_URL=http://localhost:8080
    export GALAXY_API_KEY=...
    python seed_demo_histories.py                      # creates all scenarios
    python seed_demo_histories.py --only methods-draft # one scenario
    python seed_demo_histories.py --prefix "Demo: "    # prefix all history names
    python seed_demo_histories.py --purge              # delete previously-seeded histories first
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from dataclasses import dataclass
from typing import Callable

try:
    from bioblend.galaxy import GalaxyInstance
except ImportError:
    sys.exit("bioblend not installed. Run: pip install bioblend")


SEED_TAG = "notebooks-screencast"  # tag added to every seeded history for easy purge

FASTQ_CONTENT = """\
@read_001
ACGTACGTACGTACGTACGTACGT
+
IIIIIIIIIIIIIIIIIIIIIIII
@read_002
TTTTAAAACCCCGGGGTTTTAAAA
+
IIIIIIIIIIIIIIIIIIIIIIII
"""

FASTA_CONTENT = """\
>chr_demo
ACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGT
"""

LINES_TXT = "\n".join(f"line {i:02d} of demo input" for i in range(1, 31)) + "\n"

SAMPLE_BED = """\
chr1\t100\t200\tfeatureA\t0\t+
chr1\t300\t450\tfeatureB\t0\t-
chr2\t500\t650\tfeatureC\t0\t+
"""


@dataclass
class PasteSpec:
    name: str
    content: str
    file_type: str  # "txt", "fastq", "fasta", "bed", ...


def paste_dataset(gi: GalaxyInstance, history_id: str, spec: PasteSpec) -> str:
    """Upload an inline dataset via the tools/fetch API and return the dataset id."""
    payload = gi.tools.paste_content(
        spec.content, history_id=history_id, file_type=spec.file_type
    )
    ds = payload["outputs"][0]
    return ds["id"]


def wait_for(gi: GalaxyInstance, history_id: str, timeout: int = 600) -> None:
    """Block until every dataset in the history is in a terminal state."""
    terminal = {"ok", "error", "deleted", "discarded", "failed_metadata"}
    start = time.time()
    while True:
        details = gi.histories.show_history(history_id, contents=False)
        states = details.get("state_details", {}) or details.get("state_ids", {})
        # bioblend gives counts in state_details
        in_progress = sum(
            v for k, v in states.items() if k not in terminal and isinstance(v, int)
        )
        if in_progress == 0:
            return
        if time.time() - start > timeout:
            raise RuntimeError(f"History {history_id} did not finish within {timeout}s")
        time.sleep(2)


def run_tool(
    gi: GalaxyInstance,
    history_id: str,
    tool_id: str,
    inputs: dict,
) -> dict:
    return gi.tools.run_tool(history_id=history_id, tool_id=tool_id, tool_inputs=inputs)


def hda(id_: str) -> dict:
    return {"src": "hda", "id": id_}


# ----- scenarios ---------------------------------------------------------


def scenario_notebook_from_scratch(gi: GalaxyInstance, name: str) -> str:
    h = gi.histories.create_history(name=name)["id"]
    src = paste_dataset(gi, h, PasteSpec("demo_input.txt", LINES_TXT, "txt"))
    run_tool(gi, h, "head", {"input": hda(src), "lineNum": 5})
    run_tool(gi, h, "head", {"input": hda(src), "lineNum": 15})
    run_tool(gi, h, "cat", {"input1": hda(src), "queries_0|input2": hda(src)})
    return h


def scenario_methods_draft(gi: GalaxyInstance, name: str) -> str:
    h = gi.histories.create_history(name=name)["id"]
    fq = paste_dataset(gi, h, PasteSpec("sample_R1.fastq", FASTQ_CONTENT, "fastq"))
    fa = paste_dataset(gi, h, PasteSpec("reference.fasta", FASTA_CONTENT, "fasta"))
    txt = paste_dataset(gi, h, PasteSpec("notes.txt", LINES_TXT, "txt"))
    run_tool(gi, h, "mapper", {"input1": hda(fq), "reference": hda(fa)})
    run_tool(gi, h, "head", {"input": hda(txt), "lineNum": 10})
    run_tool(gi, h, "cat", {"input1": hda(txt), "queries_0|input2": hda(txt)})
    return h


def scenario_per_section_diff(gi: GalaxyInstance, name: str) -> str:
    # Same shape as methods-draft but distinct name and slightly different inputs
    # so you can record both clips back-to-back without confusing histories.
    h = gi.histories.create_history(name=name)["id"]
    fq = paste_dataset(gi, h, PasteSpec("rep2_R1.fastq", FASTQ_CONTENT, "fastq"))
    fa = paste_dataset(gi, h, PasteSpec("hg_demo.fasta", FASTA_CONTENT, "fasta"))
    bed = paste_dataset(gi, h, PasteSpec("peaks.bed", SAMPLE_BED, "bed"))
    run_tool(gi, h, "mapper", {"input1": hda(fq), "reference": hda(fa)})
    run_tool(gi, h, "head", {"input": hda(bed), "lineNum": 2})
    return h


def scenario_revisions(gi: GalaxyInstance, name: str) -> str:
    h = gi.histories.create_history(name=name)["id"]
    fq = paste_dataset(gi, h, PasteSpec("variants_R1.fastq", FASTQ_CONTENT, "fastq"))
    fa = paste_dataset(gi, h, PasteSpec("ref.fasta", FASTA_CONTENT, "fasta"))
    map_out = run_tool(gi, h, "mapper", {"input1": hda(fq), "reference": hda(fa)})
    bam_id = map_out["outputs"][0]["id"]
    # Wait for the BAM so pileup's metadata validator (bam_index) has something real.
    wait_for(gi, h)
    run_tool(
        gi,
        h,
        "pileup",
        {"input1": [hda(bam_id)], "reference": hda(fa)},
    )
    return h


def scenario_reports_vs_notebooks(gi: GalaxyInstance, name: str) -> str:
    h = gi.histories.create_history(name=name)["id"]
    src = paste_dataset(gi, h, PasteSpec("intervals.bed", SAMPLE_BED, "bed"))
    run_tool(gi, h, "head", {"input": hda(src), "lineNum": 2})
    return h


SCENARIOS: dict[str, tuple[str, Callable[[GalaxyInstance, str], str]]] = {
    "notebook-from-scratch": (
        "RNA-seq pilot - sample A",
        scenario_notebook_from_scratch,
    ),
    "methods-draft": (
        "ChIP-seq pilot - replicate 1",
        scenario_methods_draft,
    ),
    "per-section-diff": (
        "ChIP-seq pilot - replicate 2",
        scenario_per_section_diff,
    ),
    "revisions": (
        "Variant calling pilot - patient 042",
        scenario_revisions,
    ),
    "reports-vs-notebooks": (
        "Quick interval check",
        scenario_reports_vs_notebooks,
    ),
}


# ----- driver ------------------------------------------------------------


def purge_seeded(gi: GalaxyInstance) -> None:
    seen = 0
    for h in gi.histories.get_histories():
        full = gi.histories.show_history(h["id"])
        if SEED_TAG in (full.get("tags") or []):
            gi.histories.delete_history(h["id"], purge=True)
            seen += 1
    print(f"Purged {seen} previously-seeded histories.")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--url", default=os.environ.get("GALAXY_URL", "http://localhost:8080"))
    p.add_argument("--api-key", default=os.environ.get("GALAXY_API_KEY"))
    p.add_argument("--prefix", default="", help="Prefix prepended to every history name.")
    p.add_argument("--only", choices=list(SCENARIOS), help="Run only this scenario.")
    p.add_argument("--purge", action="store_true", help="Delete histories tagged with the seed tag, then re-seed.")
    p.add_argument("--no-wait", action="store_true", help="Skip the per-history wait at the end (faster, but jobs may still be queued).")
    args = p.parse_args()

    if not args.api_key:
        sys.exit("Set GALAXY_API_KEY (or pass --api-key).")

    gi = GalaxyInstance(url=args.url, key=args.api_key)
    print(f"Galaxy: {args.url} as {gi.users.get_current_user()['username']}")

    if args.purge:
        purge_seeded(gi)

    targets = [args.only] if args.only else list(SCENARIOS)
    for key in targets:
        base_name, fn = SCENARIOS[key]
        name = f"{args.prefix}{base_name}"
        print(f"-> {key}: creating '{name}' ...")
        history_id = fn(gi, name)
        gi.histories.create_history_tag(history_id, SEED_TAG)
        if not args.no_wait:
            wait_for(gi, history_id)
        print(f"   done. history_id={history_id}")

    print("All requested scenarios seeded.")


if __name__ == "__main__":
    main()
