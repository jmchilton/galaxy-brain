# Domain review — issue-796-test-phase-removed-steps

Per `wf_foundry/reviewers/DOMAIN_REVIEW.md`, at `5e1f57a2`; fixes in `0eb5be21` and `23ed8132`. Two upstream bugs in `gxwf diff` reproduced on both implementations (gxformat2 `570de0f`, gtu-ts `3fd23149`); issue text drafted, not filed.

## Upstream (§1)

- [upstream_issue_diff_inline_subworkflows.md](upstream_issue_diff_inline_subworkflows.md): a step removed inside an inline subworkflow gives `No differences.` Foundry keeps one factual CLI gotcha, no workaround.
- [upstream_issue_diff_list_form_relabel.md](upstream_issue_diff_list_form_relabel.md): a list-form label change reads as remove + add (dict form reports `fields.label`). Removed the CLI-page prescription ("restore the old label rather than recording a drop"). Debug step 8's relabel branch stays, shortened: see question below.
- Both upstream PRs (gxformat2#296, gtu-ts#233) are unmerged, so fixing them before release costs this branch nothing; it's draft until the pin bump anyway.

## Fixed

- **Legacy text (§1).** Removed every "gxwf without `diff`" mention (run-workflow-test step 6 and verification, debug step 8, scenarios coverage gap pinning 1.15). The pin bump would have had to delete it.
- **Top-level-only limit.** Was in five places. Kept once as a CLI gotcha; cut from run-workflow-test step 6 (not an instruction), its eval property (no failing output) and the coverage gaps.
- **Self-defending clauses (§3).** advance-galaxy-draft-step: dropped "Implementation strips... only one that still maps" and "Later phases edit... to find the steps they removed". run-workflow-test step 6: dropped "because an unchecked run is not green". Ledger note paragraph (cast into ~20 skills) cut from 6 lines to 3, dropping the gap / flag-record negative examples.
- **#24837 (§1).** Debug step 4 now states the instruction plus the issue link instead of narrating Galaxy's behavior.
- **Scenarios (§2).** Replaced the `variant:` line (no fixture) with a case on a committed `open-requirements.dropped.ledger.yml`; `foundry check-step-removals` on it exits 0 with `dropped_entries: ["subsample-reads-dropped"]`, on the original ledger exits 4. Deleted run-workflow-test's file preamble, which was also false (new fixture isn't under `review-galaxy-workflow/`). New cases use repo-relative paths. Bound debug's "distinguish failure surfaces" to `review-galaxy-workflow/examples/planemo-failure/`.

## Not fixed

- Debug scenarios keeps four pre-existing abstract cases; [foundry_issue_debug_scenario_fixtures.md](foundry_issue_debug_scenario_fixtures.md) is draft `work/ready-implement` issue text.
- Checked and fine: brew3r draft has exactly one drafty step, so "that call leaves no drafty step, so it extracts" holds. No banned words. Two new semicolons removed in `23ed8132`; the rest predate the branch.

## Question for John (resolved)

- Debug step 8's relabel branch ("a removed step that reappears under `steps.added` with the same tool and connections was relabelled, recommend restoring its old label") works around the list-form relabel bug. §1 says remove it. It came from the normal review and is harmless until upstream fixes the diff. Keep it until then, or drop it now and file the upstream issue?
- Resolved: upstream fixed the diff (gtu-ts `a5c6cd57`), and the relabel branch was dropped in [subagents/upstream_fix_followup.md](subagents/upstream_fix_followup.md).

## Gate

`make -k check` at `0eb5be21` (validate, casts, fixtures rechecked at `23ed8132`): red only on `validate-roadmap` and `check-vendored`; 501 tests pass.
