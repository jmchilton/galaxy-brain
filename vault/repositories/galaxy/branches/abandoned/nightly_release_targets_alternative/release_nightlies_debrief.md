# Release nightly extension — 2026-10-14

Commit: `a13b016c0ff9575606639bfb8273f2572f68ed56`. Parent/rollback point: `b2a792c206ded6040be900adef9b4b52f3819719`. One new Galaxy commit, pushed to jmchilton/nightly_unit_tests. Revert that commit to restore the pre-extension implementation. No upstream or release branch was changed.

## User decisions and implementation

John requested nightly coverage of dev and releases 26.0, 26.1, 26.2, with one independently bumpable Python version per branch, initially 3.10 for all four. This supersedes the initial five-version dev nightly design.

The dispatcher in `.github/workflows/nightly_tests.yaml` lives on dev and calls the existing suite workflows with one branch/version target per invocation. `.github/nightly-test-targets.json` is the shared configuration. Target preparation resolves upstream branch SHAs before running tests; tests, reports, and Codecov attribution use those immutable commits. Daily unit/Tool Shed/framework runs start at 00:00/01:00/02:00 UTC. Manual dispatch runs all three suites. PRs exercise target-selection/reporter tests without starting release runtime suites.

Reporting uses suite + branch titles and each invocation's own dependency results. Failed-job details also filter on suite + branch, so a failing sibling cannot contaminate the message. A passing branch closes only its own issue. Changing Python versions retains issue identity. Existing Selenium reports keep their default SHA/unfiltered behavior and upstream dev gate.

Release26.0 retains PostgreSQL17/psycopg2, framework if_needed/always and Tool Shed v1/v2. Release26.1 retains if_needed/always. Other targets use newer defaults. Releases26.0/26.1 lack .tool-versions and the Tool Shed Node version file, so setup has fixed uv/Node fallbacks. All Tool Shed install clients and both configured framework APIs remain covered. Tuesday extended metadata remains dev-only and untracked.

## Backport boundary

Nightly release coverage needs only the dispatcher and called workflows on dev; it checks out release code. Existing release PR matrices are unchanged. Reducing those PR matrices requires a separate backport of CI policy to each release, after verifying the nightly backstop. No release-PR savings are claimed here.

## Evidence

- Five target-selection tests pass: independently changed versions, historical setup, missing branches, duplicates and malformed/empty configurations.
- Eleven reporter cases pass, including prior Selenium behavior, cross-branch closure isolation, sibling-suite filtering, target SHA and version-bump issue identity.
- GitHub workflow JSON Schema, actionlint1.7.12 (copies normalize the preexisting $/ convention to ./), and zizmor1.30.1 with repository configuration pass. Zizmor reports no findings. The commit hook's workflow validation passes.
- Live resolver smoke test returns upstream dev36fe2ce8428, release26.0e69583662de, release26.1 933e342ad1d, release26.2 d28efb94ed9, all configured with Python3.10.
- Independent GENERAL review of the final full diff passes; human read-through remains unchecked. Review corrected Codecov attribution and preserved26.1's historical framework API modes.
- JavaScript was formatted by repository hooks. Unrelated whole-file Markdown reflow was removed; the formatter alone was skipped during amendment to preserve the existing documentation style. Substantive tests and schema/security checks passed.
- Fork security CI on a13b016c0ff is [green](https://github.com/jmchilton/galaxy/actions/runs/38605173521); remaining runtime suites and [nightly preparation](https://github.com/jmchilton/galaxy/actions/runs/38605173831) are queued or running at refresh. No complete release-runtime or upstream reporter execution is claimed. After merge, dispatch the nightly workflow on upstream dev and inspect each configured branch.

## Description backup

[Previous description](pr_description_before_release_nightlies.md) is an exact backup taken before rewriting, including John's checked human-read item on the old diff. The rewritten description resets that item because the extension adds tests/comments that need a fresh read.

## Handoff

The description and four title choices are rewritten. One fresh strengthening round returned nothing to add; see [strengthening](release_nightlies_strengthening.md). Final status is branches_ready_for_final_review, with no PR opened. Vault validation passed with zero errors and fifteen existing advisory warnings. Tracking artifacts are excluded from frontmatter validation; no index/dashboard generation was needed.
