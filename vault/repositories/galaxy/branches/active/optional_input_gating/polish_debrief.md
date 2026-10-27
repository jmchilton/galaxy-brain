Hardened (with John's approved scope expansion) and polished `optional_input_gating` to 5 commits at `8b049f90c33`; the description, titles and labels are written and wait for John's final review.

# optional_input_gating — polish debrief (2026-10-27)

## Before polishing

- Rebased onto `dev` (`a9a68082414`) after the parent `dangling_when_lint` merged as #24107. Resolved a conflict in `workflowStepStore.ts`: kept dev's unconnected gate ports, and the branch's source-shaped probe ports now reuse `gatePort`. Fixed 2 `FormConditional` tests whose ids shifted with dev's `FormSelection`.
- Hardening ran in full. Debriefs: [test challenges](test_challenges_debrief.md), [E2E polish](polish_e2e_tests_debrief.md), [Codex review](codex_review.md), [thermo-nuclear](thermo_nuclear_review.md), [baseline refactor](baseline_refactor.md), [scope evaluation](scope_evaluation.md), [scope expansion](scope_expansion_debrief.md), [screenshots](screenshot_debrief.md).
- The scope evaluation recommended generalizing the orphaned-connection cleanup to every `when` change. John approved the expansion.

## Polish steps

1. **CI.** Fork CI was pending on `b158809f396`, with no failures yet. Later heads haven't been checked.
2. **Checklists.** GENERAL and WORKFLOW_RELATED both apply ([review 1](subagents/checklist_review.md)).
   - The one failure was the pick-value Selenium helper rewrite inside the feature commit. It is now its own leading commit 1, and the final tree was unchanged apart from a test-comment wording fix.
3. **Description.** Rewritten from scratch; the old draft was stale. It leads with the IWC virology workaround and screenshots, then highlights the likely misreadings.
4. **Strengthening** ([review](subagents/strengthen_review.md), [applied](strengthen_debrief.md)):
   - added an ungated negative framework fixture;
   - gate-specific drop reasons;
   - a collection gating test;
   - screenshot retakes, plus a new mid-drag preview shot;
   - a `FormConditional` test fold.
   - Description fixes: the workaround claim was wrong, the IWC count is 186 not 184, the "every test fails on dev" claim was false, and four highlights were added.
5. **Recheck** ([review 2](subagents/checklist_review_2.md)) found that the new drop reasons had replaced dev's "Cannot connect an optional output…" text. They're now appended to it instead.
   - Red→green: 2 NodeInput tests fail against the previous `terminals.ts` and pass after.
   - "No presence gate can be written…" was reworded to "Galaxy can't write a condition for this input."
   - An overstated Selenium comment was softened.
6. **Galaxy check.** `make format` made no changes. mypy on the changed Selenium file shows only the missing-annotation errors `dev` already has.
7. **Titles and labels:** [titles](pr_titles.md), [labels](pr_tags.md) (`kind/feature`, `area/workflows/editor`).

## Final state

Commits on `dev` `a9a68082414`:

1. `b48099d525a` pick-value test helper cleanup
2. `37626a463fb` shared step-output helpers (refactor)
3. `51135b468c7` drop connections orphaned when a step's condition changes (fix for a bug on dev)
4. `e669ab80a52` baseline framework tests (pass on dev), including the ungated control
5. `8b049f90c33` the feature

Verification:

- vitest (stores, Workflow Editor, Form) 1153 passed; `vue-tsc` clean.
- 6 framework workflow tests passed.
- Gate, drop and twin E2E tests passed on Playwright at `d30e97407ec`. The last amend changed only tooltip text and a comment.
- Selenium was not run locally.

```
created .../differential-review/snapshots/20261027T210159Z-polishing-8b049f90c337.json
  polishing @ 8b049f90c337 vs origin/dev (merge-base a9a68082414f)
  since 20261027T200724Z-hardening-b158809f3964:
    commits: 0 same, 2 rebased, 2 changed, 1 new, 0 dropped
    hunks:   77 carried, 5 changed, 2 new, 0 dropped
```

## Left for John

- `expressionGuardsInputPresence`: keep accepting `unknown` conditions (current behavior, described in the PR), or accept only `false-when-null`.
- Commit 1, the pick-value cleanup: keep it, split it into its own PR, or drop it. The checklist flags it as unrelated.
- Wider follow-ups:
  - a toast when a condition change drops connections;
  - map-over reset in `RemoveStepAction`;
  - splitting commit 3 out for `release_26.2`;
  - an IWC follow-up that removes the virology workflow's two helper steps;
  - passing the `useWorkflowStores` bundle instead of `workflowId`;
  - removing the `presenceGateAssumed` flag.
- The Playwright-only mid-drag preview uses a synthetic `dragenter`, which works around `_drag_hold` firing `dragstart` and `dragenter` in the same tick. The reusable fix is a frame wait in the shared helper.
- The ungated control asserts only `expect_failure`, not the failure message.
- Re-check fork CI on `8b049f90c33` before approval.
