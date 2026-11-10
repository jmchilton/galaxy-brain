Run via Opus 5.5 at high effort.

The feature's behaviour holds up, but its structure had three linked problems, all in how `next_draft_step` indexes and prints edges: two parallel indexes built by near-identical walkers, a helper fed labels that broke its documented contract, and two separate renderings of the same work item. I fixed all three with one refactor, which leaves output unchanged: gxformat2 `103fc22`, galaxy-tool-util-ts `c2e6868e`. It removes 9 lines from `draft.py` and 4 from `draft-checks.ts`. The validation rule, fixtures, expectations and docs needed no changes, so no sync was run. The synced expectations and the two new fixtures are byte-identical between the worktrees. I don't think the branch should be blocked or re-scoped.

Not acted on:

- **Both files are over 1,000 lines.** `draft.py` went from 1147 to 1187 and `draft-checks.ts` from 1657 to 1705. Neither crossed the line on this branch, and a split is a large refactor the change doesn't need. Follow-up: move next-step and extract into their own modules, in both languages together.
- **Step ordering, the survey's output-source check and the extract cascade still resolve refs against step labels only.** Validation and now the edge index also use input labels. This is pre-existing, and fixing it changes behaviour. I tested the ordering half, which the Codex review left untested. With an input labelled `a/out`, step `a` sourced from `b/out` and step `b` sourced from `a/out`, the draft validates and the phantom edge makes a cycle, so `a` is offered first although `b` feeds it. The guide's "cycles aside" sentence is wrong for this contrived draft. Follow-up.
- **There are two definitions of "has a default".** `_has_default_value` / `hasDefaultValue` require a non-null value, while the extract cascade checks that the key is present (`draft.py` line 934 area, `draft-checks.ts` `"default" in value`). The earlier commit recorded this as deliberate. Unifying them changes extract's behaviour on `default: null`. Follow-up, and John should decide which definition wins.
- **`$link` edges and draft cycles remain follow-ups.** Both are pre-existing and already recorded in `subagents/normal_review.md`. One consequence is that the `consumed by` list misses `$link` refs, so "updating every ref listed" can undercount. None of the 189 real drafts the earlier review checked use `$link`.
- **`iterateMapOrArrayLabeled` is a pre-existing identity wrapper around `iterateOutputs`.** It's a small cleanup, unrelated to this change.
- **The `_walk_draft_validation` branch stays where it is.** It's 5 more lines in a busy function, but that loop already owns `refs`, and moving it would add a wrapper without removing a concept.
- **Shared `in:` edge iteration across ordering, consumers and cascade wasn't extracted.** It would only shorten a two-level loop at each site, and the natural time to do it is the `$link` follow-up, which needs one step-edges helper anyway.

<details><summary>Full review</summary>

Scope: `git diff origin/main...HEAD` in both worktrees at gxformat2 `cdf4ca5` and galaxy-tool-util-ts `7d2edbd2`, weighed against `REVIEW_FOCUS.md`. I formed this view from the diff and surrounding code, then read the earlier debriefs to avoid repeating their follow-ups.

## Findings acted on

### 1. Two parallel indexes for one concept

This was the main structural issue. `_collect_output_refs` and `_collect_step_consumers` (`collectOutputRefs` and `collectStepConsumers`) built the same `step -> port -> set` shape, each with its own resolve-and-insert logic. `_step_work_items` then took both, plus the step label to look them up with, so its parameter count went from 3 to 4. `_next_draft_step_in` had to assemble `known_labels` first, because both collectors needed it. In TS, `addPortRef` shared the insertion, but the concept was still split.

Both indexes answer one question: what references this port? There is now one collector, `_collect_port_edges` / `collectPortEdges`, which takes the workflow, owns the label set and returns `label -> port -> _PortEdges`, where `_PortEdges` has `workflow_outputs` and `consumers`. `_step_work_items` takes the step and that step's own map. `known_labels` no longer appears in `_next_draft_step_in`, and the `step_label` parameter is gone.

### 2. `_split_source_ref` was fed labels that broke its contract

Commit `cdf4ca5` / `7d2edbd2` correctly started resolving against input labels too, but did so by passing them to `_split_source_ref` / `splitSourceRef`, renaming only the local variable. That helper's parameter is `step_labels`, and its docstring says "any other slash-less ref is a workflow-input ref and is reported port-less". With inputs in the set, `reads` came back as `("reads", "output")`, so the docstring was false at those two call sites. It worked only because nothing looks up a non-step label.

The collector now calls `resolve_source_reference` directly, as `check_edge_ref` does, and `_split_source_ref` receives only step labels again. Entries for inputs and unknown labels are still stored but never read, because lookups use step labels and steps win on a shared label. That's the same reason the old code worked, and it now no longer leans on a helper's false docstring.

