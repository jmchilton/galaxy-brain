"""launch_agent.sh's `hc run` call, against stub hc and herdr-app binaries."""

import os
import re
import subprocess
from pathlib import Path

SCRIPT = Path(__file__).with_name("launch_agent.sh")


def launch(tmp_path, prompt):
    """The arguments of the stub's `hc run` for a launch with this prompt."""
    log = tmp_path / "run.log"
    bin_dir = tmp_path / ".local" / "bin"
    bin_dir.mkdir(parents=True)
    hc = bin_dir / "hc"
    hc.write_text(
        '#!/bin/sh\n[ "$1" = run ] || { echo "{}"; exit 0; }\n'
        f'printf \'%s\\n\' "$@" > {log}\n'
        "echo '{\"address\":\"t9\"}'\n"
    )
    (bin_dir / "herdr-app").write_text("#!/bin/sh\nexit 0\n")
    hc.chmod(0o755)
    (bin_dir / "herdr-app").chmod(0o755)
    env = {**os.environ, "HOME": str(tmp_path), "GB_HERDR": "app"}
    subprocess.run([SCRIPT, "factory", "claude", "probe", prompt], env=env, check=True, capture_output=True)
    return log.read_text().splitlines()


def record_labels(args):
    return [arg for arg, before in zip(args[1:], args) if before == "--label" and arg.startswith("gb.record.")]


def test_labels_records_the_prompt_names(tmp_path):
    prompt = (
        "Shelve /v/repositories/galaxy/branches/active/fix_26.1. Blocked on: x\n"
        "See `/v/repositories/galaxy/reviews/active/24635/round_1/notes.md` and the queue repositories/foundry/issues/MY_ISSUES.md"
    )
    labels = record_labels(launch(tmp_path, prompt))
    refs = sorted(label.split("=")[0] for label in labels)
    assert refs == ["gb.record.galaxy/branches/fix_26.1", "gb.record.galaxy/reviews/24635"]
    assert all(re.fullmatch(r"\d{9,}", label.split("=")[1]) for label in labels)


def test_no_record_labels_without_a_record(tmp_path):
    args = launch(tmp_path, "Run ./TICK.md on galaxyproject/foundry#12")
    assert record_labels(args) == []
    assert args[-1] == "Run ./TICK.md on galaxyproject/foundry#12"
