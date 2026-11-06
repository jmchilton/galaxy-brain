---
upstream_base_branch: release_26.1
---
# Workflow text input restrictions survive the editor's `value:label,...` string (#24375)

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:issue_24375_restriction_string_roundtrip_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24375_restriction_string_roundtrip_26.1)

## Status

READY: implemented, re-scoped once and hardened ([implementation debrief](implementation_debrief.md)). The local head `4333ba9e1a6` needs a force-push; the fork still has `c3bf15ffc76`. The original scope is on the fork as an [alt](alts/original_scope.md).

## Decisions

Re-scoped on the first scope evaluation's recommendation: a state with both restrictions and suggestions now opens as restricted ([re-scope debrief](implementation_rescope_debrief.md)). The second evaluation recommends no further change.

Stands alone; no `parent_branch`. Follow-up to [`issue_23980_static_restriction_default`](../../merged/issue_23980_static_restriction_default/index.md) (#24140), but that branch changes run-form option selection (`restrict_options`, `_is_default_option`, client `validateInputs`). This one changes the editor string conversion (`_parameter_option_def_to_tool_form_str`, `_string_to_parameter_def_option`). The functions are identical from `release_25.1` to `dev`, so this branch can target an older release. It targets `release_26.1` because the fix changes the editor field's syntax (backslash escapes), so it's not a pure bug fix. The empty-option symptom only reaches the run form once #24140 lands, but the other losses happen on every release.
