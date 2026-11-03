# Review trims sweep

Run only when John asks. Recommend changes; don't apply them.

1. Read the date in `LAST_REVIEW_TRIMS_SWEEP.md`; if it's missing, read everything.
2. Collect "Trimmed by John" entries since then from `vault/repositories/*/reviews/*/*/filtered_findings.md`. Use the record's `verified_review.md` git history for a trimmed finding's full text and discovering profile when the entry lacks them.
3. Group them by kind of finding and by discovering profile. Recommend a fix only for a pattern seen at least twice; list one-offs without a fix. Where John gave no reason, say so; don't guess.
4. Name one target file per recommendation, usually a profile in `_shared/reviewers/` or the verification rules in `_shared/PROCESS_INITIAL_REVIEW.md`. Prefer clarifying or deleting an instruction over adding one.
5. Update `LAST_REVIEW_TRIMS_SWEEP.md` to today's date.
