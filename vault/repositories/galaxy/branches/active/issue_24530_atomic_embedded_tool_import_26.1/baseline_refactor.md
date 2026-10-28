No refactoring of the base branch was performed.

Re-checked `82a993c494a..HEAD` (8 commits) fresh. Every non-test change is part of the fix: `_save` and `rollback_tools_on_error` change commit timing; the wrapper/`_impl` split exists only to hold the scope; `unload_dynamic_tool` is a new capability; subworkflow flush and tag `flush=False` are required by deferred commits. The new tests fail on the base, so they aren't baseline tests. History left as is.
