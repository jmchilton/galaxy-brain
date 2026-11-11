# Test challenges review — PR #790

- Profile: generic_test_challenger (`_shared/reviewers/generic_test_challenger.md`)
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `a84e0df5ce5c8893c6569ed1ed1bfd1d11da2925`

Full test plan: [test_challenges_debrief.md](test_challenges_debrief.md). Tests were read, not run: there are no `node_modules`, no `dist/`, and no workflow fixtures on this machine.

The new tests are behavioral. They build summaries from synthetic pipeline trees, with no mocks and no private-helper tests. Nothing needs to be dropped or rewritten for mocking reasons.

## P2 1 — The new path-or-URL heuristic is barely tested at its edges

`isCandidateInputParam` no longer uses a param-name allowlist. It now uses `isPathOrUrlValue`, which accepts any value whose last segment ends in a 1–8 character alphanumeric suffix that is not a size or time unit. The only tests are `.tar.gz` URLs (kept), `false` and `star` (dropped). Nothing covers:

- The unit exclusion list (`6.GB`, `2.h`).
- Version or build-like dotted values (`WBcel235.105`, `110.1`, `GRCh38.p14`). The regex accepts `105`, `1` and `p14` as extensions, so these probably become test inputs. Not verified on a fixture.
- Directory or extensionless values (`s3://bucket/salmon/`, `https://example.com/db/`). The old name rule kept some of these; the new rule silently drops them.

The bacass `dfast_config` change shows the rule's reach is mostly visible through real fixtures. Add one table-style `buildSummary` profile test with these values, and decide whether all-numeric suffixes and trailing-`/` URLs count.

## P3 1 — Self-referential assertion

In the rnaseq provenance test, `expect(Object.keys(expected)).toHaveLength(14)` asserts the test's own literal. Drop it.

## P3 2 — Bare counts as change detectors

The rnaseq assets `toHaveLength(20)`, test inputs `toHaveLength(11)` and sarek `toHaveLength(56)` will break on any unrelated extraction improvement. For sarek, assert the 8 newly surfaced params named in the PR description (`ascat_genome`, `dbsnp_vqsr`, …) instead of, or alongside, the count. The named `arrayContaining` and `not.toContain` checks already carry the intent elsewhere. This is optional.

## P3 3 — Profile-side comment stripping is untested

`stripTrailingLineComment` also runs on profile values via `candidateParamData` → `parseNfTestParamValue`, and its code comment is about profile values. The new tests only use nf-test `params {}` blocks. Add a `profiles.test.params` case with a trailing `// note`. Separately, pin or document that an unspaced `'a.csv'// note` is not stripped.
