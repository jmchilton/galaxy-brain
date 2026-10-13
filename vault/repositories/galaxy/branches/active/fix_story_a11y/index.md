# fix_story_a11y

Status: `ready`. Base: `dev`.
PR: [#24046 — Repair accessibility issues across shared controls and forms](https://github.com/galaxyproject/galaxy/pull/24046), opened by John; verified 2026-10-11.
PR base: `dev`; current head: `175e7d5a1831836dd9b360a4cb1dad5e0874fa85`.
Base: upstream `dev` at `b406ead2e4eb55b94d1ba437af8f60ebe4983947` (2026-10-10).
Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/fix_story_a11y`.
Pushed to `jmchilton/fix_story_a11y` at `96bd157af90d51595b5d8f4195d13699bc72846e` on 2026-10-11.

User requested a new dev worktree and subagent repair batches for the accessibility findings from `vitest_story_a11y`. This branch contains production repairs and focused unit regressions, independent of the running migration lanes. All 236 frozen audit stories pass with accessibility checks set to error and no exceptions in the disposable harness. Eight independent Chromium keyboard/focus probes pass.

- [PR description](pr_description.md)
- [PR title options](pr_titles.md)
- [Polish debrief](polish_debrief.md)
- [Independent polish checklist](polish_checklist.md)
- [Single strengthening round](polish_strengthening.md)
- [PR browser CI repair and validation](ci_repair_24046.md)
- [Initial PR browser CI triage](ci_triage_24046.md)
- [Polish CI evidence](ci_polish.md)
- [Repair batches](repair_batches.md)
- [Initial implementation](initial_implementation_debrief.md)
- [Final implementation](implementation_debrief.md)
- [Normal review](normal_review.md)
- [Code quality review](thermo_nuclear_review.md)
- [Test challenge](test_challenges_debrief.md)
- [Scope evaluation](scope_evaluation.md)
- [Screenshot review](screenshot_debrief.md)
- [Reproducible validation](validation/README.md)
- [Forms implementation](subagents/forms_implementation.md)
- [Collections implementation](subagents/collections_implementation.md)
- [Workflow implementation](subagents/workflow_implementation.md)

No PR was opened or GitHub comments/check reruns posted during polishing. John subsequently opened the draft PR; its published description marks the human-read checklist item complete. Fork CI was assessed during polishing: client checks queued, release-script failure diagnosed as unrelated (see CI evidence). Original a11y prototype still retains its todo annotations; this branch repairs dev independently. Production SHA is unchanged.

Polish tracking changes are committed locally on galaxy-brain main. Sync is pending because unrelated outgoing commits would be published by a push; other staged/unstaged work was preserved.

## PR verification — 2026-10-11

Live GitHub state: OPEN, draft, MERGEABLE; review decision unset. CI remains in progress with no failed checks at verification. Upstream client unit/lint checks are running; client API and Tool Shed frontend checks pass. Published title matches the first proposed option, and the published description marks John’s human-read item complete. Queue moved from final review to `ci_wait`; the active record stays in place. No PR settings or comments changed by this verification.

## Related browser CI failure — 2026-10-11

Completed Playwright shard 1 fails on two stale driver assumptions: 46 failed cases plus two setup errors wait for the removed fixed ClickToEdit input ID; one case searches for a caret inside the now-correctly labeled combobox input. CI DOM snapshots confirm the input and enclosing multiselect caret exist. These are test-driver adaptations required by the markup changes, with no user-behavior bug established in this shard. See the linked triage. Moved to `author_work`; no branch edits, test changes, or GitHub posts made during diagnosis.

## Browser-driver repair — 2026-10-11

John requested checking for unpushed work and repairing the related CI failures. No unpushed driver repair existed. Inspected every failed browser-suite log and additional CI DOM snapshots; all observed failures map to fixed-ID, wrapper/combobox, native-button, or folder-opening assumptions in the driver. Updated shared navigation and select helpers, preserving component code and existing test assertions. Sixteen existing live Playwright cases pass (nine application flows, three integration cases, four tool-form harness cases), as do 15 focused component tests and formatting/lint hooks. No app regression was established in those flows.

Pushed `96bd157af90d51595b5d8f4195d13699bc72846e` to the fork; live PR head matches and new CI is queued/running. Moved to `ci_wait`, retaining draft status until CI settles. See [repair evidence](ci_repair_24046.md). No PR description, comments, or review settings changed.

## TICK — 2026-10-12

All 60 prior-head upstream checks settled. Client, Playwright, integration-Selenium and harness checks passed; the only failures were package collection importing removed `pulsar.client.build_client_manager`, outside the a11y and driver change. [Package run](https://github.com/galaxyproject/galaxy/actions/runs/38178840247). CI was the sole remaining draft blocker. Cleanly rebased both patches onto actual dev `6831f768a637d148d941a3477db0a14e21573c1d`; range-diff confirms both patches identical. All **196 affected Vitest cases across 23 files pass**. Published to `jmchilton:fix_story_a11y` with an exact old-head lease and took the PR out of draft under standing authorization. Verified OPEN, non-draft, correct base and head `175e7d5a1831836dd9b360a4cb1dad5e0874fa85`. Fresh upstream CI is queued/running; prior green results are not claimed for this head. No description or comment changed.

## TICK — 2026-10-13 evening

GitHub now reports OPEN, non-draft and mergeable at `175e7d5a183`; this TICK did not change draft status. Current-head browser/client checks pass. Package runs 38261321068 and 38351349686 fail importing removed `pulsar.client.build_client_manager`, outside the accessibility change. Reclassified to `ready` and requested failed-job reruns.
