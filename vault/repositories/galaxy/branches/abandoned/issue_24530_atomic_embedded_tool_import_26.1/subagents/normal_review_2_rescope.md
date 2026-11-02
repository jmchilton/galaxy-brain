# Normal review 2 (post re-scope) debrief

Verdict: no blocking bugs. I made no changes.

Not acted on:
- **Copy scope closes before `workflow.copy` and the caller's commit, which could orphan toolbox entries: doesn't apply.** Every copy is a `GalaxyUserTool`, and `load_dynamic_tool` never caches those (`toolbox/base.py`, "UDTs are resolved per-request"). Nothing is left in the toolbox, and the flushed rows disappear with the uncommitted session.
- **No test for `b47fbef2c2c`: partial failure isn't reachable.** The permission check fails before the first copy, and stored tools have already passed lint. The review agrees.
- **Docstring dependence on the caller committing**: the docstring already states it, and there is one caller.
- **Double flush in `_save`**: harmless. The association id needs the first flush.

<details><summary>Full review</summary>
Caller checks are OK: `_import_shared_workflow` commits right after the copy, and the API and legacy controller paths both go through it. The rollback is safe because nothing of the caller's is pending yet. No `create_*` caller lands inside a scope unexpectedly.
</details>
