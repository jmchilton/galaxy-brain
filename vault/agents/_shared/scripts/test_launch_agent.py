"""launch_agent.sh's `hc run` call, against stub hc and herdr-app binaries."""

import os
import re
import subprocess
from pathlib import Path

SCRIPT = Path(__file__).with_name("launch_agent.sh")
VAULT = SCRIPT.parents[3]


def run_launch(tmp_path, prompt, *flags, kind="claude"):
    """The finished run and the stub's `hc run` arguments (None if it didn't run); `hc exec` runs here, git skipped."""
    log = tmp_path / "run.log"
    bin_dir = tmp_path / ".local" / "bin"
    bin_dir.mkdir(parents=True)
    hc = bin_dir / "hc"
    hc.write_text(
        "#!/bin/sh\n"
        'if [ "$1" = exec ]; then shift 3; [ "$1" = git ] && exit 0; exec "$@"; fi\n'
        '[ "$1" = run ] || { echo "{}"; exit 0; }\n'
        f'printf \'%s\\n\' "$@" > {log}\n'
        "echo '{\"address\":\"t9\"}'\n"
    )
    (bin_dir / "herdr-app").write_text("#!/bin/sh\nexit 0\n")
    hc.chmod(0o755)
    (bin_dir / "herdr-app").chmod(0o755)
    env = {**os.environ, "HOME": str(tmp_path), "GB_HERDR": "app"}
    result = subprocess.run([SCRIPT, *flags, "factory", kind, "probe", prompt], env=env, capture_output=True, text=True)
    return result, (log.read_text().splitlines() if log.exists() else None)


def launch(tmp_path, prompt):
    """The arguments of the stub's `hc run` for a launch with this prompt."""
    result, args = run_launch(tmp_path, prompt)
    assert result.returncode == 0, result.stderr
    return args


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


def test_require_starts_nothing_without_the_path(tmp_path):
    result, args = run_launch(tmp_path, "x", "--require", "repositories/nope/missing")
    assert result.returncode == 2
    assert "repositories/nope/missing isn't in" in result.stderr
    assert args is None


def test_require_launches_when_the_path_is_there(tmp_path):
    result, args = run_launch(tmp_path, "x", "--require", "agents/_shared")
    assert result.returncode == 0, result.stderr
    assert args[-1] == "x"


def test_require_checks_the_hosts_vault_after_its_pull(tmp_path):
    result, args = run_launch(tmp_path, "x", "--host", "box", "--vault", str(VAULT), "--require", "repositories/nope/missing")
    assert result.returncode == 2
    assert "isn't in" in result.stderr and "on box" in result.stderr
    assert args is None
    result, args = run_launch(tmp_path / "again", "x", "--host", "box", "--vault", str(VAULT), "--require", "agents/_shared")
    assert result.returncode == 0, result.stderr
    assert args[args.index("--on") + 1] == "box"


def agent_command(args):
    """The command after `--`, past the env-cleaning `sh -c` prefix."""
    command = args[args.index("--") + 1 :]
    assert command[:2] == ["sh", "-c"] and command[3] == "sh", command
    return command[2], command[4:]


def test_codex_skips_the_shared_daemon(tmp_path):
    """The daemon's env would point hooks at whichever terminal started it."""
    result, args = run_launch(tmp_path, "x", kind="codex")
    assert result.returncode == 0, result.stderr
    assert agent_command(args)[1] == ["codex", "--no-daemon", "x"]


def test_claude_gets_no_daemon_flag(tmp_path):
    result, args = run_launch(tmp_path, "x")
    assert result.returncode == 0, result.stderr
    assert agent_command(args)[1] == ["claude", "x"]


def test_agents_start_without_claude_session_env(tmp_path):
    """An hc core started from a Claude shell would turn off launched Claude's transcripts."""
    result, args = run_launch(tmp_path, "x")
    assert result.returncode == 0, result.stderr
    script, _ = agent_command(args)
    env = {**os.environ, "CLAUDE_CODE_CHILD_SESSION": "1", "CLAUDECODE": "1", "CLAUDE_EFFORT": "max", "KEEP_ME": "yes"}
    out = subprocess.run(["sh", "-c", script, "sh", "env"], env=env, capture_output=True, text=True, check=True).stdout
    assert "KEEP_ME=yes" in out
    assert [line for line in out.splitlines() if line.startswith("CLAUDE")] == []
