# Normal review, round 2 (refactor version)

Verdict: sound; no blocking or medium issues. Acted on the pre-existing annotation bug; kept the shim; left the regression guard for John.

Acted on:
- Low 1 — `ApiTestCase._test_driver: GalaxyTestDriver | None` raised `TypeError` on Python 3.10–3.13 when the driver is unavailable (pre-existing, moved verbatim). Quoted the annotation in `base/api_testcase.py`.
- Nit 3 — commit 1's message described the allowlist that commit 2 removed. History rebuilt: move commit first, then the YAML exclusion (also fixes cherry-pick order).

Not acted on:
- Low 2 — no enforced guard against a future `test/integration` → `galaxy_test.api` import (nested ruff TID251 or a `git grep` lint). Left as an open question for John; YAML comment points shared code at `lib/galaxy_test/base`.
- Nit 4 — `shared_api_tests.py` is a grab-bag; sample-sheet helpers could become `DatasetCollectionPopulator` methods. Not worth the churn here.
- Nit 5 — keep the `_framework.py` shim (~45 importers).

<details><summary>Full review</summary>

- Byte-identity confirmed via AST source segments; only intentional typing changes differ. `api_testcase.py` is the same blob as old `_framework.py`.
- mypy from `lib/` on all changed files plus integration users: 0 new errors. black/isort/ruff clean.
- Package deps: new imports (`requests`, `galaxy.tool_util.verify.test_data`) are declared galaxy-test-base deps. Standalone galaxy-test-base import already fails on dev (`galaxy.celery`, `rocrate`).
- MRO unchanged for `TestHistoriesApi`, `TestImportExportHistory`, both integration classes.
- Collection: 908 vs 908 identical node IDs; `shared_api_tests.py` not collected (`*_tests.py` ≠ `*_test.py`).
- Import edges: importing every `test/integration/**` module loads nothing from excluded dirs; no data-path references.
- Info: `[mypy-galaxy_test.api.test_histories] check_untyped_defs = False` still needed for code that stayed; `dataset_populator` re-annotations in integration test are required.
</details>
