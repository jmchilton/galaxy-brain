# Pulsar #546 — Fix datetime import aliases for Ruff 0.17

[PR #546](https://github.com/galaxyproject/pulsar/pull/546) · Status: merged 2026-10-12 into `master`; tracking ended (merged). GitHub state checked 2026-10-24. Was: open; base `master`. Created 2026-10-11 at John’s request.

[Implementation verification](implementation-2026-10-11.md) · [branch](https://github.com/jmchilton/pulsar/tree/fix-datetime-import-alias)

The four ICN001 failures reproduce with CI’s Ruff 0.17.0 and pass after importing datetime as dt and updating module references. Whole-tree Ruff and isort checks pass; all 40 affected tests pass. Includes the required 0.16.1.dev0 history entry. Changes are committed and pushed; fresh CI is queued. This is implementation evidence, not an independent PR review.
