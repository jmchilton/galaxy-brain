# Implementation debrief: issue_24350_has_line_matching_docs_26_1

**STATUS: BLOCKED, parked on a scope decision.** The work is complete and hardened at head `c566eeb1d53` (base `release_26.1`). The second scope evaluation recommended another modest expansion. CLAUDE.md says to park rather than re-scope twice, so John needs to decide the scope.

```
created .../differential-review/snapshots/20261101T150730Z-hardening-c566eeb1d53a.json
  hardening @ c566eeb1d53a vs origin/release_26.1 (merge-base 32f18adbdd1c)
  since 20261101T150236Z-implementation-c566eeb1d53a:
    commits: 10 same, 0 rebased, 0 changed, 0 new, 0 dropped
    hunks:   36 carried, 0 changed, 0 new, 0 dropped
```

## What the branch does (#24350)

1. **Baseline tests** (`f12e7955aec` and its fixups). Two parametrized tests in `test_asserts.py` pin current behavior: `has_line_matching` anchoring (prefix vs `.*`, and the ungrouped-alternation leak) and `has_text_matching`'s unanchored, whole-output `^`.
2. **Docs** (`40db279e2bf` and its fixups). Split the shared `Expression` into `TextExpression`/`LineExpression`. Docstrings explain `^(?:expression)$` in multiline mode, `.*` for prefixes, matches that can span lines via `\s`, and `has_text_matching`'s unanchored search and `(?m)`.
3. **Behavior fix** (`16cfad00004`, from the re-scope). Wrap as `^(?:{e})$`, so `foo|xbar` no longer counts `foo 1`. Two baseline cases flip from 2 and 3 to 0.
4. **Docs** (`961b6d0450e` and its fixup, from the re-scope). Fix the `element_text_matches`/`attribute_matches` expression text (unanchored search) and add a `has_n_columns` header-width note.

`galaxy.xsd`, `tool_util_models/assertions.py`, `client/packages/api-client/src/schema/schema.ts` and `client/src/components/Tool/ToolSourceSchema.json` are regenerated in each commit.

## Decisions for John

1. **Scope.** There are three options:
   - **(A)** Ship as is. This includes the `^(?:e)$` behavior change on a release branch.
   - **(B)** Also fold in the `element_text_is`/`attribute_is` missing-`^` fix. This is the second scope evaluation's recommendation (`scope_evaluation.md`). `re.escape(text) + "$"` lets `text="blastp"` pass on `xblastp`. The fix is two one-line changes plus tests. `attribute_is` has no unit tests yet. One existing test message changes, and pretty-printed XML with leading whitespace would start failing.
   - **(C)** Contract to the docs-only alt `issue_24350_has_line_matching_docs_26_1_alt_original_scope` (`alts/original_scope.md`).
   If not (B), the `*_is` bug should be queued as its own issue.
2. **Behavior change on a release branch.** The corpus check (`earlier_drafts/1/scope_evaluation.md`) found about 1,050 `has_line_matching` uses. Only 3 have a top-level `|`, and all are accidental unescaped `gi|…` IDs that pass vacuously today. After the fix, 2 live bgruening/galaxytools tests (`tRNAscan.xml`, `aragorn.xml`) and 1 deprecated IUC tool would fail. Consider a courtesy galaxytools PR. The PR body needs a behavior-change note and a migration hint (escape a literal `|` as `\|`), plus the `kind/bug` label.
3. **Target.** `release_26.1` is the oldest release whose client artifacts carry these docs. `release_25.1` has the bug, but only in the XSD and models.

## Polish-time notes

- **Autosquash needed.** The first hardening rebase was blocked from force-pushing, so the history has 6 `fixup!` commits. Run `git rebase --autosquash origin/release_26.1` and force-push.
- **Reword `40db279e2bf`.** Its message mentions grouping alternatives by hand, which `16cfad00004` then removes. Reword it while squashing, or move the fix ahead of it; that move conflicts in all the artifacts.
- **Regeneration needs `xmllint`.** `codegen.py` needs `xmllint` (`/home/ubuntu/miniforge3/bin`) and `.venv/bin` on PATH. Without it, the XSD is left half-rewritten.
- **Local pytest flag.** Local pytest needs `-p no:postgresql` (libpq is missing).

## Reviews and validation that still apply

The branch was not changed after the second hardening pass, so all of these hold at `c566eeb1d53`:

- normal review (`subagents/normal_review.md`);
- re-scope review (`subagents/rescope_review.md`);
- test challenges (`test_challenges_debrief.md`). Baseline cases pass on `release_26.1`, and the flipped cases fail without `16cfad00004`;
- Codex (`codex_review.md`). One P2 about `$` before a final newline was not acted on, as standard Python semantics;
- thermo-nuclear (`thermo_nuclear_review.md`): nothing to act on;
- baseline refactor (`baseline_refactor.md`): none;
- branch checks: `test_asserts.py` and `test_assertion_models.py` pass. ruff, black, isort and prettier are clean. mypy shows no new errors; the 6 it reports are pre-existing on the base.

Screenshots were skipped because there is no UI change, only generated schema description text.

**What remains if (B) is chosen:** add baseline `*_is` tests and the fix, regenerate nothing (the docstrings already promise exact match), then run a normal review and a fresh test challenge. CI has not run yet.
