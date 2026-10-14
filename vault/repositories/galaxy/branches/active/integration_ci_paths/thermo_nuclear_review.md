# Thermo-nuclear review: integration_ci_paths

**Verdict: approve after small changes.** Commit 2 is the right move. Moving the shared code into `galaxy_test.base` keeps the CI exclusions honest without an allowlist, and it fits the existing package layout. Apart from new imports, type annotations and a module docstring, the move is pure: a line-set comparison of the removed and added code finds no other changes. No file crosses 1k lines, the shim follows the `performance/_framework.py` precedent, and the type annotations fix the code instead of adding mypy red-list entries. What's left is a duplicate the move made obvious, a commit-order problem, and a code-judo option that keeps api-only helpers out of `base`. One risk remains: the soundness of the exclusions depends on an import invariant that only a YAML comment guards.

## Recommended changes

1. **`lib/galaxy_test/api/test_wes.py:22`: delete the duplicate `WORKFLOW_SIMPLE`.** It is byte-identical to the copy that just moved to `lib/galaxy_test/base/workflow_fixtures.py:1`, and test_wes.py already imports from `workflow_fixtures` (line 16). Add `WORKFLOW_SIMPLE` to that import and drop the local 14 lines. This is the reuse that the move enables.
2. **Commit order: put the move (6faf24f5228) before the exclusions (c3a25e9f6be), or squash them.** Commit 1 on its own excludes `lib/galaxy_test/api/**` while `test/integration` and `galaxy_test/conftest.py` still import `galaxy_test.api._framework`, `test_tools`, `test_workflows` and `test_histories`. As merged, every commit in history should be a valid state, which matters for a cherry-pick or backport of only the CI commit. Swapping the order costs nothing.
3. **`lib/galaxy_test/base/shared_api_tests.py:182-201`: leave `BaseHistories` in `api/test_histories.py` and drop it as a base of `ImportExportTests`.** `ImportExportTests` uses only `_assert_history_length` from it, five times. `DatasetPopulator.history_length()` (`populators.py:2031`) already does the same GET, status assert and `len`. Replace those calls with `assert self.dataset_populator.history_length(history_id) == n` and declare `class ImportExportTests(UsesApiTestCaseMixin)`. `BaseHistories` (`_show`, `_update` and `_create_history`, about 80 call sites, all api-only) then stays next to its only consumers, unchanged. `base` receives only shared code, and the new `UsesApiTestCaseMixin` base on `BaseHistories` goes away. The only cost is that a failed assertion no longer prints the contents list. If that matters, keep a one-line `assert len(self.dataset_populator.get_history_contents(id)) == n, ...`.
4. **`lib/galaxy_test/workflow/test_framework_workflows.py:24`: import `ApiTestCase` from `galaxy_test.base.api_testcase`.** The branch moved `conftest.py`, `performance/_framework.py` and `test/functional/test_toolbox_pytest.py` to the base import. This is the one non-api suite that still reaches into `galaxy_test.api._framework`. CI is unaffected because `workflow/` is excluded too, but the rule should be that only api tests use the `api` shim.
5. **`lib/galaxy_test/api/test_dataset_collections.py:1029-1035` (optional, predates the PR): delete `TestDatasetCollectionsApi._assert_one_collection_created_in_history`.** It has no callers and is a near-copy of the `assert_one_collection_created_in_history` function that just moved to `base`.
6. **(Optional) Enforce the invariant the exclusions rely on.** At the moment only the YAML comment stops a future `test/integration` → `galaxy_test.api` import, or a `base`/`driver`/`conftest` → `api` import (the trap `conftest.py` already fell into). If someone adds one, edits to that api file stop running Integration, on PRs and on pushes to dev alike, until the weekly Tuesday cron. A grep wired into the existing `lint` tox env would catch it:

   ```sh
   ! git grep -nE '(galaxy_test\.(api|selenium|workflow)|galaxy\.selenium)\b' -- test/integration lib/galaxy_test/base lib/galaxy_test/driver lib/galaxy_test/conftest.py ':!*.md'
   ```

   (The docstring mention in `populators.py:27` needs excluding or rewording.) It's cheap, but it is new CI surface. Take it or leave it. Without it, the residual risk should be stated in the PR description.

## Considered and rejected

