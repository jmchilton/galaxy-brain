Acted on: made request context mandatory for both invocation serializers and removed the nullable-context branch. No outstanding implementation recommendation remains. Deferred: live API/browser reruns and PostgreSQL migration execution remain part of coordinator validation; this review did not execute them.

Unacted-on recommendations: none. Existing large modules were inspected, but the small cohesive additions do not justify unrelated decomposition. Accepted direct-lineage scope remains unchanged.

## Details

Reviewed the complete issue 24174 branch against `origin/dev`, including staged UI changes, backend/model/migration changes, API/unit/client/browser tests, generated API types, the implementation plan, initial implementation debrief, and both phase reviews. Applied the strict review prompt at `_shared/prompts/thermo-nuclear-code-quality-review.md`. Review reference: backend commit `3896a4742ba` plus then-current UI worktree changes; this report includes the focused serializer correction described below.

### Finding addressed

**Require context at the serialization boundary.** The new element lineage fields depend on the requesting user. Both serializer methods previously accepted `trans=None`, and their element branch silently omitted lineage in that mode. Every current caller already has and supplies context, so optionality added a mode with no legitimate caller and made future incomplete responses easy to introduce.

Changed `serialize_workflow_invocation()` and `serialize_workflow_invocations()` to require keyword-only `trans: ProvidesUserContext`; the element branch now depends only on the selected view. This deletes an unnecessary mode while preserving all current callsites. Repository-wide Python search found no omitted-context caller, including tests and other services.

### Structural assessment

- The indexed nullable self-reference is the minimal persistent model for immediate-source provenance and direct reverse lookup. A separate lineage table, transitive group identifier, or metadata parameter would add concepts without serving the accepted scope.
- Source validation lives in the workflow invocation service before run configurations are built. Passing the resolved model through every expanded batch configuration keeps persistence in the canonical request-to-model conversion and avoids re-decoding IDs or performing access checks in the lower workflow layer.
- Source and successor presentation lives in the existing invocation service serializer. Collection markers read the local FK through `is_rerun`, so ordinary list responses avoid source loads and reverse-lookup queries. Element views perform deterministic indexed direct-successor lookup and reuse the existing access policy. The helper catches the existing policy exceptions instead of duplicating history visibility rules in bespoke SQL.
- The latest-successor scan intentionally checks candidates until it finds an accessible one; an unconditional SQL limit would incorrectly hide an older accessible rerun. The current bounded fetch batches keep this straightforward. No speculative policy rewrite is warranted for this feature.
- The UI isolates its two related notices in a small typed component. Both run variants receive the same parent-owned source prop and add it at their existing payload boundaries. The existing card badges and grid converters handle list markers; no separate fetch orchestration was introduced.
- Reusable request export and model-store import retain their explicit attribute contracts. Database-local lineage does not leak into an accidental replay/import dependency.
- Migration operations use the canonical shared helpers and reverse their changes in dependency order. The SQLite test checks existing rows, FK enforcement, deletion behavior, and downgrade. PostgreSQL execution remains an explicit validation limit rather than an inferred pass.
- No file crosses from below 1,000 lines to above 1,000 lines. The touched run forms remain 371 and 828 lines; invocation detail remains 592, invocation service 428, and run-request module 739. Already-large model, workflow-service, and API-test modules receive focused additions in their existing canonical sections. Extracting unrelated surrounding code would increase scope without deleting feature complexity.
- No unnecessary wrapper, loose new model shape, cast, generic dispatcher, scattered special-case state, or partial-update persistence flow was introduced. The model assignment participates in the existing invocation transaction.

### Test and validation review

The diff includes API persistence/batch/access/replay coverage, migration and model-store coverage, expanded-form submission coverage, lineage component assertions, and a browser I → J → K flow using both forms with reload/navigation/list checks. Existing assertions were not weakened in the reviewed diff. The test challenge and E2E polish agents own further test refinement and execution.

For the focused serializer correction, ran a repository-wide callsite search and parsed the service with the worktree Python interpreter, asserting that both methods require context and all local calls supply it. Checks passed. No live servers were restarted and no commits were created by this reviewer. The coordinator should include the focused lineage API tests after its planned server restart to validate the final integrated branch.

Approval: no remaining structural or maintainability blocker found in the reviewed implementation. Final READY status still depends on the required execution, scope, screenshot, and handoff procedures owned by the coordinator.
