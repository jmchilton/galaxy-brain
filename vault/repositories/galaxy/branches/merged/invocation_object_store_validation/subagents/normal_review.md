Parent disposition: acted on test helper reuse; no recommendations declined. Independent review found no remaining blocker.

<details>
<summary>Full independent review</summary>

Independent normal review: no production correctness findings remain. Reviewed the complete release-base diff and uncommitted expansion, request schema, shared selection validator, run-config construction/serialization and distributed-store integration controls.

The three explicit preferences and general/split exclusivity are checked before history creation. The relocated effective-output rejection preserves its original truthiness and message; internally derived subworkflow outputs are still computed later. Null/empty omitted behavior and valid split routing retain their existing predicates. Invalid option precedence changes are confined to requests with multiple errors.

Test-review action: replaced both new direct invocation POSTs with existing `WorkflowPopulator.invoke_workflow_raw`; retained all assertions. Fresh focused requests passed 6/6 after this adjustment. Prior expanded selection including compatible invocation passed 7/7; four real distributed-store workflow integration controls passed, including nested/split routing. Repository hooks pass. No declined correctness recommendations.

</details>