- **Rewriting the 46 `from ._framework import ApiTestCase` imports and deleting `api/_framework.py`.** The re-export shim matches the existing `performance/_framework.py` alias. Removing it would add churn and might break downstream users of the packaged `galaxy-test-api` module.
- **Merging `ApiTestCase` into `base/api.py` or `base/testcase.py` instead of adding `api_testcase.py`.** `base/api.py` is imported by `populators.py`, so adding the guarded `galaxy_test.driver` import there would load the driver and app stack for every populator user. A separate 39-line module is the right boundary.
- **Splitting `shared_api_tests.py` by domain (tools, workflows, histories, collections).** That means four small modules for about 450 lines. One module with a clear purpose ("code shared with integration lives here") is easier to find and backs up the YAML comment. Moving the workflow mixin into `workflow_fixtures.py` would also pull it into that module's strict mypy section. The name could be confused with `api/sharable.py`/`SharingApiTests`, but that's minor.
- **Moving `upload_flat_sample_sheet`/`assert_one_collection_created_in_history` onto populators.** `populators.py` is already 5277 lines, and `upload_flat_sample_sheet` is a shared test body full of asserts, not a populator action.
- **Keeping the api-only `_run_workflow_once_get_invocation` out of `RunsWorkflowFixtures`.** The mixin hangs together as a unit, and splitting one method out costs more churn than it saves.
- **Folding `TestsTools._run` into `DatasetPopulator.run_tool_raw`.** This duplication predates the branch, and the method has hundreds of call sites. That's out of scope for a CI-paths change.
- **YAML anchors to deduplicate the `push`/`pull_request` path lists.** No Galaxy workflow uses anchors, and every sibling workflow duplicates the list.
- **An allowlist that excludes `lib/galaxy_test/api/**` but re-includes specific files.** It would go stale the next time an integration test imports a new api helper. Moving the shared code is the better design.
- **Excluding more paths (`test/manual`, `test/evals`, `lib/galaxy/navigation`, …).** That's scope creep with no measured benefit.
- **The `dataset_populator: DatasetPopulator` annotations added in `test/integration/test_history_import_export.py`.** They are required: without them mypy reports `Definition of "dataset_populator" in base class "ImportExportTests" is incompatible with definition in base class "IntegrationInstance"`. The third class in that file already uses the same pattern.
- **The `__all__` in `base/api_testcase.py`.** It's redundant in the module that defines the class, but harmless and copied as-is. Not worth a comment.

<details>
<summary>Full review</summary>

### Scope

`git diff origin/dev...HEAD` (origin/dev fetched, 36fe2ce8428), 2 commits, 22 files, +599/−545.

- c3a25e9f6be: `.github/workflows/integration.yaml` excludes `test/unit/**`, `test/integration_selenium/**`, `lib/galaxy_test/{api,selenium,workflow}/**` and `lib/galaxy/selenium/**` in both `push` and `pull_request`.
- 6faf24f5228: moves `ApiTestCase` to `galaxy_test/base/api_testcase.py`, and moves `TestsTools`, `RunsWorkflowFixtures`, `ChangeDatatypeTests`, `BaseHistories`, `ImportExportTests`, `upload_flat_sample_sheet` and `assert_one_collection_created_in_history` to `galaxy_test/base/shared_api_tests.py`. `WORKFLOW_SIMPLE` moves to `workflow_fixtures.py`. Importers are updated, and `api/_framework.py` becomes a re-export.

### Is the exclusion list sound?

Integration CI runs `./run_tests.sh -integration test/integration` only (integration.yaml:193). `test/integration/conftest.py` imports `galaxy_test.conftest`, which used to import `galaxy_test.api._framework`. That's why moving `ApiTestCase` was necessary and not cosmetic. Good catch by the author.

Import closure check: grepping `lib/galaxy`, `lib/galaxy_test/{base,driver,conftest.py,shard.py}` and `test/integration` for `galaxy_test.(api|selenium|workflow)` and `galaxy.selenium` finds only a docstring in `populators.py:27`. A path-string check (`galaxy_test/(api|workflow|selenium)`, `galaxy/selenium`, `integration_selenium`, `/unit/`, `pardir`) finds only `test-data`, `tools` and `functional/tool-data` references, so nothing hidden is loaded by path. The exclusions are sound at HEAD.

