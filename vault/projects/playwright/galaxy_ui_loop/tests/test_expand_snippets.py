"""Run with: uv run --no-project --with pytest python -m pytest tests/test_expand_snippets.py"""

import pytest

from expand_snippets import expand

FAQ = """---
title: Renaming a history
area: histories
---

1. Click the pencil icon
2. Type the new name
"""


@pytest.fixture
def gtn(tmp_path):
    (tmp_path / "faqs" / "galaxy").mkdir(parents=True)
    (tmp_path / "faqs" / "galaxy" / "histories_rename.md").write_text(FAQ)
    return tmp_path


def test_snippet_is_replaced_by_titled_body_without_frontmatter(gtn):
    assert expand("before\n{% snippet faqs/galaxy/histories_rename.md %}\nafter\n", gtn) == (
        "before\n**Renaming a history**\n\n1. Click the pencil icon\n2. Type the new name\nafter\n"
    )


def test_snippet_inside_a_box_keeps_the_line_prefix(gtn):
    assert expand(">    {% snippet faqs/galaxy/histories_rename.md %}\n", gtn) == (
        ">    **Renaming a history**\n>\n>    1. Click the pencil icon\n>    2. Type the new name\n"
    )


def test_missing_snippet_fails(gtn):
    with pytest.raises(FileNotFoundError):
        expand("{% snippet faqs/galaxy/nope.md %}\n", gtn)