### 3. One work item rendered two ways

The in side built `"semantic hint: 'x'; "` with a trailing separator and spliced it into a template with hard-coded parentheses. The out side built a list and joined it. The branch introduced the in-side form to fit `sourced from`. Output text is a shared contract, so two templates for one item shape are two chances to drift, in each of two languages.

`_port_work_item` / `portWorkItem` is now the single renderer. `_out_port_edges` / `outPortEdges` builds the out-side edge list beside `_in_port_edges`, and both port loops in `_step_work_items` shrink to two or three lines.

### 4. `_quoted` was wider than its callers

`_quoted` took `Iterable[str]`, and every caller passed a list. In TS that forced a `[...values]` copy, and in Python it added an import. It now takes a list, and the `Iterable` import is gone.

## Reviewed with no change needed

- **The validation rule.** Inputs `{}`, `{source: []}`, `{source: null}`, `{default: null}`, list-form `{id: ...}` and nested subworkflows are all fixture-covered. Falsy defaults (`0`, `false`) count as defaults in both languages (`is not None`, `!= null`).
- **`no source: unwired`.** It only prints on drafts validation rejects, but `next_draft_step` is total on invalid input, so it's reachable and has a test.
- **Tests.** The edits to existing expectations in `next_draft_step.yml` and `draft-checks.test.ts` change expected text to the new wording and don't loosen any assertion. The new declarative tests assert exact strings, which suits a shared-text contract.
- **The survey count.** Leaving it out, as the implementation debrief records, is sound. The issue says "can", and rejecting unwired ports makes a wired/unwired split moot.

## Verification

Differential run, using `gxformat2/examples` and the foundry, foundry-runs and foundry-lib checkouts: 375 draft files, 5,163 work items. (The polish round found this walker stopped at the first step on list-form `steps`, and reran it in full: 51,943 items, 0 differences.) For each file I called `next_draft_step`, removed the offered step and repeated, so that most steps were rendered and not only the first.

- Old Python (`cdf4ca5`) vs new Python: 0 differences in work items and in full `validate_draft` results.
- New Python vs new TS, comparing the same walk's work items: 0 differences.
- Old TS wasn't run in this comparison. The TS old-to-new link rests on the exact-text expectations plus the earlier debrief's Python and TS parity result.

Checks, on the code as committed:

- gxformat2: `pytest` 954 passed, 8 skipped; `ruff check`, `black --check` and `mypy` on `draft.py` are clean.
- galaxy-tool-util-ts: schema build succeeded; schema `vitest` 46 files, 5167 passed, 5 expected fail, 79 skipped; `packages/cli/test/draft-validate.test.ts` 27 passed; `make typecheck`, `make lint`, `make format`, `make check-sync-draft-sentinel` and `pnpm run lint:unused:ci` exit 0.
- `make check` wasn't run, as instructed. Other packages' full test suites, including `integration-tests`, weren't run either; the earlier debrief lists 3 failures there that also occur on `origin/main`.

## Approval bar

No file crossed 1,000 lines on this branch. The added validation branch is small and in the right loop. With the changes above I see no remaining presumptive blocker. The remaining gaps are the pre-existing ones listed under "Not acted on".

</details>

## Differential review snapshot

```text
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy-tool-util-ts/branches/merged/issue_215_draft_port_edges/differential-review/snapshots/20261106T232458Z-hardening-c2e6868e57a4.json
  hardening @ c2e6868e57a4 vs origin/main (merge-base f5470fe5ac3b)
  since 20261106T211735Z-implementation-d447be46e911:
    commits: 2 same, 0 rebased, 0 changed, 2 new, 0 dropped
    hunks:   17 carried, 2 changed, 2 new, 3 dropped
    new     7d2edbd2c762 Resolve port edges against workflow input labels too
    new     c2e6868e57a4 Collect a TODO port's edges in one pass
```

## Differential review snapshot (gxformat2)

```text
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/gxformat2/branches/merged/issue_215_draft_port_edges/differential-review/snapshots/20261106T232459Z-hardening-103fc229aa89.json
  hardening @ 103fc229aa89 vs origin/main (merge-base b0241eee5438)
  since 20261106T211735Z-implementation-735814742d10:
    commits: 2 same, 0 rebased, 0 changed, 2 new, 0 dropped
    hunks:   10 carried, 2 changed, 1 new, 3 dropped
    new     cdf4ca5b2d02 Resolve port edges against workflow input labels too
    new     103fc229aa89 Collect a TODO port's edges in one pass
```
