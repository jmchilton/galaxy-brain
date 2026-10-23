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
