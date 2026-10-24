# Open PR and branch queue

Snapshot: 2026-10-23 (recovered from live GitHub state, local worktrees and agent notes; earlier tracking lived in `agents/planemo/PULL_REQUESTS.md`).

## Open Planemo PRs — ready from our side (`ready`)

- [`shutdown_test_real_galaxy_run`](active/shutdown_test_real_galaxy_run/index.md) — Post-shutdown test results test drives real `GalaxyEngine._run`. [#1753](https://github.com/galaxyproject/planemo/pull/1753).
- [`skip-tests-when-external-services-down`](active/skip-tests-when-external-services-down/index.md) — Skips tests relying on quay.io, the Tool Sheds, Dockstore and usegalaxy.eu when they're down. [#1726](https://github.com/galaxyproject/planemo/pull/1726).
- [`collection-output-assertions`](active/collection-output-assertions/index.md) — Fixes silently skipped collection output assertions in workflow tests. [#1723](https://github.com/galaxyproject/planemo/pull/1723).
- [`config-option-conversion`](active/config-option-conversion/index.md) — Applies Click conversion to configured option values. [#1714](https://github.com/galaxyproject/planemo/pull/1714).
- [`deduplicate-wait-on`](active/deduplicate-wait-on/index.md) — Uses `galaxy.util.wait.wait_on`. [#1711](https://github.com/galaxyproject/planemo/pull/1711).
- [`shed-lint-fail-fast`](active/shed-lint-fail-fast/index.md) — Fixes `shed_lint` fail-fast behavior. [#1710](https://github.com/galaxyproject/planemo/pull/1710).
- [`python-gc-doc-example`](active/python-gc-doc-example/index.md) — Replaces the Perl documentation example with Python. [#1709](https://github.com/galaxyproject/planemo/pull/1709).
- [`test-job-files-in-tmpdir`](active/test-job-files-in-tmpdir/index.md) — Writes inline test jobs outside source directories. [#1707](https://github.com/galaxyproject/planemo/pull/1707).
- [`pin-supported-galaxy-python-rebased`](active/pin-supported-galaxy-python-rebased/index.md) — Pins Galaxy virtualenvs to an explicit Python version. [#1704](https://github.com/galaxyproject/planemo/pull/1704).
- [`issue-1693-iwc-missing-tests-error`](active/issue-1693-iwc-missing-tests-error/index.md) — Requires workflow tests under the IWC lint profile. [#1695](https://github.com/galaxyproject/planemo/pull/1695).
- [`drop-verbose-galaxy-errors`](active/drop-verbose-galaxy-errors/index.md) — Drops the dead `interactor.VERBOSE_GALAXY_ERRORS` assignment. [#1684](https://github.com/galaxyproject/planemo/pull/1684).

## Open Planemo PRs — needs attention (`attention`)

- [`publish-planemo-cli`](active/publish-planemo-cli/index.md) — Publishes a pinned `planemo-cli` in parallel to `planemo`. [#1733](https://github.com/galaxyproject/planemo/pull/1733).
- [`sanitize-invocation-test-data-paths`](active/sanitize-invocation-test-data-paths/index.md) — Sanitizes invocation labels used as filenames. [#1724](https://github.com/galaxyproject/planemo/pull/1724).
- [`issue-1694-iwc-changelog-date`](active/issue-1694-iwc-changelog-date/index.md) — Validates dates in IWC changelog headings. [#1697](https://github.com/galaxyproject/planemo/pull/1697).

## Draft Planemo PRs — ready to undraft (`draft_ready`)

None yet.

## Draft Planemo PRs — waiting for CI (`ci_wait`)

None yet.

## Draft Planemo PRs — needs author work (`author_work`)

- [`pyrefly`](active/pyrefly/index.md) — Type checks with Pyrefly alongside mypy. [#1734](https://github.com/galaxyproject/planemo/pull/1734).
- [`package-installed-galaxy-gravity`](active/package-installed-galaxy-gravity/index.md) — Runs package-installed Galaxy through Gravity. [#1701](https://github.com/galaxyproject/planemo/pull/1701).
- [`test-serve-results`](active/test-serve-results/index.md) — Keeps managed Galaxy running after tests. [#1708](https://github.com/galaxyproject/planemo/pull/1708).
- [`anonymous-external-galaxy-api`](active/anonymous-external-galaxy-api/index.md) — Allows anonymous access to external Galaxy instances. [#1700](https://github.com/galaxyproject/planemo/pull/1700).

## Planemo branches — implemented, work left (`branches_implemented_needs_ci`)

- [`fail-tests-leaking-secrets`](active/fail-tests-leaking-secrets/index.md) — Fails tool tests whose stdio or outputs contain a test credential secret or the API key (#1746). [Open PR](https://github.com/galaxyproject/planemo/compare/master...jmchilton:planemo:fail-tests-leaking-secrets?expand=1).

## Planemo branches — implemented, work left, green (`branches_implemented`)

None yet.

## Planemo branches — needs polish (`branches_need_polish`)

None yet.

## Planemo branches — ready for final review (`branches_ready_for_final_review`)

- [`workflow-informal-params-sentinel`](active/workflow-informal-params-sentinel/index.md) — Fills undeclared workflow `${...}` parameters with a sentinel and warns (#1750). [Open PR](https://github.com/galaxyproject/planemo/compare/master...jmchilton:planemo:workflow-informal-params-sentinel?expand=1).

## Planemo branches — approved, opens when green (`branches_need_pr`)

None yet.

## Planemo branches — still deciding on (`branches_need_decision`)

- [`embed_galaxy`](active/embed_galaxy/index.md) — Embedded Galaxy in Planemo; PR closed unmerged, likely superseded by #1701. [#1690](https://github.com/galaxyproject/planemo/pull/1690) (closed). [Open PR](https://github.com/galaxyproject/planemo/compare/master...jmchilton:planemo:embed_galaxy).

## Planemo branches — reference only (`branches_reference`)

None yet.
