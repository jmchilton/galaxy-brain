# extract_next_followups: polish debrief (2026-10-17)

Polished at head `891572be9e0` (base `release_26.2`). No branch changes: the strengthening pass found only description fixes.

## CI

Fork CI on `891572be9e0` was still queued throughout, with no failures and nothing completed except two skips (CWL conformance, Pulsar packages). The earlier run on `0a2f2198beb` was cancelled by the push. **Check fork CI before approval.**

## Checklist (GENERAL + WORKFLOW_RELATED)

No FAILs. The human-read item is left for John. Notes:
- Evidence for "who hits this" is reproduced red tests from post-merge review, not user reports, because 26.2 hasn't shipped. The description says so.
- `navigation.yml` drops notebook chat selectors that a rebase brought back. They're dead on 26.2 (only referenced in `navigation.yml`). It's housekeeping and the description mentions it.
- One `toolbox.calls == [1, 2]` unit assertion checks call order. It's the only direct way to see each map walked once.

## Strengthening round

The fact-check against `origin/release_26.2` / `origin/release_26.1` corrected the draft:
- **Quote regression.** It's real and only on 26.2 (`_reject_unquotable` is absent on 26.1). The draft said the history "can't be extracted at all", which overstated it: the 400 hits a selected input named after a quoted dataset, because the form's default name is the dataset name. Renaming works around it.
- **Copies on the form.** Wrong in the draft. On 26.2, Create is disabled ("Step labels must be unique"), and the API returns 400. "One input per copy, last wired" was older dev behavior.
- **Un-starring.** Understated in the draft. On 26.2 the server silently re-exposes the output under a generated label.
- **Blank report.** Applies to an empty or all-dropped notebook. A notebook with prose and no references keeps its prose.
- **E6 (PDF invocation sections) and E7 (hid copies).** These predate #22860 and are on 26.1 as well. `extract_steps` hid wiring is the same on 26.1, and `DEFAULT_MARKDOWN` uses both sections. The description now splits them into an "outside notebooks, also on 26.1" table.
- Added highlighted sentences for these likely misreadings: why a release branch, not a new feature, behavior outside notebooks, and why the diff is so big (non-test +984/−773).

The subagent suggested reproducing E6 on a plain workflow's default report. I didn't do that. The E6 unit tests fail on the base, and `DEFAULT_MARKDOWN` has used both sections since before 26.1, so I stated the claim directly.

## Questions for John

- E6 and E7 change behavior that 26.1 users already see, not code from #22860. Do they stay on the `release_26.2` PR, or split off to `dev`? Release managers may push back.
- Pick a title from [pr_titles.md](pr_titles.md).

