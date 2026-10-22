# foundry#657 — planemo-asserts-idioms: has_line_matching anchoring, has_n_columns first line

Issue: https://github.com/galaxyproject/foundry/issues/657 (scottcain, AI-posted, `needs-triage`)
Branch: `issue-657-assert-semantics` on `origin`, worktree `~/projects/worktrees/foundry/branch/issue-657`, commit `e32b8775` on `47aa5c1c`.
PR body: [pr_description.md](pr_description.md) (not opened).

## Triage (2026-10-21)

Both claims verified in galaxy `v26.1.1`:

- `asserts/text.py:165-166`: `has_line_matching` = `re.findall(f"^{e}$", o, re.MULTILINE)`; `has_text_matching`
  (`:137-138`) = bare `re.search`/`re.findall`.
- `asserts/tabular.py:60-61`: `has_n_columns` splits only the first non-comment line (docstring says so).
- Note said neither (section 1 table rows 30-31, section 4).

## Fix

Section 4: anchoring + `I\t.*` example; `has_n_columns` first-line + ragged R matrix + data-row-width regex.
Table row → "checks the first line's width (see section 4)". Revision 10, 8 casts + Dashboard.
Examples run against galaxy-tool-util 26.1.1 functions via `uv run --with` (all as documented).

Not done: Scott's note-wide "say what each family measures" framing (vague; per-family fixes cover it);
upstream Galaxy docstring for `has_line_matching` (source of the identical schema descriptions) could
mention the anchoring — possible small Galaxy PR.
- Galaxy docs request queued: [gx_issues/to_file/assert_line_matching_anchoring_docs.md](../../../agents/gx_issues/to_file/assert_line_matching_anchoring_docs.md)
