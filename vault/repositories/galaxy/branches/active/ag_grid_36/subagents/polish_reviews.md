# Polish reviews — 2026-10-27

Restored swap E2E coverage using a stable button hook, then completed the one strengthening round. No scope expansion was requested or applied. Human-read checklist item remains for John.

## Checklist review

Fresh review of `origin/dev...be137af455e` found no code blocker, but caught upstream removal of the title-based swap step in `71bfc69c498`. Added `data-description` to the swap button, restored the navigation selector and click, and asserted reversed dataset names in the saved collection. A second checklist pass approved the code and coverage design pending E2E; that E2E subsequently passed.

<details><summary>Checklist evidence</summary>

- Human read every test/comment: unchecked for John.
- Failure experience: lost edit/swap write-back can silently change submitted data; missing model objects leave identifiers blank or prevent sheet creation.
- Unrelated/stale generated changes: Yes!
- Behavioral tests: real-grid identifier/model-object preservation, component validation, and E2E submitted results.
- Baseline: generic editing helper and import/rename E2E already upstream; v31-compatible cleanup leads the branch.
- Comments: obsolete registry archaeology and dead RuleGrid code removed; remaining comments explain active row-copy, compatibility and legacy-theme constraints.
- Workflow behavior: no intended scheduler, mapping or serialization changes; sample-sheet entry retains existing behavior.
- Audience/evidence: data-landing, collection-builder, sample-sheet and rule-grid users, supported by real-grid unit tests, E2E and hardening comparisons.
- Alternatives: retaining v31, splitting cleanup/tests, shared grid component and Theming API evaluated in scope notes.
- Follow-up review: the hook passes through GButton's `$attrs`, so it does not depend on development-only title behavior. The test checks saved orientation rather than internal state.

</details>

## Strengthening review

No further development recommended beyond completing the restored E2E. Applied both wording tasks: state preserved user-facing behavior directly in the highlighted scope sentence, and include current validation results in the description with a debrief link.

<details><summary>Likely misreadings</summary>

The highlighted optional-upgrade sentence answers an urgent-CVE-fix interpretation. The highlighted preservation sentence answers a new-grid-UI interpretation. The risk section distinguishes workflow sample-sheet entry from scheduling, mapping and serialization. A wrapper refactor, Theming API migration or another sample-sheet E2E would broaden the work without strengthening this pitch enough to justify it.

</details>
