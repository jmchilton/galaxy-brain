# issue_23891_output_reference_resolver — implementation debrief (re-harden, 2026-10-27)

**STATUS: READY.** Fixes galaxyproject/galaxy#23891. The branch is at `jmchilton/issue_23891_output_reference_resolver` @ `bc6d953af2c`, nine commits on `origin/dev` (`a9a68082414`). The earlier debrief is in `earlier_drafts/1/`.

## What happened in this re-harden
- **Rebase:** rebased cleanly onto `origin/dev`; the branch had been 2150 commits behind. The unit tests passed afterwards.
- **Round 1 hardening** (debriefs in `earlier_drafts/2/`):
  - The test challenge trimmed two comments.
  - Codex found a real load crash: a tool with a `value_from` conditional (as in `upload.xml`) plus any `format_source`/`metadata_source` output hit an `AssertionError`. I fixed it with a red→green test.
  - The thermo-nuclear review built the resolver once and flattened `_visit`.
  - The baseline refactor split out a pure refactor commit, `0858c00a9e9`, that moves the linter walker into `tool_util/parser/output_references.py` as `InputReferences`.
- **Rescope (EXPAND):** added `OutputsMetadataSourceReference` (`886d8ffd327`). It uses the same `_check_output_reference` path and rules as format_source, so every reference that fails at 26.2 load is now linted first.
  - The pre-rescope branch is kept as the alt `..._alt_original_scope`.
  - The normal review found no bugs. Details: `implementation_rescope_debrief.md`, `subagents/rescope_review.md`.
- **Round 2 hardening** (current debriefs):
  - Test challenge: no change.
  - Codex: no change; every finding is an open policy question or was already true on dev.
  - Thermo-nuclear: `resolve()` cleanup and comment trims.
  - Baseline: no change.
  - Scope: **KEEP**.
- **Checks:**
  - `make format` is clean.
  - The 4 unit test files pass (190 tests).
  - mypy, compared with dev on the changed files, shows no new real errors. The only new line is the usual `Linter` "subclass Any" environment noise.
  - I didn't rerun the API or framework tests. No runtime behavior changed since the earlier verified run apart from the `value_from` guard, which has a unit test.

## Snapshot
```
exists .../differential-review/snapshots/20261027T164915Z-hardening-bc6d953af2ce.json
  hardening @ bc6d953af2ce vs origin/dev (merge-base a9a68082414f)
  since 20261027T162528Z-revision-6524c4c38c30:
    commits: 0 same, 2 rebased, 2 changed, 5 new, 0 dropped
```

## Open questions for John
1. **Shadowed legacy alias:** should it be a load error from 26.2? Codex raised it twice, and it isn't a regression. The linter already errors on it.
2. **Mixed-type conditional matches:** they are kept on `any()`. Should 26.2 require `all()`?
3. **YAML tool linting:** the output reference linters are XML-only, same as dev. Make it a follow-up?
4. **PR split:** 1, 2 or 3 PRs (see `scope_evaluation.md`)?
5. **Stale PR description:** `pr_description.md` predates the metadata_source lint and the `value_from` fix, and needs a refresh before the PR opens.
6. **CI:** fork CI hasn't run on `bc6d953af2c`.
