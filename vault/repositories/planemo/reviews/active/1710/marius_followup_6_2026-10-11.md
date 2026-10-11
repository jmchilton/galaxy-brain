# Review: jmchilton/planemo #6 → galaxyproject/planemo #1710

Recommendation: merge into `shed-lint-fail-fast`. No blocking finding in Marius's correction.

- Fork PR: https://github.com/jmchilton/planemo/pull/6
- Upstream PR: https://github.com/galaxyproject/planemo/pull/1710
- Reviewed fork HEAD: `4d22462d402e0168a5a1ddbcfcbe5112c1fd58bc`.
- Target head in metadata: `63736179136c926f934cd9f9f31ed42a3186be46`.
- Master merged by Marius: `48725d69` (merge commit `31ef56bc2d2d9fc4d28a6d088ce28179edacc39f`). Both target head and merged master are ancestors of reviewed HEAD. Verify current remote target/source SHAs before merge.

Marius is right: a nonzero repository callback result cannot uniformly mean an operation failed. `shed_diff` uses 1 for differences and `shed_create` uses 1 for an already existing repository. The new `stop_on_failure=False` argument correctly makes traversal termination opt-in; only shed_lint passes its fail_fast setting. The original realization-error fail_fast behavior is preserved because fail_fast remains in the realization keyword arguments. Normal lint warnings still stop at default warn level and continue at error level. The import conflict resolution retains both existing fail-fast test imports and newly merged #1729 DOI/Conda imports. No tests were removed or weakened, and the focused new commit passes `git diff --check`.

Validation (Python 3.12, shared Planemo .venv; PYTHONPATH points to reviewed worktree):

- Existing four fail_fast tests, two metadata tests, and DOI integration test: 7 passed.
- `tests/test_shed_lint.py tests/test_lint.py tests/test_shed.py tests/test_shed_expansion.py`: 23 passed, 7 skipped with PLANEMO_SKIP_SLOW_TESTS=1 and PLANEMO_SKIP_NETWORK_TESTS=1 and an external responses stub for GET `https://toolshed.g2.bx.psu.edu/api/repositories` returning []. An initial unstubbed run had 5 failures due to restricted Tool Shed DNS; the stub resolves all five without changing repo files or test expectations. Other remote/slow tests remain skipped.
- External CLI probes `/tmp/planemo-marius-oct11/test_pr6_probe.py`: 2 passed. Actual `shed_diff -r --fail_fast` visits both differing fixture repositories; actual `shed_create -r --fail_fast --skip_upload` visits the existing first repo and creates the second. Substituting only original #1710 traversal implementation in process makes both probes fail (only one repository visited), proving the regression and fix.
- Worktree remains clean. No original edits, merges, pushes, or public reviews made by this reviewer.

Follow-ups (non-blocking):

1. Regenerate `docs/commands/*.rst` from shared option help; eleven files still say "Stop on first job failure." The source now says "Stop on first failure." This is a mechanical docs follow-up.
2. Add a `HISTORY.rst` entry for #1710 explaining that `shed_lint --fail_fast` stops after its first warning at default `--fail_level warn`; `--fail_level error` still continues after warnings. Current unreleased history lacks this entry. No further code change needed for Marius's observation about `raise LintFailed()` after tools lint: it covers tool-load failures.
3. Separate existing recursive shed_diff output bug exposed by probing: `planemo/commands/cmd_shed_diff.py` captures `user_requested_output` from shared `kwds['output']`, then replaces the shared value with its per-repository temporary filename without restoring it. After the first repository, the next iteration treats the previous temporary filename as a user-selected output file, copies the next diff there, and skips stdout. A mocked normal CLI invocation with two differing repositories calls diff_repo twice but prints only the first diff. This command file is unchanged between original #1710 and #6 and is not a reason to withhold this correction. Investigate/fix separately by keeping user-selected output outside the loop or restoring kwargs, with a regression covering both repo diffs on stdout (and an intentional policy for shared --output files).

## Coordinator outcome

Companion #6 merged into shed-lint-fail-fast as cac00fc00b182b0775599e3b8fe6ddf35ee8dd73. Focused suites: 23 passed/7 skipped with Tool Shed response stub; two sibling CLI regressions pass and failed before fix.
