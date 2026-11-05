### P3 1: `stored_string_is_single_option` comment implies only subclasses split stored strings

The new class-attribute comment says subclasses that parse separated strings in `from_json` opt out. The base `_select_from_json` also splits: for a multiple select with no legal values in runtime context (a dynamic select while building a workflow), it calls `value.split()` on string values. `to_python` now wraps stored `"A\nB"` as `["A\nB"]` before `from_json` runs, so that branch no longer splits it. Only legacy whitespace-separated state for dynamic multiple selects is affected. Once legal values exist, a plain `"A\nB"` string was already rejected as an invalid option before this PR. The comment should say the base split is now bypassed so a reader doesn't think only subclasses are affected.

Reword the comment to name the bypassed base split. The review branch does this in `af36dd1882e`. If whitespace-separated stored state should keep working in the editor, skip the wrap for strings containing `\r` or `\n`. That keeps the `"AA"` fix and option values that contain spaces.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort.

</details>
