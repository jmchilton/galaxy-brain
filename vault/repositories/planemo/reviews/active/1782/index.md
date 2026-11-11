# planemo#1782 — Add opt-in security linter (--security) flagging unsafe uses of user-controlled values in tool commands

- [View on GitHub](https://github.com/galaxyproject/planemo/pull/1782) · [default review](initial_review.md) · [thermo review](thermo_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [risks](risks.md) · [findings](review_0_findings.yml) · [comment note](johns_review_0_comment_note.md) · [PR note](johns_review_0_pr_note.md) · [review branch `pr_1782_round_0_rev_0`](https://github.com/jmchilton/planemo/tree/pr_1782_round_0_rev_0)

## Status

Initial review (round 0) against `2ffe63c3` complete: 1 P1, 8 P2, 9 P3, with 14 fixed on the review branch (tip `49775ee0`); not delivered.

PR open by rplanel; base `master`; no CI checks reported on the PR head yet.

## Related

- Galaxy-side bug found during review, queued for an issue: [select_wrapper_iter_skips_sanitization](../../../../galaxy/issues_incubator/incubating/select_wrapper_iter_skips_sanitization/index.md) (multiple-select iteration skips sanitization; the review branch's `SecurityRawParamValue` loop check depends on it).
