### P3 1: `IntParameter.marshal` accepts booleans and truncates non-integral floats (implementation verified)

`isinstance(True, int)` is true, so `True`/`False` are stored as-is, and `int(3.7)` silently becomes `3` while the string `"2.5"` is rejected. The edit form only sends strings, but tool-provided metadata (`galaxy.json` via `lib/galaxy/metadata/set_metadata.py`, `lib/galaxy/model/store/discover.py`, `<action type="metadata">`) can pass JSON booleans and floats through `MetadataCollection.__setattr__` -> `unwrap`.

Reject `bool` and non-integral floats in `marshal` before the `int` pass-through; integral floats like `3.0` still become `3`. `wrap` is unchanged, so a legacy stored `True` still passes through on read.

<details><summary>Details</summary>

```python
if isinstance(value, bool) or (isinstance(value, float) and not value.is_integer()):
    raise RequestParameterInvalidException(f"Expected an integer, got {value!r}")
```

The unit tests gain `True`, `False`, `3.7` and `"2.5"` rejection cases, a `3.0 -> 3` case, and a type check on the unwrapped value. Before the fix, the `True`, `False` and `3.7` cases failed. All 21 tests in `test/unit/data/datatypes/test_tabular.py` pass with it.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: API test hand-rolls a browser-session login (implementation verified)

`test_set_edit_stores_comment_lines_as_int` copies the `login/start` CSRF scrape and the `user/login` POST inline. The same sequence already exists in `test/integration/oidc/test_auth_oidc.py` (`REGEX_GALAXY_CSRF_TOKEN`, ~L318-L327). Future tests of legacy controller routes outside `/api` would copy it again.

Add a `_browser_session(email, password="testpass")` context manager to `UsesApiTestCaseMixin` in `lib/galaxy_test/base/api.py`, next to `_different_user`, and use it in the new test. The OIDC integration test is left alone on the release branch; switching it to the helper fits the dev forward-port.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>
