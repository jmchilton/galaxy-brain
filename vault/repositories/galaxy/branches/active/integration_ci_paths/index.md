# integration_ci_paths

Status: `ci_wait`. Base: `dev`. Fork: `jmchilton/integration_ci_paths`. PR: [#24135](https://github.com/galaxyproject/galaxy/pull/24135) (draft).

Skips the Integration workflow when a PR only changes test suites that run in other workflows (unit, API, Selenium, workflow framework). Companion to `integration_ci_scope`; independent of it.

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Polish checklist](polish_checklist.md) · [Strengthening](polish_strengthening.md) · [Polish debrief](polish_debrief.md)

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Codex](codex_review.md)

## Decisions

- John asked for this branch on 2026-10-14 after the CI timing analysis recorded in the [initial debrief](initial_implementation_debrief.md).
- First version allowlisted the 6 `lib/galaxy_test/api` modules integration tests imported (no measured CI difference vs refactoring). John then asked for the refactor so the include/exclude list is robust: shared code moved to `galaxy_test.base`, allowlist removed.
- No enforced import guard (John, 2026-10-14); PR description must state the import rule and residual risk (see [earlier debrief](earlier_drafts/1/implementation_debrief.md)).
- `lib/galaxy/navigation/` stays on the trigger list: `lib/galaxy/tours` imports it at runtime.
- Shared module split into `base/api_mixins.py` + `base/api_helpers.py` (John, 2026-10-14); folded into the refactor commit.

## TICK — 2026-10-14

Current fork head fb7c6a96a759 still has an in-progress check. The two package reds are mypy at unchanged galaxy/security/ssh_util.py:18 (untyped publickey call), unrelated to import relocation; failed jobs rerun. Retain branches_implemented_needs_ci until runtime coverage settles.

## Polish — 2026-10-14

Completed. Original head `fb7c6a96a759d5f0255dac31cb632a4c5a494b26` passed Integration, API, workflow framework, lint and other runtime workflows. Package run [38625245560](https://github.com/jmchilton/galaxy/actions/runs/38625245560) fails mypy at unchanged `galaxy/security/ssh_util.py:18` on Python 3.10 and 3.14 (`publickey` untyped call), verified in failed logs; unrelated to this branch. Rebased without conflicts onto current `origin/dev`; new head `ec49da686a6e7551c6e9b50f14d948cde87d037f`.

Fresh checklist passed; one strengthening round returned “nothing to add”. No code changes beyond the conflict-free rebase. Current head CI remains queued ([Integration](https://github.com/jmchilton/galaxy/actions/runs/38661010332)); previous-head passing results are not claimed for the new head. Human-read checkbox remains unchecked. See the linked description, titles and polish debrief for final review.

## Draft PR opened — 2026-10-14

John requested opening the PR as a draft and moving it to waiting on CI. Opened [#24135](https://github.com/galaxyproject/galaxy/pull/24135) against `dev` at `ec49da686a6e7551c6e9b50f14d948cde87d037f`, titled “Skip Integration CI for changes confined to other test suites”. Used `pr_description.md` verbatim, including the human-read checkbox already checked in the working file; added no mentions. No code changes or further rebase.

Live GitHub verification confirms open and draft at that SHA. Upstream CI is queued/in progress, including [Integration](https://github.com/galaxyproject/galaxy/actions/runs/38661487143) and [API tests](https://github.com/galaxyproject/galaxy/actions/runs/38661486789). Fork CI remains queued. Queue entry moved to `ci_wait` as requested.

## Integration failure diagnosis — 2026-10-15

At John's request, inspected only upstream Integration [run 38661487143, shard `Test (3.10, 2)`](https://github.com/galaxyproject/galaxy/actions/runs/38661487143/job/116183600304?pr=24135) and the PR diff at `ec49da686a6e7551c6e9b50f14d948cde87d037f`. All 22 errors are setup errors in `test/integration/objectstore/test_onedata_objectstore.py`, sharing one Onedata container-readiness failure: `docker exec TestOnedataObjectStoreIntegration_op_container await-demo` exits 1 after the demo fails to initialize within 600 seconds. The shard otherwise reports 674 passed and 1 skipped; the other three Integration shards passed.

Diagnosed as unrelated to this PR: the failing Onedata setup and Docker helper are unchanged, and readiness fails in `BaseOnedataObjectStoreIntegrationTestCase.setUpClass()` before `super().setUpClass()` starts Galaxy. This is an external demo-service startup failure, not an import/collection failure from the shared-helper relocation. The logs do not establish why the demo failed to initialize.

Other workflow failures were not rechecked; John states they are broken on `dev`. No code changes, reruns, rebase or draft-status change made during this focused diagnosis. Existing broader-CI queue status retained pending broader workflow reconciliation.
