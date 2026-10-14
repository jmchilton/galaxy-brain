# Scope evaluation: integration_ci_paths

**Recommendation: keep the scope as implemented. No scope change.** One PR with two commits: move the API test code that other suites import into `galaxy_test.base`, then exclude other suites' dirs (`test/unit`, `test/integration_selenium`, `lib/galaxy_test/{api,selenium,workflow}`, `lib/galaxy/selenium`) from the Integration path filter. This is what John asked for: the 22% skip rate (~211 runner-min per skipped PR) with no allowlist. Every reviewer flagged expansions or contractions (regression guard, sibling-workflow exclusions, `BaseHistories` placement, more exclusions, splitting the PR), and each one is optional or belongs elsewhere. The one open item for John is the regression guard. It's cheap, but it adds a new CI check; without it, the PR description should state the residual risk (see D).

## A. As implemented (refactor + exclusions, one PR)

Commit 1 moves `ApiTestCase`, `TestsTools`, `RunsWorkflowFixtures`, `ChangeDatatypeTests`, `BaseHistories`, `ImportExportTests`, the sample-sheet helpers and `WORKFLOW_SIMPLE` into `galaxy_test.base`, and leaves an `api/_framework.py` re-export shim. Commit 2 adds 6 negated globs to both `push` and `pull_request` in `integration.yaml`.

| Pros | Cons |
|---|---|
| <ul><li>Meets both of John's asks: the skip rate, and robust exclusions with no allowlist</li><li>Removes the hidden `galaxy_test.conftest` → `galaxy_test.api` dependency at its source</li><li>Commits are ordered so each is valid alone, and the CI commit is 16 lines and trivially reviewable</li><li>The moved code is unchanged apart from typing (AST-verified), and the 908 collected tests are identical</li></ul> | <ul><li>~1100 lines of churn for a 16-line CI change, though it's mostly a mechanical move</li><li>Soundness rests on an import convention that only a YAML comment enforces (see D)</li><li>`shared_api_tests.py` is a grab-bag module (accepted by both reviews)</li></ul> |

## B. Contract: allowlist only (original `c3a25e9f6be`)

Exclude `lib/galaxy_test/api/**` but re-include the 6 modules that integration imports. No code moves.

| Pros | Cons |
|---|---|
| <ul><li>Tiny diff</li><li>Same measured skip rate (in the 300-PR sample, every PR that touched those 6 files also touched other trigger paths)</li></ul> | <ul><li>John explicitly replaced this with the refactor</li><li>It goes stale silently, and Codex round 1 already found a miss (`api/__init__.py`)</li><li>It keeps the integration → API-suite coupling</li></ul> |

## C. Contract: split into two PRs (refactor, then CI)

Same code as A, sent as a test-refactor PR followed by a 16-line CI PR.

| Pros | Cons |
|---|---|
| <ul><li>Each PR reviews on its own terms</li><li>The refactor could land even if the CI policy were debated</li></ul> | <ul><li>The refactor exists only to make the CI change sound, so on its own it has little reason to exist</li><li>Two review cycles and a merge dependency for no real gain, since the commits are already separate</li></ul> |

## D. Expand: enforce the import invariant

Add a check that fails when `test/integration`, `lib/galaxy_test/{base,driver}` or `lib/galaxy_test/conftest.py` imports `galaxy_test.{api,selenium,workflow}` or `galaxy.selenium`. The check could be a `.ci/*.sh` grep wired into tox/lint (the precedent is `.ci/check_controller.sh` and `check_test_class_names.sh`) or a nested ruff `TID251` config. Galaxy doesn't use `flake8-tidy-imports` today.

| Pros | Cons |
|---|---|
| <ul><li>Makes the "robust" claim enforced rather than conventional</li><li>The failure mode is silent: once a bad import lands, API-only edits skip Integration on PRs and on dev pushes until the Tuesday cron</li><li>~5–10 lines, with local precedent</li></ul> | <ul><li>New CI surface that reviewers have to accept</li><li>A docstring hit in `populators.py:27` needs an exclusion or rewording</li><li>Low probability: the PR that introduces the import touches `test/integration`, so Integration still runs on that PR</li></ul> |

## E. Expand: thermo-nuclear leftovers (#3 `BaseHistories` placement, #5 dead method)

Keep `BaseHistories` in `api/test_histories.py` and make `ImportExportTests` use `DatasetPopulator.history_length()`. Delete the unused `TestDatasetCollectionsApi._assert_one_collection_created_in_history`.

| Pros | Cons |
|---|---|
| <ul><li>`base` would receive only truly shared code</li><li>Removes a dead near-duplicate</li></ul> | <ul><li>#3 was weighed and rejected: it loses the history-contents dump on assertion failure</li><li>#5 predates the branch and doesn't affect CI scope</li></ul> |

## F. Expand: reciprocal exclusions in sibling workflows

Have `api.yaml`, `unit.yaml` and `framework_*.yaml` exclude `test/integration/**` and the other suites' dirs (normal review round 1, finding 6).

| Pros | Cons |
|---|---|
| <ul><li>Likely larger total savings, since API/framework/unit runs also fire on integration-only PRs</li><li>Same mechanism, so it's an easy pattern to copy</li></ul> | <ul><li>Each workflow needs its own import-closure analysis and skip-rate measurement</li><li>It roughly triples the review surface and the risk</li><li>It's a natural follow-up PR once this one lands</li></ul> |

## G. Expand: more Integration exclusions

Also exclude `test/manual`, `test/evals`, `lib/galaxy_test/performance` and similar dirs.

| Pros | Cons |
|---|---|
| <ul><li>Completeness</li></ul> | <ul><li>Zero commits touched these paths on `origin/dev` since 2026-09-14, so there's no measured benefit</li><li>`lib/galaxy/navigation` must stay because `lib/galaxy/tours` imports it at runtime</li></ul> |

## H. Expand: fold in `integration_ci_scope` or the `shard_durations.json` refresh

Combine with John's finer-grained family selection branch, or regenerate stale shard timings in the same PR.

| Pros | Cons |
|---|---|
| <ul><li>One "Integration CI cost" PR</li></ul> | <ul><li>Different mechanisms (job-level selection, shard balancing) with different risk profiles</li><li>`integration_ci_scope` is John's own branch and independent of this one</li><li>Mixing them muddies review and attribution of savings</li></ul> |

<details>
<summary>Details</summary>

- **Skip rate after the refactor.** The 22% (49/300 PRs) figure was measured for the allowlist version. The refactor version excludes the whole `api/` dir, so it skips at least as many PRs. Edits to the moved code now land in `lib/galaxy_test/base`, which still triggers Integration, as it should. No re-measurement is needed for the scope decision.
- **Push-trigger symmetry.** Excluding the same paths on `push` means a dev merge of an API-only change doesn't run Integration either. That's correct, because Integration can't observe the change. The only backstop for a broken invariant is the weekly cron, which is why D matters at all.
- **Stale vault note.** The `index.md` "Decisions" section still says "Allowlist the 6 `lib/galaxy_test/api` modules … rather than moving shared mixins". It should be updated to record John's switch to the refactor. That's a docs fix, not a scope change.
- **PR description.** If D isn't taken, the PR description should say: "Integration tests must not import from `galaxy_test.api`, `galaxy_test.selenium`, `galaxy_test.workflow` or `galaxy.selenium`. Shared code goes in `galaxy_test.base`. Nothing enforces this beyond the YAML comment."
- **Which reviews still apply.** All of them apply to A as-is. The Codex round-1 and normal-review round-1 notes cover the superseded allowlist and are moot.

</details>
