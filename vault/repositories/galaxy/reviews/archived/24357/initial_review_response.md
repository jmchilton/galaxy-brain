Pushing small testing changes - hope that is okay! Looks great though - thanks so much.

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: Opus 5.5 · Effort: low · Reviewed commit: 81bcc6eac6b484d87d0ca3aa3b9a9e02ae8b5715

Risks are low and mostly a two-way door; the only lasting choice is a new public `IntParameter` metadata parameter class (exported from `galaxy.datatypes.metadata`) that datatype authors may start depending on, landing on a release branch.

<details><summary>Risk Details</summary>

- New `IntParameter` is added to `galaxy.datatypes.metadata.__all__`, a module datatype plugins import from; once released, removing or changing its semantics is a compatibility break for third-party datatypes.
- Behavior change in the edit-attributes path: a non-integer `comment_lines` (e.g. "abc") now raises `RequestParameterInvalidException` (400) instead of being silently stored; blank strings now store `None` rather than `""`.
- Stored metadata is not migrated: existing string values stay strings in the DB and are converted on read by `wrap()`; unparseable legacy values are passed through unchanged, so readers like `ColumnDataProvider` still need their own `try/except` guard.
- `comment_lines` subclasses that override the element (e.g. `text.py` around line 841) do not get `IntParameter`, so typing is per-datatype, not global.
- Lands on `release_25.1`, so it ships in a point release; scope is small (one metadata element, one data provider, tests).

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether introducing a new generic `IntParameter` class is appropriate for a release-branch fix versus fixing the consumer only, since its public export is the part hardest to walk back. Also confirm that rejecting non-integer input with a 400 on `dataset/set_edit` is the desired user-facing behavior, and that lenient `wrap()` pass-through of legacy bad strings is acceptable without a data migration.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24357_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24357_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24357_review_0) builds on the reviewed commit `81bcc6eac6b` with two small follow-ups. `IntParameter.marshal` now rejects booleans and non-integral floats, which tool-provided metadata could otherwise store as `True` or silently truncate. The CSRF-scraping web login in the new API test moves into a reusable `_browser_session` helper on `UsesApiTestCaseMixin`, for later tests of legacy routes outside `/api`.

- [`111f5bdd98a`](https://github.com/jmchilton/galaxy/commit/111f5bdd98a) Reject bool and non-integral float comment_lines metadata. Adds the bool and float guard to `IntParameter.marshal` and adds the matching rejection, `3.0 -> 3` and type-check cases to the unit tests.
- [`ea18258b648`](https://github.com/jmchilton/galaxy/commit/ea18258b648) Extract _browser_session test helper for legacy controller routes. Adds the context manager to `lib/galaxy_test/base/api.py` and uses it in `test_set_edit_stores_comment_lines_as_int`, dropping the inline `re` and `requests.Session` code.

</details>

</details>

### P3 1: `IntParameter.marshal` accepts booleans and truncates non-integral floats (implementation verified)

`isinstance(True, int)` is true, so `True`/`False` are stored as-is, and `int(3.7)` silently becomes `3` while the string `"2.5"` is rejected. The edit form only sends strings, but tool-provided metadata (`galaxy.json` via `lib/galaxy/metadata/set_metadata.py`, `lib/galaxy/model/store/discover.py`, `<action type="metadata">`) can pass JSON booleans and floats through `MetadataCollection.__setattr__` -> `unwrap`.

Reject `bool` and non-integral floats in `marshal` before the `int` pass-through; integral floats like `3.0` still become `3`. `wrap` is unchanged, so a legacy stored `True` still passes through on read.

Fixed in [`111f5bdd98a`](https://github.com/jmchilton/galaxy/commit/111f5bdd98a).

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

Fixed in [`ea18258b648`](https://github.com/jmchilton/galaxy/commit/ea18258b648).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>
