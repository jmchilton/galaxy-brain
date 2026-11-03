"""Tests for pull_screenshots.py: destination resolution and the copy/move plan."""
import os
import subprocess
from pathlib import PurePosixPath

from pull_screenshots import (
    Source,
    apply,
    ignored_screenshots,
    load_hosts,
    plan,
    record_homes,
    resolve,
    stranded,
)

SHOT = "screenshots/a.png"


def make_record(vault, rel):
    record = vault / rel
    record.mkdir(parents=True)
    (record / "index.md").write_text("# record\n")
    return record


def make_file(path, mtime, content="png"):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
    os.utime(path, (mtime, mtime))
    return path


def test_resolve_follows_record_to_current_status(tmp_path):
    make_record(tmp_path, "repositories/galaxy/branches/merged/foo")
    homes = record_homes(tmp_path)
    rel = f"repositories/galaxy/branches/active/foo/earlier_drafts/1/{SHOT}"
    assert resolve(rel, homes) == f"repositories/galaxy/branches/merged/foo/earlier_drafts/1/{SHOT}"


def test_record_homes_ignore_stranded_dirs_without_index(tmp_path):
    make_record(tmp_path, "repositories/galaxy/reviews/active/123")
    make_file(tmp_path / f"repositories/galaxy/reviews/archived/123/{SHOT}", 1)
    assert record_homes(tmp_path) == {("galaxy", "reviews", "123"): PurePosixPath("repositories/galaxy/reviews/active/123")}


def test_resolve_unknown_record_is_none(tmp_path):
    assert resolve(f"repositories/galaxy/branches/active/missing/{SHOT}", {}) is None


def test_resolve_passes_non_record_paths_through():
    for rel in (f"agents/gx_branches/{SHOT}", f"repositories/galaxy/pipeline_runs/2026-10-25-x/run/{SHOT}"):
        assert resolve(rel, {}) == rel


def test_plan_copies_remote_moved_record_into_local_home(tmp_path):
    vault = tmp_path / "vault"
    make_record(vault, "repositories/galaxy/branches/active/foo")
    remote = make_file(tmp_path / f"stage/repositories/galaxy/branches/merged/foo/{SHOT}", 10)
    source = Source(f"repositories/galaxy/branches/merged/foo/{SHOT}", remote, "remote")
    transfers, warnings = plan([source], vault, record_homes(vault))
    assert transfers == [(source, f"repositories/galaxy/branches/active/foo/{SHOT}")]
    assert warnings == []


def test_plan_newest_source_wins_for_same_destination(tmp_path):
    vault = tmp_path / "vault"
    make_record(vault, "repositories/galaxy/branches/merged/foo")
    old = make_file(tmp_path / f"stage/repositories/galaxy/branches/active/foo/{SHOT}", 10)
    new = make_file(tmp_path / f"stage/repositories/galaxy/branches/merged/foo/{SHOT}", 20)
    sources = [
        Source(f"repositories/galaxy/branches/active/foo/{SHOT}", old, "stranded"),
        Source(f"repositories/galaxy/branches/merged/foo/{SHOT}", new, "current"),
    ]
    transfers, _ = plan(sources, vault, record_homes(vault))
    assert [source.label for source, _ in transfers] == ["current"]


def test_plan_keeps_newer_local_copy(tmp_path):
    vault = tmp_path / "vault"
    record = make_record(vault, "repositories/galaxy/branches/active/foo")
    make_file(record / SHOT, 30)
    remote = make_file(tmp_path / f"stage/repositories/galaxy/branches/active/foo/{SHOT}", 20)
    source = Source(f"repositories/galaxy/branches/active/foo/{SHOT}", remote, "remote")
    assert plan([source], vault, record_homes(vault)) == ([], [])


def test_plan_warns_on_unknown_record(tmp_path):
    remote = make_file(tmp_path / f"stage/repositories/galaxy/branches/active/foo/{SHOT}", 20)
    source = Source(f"repositories/galaxy/branches/active/foo/{SHOT}", remote, "remote:foo")
    assert plan([source], tmp_path / "vault", {}) == ([], ["no local record for remote:foo"])


def test_apply_moves_stranded_local_copy_and_prunes_old_dir(tmp_path):
    vault = tmp_path / "vault"
    make_record(vault, "repositories/galaxy/branches/merged/foo")
    make_file(vault / f"repositories/galaxy/branches/active/foo/{SHOT}", 10)
    homes = record_homes(vault)
    local = stranded(vault, [f"repositories/galaxy/branches/active/foo/{SHOT}"], homes)
    transfers, _ = plan(local, vault, homes)
    apply(transfers, vault)
    assert (vault / f"repositories/galaxy/branches/merged/foo/{SHOT}").read_text() == "png"
    assert not (vault / "repositories/galaxy/branches/active").exists()


def test_apply_copies_remote_file_with_mtime(tmp_path):
    vault = tmp_path / "vault"
    remote = make_file(tmp_path / f"stage/agents/gx_branches/{SHOT}", 10)
    apply([(Source(f"agents/gx_branches/{SHOT}", remote, "remote"), f"agents/gx_branches/{SHOT}")], vault)
    assert (vault / f"agents/gx_branches/{SHOT}").stat().st_mtime == 10
    assert remote.exists()


def test_stranded_skips_files_already_home(tmp_path):
    make_record(tmp_path, "repositories/galaxy/branches/active/foo")
    rels = [f"repositories/galaxy/branches/active/foo/{SHOT}", f"agents/gx_branches/{SHOT}"]
    assert stranded(tmp_path, rels, record_homes(tmp_path)) == []


def test_ignored_screenshots_lists_only_ignored_screenshot_files(tmp_path):
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    (tmp_path / ".gitignore").write_text("/vault/**/screenshots/\n/vault/other.log\n")
    vault = tmp_path / "vault"
    make_file(vault / f"agents/x/{SHOT}", 1)
    make_file(vault / "other.log", 1)
    make_file(vault / "agents/x/notes.md", 1)
    assert ignored_screenshots(vault) == [f"agents/x/{SHOT}"]


def test_load_hosts_skips_local_environments(tmp_path):
    path = tmp_path / "ENVIRONMENTS.yml"
    path.write_text("environments:\n  - name: Local\n  - name: remote\n    host: box\n    vault: /v\n")
    assert load_hosts(path) == [("box", "/v")]
