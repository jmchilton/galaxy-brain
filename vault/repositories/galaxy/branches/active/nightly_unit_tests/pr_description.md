Move older-Python and legacy-tool-API checks from each `dev` PR to daily runs with failure-tracking issues, reducing repeated CI work while preserving regular compatibility coverage.

Every PR currently pays for the oldest and newest Python unit and Tool Shed jobs, and both tool framework APIs. Keep Python 3.14 and the tool request API on the PR path, and make the deferred coverage visible through daily runs that open, update, and close tracking issues.

***This changes developer CI: runtime compatibility failures in the deferred jobs can reach `dev` before the nightly catches them.***

| Suite | PRs and pushes to `dev` | Daily runs on `dev` | Release PRs and pushes |
| --- | --- | --- | --- |
| Python unit tests | Python 3.14 | Python 3.10–3.14, 00:00 UTC | Python 3.10 + 3.14 |
| Tool Shed tests | Python 3.14, both install clients | Python 3.10–3.14, both clients, 01:00 UTC | Python 3.10 + 3.14, both clients |
| Tool framework tests | Tool request API | Both APIs, 02:00 UTC | Both APIs |

***Release PRs and pushes retain their existing matrices; automatic tracking issues are written only for runs on upstream `dev`.***

***Performance tests leave CI entirely; the Tuesday extended-metadata tool framework run still tests both APIs.*** Performance tests remain available locally. The Tool Shed and framework changes save runner work; they do not claim to shorten those suites' wall-clock time.

<details><summary>Reporting, concurrency, and reusable workflows</summary>

The new nightly runs and manual dispatches reuse Selenium's weekly reporting logic from #24014 through `_report_scheduled_result.yaml`. Only upstream `dev` reports issues. Failures include the SHA, run link, attempt, and failed job names; subsequent failures comment on the open issue, and a passing run closes it. Lookup uses the exact title and bot creator, so relabeling an issue no longer creates an orphaned duplicate. A passing run closes duplicate tracking issues too.

Separate concurrency groups keep pushes from cancelling daily coverage, and keep the two framework schedules separate. Reusable workflows now have a `_` prefix, including `_build_client.yaml`; callers and path filters follow the rename. Developer docs explain the matrices and `GALAXY_TEST_USE_LEGACY_TOOL_API=never` for matching PR framework CI locally.

</details>

## Risks

This is a two-way door: CI policy can be reverted without changing Galaxy's application behavior, but deferred compatibility checks can allow regressions to merge before detection.

<details><summary>Risk Details</summary>

- Ruff and mypy on Python 3.10 catch many compatibility errors, but new stdlib imports can escape static checks; older-Python runtime checks elsewhere and these nightlies provide the backstop.
- Nightly schedules and upstream issue writes have not been exercised end to end for these new consumers. Fork CI is still pending.
- Check the first upstream fork-PR run for reusable-workflow permission startup failures. After merge, manually dispatch all three suites on `dev` to exercise the full matrices and reporting.
- Release-branch merges that introduce new `build_client.yaml` references must update them to `_build_client.yaml`.

</details>

<details><summary>Risk Review Advice</summary>

Review the coverage tradeoff in the table and the removal of performance CI. Check the schedule/report gates and release exceptions, then confirm upstream PR startup and the post-merge dispatches.

</details>

## Context

An [alternative implementation](https://github.com/jmchilton/galaxy/compare/b2a792c206ded6040be900adef9b4b52f3819719...nightly_release_targets_alternative) adds configurable nightly coverage for dev and releases 26.0–26.2. **John rejected that implementation as too verbose.** It is preserved separately for Marius to comment on whether that route is worthwhile; this PR retains the simpler dev-only nightlies.

Builds on #24014's weekly Selenium failure tracking. This follows the CI-speed discussion with Marius; the same reporter now has additional consumers. Release branches retain their previous unit, Tool Shed, and tool framework matrices because the nightlies run on `dev`.

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

The recorded review at `fd6bde75309` did not cover subsequent suite changes or execute GitHub Actions. Later suite-specific reviews and the polish checklist cover the final diff; fork CI is pending.

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Red checks and failure artifacts; nightly failures also have tracking issues with run links and failed jobs.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Existing suites are retained; the reporter harness verifies issue lifecycle behavior.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments describe previous implementation or bugs, what purpose do they serve? They explain the unchanged Tuesday reporting exception.

## How to test the changes?

- [x] Instructions for manual testing are as follows:
  1. Check a `dev` PR runs Python 3.14 unit/Tool Shed jobs and the `never` tool framework job; a release-target PR retains both matrix endpoints/APIs.
  2. After merge, dispatch Unit, Toolshed, and Tool framework tests on upstream `dev`; check the full matrices and tracking issue lifecycle on failures/recovery.
  3. Confirm the Tuesday extended-metadata framework run retains both APIs and remains untracked.

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
