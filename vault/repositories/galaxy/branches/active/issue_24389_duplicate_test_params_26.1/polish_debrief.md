# Polish debrief

Polished 2026-10-25 at head `60607462357`. The branch wasn't changed; only the description was written and tightened.

## Steps

1. **CI.** Fork CI on `60607462357` was mostly still queued. Python linting was green and there were no reds. The earlier run on `f8761cc62c4` was cancelled (superseded).
2. **Checklist.** I used `GENERAL.md` only, since the branch doesn't touch workflows. A fresh subagent checked every item against the diff, and all pass. The human-read item is left unchecked.
3. **Description.** The "show" is a before/after for the cutadapt shape. On a `df713519127` temporary worktree the lint is silent and the test runs with `CTGTCTCTTATA`; at head it's a `TestsCaseValidation` ERROR and a load error. I ran it with the main clone's venv, `PYTHONPATH=<tree>/lib`.
4. **Strengthening.** A fresh subagent suggested 5 changes; I applied 4 to the description only:
   - "kept the last" now applies to repeats only. At top level, base kept the first.
   - The rejection is described as the same check as the unqualified case (`_resolve_matching_inputs`); the message text is new.
   - The `edit_attributes` reach is stated: since #18560 (24.2) `test_data` 500s and `galaxy-tool-test`/`planemo test` can't fetch tests, but no tools-iuc or functional test tool uses the tag.
   - New bold+italic lines say: no runtime change below 24.2; only test parsing changes, not tools, the form or the XSD; how IUC tools fix it.
   - Not applied: claim the side fix for identical *unqualified* composite duplicates (false "Ambiguous" on base, per `scope_evaluation.md`). There's no dedicated test, so the description doesn't claim it.
5. **Check Galaxy.** isort and black are clean on the 5 touched files. mypy matches base (15 pre-existing errors, none new). `ruff` isn't in the main venv, but pre-commit ran it during hardening.
6. **Titles/tags.** I wrote [pr_titles.md](pr_titles.md) with a `[26.1]` prefix. [pr_tags.md](pr_tags.md) has `kind/bug` and `area/tool-framework`, and drops the labeler's `area/testing`.

## Left for John

- Read every test and comment (checklist item).
- Decide whether erroring at load is acceptable on a 26.1 point release, given sourmash sketch and isoformswitchanalyzer.
- Optional: a red-to-green test for the unqualified composite duplicate side fix, so the PR can claim it.
- Fork CI on `60607462357` hadn't settled when polishing finished.
