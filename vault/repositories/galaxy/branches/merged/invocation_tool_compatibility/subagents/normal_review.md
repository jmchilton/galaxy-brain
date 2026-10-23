Parent disposition: acted on test helper reuse; no recommendations declined. Independent review found no remaining blocker.

<details>
<summary>Full independent review</summary>

Independent normal review: no production correctness findings remain. Inspected the full release-base diff plus expansion, toolbox has_tool/get_tool delegation, eager/lazy compatibility metadata, recursive reference collector and its workflow-list/agent consumers.

The request service resolves each complete tool reference before constructing histories, retaining user, exact-version and UUID lookup options. Missing tools still take diagnostic precedence over incompatible tools. Shared collection now applies its existing full-reference equality consistently when merging children, preserving first encounter order and distinct versions/UUIDs. Other consumers require reference identity rather than occurrence counts.

Test-review action: changed the three new invocation POST sites to `WorkflowPopulator.invoke_workflow_raw`, preserving payloads and all assertions. All 10 invalid-request cases pass after the adjustment; the prior expanded run passed 11 including compatible execution. Red evidence proves nested duplicate diagnostics were observable before the collector correction. Hooks pass. No declined correctness recommendations.

</details>
