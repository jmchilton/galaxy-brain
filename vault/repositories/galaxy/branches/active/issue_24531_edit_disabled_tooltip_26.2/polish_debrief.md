Run via claude-opus-5-5.

# Polish debrief

- **Rebase:** onto `release_26.2`, head `142a9901162` (fork already had it). No conflicts.
- **CI:** fork CI pending (23/25 runs); CWL conformance and Pulsar package runs "failed" with no failed job (setup/skip), unrelated to a client change. Recheck before PR.
- **Checklist:** [pr_checklist.md](pr_checklist.md), all 6 GENERAL items pass. Soft: `HistoryNavigation.test.ts` is a shallow prop check; `workflow_card_button` has no callers.
- **Description:** [pr_description.md](pr_description.md). Strengthening round: description-only fixes (scope count corrected from "~25 sites" to ~10 remaining buttons, bold-italic release-target sentence, native-`title` risk widened to all converted buttons, helper wording, GCard callers, rule builder Finish example). No branch changes.
- **Check Galaxy:** `make format` clean; mypy shows no errors in the changed hunk.
- **Titles/tags:** [pr_titles.md](pr_titles.md), [pr_tags.md](pr_tags.md).

## Open question

Convert the ~8 in-flight bulk-action buttons (HistoryList ×4, WorkflowList ×3, DatasetList ×1) here too? Each has a busy title never shown; mechanical but 3 more files on 26.2, no Selenium. Default: leave for `dev` follow-up.

## Snapshot

```
created .../differential-review/snapshots/20261029T010131Z-polishing-142a99011620.json
  polishing @ 142a99011620 vs origin/release_26.2 (merge-base a60a0c01bfdc)
  since 20261028T161320Z-hardening-e816c0542f05:
    commits: 0 same, 8 rebased, 0 changed, 0 new, 0 dropped
    hunks:   22 carried, 0 changed, 0 new, 0 dropped
```
