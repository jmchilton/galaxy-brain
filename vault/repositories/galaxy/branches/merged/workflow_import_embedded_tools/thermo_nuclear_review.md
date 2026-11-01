No structural changes are required. The coordinator clarified the resolver's docstring to make its possible tool creation and session commit explicit. The branch puts embedded-tool creation in the existing dependency-loading phase and shares the existing permission and ownership policy with standalone module construction.

Items not acted on during this review:

- Optional type annotations remain deferred, consistent with the adjacent dictionary-based module construction API. Introducing a new workflow-step model just for this resolver would add a competing boundary.
- The extra owned-tool lookup and materialization are retained. Avoiding them through a skip-resolution flag or an import-specific cache would add state and permission-sensitive branches without improving the ordering guarantee.

<details>
<summary>Full quality review</summary>

Reviewed the complete branch diff against `origin/release_26.1`, the surrounding workflow dependency and step-construction loops, the dynamic-tool manager, direct module-construction callers, and the normal-review and test-challenge debriefs. Applied the thermo-nuclear review's structural, boundary, orchestration, and decomposition criteria. No implementation edits or Git operations were performed.

The resolver extraction earns its abstraction: it owns both user and admin embedded-tool creation and the user-tool reuse policy. Keeping that logic on `ToolModule` preserves the canonical behavior used by the workflow upload, module-building API, and recommendation callers. The importer receives only the resolved tool UUID and does not duplicate ownership or role decisions.

The added orchestration belongs in the existing dependency pre-pass. It introduces one tool-step guard beside subworkflow preloading and runs before any parent `WorkflowStep` is constructed. Recursive child workflows use the same construction method and complete before returning. A separate recursive scanner would duplicate the existing subworkflow loader's handling of inline, referenced, and fetched workflows; constructing every tool module in advance would add another lifecycle and retain more state than the fix requires.

Alternative fixes do not offer a simpler ownership model. Delaying individual output and PJA session additions would couple the importer to every association that may cascade a step into the session. Changing dynamic-tool creation to share the outer workflow transaction would require transaction-policy changes across additional callers. The pre-pass fixes the lifecycle boundary while retaining existing transaction semantics. Atomic rollback of tool creation after an unrelated invalid workflow step is not an invariant this branch introduces.

The helper remains usable by standalone module-building callers. Keeping its normal resolution check when modules are built avoids a new trusted-UUID flag or a bypass path. The resulting repeated lookup/materialization is an acknowledged cost rather than hidden state. No new enum, cache, cast, optional mode, pass-through wrapper, or parallel workflow representation is introduced.

The existing files already exceed 1,000 lines; this change crosses no size threshold. Adding the API cases beside existing embedded-user-tool tests keeps setup and permission helpers local. The two test methods cover distinct public import representations: format2 user tools and native admin dynamic tools. Their short fixture overlap does not justify an abstraction that would hide the actual serialized workflow shape. The parameter matrix expresses the relevant metadata and nested-workflow combinations without a full Cartesian expansion.

Validation evidence is behavioral: two baseline cases passed before implementation; six user-tool cases and two corrected admin cases fail on the base workflow manager with `NOT NULL constraint failed: workflow_step.workflow_id`; all ten strengthened import variants pass on the branch. The wider user-tool run passed 26 cases. Tests inspect retained outputs, rename actions, embedded definitions, and connections, using existing API populators. No mock-only scaffolding or UI-specific test layer is needed for the changed boundary.

No high-conviction code-quality regression or missed dramatic simplification was found.

</details>
