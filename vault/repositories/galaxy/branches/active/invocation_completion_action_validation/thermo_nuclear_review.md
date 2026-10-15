# Thermo-nuclear code quality review

No structural blocker found. Performed the strict shared maintainability review because this extraction touches dependency injection, despite its small diff.

The simplifying choice is to reuse the existing authoritative hook registry rather than add a schema enum, a second allowlist, or another registry instance. `_register_singleton` preserves the application's established lifetime and identity, while constructor injection gives the service a direct typed dependency. Registration follows the surrounding scheduling-manager pattern; the completion monitor continues receiving the same registry object. There is no new lookup fallback, optional service dependency, or magic resolution path.

The focused `_check_on_complete` helper keeps the invocation entrypoint readable and names the validation responsibility. Its two loops directly represent the existing `list[dict[str, Any]]` payload contract and inspect action names without changing each hook's configuration. No extra policy object, dispatcher, or generalized request-validation framework would delete meaningful complexity here; those would add machinery to a simple registry membership check.

The service remains below 1,000 lines (665 at review). The already-large application module gains only singleton wiring in the existing initialization location; this does not cross the file-size threshold. No casts, duplicated validators, scattered runtime branches, extra sequential I/O, or nonatomic persistence are introduced. The check instead prevents histories/invocations from being persisted for unknown names.

Considered moving action-name validation onto a new registry method. The registry currently exposes available names and execution; introducing a one-caller request-specific exception method would add indirection and couple the registry to the web request contract. Keeping membership validation at the service boundary is clearer for this change. Hook payload validation remains owned by existing hooks, consistent with the explicitly narrow scope.

No edits requested. Focused API positive/negative tests and existing hook tests are being run by the implementation agent; this reviewer did not duplicate them or modify code during execution.

Final validation reported by the implementation agent: new unknown-action API regression passed (1); existing registered-export and no-hook API controls passed (2); full existing hook tests passed. No review action remains.
