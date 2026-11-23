"""start_desk.sh against stub hc and launch_agent.sh in a copied agents tree."""

import json
import os
import shutil
import subprocess
from pathlib import Path

SCRIPT = Path(__file__).with_name("start_desk.sh")


def run(tmp_path, terminals, foregrounds, ls_fails=False):
    """Run the script; return (result, launch_agent.sh args or None)."""
    agents = tmp_path / "agents"
    scripts = agents / "telegram" / "scripts"
    shared = agents / "_shared" / "scripts"
    scripts.mkdir(parents=True)
    shared.mkdir(parents=True)
    shutil.copy(SCRIPT, scripts / "start_desk.sh")
    desk = str((agents / "telegram").resolve())
    log = tmp_path / "launch.log"
    (shared / "launch_agent.sh").write_text(f"#!/bin/sh\nprintf '%s\\n' \"$@\" > {log}\n")
    bin_dir = tmp_path / ".local" / "bin"
    bin_dir.mkdir(parents=True)
    listing = {"terminals": [{**t, "cwd": t.get("cwd", desk)} for t in terminals]}
    gets = "".join(
        f"  {addr}) echo '{json.dumps({'foreground': {'name': name}})}' ;;\n" for addr, name in foregrounds.items()
    )
    ls = "exit 1" if ls_fails else f"echo '{json.dumps(listing)}'"
    (bin_dir / "hc").write_text(
        f'#!/bin/sh\n[ "$1" = ls ] && {{ {ls}; exit; }}\n[ "$1" = get ] && case $2 in\n{gets}  *) echo "{{}}" ;; esac\n'
    )
    for f in (bin_dir / "hc", scripts / "start_desk.sh", shared / "launch_agent.sh"):
        f.chmod(0o755)
    env = {**os.environ, "HOME": str(tmp_path)}
    result = subprocess.run([scripts / "start_desk.sh"], env=env, capture_output=True, text=True)
    return result, (log.read_text().splitlines() if log.exists() else None)


def test_no_launch_when_desk_claude_is_live(tmp_path):
    result, args = run(tmp_path, [{"address": "t21", "state": "live"}], {"t21": "claude"})
    assert result.returncode == 0, result.stderr
    assert args is None


def test_launches_when_no_desk(tmp_path):
    result, args = run(tmp_path, [], {})
    assert result.returncode == 0, result.stderr
    assert args == ["telegram", "claude", "telegram", "Start up per AGENTS.md.", "--permission-mode", "auto"]


def test_launches_when_desk_terminal_fell_back_to_a_shell(tmp_path):
    terminals = [{"address": "t21", "state": "live"}, {"address": "t23", "state": "live"}]
    result, args = run(tmp_path, terminals, {"t21": "bash", "t23": "python3"})
    assert result.returncode == 0, result.stderr
    assert args is not None


def test_ignores_claude_elsewhere_and_finished_desks(tmp_path):
    terminals = [{"address": "t5", "state": "live", "cwd": "/elsewhere"}, {"address": "t21", "state": "finished"}]
    result, args = run(tmp_path, terminals, {"t5": "claude", "t21": "claude"})
    assert result.returncode == 0, result.stderr
    assert args is not None


def test_no_launch_when_hc_ls_fails(tmp_path):
    result, args = run(tmp_path, [], {}, ls_fails=True)
    assert result.returncode != 0
    assert args is None
