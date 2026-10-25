# Polish debrief

Wrote the PR description, ran one strengthening round, and applied it at `e57c9157`.

- Added test `e57c9157`. It shows incompatible known map-overs still error beside a skipped edge, and a mutation check confirmed it fails if `_resolveStepMapOver` is skipped.
- Description now states up front that `__APPLY_RULES__` edges still `skip` and that validation goes quiet downstream of any skip. The Risks line no longer says "minimal".
- The sarek "22 → 0" result was not measured here. The description attributes those numbers to the issue report.
- Open scope question for John: narrow the trigger to unknown-source skips only (needs a skip reason on the result), here or as a follow-up?
