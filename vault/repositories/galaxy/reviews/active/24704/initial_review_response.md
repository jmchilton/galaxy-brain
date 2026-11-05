

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

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

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24704_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24704_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24704_review_0) is based on the reviewed head `8c28063331f`. It rewords the new `stored_string_is_single_option` comment to say that wrapping stored strings bypasses the base `_select_from_json` whitespace split. It makes no behavior change.

- [`af36dd1882e`](https://github.com/jmchilton/galaxy/commit/af36dd1882e0b412d75a76c4702870348d65ad4b) Note stored select strings skip base whitespace split. Rewords the class-attribute comment in `lib/galaxy/tools/parameters/basic.py` so it doesn't imply only subclasses split stored strings.

</details>

</details>

### P3 1: `stored_string_is_single_option` comment implies only subclasses split stored strings

The new class-attribute comment says subclasses that parse separated strings in `from_json` opt out. The base `_select_from_json` also splits: for a multiple select with no legal values in runtime context (a dynamic select while building a workflow), it calls `value.split()` on string values. `to_python` now wraps stored `"A\nB"` as `["A\nB"]` before `from_json` runs, so that branch no longer splits it. Only legacy whitespace-separated state for dynamic multiple selects is affected. Once legal values exist, a plain `"A\nB"` string was already rejected as an invalid option before this PR. The comment should say the base split is now bypassed so a reader doesn't think only subclasses are affected.

Reword the comment to name the bypassed base split. The review branch does this in `af36dd1882e`. If whitespace-separated stored state should keep working in the editor, skip the wrap for strings containing `\r` or `\n`. That keeps the `"AA"` fix and option values that contain spaces.

Fixed on the review branch in [`af36dd1882e`](https://github.com/jmchilton/galaxy/commit/af36dd1882e0b412d75a76c4702870348d65ad4b).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort.

</details>
