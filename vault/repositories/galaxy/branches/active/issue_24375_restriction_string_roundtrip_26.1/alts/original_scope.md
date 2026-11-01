# Alt: original scope

Branch `issue_24375_restriction_string_roundtrip_26.1_alt_original_scope` at `13c2282e38c` is on the jmchilton fork.

This is the branch before the re-scope: the baseline tests, the escape-scheme fix and the minimal-backslash follow-up. It fixes every lossy case the issue lists for the editor's `value:label,...` string.

The parent branch adds one commit on top (`683d887a650`). That commit makes `step_state_to_tool_state` open a step with both `restrictions` and `suggestions` as restricted, where it used to open as suggestions and the next save dropped the restrictions. The scope evaluation ([earlier_drafts/1/scope_evaluation.md](../earlier_drafts/1/scope_evaluation.md)) recommended that expansion.
