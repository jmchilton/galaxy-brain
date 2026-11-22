# pulsar#553 — Stage inputs from URLs issued by Galaxy

- [View on GitHub](https://github.com/galaxyproject/pulsar/pull/553) · [Code review](initial_review.md) · [Test review](test_challenges_review.md) · [Risks](risks.md) · [Verified review](verified_review.md) · [Review branch](https://github.com/jmchilton/pulsar/tree/pr_553_review_0) · [Response draft](initial_review_response.md) · [Actions](initial_response_action.md) · [Findings checklist](verified_findings_checklist.md) · [CI notes](ci_notes.md) · [Verification debrief](verification_debrief.md)

## Status

Initial review of `8594de636006348eb72dc597753791f3531a3835` complete: one P2 regression coverage gap, addressed by test-only commit `49872eb` on pushed branch `pr_553_review_0`; response drafted, not delivered.

PR open, targeting `master`; head now `4041fed` after John's merge of `master` into `staging-input-urls` (2026-11-22, import-only conflict in `test/client_staging_test.py`), mergeable.

CI on `4041fed` pending; earlier Galaxy `master` framework red was a pre-existing API mismatch (checked 2026-10-26).
