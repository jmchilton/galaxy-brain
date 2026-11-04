# Alt: original scope

Branch `issue_24722_unversioned_tool_preflight_26_2_alt_original_scope` on `jmchilton/galaxy`, head `ae1c7f50bc0`.

This is the fix as first implemented and hardened up to the scope evaluation: the baseline tests, `AbstractToolBox.get_tool_at_version`, and the fallbacks in the invocation pre-flight and `ToolModule.__init__`.

It differs from the parent by leaving out the last commit (`Name installed versions when an exact-version workflow tool is missing`). In the alt, a real exact-version mismatch still produces the original 400 text, e.g. `compose_text_param (version 0.0.1)`. Nothing says another version is installed, and the existing message assertions in `test_workflow_invocation.py` and `test_tool_source_storage.py` are unchanged.
