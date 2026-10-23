# Filtered findings — gxformat2#278

- test_challenges_review P3 3 (pin `validate_format2_draft` behavior on a classless doc): pre-existing `GalaxyWorkflowDraft.class_` default, which the PR doesn't touch.
- initial_review P3 3, follow-up "limit the `run` dict arm to `@import`": pre-existing loose `run` union; nested validation was never strict. The rest of that finding is merged into verified P2 1.
- initial_review P3 3 claim "normalization is unaffected" and the initial_review / test_challenges claims "no TS changes needed": both disproved by reproduction (see verified P2 1 and P2 2).
- test_challenges_review P3 1 (add a `lint_format2` parity expectation): already covered by `test_lint_format2_missing_class` once the fixture is deduplicated; merged into verified P3 1.
