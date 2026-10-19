# Review branch `pr_192_review_0`

Based on the reviewed commit `fee94b34`. It touches only TS-local test code, so no synced fixtures or expectations change. The single-rule `StepLabelNotUnique` membership assertion in `lint-profiles.test.ts` is replaced by an invariant: every exported `Linter` subclass in `lint-rules.ts` must be listed in the profile it declares in `lint_profiles.yml`. Red check: changing `StepLabelNotUnique.profile` to `best-practices` fails the new test. The cross-language findings (P2 1, P2 2, P3 1) need gxformat2#268 first and are not on this branch.

- `2d2a07ff` Check every lint rule class appears in its profile: adds the invariant test and drops the redundant `toContain("StepLabelNotUnique")` (verified_review P3 2).
