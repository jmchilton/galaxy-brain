# Implementation debrief

```
created .../tool_security_runtime/differential-review/snapshots/20261128T011551Z-revision-ac59cad33906.json
  revision @ ac59cad33906 vs tool_security_static_findings (merge-base 590a784bd040)
  since 20261127T222503Z-revision-d097f9086864:
    commits: 0 same, 8 rebased, 2 changed, 5 new, 0 dropped
    hunks:   112 carried, 12 changed, 16 new, 1 dropped
```

(The "new" and "changed" commits include the 2026-11-27 re-sync, which had no snapshot of its own.)

**STATUS: BLOCKED on the defaults decision, as before.** This revision (John, 2026-11-27: leave interactive and CWL tools out) is done and pushed. Head `ac59cad3390` on `jmchilton/tool_security_runtime` (was `4b200abef4e`). The earlier debrief is `earlier_drafts/3/implementation_debrief.md`; everything in it still holds except where this revision changes it.

## Shared commit S''

S'' is `5a893ddceb2` (was `e04753dca51`), on branch 1 `590a784bd04`, byte-identical in `tool_patches_static_findings`. It adds to `galaxy.tools.security_refusal`:
- `review_exclusion(path, tool_type, *, patched=False) -> str | None`: why the reviews leave a tool out. The answer is "it is one of Galaxy's own tools", "it is an interactive tool" or "it is a CWL tool", else None.
- `built_tool_type(tool_source)`: the `tool_type` of the class Galaxy builds a source as. It uses `galaxy.tools.tool_class_for_source()`, which is factored out of `create_tool_from_source` with no behaviour change.

Tests: the interactive tools on dev, CWL, a `<type>` override in both directions, YAML, the entry-points lookalike, and patched tools.

## This branch

- **`625cafee849` Leave interactive and CWL tools out of the job-preparation review.**
  - `reviewed_tool_source()` and `ToolSecurityReviewer.review()` skip every tool `review_exclusion(tool_file(tool), tool.tool_type)` leaves out. That covers both the review and the per-job value check, at every level and every `when_unsure`. Galaxy logs why once per reviewer and tool.
  - It reads `Tool.tool_type` because the loaded tool's XML source has dropped its tree. `Tool.tool_type` is the type of the class Galaxy built, so this agrees exactly with branch 4's `built_tool_type()`.
  - The admin doc and both option descriptions (`tool_security_review`, `tool_security_review_when_unsure`) say interactive and CWL tools are not reviewed, and why. As before on this branch, only `config_schema.yml` is edited; `galaxy.yml.sample` and `galaxy_options.rst` were never regenerated here.
  - Effect: jobs of interactive tools are no longer checked. CWL tools never reach job preparation, because Galaxy raises `ToolLoadError` for them, so their exclusion here is for when runtime support lands.
- **`ac59cad3390` Challenge exclusion tests.** The interactive test and the lookalike test are one test: the same template and values, with only the tool type different.

## Reviews and challenges

- **Normal review.** It agreed that branch 3's `Tool.tool_type` is right, and found the shared docstring and branch 4's input did not match it. That is fixed in S'' with `built_tool_type()`. Applied from this review:
  - the comment wording;
  - dropping a CWL test that set an impossible `tool_type`;
  - "may get the user's API key";
  - the docs' log sentence, which now names only the tools that are logged;
  - "Galaxy does not run CWL tools yet".

  Following the security-reports policy, there is no review debrief in `subagents/` for this round.
- **Test challenges.** See `test_challenges_debrief.md`; the old one is in `earlier_drafts/3/`. Its shared-commit recommendations are applied to S''.

## Tests (final head)

- **Unit:** 3798 passed, 2 xpassed. The suites are `test/unit/tool_util/security`, `test_security_review.py`, `test_security_review_spec.py`, `test_cached_tool.py`, `test_security_refusal.py`, `test_pulsar_runner.py`, `test_prepare_refusals.py` and `test_toolbox.py`.
- **Lint:** ruff, black and isort are clean on the changed files. mypy shows no new errors on the changed library lines.
- **Integration, alone under the lock:** `test_tool_security_review.py`, 11 of 11.
- **API:** `test_upload_posix_newline_fixes_by_default` and `test_libraries.py::TestLibrariesApi::test_create_dataset` both pass.
- **Merge check:** `git merge-tree` with `tool_patches_static_findings` conflicts only in `doc/source/admin/tool_security_review.md`.

## Decisions for John

1. **Remaining default refusals (the BLOCKED reason), unchanged.**
2. **Interactive tool trust.** With `interactivetools_enable` on, every tool Galaxy builds as an interactive tool skips the job check, Tool Shed tools included. A private report covers what that now lets through. Please read it before landing.
3. Items 2 to 4 of `earlier_drafts/3/implementation_debrief.md` are unchanged. One of them is passing `patched=` once tool patches exist here. `review_exclusion` takes it as well.
