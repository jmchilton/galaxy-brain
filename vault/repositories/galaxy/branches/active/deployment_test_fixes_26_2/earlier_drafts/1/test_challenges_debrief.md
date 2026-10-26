Retained the decorator contract coverage and improved it to declare each expected requirement explicitly, instead of discovering its test inputs from the decorator's private metadata. All 24 test-base tests pass; the three published-object regression cases fail against the unchanged release code at `assert callable(decorated)`.

- Changed `test/unit/test_base/test_decorators.py`: parameterize decorator/requirement pairs, and clear the independent admin prerequisite before exercising the requested skip variable. This avoids a malformed metadata list selecting the test's expectations, and independently checks `new_user`/`new_library` skipping rather than letting their implied admin requirement satisfy the test.
- No tests were dropped. The baseline execution, result forwarding, method-name preservation, and skip behavior belong in the existing decorator unit suite. This is public test-framework behavior and requires no running Galaxy or browser.
- No new infrastructure test file, API test, or browser test was added. The other fixes are small framework/runner changes; their offline checks below exercise failures, skips, and shell configuration without a live deployment. UI behavior is unchanged, so E2E coverage would add setup without covering a different user-visible path.

<details>
<summary>Validation and reproducible offline checks</summary>

Reviewed the test-layer guidance, backend unit-testing guidance, decorators, and context-manager sections of `doc/source/dev/writing_tests.md`.

Validation:

- `PYTHONPATH=lib .venv/bin/python -m pytest test/unit/test_base -q`: **24 passed**.
- Exported the original baseline file from commit `89b8cc3b93a`, and ran it against the release archive with both `PYTHONPATH` and pytest's `-o pythonpath` pointing at that archive: **20 passed**. The separate baseline commit still precedes the fix.
- Ran the current decorator tests with `-o pythonpath=/tmp/deployment-mypy-base/lib`: **3 failed, 20 passed**. Only the published-object cases failed, all at the explicit callable assertion. Setting pytest's pythonpath explicitly matters because `pytest.ini` otherwise prepends the working branch's `lib`.
- Ran `/tmp/check_deployment_fixes.py`: history assertion/skip propagation and cleanup, pre-request admin guards, and nine local runner configurations all passed. The runner check supplied stub `scripts/common_startup.sh`, `.venv/bin/activate`, and `pytest` executables in a temporary directory. It checked all three targets against `api`, `selenium`, and `all`, with debug unset, development bootstrap arguments, capability exclusions, report arguments, and appropriate file selection. No network requests or real dependency installation occurred.
- Black and `git diff --check` passed.

To reproduce the history and guard checks after the scratch file expires, save this as a scratch Python script and run `PYTHONPATH=lib .venv/bin/python /path/to/script.py` from the worktree:

```python
import os
from dataclasses import dataclass
from unittest import SkipTest

from galaxy_test.base.api import UsesApiTestCaseMixin
from galaxy_test.base.populators import BaseDatasetPopulator


@dataclass
class HistorySource:
    def new_history(self, **kwds):
        return "history-id"


for error in (AssertionError("body failed"), SkipTest("skip body")):
    cleaned = []
    try:
        with BaseDatasetPopulator._test_history(
            HistorySource(), cleanup_callback=cleaned.append
        ):
            raise error
    except type(error) as caught:
        assert caught is error
    else:
        raise AssertionError("history context suppressed the test outcome")
    assert cleaned == ["history-id"]

with BaseDatasetPopulator._test_history(HistorySource()) as history_id:
    assert history_id == "history-id"

os.environ["GALAXY_TEST_SKIP_IF_REQUIRES_ADMIN"] = "1"
for operation in (
    lambda: UsesApiTestCaseMixin._setup_user(None, "unused@example.org"),
    lambda: BaseDatasetPopulator.user_private_role_id(None),
):
    try:
        operation()
    except SkipTest:
        pass
    else:
        raise AssertionError("admin helper did not skip before using its client")
```

Passing `None` as the helper receiver deliberately makes any client access impossible: only a skip before that access can pass the final checks. The history source is a minimal data-free implementation, without mocks. The checks retain the pre-existing cleanup-on-failure policy and do not claim to change success-path history lifecycle.

</details>

Direct pytest-collection reproduction also confirmed the original silent-drop symptom. A scratch module with the following content collected **zero tests** against the release archive and **one test** against this branch:

```python
from galaxy_test.base.decorators import requires_new_published_objects


@requires_new_published_objects
def test_publish():
    pass
```

Run `PYTHONPATH=lib .venv/bin/python -m pytest --collect-only /tmp/deployment_collect_published.py -q -c pytest.ini` for the fixed branch. To compare an archive of `origin/release_26.2`, set `PYTHONPATH` to its `lib` and add `-o pythonpath=/path/to/archive/lib` so pytest uses the archived decorators. The zero-test case exits with pytest's normal no-tests-collected status; the fixed case lists `test_publish` without executing it.
