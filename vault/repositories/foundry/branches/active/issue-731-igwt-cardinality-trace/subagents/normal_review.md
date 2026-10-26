# Normal review debrief

Acted on all three bugs (verified on the egapx run first) and on most of the design and nit points, in `88e38f05`:
- Null-on-collection: step 53 (`__APPLY_RULES__`) reports `output: null` with only `ok` connections; `_sentinelToCollectionType` maps ANY to null. Null now counts as dataset only when the tool declares a dataset output and the path is clean.
- Subworkflow inner skips are invisible, so a null from a subworkflow is treated as unknown.
- The recipe now covers outputs that are workflow inputs (no `/`) and native `.ga` (`workflow_outputs[].label`).
- Moved the lookup recipe and caveats into `content/cli/gxwf/validate.md`; Mold step 3 links to it.
- eval: the handoff clause moved into the llm-judged property; dropped "until..." from the intro.
- "No static gate" is now stated once, in step 5. The scenario pins `@galaxy-tool-util/cli` 1.14.0.

Not acted on:
- Follow-up issue on the test-plan Molds tracing kinds where the plan is written: left for John (it widens scope).

<details><summary>Full review</summary>

Verdict: direction right, scenario real, but one correctness bug in the step-3 null-trust rule (counterexample in the evidence run) plus three edge-case gaps.

Real bugs: (1) null ≠ dataset even with clean connections (ANY_COLLECTION_TYPE → null; step 53). (2) skips inside subworkflows invisible (`_resolveSubworkflowOutputs` drops inner result; step_results top-level only). (3) outputSource split fails for input-as-output and native .ga.

Design: document --connections JSON shape in content/cli/gxwf/validate.md; no existing resolved_outputs note or plan-defect channel, handoff is fine; consider upstream-of-here follow-up in test-plan Molds.

Eval: split mixed deterministic/judged property; drop "until…".

Nits: scenario fixture uncommitted (pin version or accept prose); triplicated "no static gate"; validate-tests.md addition fine.
</details>
