"""hc_session_label.sh against a stub hc that logs its arguments."""

import json
import os
import subprocess
from pathlib import Path

SCRIPT = Path(__file__).with_name("hc_session_label.sh")


def run_hook(tmp_path, harness, payload, terminal="t7", command=None):
    """The finished hook and the stub's `hc` arguments (None if hc wasn't called); command replaces running the script."""
    log = tmp_path / "hc.log"
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir(parents=True)
    hc = bin_dir / "hc"
    hc.write_text(f"#!/bin/sh\nprintf '%s\\n' \"$@\" > {log}\n")
    hc.chmod(0o755)
    env = {**os.environ, "PATH": f"{bin_dir}:{os.environ['PATH']}"}
    env.pop("HC_TERMINAL_ID", None)
    if terminal:
        env["HC_TERMINAL_ID"] = terminal
    stdin = payload if isinstance(payload, str) else json.dumps(payload)
    result = subprocess.run(command or ["sh", SCRIPT, harness], input=stdin, env=env, capture_output=True, text=True)
    return result, (log.read_text().splitlines() if log.exists() else None)


START = {
    "hook_event_name": "SessionStart",
    "session_id": "d5c3f065-247e-45da-9a2c-e00ad9c9aa9a",
    "transcript_path": "/home/u/.claude/projects/-v/d5c3f065-247e-45da-9a2c-e00ad9c9aa9a.jsonl",
    "source": "startup",
}


def test_labels_terminal_with_session(tmp_path):
    result, args = run_hook(tmp_path, "claude", START)
    assert result.returncode == 0, result.stderr
    assert args == [
        "label",
        "t7",
        "gb.harness=claude",
        "gb.session=d5c3f065-247e-45da-9a2c-e00ad9c9aa9a",
        f"gb.transcript={START['transcript_path']}",
    ]


def test_codex_without_transcript_clears_it(tmp_path):
    payload = {"hook_event_name": "SessionStart", "session_id": "019a-codex"}
    result, args = run_hook(tmp_path, "codex", payload)
    assert result.returncode == 0, result.stderr
    assert args == ["label", "t7", "gb.harness=codex", "gb.session=019a-codex", "gb.transcript="]


def test_outside_hc_does_nothing(tmp_path):
    result, args = run_hook(tmp_path, "claude", START, terminal=None)
    assert result.returncode == 0
    assert args is None


def test_subagent_session_does_nothing(tmp_path):
    result, args = run_hook(tmp_path, "claude", {**START, "agent_id": "a1"})
    assert result.returncode == 0
    assert args is None


def test_other_events_do_nothing(tmp_path):
    result, args = run_hook(tmp_path, "claude", {**START, "hook_event_name": "Stop"})
    assert result.returncode == 0
    assert args is None


def test_bad_input_does_nothing(tmp_path):
    for payload in ["not json", "{}"]:
        result, args = run_hook(tmp_path / payload[:3], "claude", payload)
        assert result.returncode == 0
        assert args is None


def test_unknown_harness_does_nothing(tmp_path):
    result, args = run_hook(tmp_path, "cursor", START)
    assert result.returncode == 0
    assert args is None


def codex_parent(tmp_path):
    """A stub `codex` that runs the hook as its child."""
    codex = tmp_path / "codex"
    codex.write_text(f"#!/bin/sh\nsh {SCRIPT} codex\n")
    codex.chmod(0o755)
    return str(codex)


def test_codex_under_shared_daemon_does_nothing(tmp_path):
    """The daemon's HC_TERMINAL_ID belongs to whichever terminal started it."""
    result, args = run_hook(tmp_path / "run", "codex", START, command=[codex_parent(tmp_path), "app-server"])
    assert result.returncode == 0, result.stderr
    assert args is None


def test_codex_without_daemon_labels(tmp_path):
    result, args = run_hook(tmp_path / "run", "codex", START, command=[codex_parent(tmp_path), "--no-daemon"])
    assert result.returncode == 0, result.stderr
    assert args[:4] == ["label", "t7", "gb.harness=codex", f"gb.session={START['session_id']}"]
