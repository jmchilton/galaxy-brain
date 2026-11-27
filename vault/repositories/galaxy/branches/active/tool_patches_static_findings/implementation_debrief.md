# Implementation debrief

```
exists .../tool_patches_static_findings/differential-review/snapshots/20261127T222331Z-revision-dacf77a87c6f.json
  revision @ dacf77a87c6f vs tool_security_static_findings (merge-base 53559de55d06)
  since 20261126T235030Z-revision-60e85e935d25:
    commits: 0 same, 31 rebased, 16 changed, 3 new, 3 dropped
    hunks:   91 carried, 26 changed, 14 new, 5 dropped
```

**STATUS: BLOCKED on the same scope decision as before**, the capability-findings switch. This revision is done and pushed. The head is `dacf77a87c6` on `jmchilton/tool_patches_static_findings`, which was `4f54ef8c934`. The earlier debrief is `earlier_drafts/4/implementation_debrief.md`. Everything in it still holds except where this revision changes it.

## Shared plumbing with branch 3 (John, 2026-11-27)

The branch was rebuilt on shared commit S, `5659a4db4a4`. S sits on branch 1 `53559de55d0` and is identical in `tool_security_runtime`. The merge base of the two branches is S. S contains:
- `galaxy.tools.security_refusal`: `ToolInputRejected` with `Iterable[str]` codes, and `is_galaxy_own_tool(path, *, patched=False)`. It also holds the upload helpers and `tool_file()`.
- `PREPARE_REFUSALS` in `galaxy.jobs.runners`. With it, the base runner and Pulsar both fail a refused job at once, with no resubmission.
- `Tool.stored_source_path`.
- Tests in `test_security_refusal.py`, `test/unit/app/jobs/test_prepare_refusals.py` and the parametrized Pulsar test.

Changes to this branch:
- **Rename.** `galaxy.tools.security_review` becomes `galaxy.tools.static_findings`. The rename is folded into every commit that created or changed it, and the importers follow in each commit.
- **Refusal code.** `codes.py` and its commit are dropped. The one code is `STATIC_FINDINGS = "static-findings"` in `tool_util/security/refusal.py`.
- **Shared pieces.** The branch's own `ToolInputRejected`, upload helpers and runner hunks are gone. S provides them.
- **Exempt set.** `reviews_tool()` is now `refusals on and not is_galaxy_own_tool(path, patched=<a patch applied>)`. The exempt tools are only upload1, set metadata, data fetch and history import/export. This replaces the `lib/galaxy` directory rule.
  - **Newly reviewed tools.** The rule change means these are now reviewed:
    - every bundled stock tool in an installed package;
    - in every layout, the converters, the collection operations, the sample sheet tools and the spec tools.
  - **What is refused.** The review subagent ran the analyser on these. No collection operation, sample sheet tool or converter has a finding at medium or above, so none of them is refused even at `medium`. At the default `high`, 26 bundled stock tools are refused. This is intended, and `stock_tools_review_clean` addresses it.
  - **Logging.** Galaxy logs at `INFO` each of its own tools that it loads and leaves out.
- **Judge removal.** The judge scaffolding is gone (`d39ed72a274` dropped). That covers the `replace(before)` copy, `_RecordingJudge`, both `--judge` CLI tests, the `Assessment` imports, the `--judge` help and docs wording, and the `assessment` printing a conflict had brought back. Nothing mutates a `Report` after it is built, so `after = before` is safe.
- **Docs and config.** They now say why each of Galaxy's own tools is exempt (each writes values Galaxy sets itself), and at which severity each would otherwise be refused. They also say that tool patches can name only upload1: the patch engine refuses `__`-prefixed keys.

Commits:
- There are 49 commits after branch 1 (S plus 48), down from 50 before.
- The patch engine and CLI commits are unchanged apart from conflict fixes for the judge removal.
- Commit order within the branch:
  - The "Baseline tests" commit is still the first of the branch's own commits, but it now follows S. S must stay identical in both branches.
  - The intermediate refusal commits keep the old exempt rule until the last feature commit. This only matters for bisecting.

## Reviews and challenges

- **Review** (`subagents/review_shared_plumbing.md`). It had no MUST-FIX findings and no security issue. I acted on the docs findings: why each tool is exempt, and which tools can be patched. Not acted on: a re-populate on an exempt-rule change within one Galaxy version (the code is unreleased) and the bisect note.
- **Test challenges** (`test_challenges_debrief.md`, regenerated because more than 3 tests changed).
  - Commit `dacf77a87c6` folds the own-tools tests into one, with its load log, and drops a case that also passed under the old rule.
  - I applied its recommendations for S to S: `_real_lib_path(path, tools_dir)`, the runner test moved into a dataclass double, the folded upload path test, and `str(refusal)`.

## Tests (final heads)

- **Unit.** 1582 passed, 2 xpassed. The suites are security, tool patches, static findings refusal, toolbox, cached tool, `source_store`, `tool_source` scripts, job wrapper, Pulsar runner, prepare refusals and security refusal. The 41 S tests and refusal tests pass on the final S.
- **Lint.** ruff, black and isort are clean on every commit's changed files. mypy shows no new errors against the old head.
- **Integration, one at a time under the lock.**
  - `test_tool_static_findings_refusal.py`: 8 of 8 on the final head.
  - `test_tool_patches.py`: 12 of 12, run before the last S test-only amendments.
- **API.** `test_tools_upload.py::TestToolsUpload::test_upload_posix_newline_fixes_by_default` and `test_libraries.py::TestLibrariesApi::test_create_dataset` both pass.
- **Merge check.** `git merge-tree` against `tool_security_runtime` conflicts only in `doc/source/admin/tool_security_review.md`.

## Decisions for John

1. **Scope (the BLOCKED reason).** The capability-findings switch is still open (item 1 of `earlier_drafts/3/implementation_debrief.md`). The review measured 26 stock tools refused at `high`, mostly on capability findings.
2. **After both branches land.** Whichever lands second should pass `patched=` in branch 3's own-tool check too. Otherwise a patched upload1 is exempt from the value check but refused statically here.
3. Items 2 to 4 of `earlier_drafts/4/implementation_debrief.md` (the dismissals plan and the rest) are unchanged. Item 2 there, the `lib/galaxy` patch gap, is resolved by the new rule.
