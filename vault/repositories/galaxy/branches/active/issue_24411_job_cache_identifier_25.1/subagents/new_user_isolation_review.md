# New-user test isolation review debrief

Approved: no bugs, no security issue. No changes were needed. The reviewer read the code only and didn't run tests.

Not acted on:
- **`@bx.psu.edu` emails:** these match `OTHER_USER`, so I kept them.
- **The sanitization test's address read-back now partly re-tests the helper:** kept, because dropping it would remove an assertion.

<details><summary>Full review</summary>

Scope: `git diff 9e28638711a..fac15b1bfa9`.

What the reviewer checked:
- **Fit:** the helper builds on `_different_user` in `UsesApiTestCaseMixin` and takes no history. That lets callers use `test_history()`. Removing the populator method is good.
- **Acting as the new user:** `_different_user` swaps the API key on the shared interactor object, which `DatasetPopulator` also holds. So cached runs, renames and content fetches all run as the new user.
- **Assertions:** every original assertion is kept in both tests.
- **Decorators:** the order is fine. `GALAXY_TEST_SKIP_IF_REQUIRES_NEW_USER=1` skips both tests, and the admin key is needed to create the user.
- **Imports:** at the top of the file. `get` and `json` are still used.

Nits:
1. The emails use `@bx.psu.edu`, which is fine.
2. The address re-fetch is redundant but should stay.

</details>