Ordering in the filter: the negations come after `- '.github/workflows/integration.yaml'` and don't overlap it. The comment is short and explains the rule. Good.

### Structure of commit 2

The line-set comparison of the removed api code against `shared_api_tests.py` shows the only new lines are imports, the module docstring, the class-level annotations (`dataset_collection_populator`, `test_data_resolver`) and `BaseHistories(UsesApiTestCaseMixin)`. Behavior is otherwise preserved.

MRO check in the venv:
- `TestHistoriesApi`: `ApiTestCase, FunctionalTestCase, TestCase, BaseHistories, UsesApiTestCaseMixin, UsesCeleryTasks`
- `TestImportExportHistoryViaTasksIntegration`: `PosixFileSourceSetup, ImportExportTests, BaseHistories, IntegrationTestCase, IntegrationInstance, UsesApiTestCaseMixin, …`

`BaseHistories` now comes before `UsesApiTestCaseMixin`, but it overrides nothing defined there (checked `_show`, `_update`, `_create_history` and `_assert_history_length` against `base/api.py`, `testcase.py`, `integration_util.py` and `galaxy/util/unittest.py`), so the change is harmless. Recommendation 3 would remove the question entirely.

Type checking: `galaxy_test.api.test_histories` has `check_untyped_defs = False` in mypy.ini. The moved code now sits under the checked default, and the author typed it instead of adding a `galaxy_test.base.shared_api_tests` red-list entry. That's the right call. The red-list entry for `test_histories` is still needed: removing it gives 4 errors at lines 258, 817, 853 and 861. Running mypy from `lib/` per the Makefile on `shared_api_tests.py`, `api_testcase.py` and six touched integration modules shows no errors in those files; the 23 errors it reports are all pre-existing environment noise in `galaxy/…`. The two new `dataset_populator: DatasetPopulator` annotations in `test_history_import_export.py` are required (see Considered and rejected).

Lint: `ruff check`, `isort --check-only` and `black --check` are clean on all 21 touched Python files.

Packaging: `packages/test_base` declares `galaxy-tool-util` and `requests`, which covers the new imports. The `galaxy_test.driver` import in `api_testcase.py` keeps its `try/except ImportError` guard and `unused-ignore`, so `test_base` still doesn't need to depend on `test_driver`. `shared_api_tests.py` doesn't match pytest's default `test_*.py` collection pattern, and its `*Tests` class names don't trip `.ci/check_test_class_names.sh`.

File sizes: `workflow_fixtures.py` grows from 1362 to 1377 lines. It was already over 1k and holds only data constants, so that's acceptable. `test_histories.py` and `test_workflows.py` shrink. `shared_api_tests.py` is 498 lines.

### Code-judo opportunities found

- `WORKFLOW_SIMPLE`: with a canonical copy now in `workflow_fixtures`, the identical copy in `test_wes.py` is plain duplication (Rec 1).
- `ImportExportTests` → `BaseHistories`: the inheritance exists for one helper that `DatasetPopulator.history_length` already provides. Cutting it keeps `base` limited to shared code and leaves about 80 api-only call sites alone (Rec 3).
- A dead `_assert_one_collection_created_in_history` method sits next to the function that replaced it (Rec 5).

### Things done well

- The author moved the shared code instead of adding an allowlist of re-included api files, which deletes a category of maintenance.
- `_framework.py` remains as the api-suite import point, so the 46 importers are untouched.
- `conftest.py` and `test/functional/test_toolbox_pytest.py` now import from `base`, which removes the hidden integration → api dependency at its root.
- The YAML comment states the rule ("Code shared with integration tests belongs in lib/galaxy_test/base") where future editors will see it.

</details>

## Coordinator actions

- #1 done — `test_wes.py` imports `WORKFLOW_SIMPLE` from `workflow_fixtures` (verified identical).
- #2 done — history rebuilt: move commit, then YAML exclusion.
- #3 rejected — keeping `BaseHistories` in the API suite requires either dropping the history-contents dump from `_assert_history_length` failure messages (switching to `history_length()`) or duplicating the helper. Moving the 4-method mixin is cheaper.
- #4 done — `test_framework_workflows.py` imports `ApiTestCase` from base.
- #5 skipped — dead `_assert_one_collection_created_in_history` method predates the branch; out of scope.
- #6 left for John — regression guard (lint `git grep` / ruff TID251).
