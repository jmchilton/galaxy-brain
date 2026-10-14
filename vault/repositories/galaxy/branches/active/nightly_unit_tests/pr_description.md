Reduce repeated CI work on `dev` PRs and add tracked nightly compatibility checks for `dev` and releases 26.0, 26.1, and 26.2, with one independently configurable Python version per branch.

Older-Python and legacy tool API jobs repeat on every PR. Keep Python 3.14 and the tool request API on the `dev` PR path, and make the deferred checks visible through daily runs that open, update, and close tracking issues. The same nightly infrastructure now checks maintained releases from `dev`.

***Nightly release coverage needs no workflow backport; reducing existing release PR matrices still requires a separate CI-policy backport. This PR's immediate per-PR savings apply to `dev`.***

| Suite | PRs and pushes to `dev` | Nightly on each configured branch |
| --- | --- | --- |
| Python unit tests | Python 3.14 | One configured Python, 00:00 UTC |
| Tool Shed tests | Python 3.14, both install clients | One configured Python, both clients and branch-supported APIs, 01:00 UTC |
| Tool framework tests | Tool request API | One configured Python, both branch-supported API modes, 02:00 UTC |

The initial targets are `dev`, `release_26.0`, `release_26.1`, and `release_26.2`, all on Python 3.10. Their version entries live together in `.github/nightly-test-targets.json`; each can be bumped separately without changing the others or creating a new tracking issue.

***This changes developer CI: deferred compatibility failures can reach `dev` before nightly detection. Nightlies test one Python version per branch, rather than every supported version.***

***Performance tests leave CI entirely; the Tuesday extended-metadata tool framework run still tests both APIs on `dev`.*** Performance tests remain available locally. The Tool Shed and framework changes save runner work without claiming to shorten those suites' wall-clock time.

<details><summary>Branch isolation and release setup</summary>

The dispatcher resolves each branch's upstream commit, then calls the existing suite workflows against that SHA. Each suite/branch invocation reports its own dependency results. Its issue title includes the branch; failures list only that suite's jobs for that branch. A passing branch cannot close another branch's failure issue. Reports and Codecov uploads identify the code actually tested, rather than the dispatcher's `dev` commit.

Release 26.0 retains PostgreSQL 17/psycopg2, Tool Shed v1/v2, and `if_needed`/`always` tool API modes. Release 26.1 retains `if_needed`/`always`; newer targets use `never`/`always`. Fixed uv and Node fallbacks support releases that predate the version files. Existing release PR matrices are preserved.

Manual dispatch of Nightly compatibility tests runs all three suites across the configured targets. Separate concurrency groups prevent pushes, different schedules, branches, or suite calls from cancelling each other.

</details>

<details><summary>Shared reporter and workflow maintenance</summary>

The nightly suites reuse the weekly Selenium reporter from #24014 through `_report_scheduled_result.yaml`. Only runs dispatched from upstream `dev` write issues. Failure reports include the tested SHA, run link, attempt, and failed jobs; recovery closes duplicate matching issues too. Lookup is by exact title and bot creator, so relabeling an issue no longer orphans it. Selenium retains its existing reporting defaults.

Call-only workflows have a `_` prefix, including `_build_client.yaml`; callers and path filters follow the rename. Event-driven suite workflows also expose `workflow_call` for the nightly dispatcher. PR checks test configuration resolution and reporter isolation without launching the release runtime suites. Developer docs describe the nightly configuration and `GALAXY_TEST_USE_LEGACY_TOOL_API=never` for matching `dev` PR framework CI locally.

</details>

## Risks

This is a two-way door: CI policy can be reverted without changing Galaxy's application behavior, but deferring compatibility checks can allow regressions to merge before detection.

<details><summary>Risk Details</summary>

- Python 3.11–3.13 do not get dedicated jobs from this nightly configuration. Ruff and mypy on 3.10 catch many compatibility errors, but new stdlib imports can escape static checks.
- Full release runtime tests and upstream issue writes have not been exercised end to end. Fork CI on the final commit is pending; local selector/reporter tests, workflow schema, actionlint and configured zizmor checks pass.
- The maintained branch list is explicit. Adding a release or bumping its Python requires updating the configuration and checking that branch's test setup.
- Release PR coverage remains intact. Reduce it only in a separate policy backport after verifying the nightly backstop.
- New release-side references to `build_client.yaml` must become `_build_client.yaml` when merged forward.

</details>

<details><summary>Risk Review Advice</summary>

Review the table's coverage tradeoff and performance CI removal. Check the four target/version entries, release-specific setup, and per-branch report isolation. After merge, manually dispatch Nightly compatibility tests on upstream `dev` and inspect all targets before backporting reduced PR matrices.

</details>

## Context

Builds on #24014's weekly Selenium failure tracking and follows the CI-speed discussion with Marius. The nightly dispatcher extends that backstop to maintained releases without duplicating scheduled workflows onto each branch.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>The initial unit-test and reporter scope was retained.</summary>

The recorded evaluation predates the explicitly requested Tool Shed, framework, and performance changes. Its recommendation is not evidence of a review of those later changes.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The reporter review led to title-based issue lookup and clearer matrix expressions.</summary>

The seven-case reporter harness checks observable issue creation, updates, duplicate closure, and skipped dependencies. It passed again during polishing. This review predates the later suite additions.

</details>

### ✅ Second Frontier Model Review

<details><summary>The initial unit-test and reporter diff had no recorded findings.</summary>

The recorded review at `fd6bde75309` did not cover subsequent suite changes or execute GitHub Actions. Later suite-specific and release-nightly checklist reviews cover the final diff; fork CI is pending.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires a fresh human read after the release-nightly extension)
- [x] What does the user see when it fails? Failed checks/artifacts and a suite/branch tracking issue with the tested SHA and run link; unresolved targets fail preparation visibly.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Tests exercise version bumps, missing/duplicate targets, issue lifecycle and branch/suite isolation.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments describe previous implementation or bugs, what purpose do they serve? They explain preserved release policy and compatibility fallbacks.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

  <details><summary>Target selection and reporter isolation</summary>

  Run `node --test .github/scripts/nightly-test-targets.test.cjs .github/scripts/scheduled-report.test.mjs`. Five target-selection tests and eleven reporter cases pass, including changing a branch's Python version independently and preserving existing Selenium reporting behavior.

  </details>

- [x] Instructions for manual testing are as follows:
  1. Check a `dev` PR runs Python 3.14 unit/Tool Shed jobs and the `never` framework job; release-target PR matrices remain unchanged.
  2. After merge, dispatch Nightly compatibility tests on upstream `dev`; check one configured Python per target, branch-supported clients/APIs, actual tested SHAs, and suite/branch failure/recovery issues.
  3. Confirm the Tuesday extended-metadata framework run remains `dev`-only, tests both APIs, and is untracked.

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
