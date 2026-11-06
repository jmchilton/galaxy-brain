from pathlib import Path

import pytest

from prune_tasks import main, prune, run

SUGGESTED = """## Review New PRs

when: daily
expires: pr_closed
what: new PRs

## Respond to Reviews

when: whenever
what: checked boxes
"""
REVIEW = "gx_reviews/SUGGESTED_TASKS.md#Review New PRs"
RESPOND = "gx_reviews/SUGGESTED_TASKS.md#Respond to Reviews"


def pr(n: int) -> str:
    return f"https://github.com/galaxyproject/galaxy/pull/{n}"


def task(n: int, suggested_by: str | None = REVIEW, link: str | None = None, extra: str = "") -> str:
    lines = f"- prompt: Launch a review of galaxyproject/galaxy#{n}\n  agent_dir: gx_reviews\n"
    lines += f"  link: {link or pr(n)}\n{extra}"
    if suggested_by:
        lines += f"  suggested_by: {suggested_by}\n"
    return lines


def block(*tasks: str) -> str:
    return "```gb-tasks\n" + "".join(tasks) + "```\n"


def expires(suggested_by: str) -> bool:
    return suggested_by == REVIEW


def states(**by_number: str):
    return lambda link: by_number.get("n" + link.rsplit("/", 1)[1])


def test_removes_merged_and_closed_keeps_the_rest_byte_for_byte():
    keep = task(2, extra="  description: |\n    🔎 odd   spacing: kept\n\n    second line\n")
    text = "Intro\n\n" + block(task(1), keep, task(3)) + "\nOutro\n"
    new, removed = prune(text, expires, states(n1="MERGED", n2="OPEN", n3="CLOSED"))
    assert new == "Intro\n\n" + block(keep) + "\nOutro\n"
    assert removed == [(pr(1), "MERGED"), (pr(3), "CLOSED")]


def test_keeps_task_from_section_without_expires():
    text = block(task(1, suggested_by=RESPOND))
    assert prune(text, expires, states(n1="MERGED")) == (text, [])


def test_keeps_task_with_no_suggested_by():
    text = block(task(1, suggested_by=None))
    assert prune(text, expires, states(n1="MERGED")) == (text, [])


def test_keeps_task_whose_link_is_not_a_pull_request():
    text = block(task(1, link="https://github.com/galaxyproject/galaxy/issues/1"))
    assert prune(text, expires, lambda link: pytest.fail("should not query")) == (text, [])


def test_keeps_task_when_state_is_unknown():
    text = block(task(1))
    assert prune(text, expires, states()) == (text, [])


def test_removes_snoozed_task():
    text = block(task(1, extra="  snoozed_until: 2099-01-01\n"))
    assert prune(text, expires, states(n1="MERGED")) == (block(), [(pr(1), "MERGED")])


def test_ignores_fields_nested_in_a_description():
    nested = f"  description: |\n    link: {pr(9)}\n    suggested_by: {REVIEW}\n"
    text = block(task(1, suggested_by=None, link="https://example.org/", extra=nested))
    assert prune(text, expires, lambda link: pytest.fail("should not query")) == (text, [])


def test_handles_each_block_and_leaves_tasks_outside_blocks():
    outside = "- prompt: not a task\n  link: " + pr(1) + "\n"
    text = outside + block(task(1)) + "Between\n" + block(task(2))
    new, removed = prune(text, expires, states(n1="MERGED", n2="MERGED"))
    assert new == outside + block() + "Between\n" + block()
    assert len(removed) == 2


def test_reads_quoted_values():
    text = block(f'- prompt: x\n  agent_dir: a\n  link: "{pr(1)}"\n  suggested_by: "{REVIEW}"\n')
    assert prune(text, expires, states(n1="MERGED")) == (block(), [(pr(1), "MERGED")])


@pytest.fixture
def agents(tmp_path: Path) -> Path:
    (tmp_path / "gx_reviews").mkdir()
    (tmp_path / "gx_reviews" / "SUGGESTED_TASKS.md").write_text(SUGGESTED)
    return tmp_path


def test_run_reads_expires_from_the_tasks_own_section(agents: Path):
    tasks = agents / "gx_reviews" / "TASKS.md"
    tasks.write_text(block(task(1), task(2, suggested_by=RESPOND), task(3, suggested_by="gone/SUGGESTED_TASKS.md#Nope")))
    removed = run(tasks, agents, lambda link: "MERGED")
    assert removed == [(pr(1), "MERGED")]
    assert tasks.read_text() == block(task(2, suggested_by=RESPOND), task(3, suggested_by="gone/SUGGESTED_TASKS.md#Nope"))


def test_run_keeps_edits_made_during_the_github_queries(agents: Path):
    tasks = agents / "gx_reviews" / "TASKS.md"
    tasks.write_text(block(task(1), task(2)))

    def john_removes_task_2(link: str) -> str:
        tasks.write_text(block(task(1)))
        return "OPEN" if link == pr(2) else "MERGED"

    run(tasks, agents, john_removes_task_2)
    assert tasks.read_text() == block()


def test_run_leaves_an_unchanged_file_unwritten(agents: Path):
    tasks = agents / "gx_reviews" / "TASKS.md"
    tasks.write_text(block(task(1)))
    before = tasks.stat().st_mtime_ns
    assert run(tasks, agents, lambda link: "OPEN") == []
    assert tasks.stat().st_mtime_ns == before


def test_main_accepts_an_agent_dir_with_no_tasks_file(agents: Path, capsys):
    assert main([str(agents / "gx_reviews")]) == 0
    assert capsys.readouterr().out == ""
