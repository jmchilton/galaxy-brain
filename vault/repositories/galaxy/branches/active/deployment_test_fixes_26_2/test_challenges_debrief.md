Re-hardened the full branch at `9d5f0d32df8` with no further test or implementation changes. The existing decorator coverage remains appropriate; fresh verification passes all 24 test-base tests and the offline history, admin, deployment-runner, and registration checks.

- Retained the parameterized decorator execution/skip contract in its existing suite. Expected requirement names are explicit, and the independent admin prerequisite is cleared so `new_user` and `new_library` exercise their own restrictions. These are observable framework contracts, not copies of implementation control flow.
- Added no dedicated test file for the registration guard. It is a test-policy check that must run before browser access; offline checks directly verify that boundary, the login fallback, existing-user login, and unrestricted argument forwarding.
- Challenged the lack of browser coverage: the change does not alter registration UI, browser navigation, or application behavior. An E2E test would either skip at this same guard or run the unchanged registration flow. A running Galaxy and browser would not provide a distinct assertion for this policy fix, so no E2E/API test is warranted.
- No tests were dropped and no mocks were added to permanent tests. The one-off forwarding check temporarily replaces the parent navigation method so it can verify all arguments without starting a browser.

<details>
<summary>Fresh validation</summary>

Read the test-layer decision guidance, backend unit-testing guidance, decorators/context-manager guidance, and Selenium class/login guidance in `doc/source/dev/writing_tests.md`. Reviewed the entire branch diff, the scope expansion, and its typed registration override.

- `PYTHONPATH=lib .venv/bin/python -m pytest test/unit/test_base -q`: **24 passed**, clean rerun with normal cache/process permissions.
- Baseline test file exported from first commit `89b8cc3b93a` against release-base decorators: **20 passed**. Current decorator tests against those same release-base decorators: **3 failed, 20 passed**; only published-object cases fail, at the callable assertion.
- Scratch decorated `test_publish` with `@requires_new_published_objects`: pytest collection yields **zero tests** on the release base and **one test** on this branch, without running it. The comparisons explicitly set pytest's `-o pythonpath=/path/to/release-archive/lib`; otherwise `pytest.ini` inserts the working branch's `lib`.
- `PYTHONPATH=lib .venv/bin/python /tmp/check_deployment_fixes.py`: history assertion/SkipTest propagation, error cleanup, success result, pre-request admin guards, and all nine stubbed target/type runner combinations passed.
- `PYTHONPATH=lib .venv/bin/python /tmp/check_deployment_registration.py`: direct/fallback registration skips before browser access, configured existing-user login, and all registration arguments forwarded with skips disabled/unset passed.
- `git diff --check origin/release_26.2..HEAD`: passed.

No live server, production account, or browser was used. Initial sandbox-only pytest attempts could not write caches/inspect temporary directories; the clean suite and baseline/collection reruns used normal permissions. These environment restrictions were not test failures.

The earlier archived debrief retains a complete history/admin reproduction snippet. The following self-contained registration reproduction can be saved outside the repository and run from this worktree with `PYTHONPATH=lib .venv/bin/python /path/to/script.py`:

```python
import os
from dataclasses import dataclass, field
from unittest import SkipTest
from unittest.mock import patch

from galaxy.selenium.navigates_galaxy import NavigatesGalaxy
from galaxy_test.selenium import framework
from galaxy_test.selenium.framework import GalaxyTestSeleniumContext, TestWithSeleniumMixin


class RegistrationContext(GalaxyTestSeleniumContext):
    def _screenshot_path(self, *args, **kwds):
        raise AssertionError("unexpected screenshot access")


@dataclass
class LoginContext:
    calls: list = field(default_factory=list)

    def home(self):
        self.calls.append("home")

    def submit_login(self, **kwds):
        self.calls.append(kwds)

    def register(self):
        return GalaxyTestSeleniumContext.register(self)


def assert_skips(operation):
    try:
        operation()
    except SkipTest:
        return
    raise AssertionError("registration did not skip before browser access")


os.environ["GALAXY_TEST_SKIP_IF_REQUIRES_NEW_USER"] = "1"
assert_skips(lambda: GalaxyTestSeleniumContext.register(None))
with patch.object(framework, "GALAXY_TEST_SELENIUM_USER_EMAIL", None):
    context = LoginContext()
    assert_skips(lambda: TestWithSeleniumMixin.login(context))
    assert context.calls == []
with patch.object(framework, "GALAXY_TEST_SELENIUM_USER_EMAIL", "existing@example.org"), patch.object(
    framework, "GALAXY_TEST_SELENIUM_USER_PASSWORD", "password"
):
    context = LoginContext()
    TestWithSeleniumMixin.login(context)
    assert context.calls == ["home", dict(email="existing@example.org", password="password", assert_valid=True)]

for skip in ("0", None):
    if skip is None:
        os.environ.pop("GALAXY_TEST_SKIP_IF_REQUIRES_NEW_USER")
    else:
        os.environ["GALAXY_TEST_SKIP_IF_REQUIRES_NEW_USER"] = skip
    context = object.__new__(RegistrationContext)
    with patch.object(NavigatesGalaxy, "register", return_value=None) as register:
        assert context.register("email", "password", "username", "confirmation", False, True) is None
        register.assert_called_once_with(
            email="email", password="password", username="username", confirm="confirmation",
            assert_valid=False, via_masthead=True,
        )
```

The `None` receiver in the first check makes any parent/browser access fail; only an early skip can succeed. The existing-user check runs while new-user restriction remains enabled. The final checks exercise both supported unrestricted states and preserve the parent's `None` result.

</details>
