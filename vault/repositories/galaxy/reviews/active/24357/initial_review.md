# Initial review: galaxyproject/galaxy#24357

- Profile: default
- Model: Claude Opus 5.5
- Effort: low
- Reviewed commit: `81bcc6eac6b484d87d0ca3aa3b9a9e02ae8b5715` (diffed against `git merge-base origin/release_25.1 HEAD`)

## Verdict

Small, correct fix. Approve after considering the P3s; nothing blocks merge. The new `IntParameter` is a reusable abstraction rather than a one-off cast. Both the write path (`unwrap` -> `marshal`) and the read path (`wrap`) are covered, so legacy string values come back as ints without a migration. `test/unit/data/datatypes/test_tabular.py` passes locally (16 passed). The API test was not run locally.

## Findings

### P3 1: `IntParameter.wrap` passes unconvertible legacy values through, so callers still need their own guard

`wrap` returns the raw stored value when it can't be converted, for example `"abc"` saved by the old `set_edit`. As a result `metadata.comment_lines` (and the API's `metadata_comment_lines`, because `MetadataCollection.__getattr__` calls `wrap`) is still `int | None | str`. That is why `ColumnDataProvider.get_data` needs its own `try: int(...) except (ValueError, TypeError)`. Values like that never worked: `ColumnDataProvider` raised a `TypeError` on any string, and the only other consumer is the blurb text (`"abc comments"`). Per the review focus on not keeping never-working input alive, `wrap` could return `None` for an unparseable stored value. The attribute is then always `int | None`, and the provider simplifies to:

```python
if skip_comments and self.original_dataset.metadata.comment_lines:
    start_val = max(start_val, self.original_dataset.metadata.comment_lines)
```

The `("abc", "abc")` case in `test_tabular_comment_lines_wrap_converts_stored_strings` would then expect `None`.

### P3 2: `marshal` accepts `bool` and silently truncates non-integral floats

`isinstance(True, int)` is true, so a JSON `true` is stored as `True`. `int(3.7)` gives `3` instead of an error, while the string `"3.5"` is rejected, which is inconsistent. `set_edit` gets strings from the form, so this is only reachable from other `setattr` paths (tool-provided `galaxy.json` metadata in `lib/galaxy/metadata/set_metadata.py`, `lib/galaxy/model/store/discover.py`, `<action type="metadata">` in `output_actions.py`). It's a cheap fix:

```python
if isinstance(value, bool):
    raise RequestParameterInvalidException(f"Expected an integer, got {value!r}")
if value is None or isinstance(value, int):
    return value
if isinstance(value, float) and not value.is_integer():
    raise RequestParameterInvalidException(f"Expected an integer, got {value!r}")
```

### P3 3: The API test hand-rolls a browser-session login that already exists elsewhere

`test_set_edit_stores_comment_lines_as_int` scrapes `session_csrf_token` from `login/start` and posts to `user/login`. That is the same sequence as `test/integration/oidc/test_auth_oidc.py` (`REGEX_GALAXY_CSRF_TOKEN`, ~L318-L327). A small shared helper, for example a `_browser_session(email, password)` context manager next to `_different_user` in `lib/galaxy_test/base/api.py`, would make tests for legacy controller routes reusable rather than copy-pasted. This can wait for the dev forward-port; it's not needed on the release branch.

## Checked, no finding

- Sibling write paths. Every `setattr(dataset.metadata, ...)` goes through `MetadataCollection.__setattr__` -> `spec.unwrap`, so `set_edit`, tool-provided metadata, discovered outputs, `ColumnSetAction` and `DatasetAssociationDeserializer.deserialize_metadatum` all coerce now. That is the right single choke point. `make_dict_copy` (copies, model-store import) and `from_JSON_dict` write `_metadata` directly and do not call `marshal`, so legacy junk can't make copy or import raise.
- Behaviour change on job-side paths. A tool that supplies a non-integer `comment_lines` now fails metadata setting instead of storing junk. That is consistent with rejecting never-working input. `RequestParameterInvalidException` is a request-layer exception raised from the model layer, but `set_edit` relies on it becoming a 400, so I'm leaving it as is.
- `set_edit` calls `spec.unwrap` and then `__setattr__` calls `unwrap` again. `marshal` is idempotent, and the unit test asserts this.
- Other `comment_lines` specs (`text.py:841`, `tabular.py:1178`) are `readonly=True`. Users can't edit them and only datatype code sets them (always as ints), so leaving them on the base parameter is fine for this PR. Other integer metadata (`data_lines`, `columns`) could adopt `IntParameter` on dev, but that is outside this PR.
- `ColumnDataProvider`: `max(start_val, comment_lines)` matches the old `start_val < comment_lines` logic and also ignores negative values.
- Imports are at module top level. Adding `IntParameter` to `galaxy.datatypes.metadata.__all__` follows the existing re-export pattern.
