# Scope evaluation: issue_23980_static_restriction_default

**Recommendation: keep scope as implemented, as its own small PR off dev; no scope change. Only the overlap plan needs updating.** The branch (`2552f2bddd8`, 4 commits, 3 files, +109/-24) does exactly what #23980 proposes: per-option `selected` on the static path, one shared matcher (`_is_default_option`) that both `restrict_options` paths call, and removal of the dead top-level `selected` kwarg. The plan to "drop `4736fd1d066` from 21015" is stale. 21015 is now open PR #23992 (undrafted, tip `c8f9c40bae0`), which includes that commit and lists "`restrictOnConnections` with a list default → preselected" in its description. So whichever PR lands second resolves the `restrict_options` conflict to `_is_default_option` and drops its copy of `test_value_restriction_selects_multiple_text_list_default`. #23992 will probably land first, so expect that to be this branch's job. Neither expansion is worth taking on: the editor `_parameter_option_def_to_tool_form_str` crash belongs in a separate issue, and #23992 already adds the save-time list-default check.

## 1. As implemented (recommended)

Static restrictions mark each option `selected` against the default, whether scalar, list (for `multiple`) or `{value, label}`. `restrict_options` reuses the same matcher. An empty-string default now matches (Codex P2). Covered by two API tests (one copied from 21015) and one Selenium test that hasn't been run.

| Pros | Cons |
|---|---|
| <ul><li>Matches the issue's Proposed Approach exactly, shared helper included</li><li>Small, self-contained bug fix, independent of #23992</li><li>Present on dev since 2022, so it could target a release branch if wanted</li><li>The run form now agrees with what a run with no value supplied already used</li></ul> | <ul><li>Small textual conflict with #23992 in `restrict_options` (2 `"selected":` lines plus its `default_values` block)</li><li>Duplicate API test with #23992 until one rebases</li><li>The `None` comparison changes `restrictOnConnections` for `""` defaults too (an improvement, but it reaches past the static path)</li><li>Selenium test is first run in CI</li></ul> |

<details>
<summary>Details</summary>

- Conflict resolution if this lands second: take `_is_default_option` in both comprehensions, delete #23992's `default_values` block (it kept the truthiness guard, so a blind "theirs" would quietly undo the Codex fix), and drop this branch's copy of the list-default API test. Its 21015 twin is identical.
- If this lands first, #23992 rebases the same way and `4736fd1d066` becomes empty. Its PR description bullet is then already on dev, so trim it.
- `MY_BRANCHES.md` still says "21015 should drop `4736fd1d066`" and points at `test_challenge_debrief.md` (the file is now `test_challenges_debrief.md`). The coordinator should update both.
</details>

## 2. Contract: static path only

Leave `restrict_options` unchanged: no list-default handling there and no `""` change. Drop the copied API test. The static path gets its own matcher.

| Pros | Cons |
|---|---|
| <ul><li>No conflict with #23992</li><li>No duplicate test</li><li>Smallest diff</li></ul> | <ul><li>Goes against the issue's "one small helper that both paths call"; two matchers drift (truthiness vs `None`)</li><li>The empty-string fix covers only one path</li><li>A follow-up would be needed to unify the matchers after #23992 lands</li><li>The conflict is only a few lines, so avoiding it buys little</li></ul> |

## 3. Fold into #23992 (21015)

Move these commits onto `issue_21015_multiple_text_param` and close #23980 from #23992.

| Pros | Cons |
|---|---|
| <ul><li>One `restrict_options` edit and no duplicate test</li><li>A list default on a `multiple` text input is mostly reachable through #23992's list editor default (on dev the editor stores a string, so only gxformat2/API lists hit it)</li></ul> | <ul><li>#23992 is already open, undrafted and large (15 files, +520), with CI and screenshots on `c8f9c40bae0`; adding to it resets review</li><li>Mixes a 2022 bug fix (scalar case, any text input) into a feature PR, which rules out a separate backport</li><li>Reviewers of a run-form default fix would have to read the `FormValueList`/`basic.py` changes too</li></ul> |

## 4. Stack on #23992

Rebase this branch onto `issue_21015_multiple_text_param`. The diff becomes: replace `default_values` with `_is_default_option`, fix the static path, drop the duplicate test.

| Pros | Cons |
|---|---|
| <ul><li>Cleanest diff, no conflict</li><li>Reviewed separately from the feature</li></ul> | <ul><li>Blocks a standalone bug fix on a feature PR merging</li><li>The stacked PR shows #23992's diff until #23992 merges</li><li>No real gain over (1), whose conflict is trivial</li></ul> |

## 5. Expand: fix the `_parameter_option_def_to_tool_form_str` crash

The editor config form (`get_config_form`, `step_state_to_tool_state`) builds its restrictions/suggestions string with `f"{o['value']}:{o['label']}"`, or `o` itself for scalars. That raises `TypeError` on non-string restrictions (`[0, 1]`) and `KeyError` on label-less dicts. Both shapes come from gxformat2/API, not the editor.

| Pros | Cons |
|---|---|
| <ul><li>Small fix: `_parameter_def_list_to_options` already handles label-less dicts, so the editor path could reuse it</li><li>Same input shapes as this branch's dict test</li></ul> | <ul><li>Different code path (editor form serialization, not the run form) and different symptom (crash, not wrong default)</li><li>Present on dev, not caused or touched by this branch</li><li>Needs its own repro and tests (editor round trip, `str()` of numbers through a comma-joined string)</li><li>Better filed as a separate issue via `GX_QUEUING_ISSUE_CREATION.md`</li></ul> |

## 6. Expand: save-time validation of list defaults on non-multiple inputs

Reject a list `default` when `multiple` is false, so a single select never gets several options marked `selected`.

| Pros | Cons |
|---|---|
| <ul><li>Closes the "several options selected, form shows the first" edge case the review noted</li></ul> | <ul><li>#23992 already adds this for the editor (`populate_state_from_tool_form`, "a single value is required"), so doing it here duplicates work in the PR this branch already conflicts with</li><li>The remaining gap (gxformat2/API import) is a separate validation-layer question</li><li>Not a regression; behavior is unchanged from dev</li></ul> |
