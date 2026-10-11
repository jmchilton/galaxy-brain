# Marius follow-up #10 / upstream #1723 — 2026-10-11

- Upstream: https://github.com/galaxyproject/planemo/pull/1723 (`collection-output-assertions`), reviewed base/head `d7dc4ec9cd083a1a36ab567d26d4f57044aac1b5`.
- Marius PR: https://github.com/jmchilton/planemo/pull/10 (`fix-1723-collection-keyerror`), reviewed head `985698b145ba95bac5906ffda8fb79ad4d92e826`.
- Recommendation: accept Marius's diagnosis and merge his PR together with compatibility correction `2dc5c0051715f92770b542ace6ce170cc0ed8190`, created in the disposable `/tmp/planemo-marius-oct11/pr-10` checkout. That commit preserves his head as its parent. Do not merge the PR unchanged and assume all supported dependency versions pass. No merges or pushes performed by this reviewer.

## Finding and completed correction

Marius is right that Galaxy tool-util 25.1 and 26.0 directly index `collection_type` and `elements`, so a dataset tested as `class: Collection` raises a KeyError rather than producing a structured problem. The source fix in his PR works on those versions. However, Galaxy tool-util 26.1 uses an AssertionError with wording `expected a collection`, and his newly added regression test requires `expected to be a collection`. Since requirements permit `>=25.1,<26.2`, the unchanged PR breaks the regression test on a supported dependency: **9 passed, 1 failed** with the actual 26.1.0 PyPI wheel.

Correction `2dc5c005` validates the collection shape before passing it to Galaxy. It checks `elements` for every collection assertion and `collection_type` when a type is actually asserted, then returns the same named-output/missing-key diagnostic on every supported version. It removes the broad KeyError catch, so unrelated KeyErrors deep in nested element verification are not mislabeled as dataset-versus-collection errors. All Marius's assertions remain unchanged. Two added regressions cover a class-only/count-only assertion against a dataset (missing `elements`) and a collection missing `collection_type` when an explicit type is asserted.

## Verification

Python: `/Users/jxc755/projects/repositories/planemo/.venv/bin/python` (3.12.12). Ran `tests/test_check_output.py` using actual Galaxy wheel packages downloaded/extracted under `/tmp/planemo-marius-oct11/pr10-deps`; no changes made to the shared installed environment.

Original head:

- galaxy-tool-util 25.1.0: **10 passed**.
- installed galaxy-tool-util 26.0.1: **10 passed**.
- galaxy-tool-util 26.1.0: **9 passed, 1 failed**, exact error-text assertion above.

Corrected commit:

- galaxy-tool-util 25.1.0: **12 passed**.
- galaxy-tool-util 26.0.1: **12 passed**.
- galaxy-tool-util 26.1.0: **12 passed**.
- Black, isort, flake8, and `git diff --check`: passed. Ruff is not installed in the shared environment; Black printed the environment's existing Python target-version warning while confirming both files unchanged.

Important reproduction detail: `PYTHONPATH` alone is insufficient for overriding the galaxy namespace because the installed `galaxy/__init__.py` extends its own directory first. The verified runs explicitly prepended the extracted version's `galaxy` directory to `galaxy.__path__` before importing the verifier. Each run printed and checked `inspect.getfile(verify_collection)` to ensure the actual version was used. The 26.1 run also imported its tool-util-models 26.1 wheel and `pydantic-extra-types`; the 25.1 run used its tool-util-models 25.1 wheel.

Reproduction:

```python
import galaxy
import inspect
import pytest
# For 25.1.0 or 26.1.0, and add extracted version root to PYTHONPATH for extra imports:
galaxy.__path__.insert(0, '/tmp/planemo-marius-oct11/pr10-deps/26.1.0/galaxy')
from galaxy.tool_util.verify.interactor import verify_collection
print(inspect.getfile(verify_collection))
raise SystemExit(pytest.main(['tests/test_check_output.py', '-q']))
```

## Follow-ups / decisions for John

1. Integrate correction `2dc5c0051715f92770b542ace6ce170cc0ed8190` alongside Marius #10 into `collection-output-assertions`, then push that branch. The compatibility issue is resolved by source validation; no test weakening or dependency bump is needed.
2. Marius's changelog request remains worthwhile for upstream #1723: collection type/count assertions previously skipped may now fail IWC workflow tests when actual outputs disagree. Add a release note explaining that behavior, or track the release-note decision explicitly. No release-note change was made in this reviewer checkout.
3. Bare `elements:` output expectations remain outside the gate as already explained in upstream #1723; Marius explicitly accepted that decision. No further action needed for this review.

No blocking findings remain with the correction applied. This review is scoped to the collection checker/tests; it did not run a Galaxy server or the entire Planemo suite.

## Coordinator outcome

Companion #10 merged as 0f99b440bcb70ad4b0f277193b0423437b4708a6; source correction pushed on collection-output-assertions as b7567c0e181853b2ca1704381a1e2a36dd3a6c53 (rebased from local 2dc5c005). All 12 assertions/tests pass with actual tool-util 25.1.0, 26.0.1 and 26.1.0; tests preserved.
