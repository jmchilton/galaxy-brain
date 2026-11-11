# Test challenges debrief — PR #790

- Profile: generic_test_challenger (`_shared/reviewers/generic_test_challenger.md`)
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `a84e0df5ce5c8893c6569ed1ed1bfd1d11da2925`

Tests were read, not run: this worktree has no `node_modules`, no built `dist/`, and the `workflow-fixtures` pipelines are not on disk.

## What the PR adds

- `test/resolver.test.ts`: six new synthetic-pipeline tests, all through `buildSummary`/`summarize`. They cover path-valued params versus booleans, a trailing nf-test comment, `//` inside a string, `null` clearing a profile value, comment-aware brace matching, and `getGenomeAttribute` in `main.nf`. One existing schema fixture gains `pipelines_testdata_base_path`.
- `test/integration/cli.test.ts`: four new rnaseq fixture tests (genome-attribute provenance, test-candidate inputs, `RNASEQ` present, asset count). The bacass inputs test now splits remote and local inputs. Sarek now asserts more asset names and a count of 56.

## Challenge per test

| Test | Verdict |
|---|---|
| keeps path-valued params and excludes booleans regardless of name | Keep. Behavioral and mock-free. Too narrow for the new heuristic, see P2 1. |
| strips a trailing nf-test comment outside the value | Keep. |
| keeps // inside an nf-test string while stripping the trailing comment | Keep. |
| treats an nf-test null override as clearing a profile value | Keep. Good: it checks both `params_delta` and the derived inputs. |
| closes a workflow when a comment has an apostrophe and a string contains a brace | Keep. It is a good regression test for the root cause (line comment, block comment, `}` and `//` inside a string). |
| records getGenomeAttribute assignments written in main.nf | Keep. |
| rnaseq: getGenomeAttribute provenance | Keep, but drop `expect(Object.keys(expected)).toHaveLength(14)`. It asserts the test's own literal (P3 1). |
| rnaseq: path-valued test indexes, `toHaveLength(11)` | Keep the named assertions. The exact count is a change detector (P3 2). |
| rnaseq: keeps RNASEQ in workflow list | Keep. It pins the real-world regression. |
| rnaseq assets `toHaveLength(20)`, sarek `toHaveLength(56)` | Prefer naming the 8 newly surfaced sarek params from the PR description over the bare count (P3 2). |
| bacass local/remote split | Keep. It documents the new local `dfast_config` input. |

The test style is good: no mocks or SimpleNamespace-style constructs, nothing patched, and no tests of private helpers. None of the unit tests only restate the implementation.

## Gaps and test plan

1. **`isPathOrUrlValue` heuristic (P2 1).** The rule moved from a param-name allowlist to "the value's last path segment has a 1–8 character alphanumeric suffix that is not a size or time unit". The tests only exercise `.tar.gz` URLs (in), `false` (out) and `star` (out). Add one table-style `buildSummary` test with a `test` profile containing:
   - `max_memory = '6.GB'`, `max_time = '2.h'` → excluded (the unit exclusion list has no test).
   - `snpeff_db = 'WBcel235.105'`, `vep_cache_version = '110.1'`, `genome = 'GRCh38.p14'` → these look like versions or genome builds, but the heuristic reads the suffixes `105`, `1` and `p14` as file extensions and makes them test inputs. Not verified against a fixture. Decide the intended behavior, for example by rejecting all-numeric suffixes, and pin it.
   - `salmon_index = 's3://bucket/salmon/'`, `kraken2_db = 'https://example.com/db/'` → a directory or extensionless URL. The old name rule (`db`, `genome`, `reference`, `input`) kept some of these; the new one drops them all. Either assert the drop as intended or keep URLs or values ending in `/`.
   - `input = 'samplesheet.csv?raw=true'` → kept (exercises the query stripping).
2. **Comment stripping for profile values (P3 3).** `stripTrailingLineComment` also runs on profile values (`candidateParamData` → `parseNfTestParamValue`), and its comment talks about profile values, but every new test uses the nf-test `params {}` block. Add one profile-side case (`fasta = 'genome.fa' // note` in `profiles.test.params`), or explain why profile values never carry comments by this point. The rule also strips only a `//` preceded by whitespace, so `input = 'a.csv'// note` keeps the comment. Pin it if that is intended.
3. **Brace matching edges (optional).** An unterminated `/*` at end of file, and a Groovy slashy string or regex containing `//`, are not covered. These are low value; mention only if the bug reviewer finds a real case.
