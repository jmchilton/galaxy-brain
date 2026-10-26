No maintainability changes are required. The branch restores existing framework contracts and uses the established requirement mechanism at the helper boundaries that need it; no actionable quality finding remains.

- No implementation was edited during this review.
- No new abstraction, policy model, module split, or generalized shell configuration was recommended. The five explicit runtime exports and matching static marker expression describe two existing skip layers; deriving both through shell indirection would make this small policy harder to inspect.
- API history lifecycle, timeout scaling, Selenium registration handling, browser-backend migration, and broader target/test selection remain scope questions for the separate scope evaluation. They are not structural regressions introduced by this branch.

<details>
<summary>Quality audit</summary>

Reviewed all three commits against `origin/release_26.2` through `6a2cdd7f982`, the surrounding decorator, history, and user-helper code, and the initial implementation and test-challenge debriefs.

The decorator now returns the existing shared wrapper, matching its siblings without introducing an identity layer. The history fix restores exception propagation with one statement while retaining the existing cleanup contract. Moving cleanup to `finally` would change successful history behavior and belongs to an explicit lifecycle decision rather than a behavior-preserving refactor.

Both new admin guards call `using_requirement` before client access. The private-role helper matches nearby role/configuration helpers; placing the user-setup guard in `_setup_user` covers its direct callers and named second-user switches through a common boundary while leaving anonymous switching untouched. The branch adds no ad-hoc mode checks or duplicated request logic.

The runner's debug arguments use a Bash array with a quoted expansion, so zero or two arguments are represented directly. The bootstrap change uses a supported existing flag. The marker expression and exported skips are explicit and local to the deployment entry point. A new capability registry or dynamic export loop would add concepts without eliminating an existing framework layer.

The parameterized tests live in the existing decorator suite, declare their expectations independently, and check public execution and skip behavior. They use pytest's environment fixture and a local call recorder rather than request mocks or new test infrastructure. The passing baseline commit remains first in history.

No file crosses the 1,000-line threshold because of this change. The already-large populator module grows by two direct statements; extraction would create unnecessary indirection for these fixes. No type casts, new optional states, asynchronous orchestration, or partial-update paths were introduced. Documentation changes are limited to the actual configuration mapping and supported skip setting.

`git diff --check origin/release_26.2..HEAD` passed. Existing verification evidence includes 24 passing test-base tests, a baseline/red-to-green comparison, direct pytest collection reproduction, and offline history/admin/runner checks. This was a static maintainability review; no deployed server was contacted and those tests were not redundantly rerun.

</details>
