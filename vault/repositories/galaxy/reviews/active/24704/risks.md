Risk profile: gx_risk_assessment via claude-opus-5-5 at low effort, reviewed commit `8c28063331f1c0ed8e3bf9d37ddb10e265e385e1`.

The only one-way-ish risk is that `to_python` now gives every stored scalar of a plain/genomebuild `multiple="true"` select a list shape, which tools' Cheetah, output filters and workflow consumers will come to rely on; otherwise this is a small, revertible bug fix on a release branch.

<details><summary>Risk Details</summary>

- Behavior change on `release_26.2`: stored workflow step state with a scalar for a multiple select now reaches output filters, `get_all_outputs`, and scheduling as `["AA"]` instead of `"AA"`. Any filter or Cheetah code written to handle the string form (e.g. `sel == "AA"`) silently changes result.
- Opt-out is by subclass flag (`stored_string_is_single_option`); `GenomeBuildParameter` and any future/plugin `SelectToolParameter` subclass that parses separated strings in `from_json` inherit wrapping by default.
- `""` and `"None"` are special-cased as "nothing selected"; a legal option literally named `"None"` stays a string (doctest pins this), diverging from `from_json`, which checks `"None" not in legal_values`.
- Stored comma-joined legacy values (e.g. `"A,C"`) become `["A,C"]`; this was already invalid via `from_json`, so it errors rather than changes meaning.
- Rollback is cheap: no DB migration, API schema, or persisted-format change; state is still stored as before.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the subclass audit is complete: `SelectToolParameter` subclasses are `GenomeBuildParameter`, `SelectTagParameter`, `ColumnListParameter`, `DrillDownSelectToolParameter`; only the first keeps wrapping. Check that a multiple `genomebuild` stored as a single dbkey should indeed become a list, and that no `to_python` caller (job rerun, workflow extraction, `params_from_strings`) expects a string back for multiple selects.

Given the release target, weigh whether a scalar-to-list shift for existing stored workflows is acceptable as a fix (it matches what `from_json` has done since #14998) versus landing on `dev` only.

</details>
