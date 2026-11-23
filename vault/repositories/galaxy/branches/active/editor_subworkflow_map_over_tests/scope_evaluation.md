Run via claude-opus-5-5 at high effort.

**Recommendation: a modest expansion. Keep the client-side `terminalFactory` fallback and both commits as they are, and make two small additions. First, retarget the PR from `dev` to `release_26.2`. The bug ships there, the four touched files are byte-identical between `release_26.2` and the branch base `65e6daff233`, and `git merge-tree` applies the branch cleanly. Second, finish the `DataCollectionStepInput` type correction that the fix commit started: drop its required `fields` and `column_definitions`, which neither tool nor subworkflow inputs ever send. Leave server code alone. Nothing found makes a server-side move necessary for correctness.**

`terminalFactory` is the only client reader of a step input's `collection_types`, so the fallback covers every editor consumer: connection menu, drop, linting, `useTerminal` and the map-over walks. The server's `map_over.py:_declared_collection_input_types` already reads the singular `collection_type` as its last fallback, and `test/unit/workflows/test_modules.py::test_subworkflow_new_inputs_collection_type` pins the singular field the client now reads. `_workflow_to_dict_editor` passes `get_all_inputs(connectable_only=True)` through unchanged. Client and server now read the same payload the same way, with no server edit.

Not recommended, but worth a follow-up issue: subworkflow inputs always declare `extensions: ["data"]`, whatever `format` the inner input step declares. So the editor also accepts any datatype on a format-restricted subworkflow input. It is the same family of bug (the editor is looser than the inner input's declaration), but only the server can fix it. That fix lives in the `get_all_inputs` John chose not to touch, and it would also change `InputModule.get_filter_set`, which builds run-form format filters from downstream inputs' `extensions`.

# Scope evaluation

The branch has two commits on `65e6daff233` (`origin/dev`), head `764d2bf8882`. It changes 4 files, +139 −2:
- 69 lines of tests;
- 61 lines of hand-maintained JSON fixture (fixture step 37);
- 11 lines of source in `terminals.ts` and `workflowStepStore.ts`.

None of it is generated, so the total is just over 100 lines.

## Possible Decompositions

1. **One PR (as is).** `f863340af98` (fixture step 37 and the map-over tests, which pass on the unfixed editor) and `764d2bf8882` (the fallback, the type widening and two failing-without-fix tests).
2. **Baseline, then fix.**
   - PR A: `f863340af98`. Test-only, and it pins editor subworkflow map-over semantics on `dev`. #23676 then drops its own copy of the fixture step on rebase.
   - PR B: `764d2bf8882`, after A. Its two tests use A's nested `describe`, fixture step 37 and the `collectionOutput` / `connectAccepted` / `expectEveryOutputMappedOverList` helpers, so it can't land first without carrying them.
3. **Fix to the release, baseline to `dev`.**
   - PR A (`release_26.2`): fixture step 37, the helpers and nested `describe`, the fallback, the type change and its two tests. That means reshaping the commits so the helpers travel with the fix.
   - PR B (`dev`, after A merges forward): the remaining three map-over tests.
   - This splits the history the baseline refactor kept, so it costs a rebase that options 1 and 2 don't.

## Scopes considered

### 1. As implemented

Fixture step 37 is a subworkflow step in the server's real payload shape, with a dataset input, a singular `collection_type: "list"` collection input and a fixed `list` output. Map-over tests pin how the editor maps it. `terminalFactory` falls back to `collection_type` when `collection_types` is absent, and `DataCollectionStepInput` types both fields as optional. Target: `dev`.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes a real bug: `paired` connected to a subworkflow's `list` input, and `list:list` connected directly with no map-over.</li><li>One translation point, so every terminal consumer picks it up.</li><li>Baseline-then-fix history; both fix tests fail without it.</li><li>No scheduling risk, since no server code changes.</li></ul> | <ul><li>`dev` only, while the bug is in `release_26.2` (rc1) and `release_26.1` too.</li><li>It corrects one wrong field of `DataCollectionStepInput` and leaves two others wrong in the same interface.</li></ul> |

### 2. Retarget to `release_26.2` (recommended)

Same commits, rebased onto `release_26.2` and merged forward to `dev`.

| Pros | Cons |
| --- | --- |
| <ul><li>A user-visible editor bug in the release now in rc gets fixed there.</li><li>`terminals.ts`, `terminals.test.ts`, `parameter_steps.json` and `workflowStepStore.ts` are identical on `release_26.2` and `65e6daff233`, so the rebase is a no-op on content. Fixture step 37 keeps its id because steps 34-36 exist there too.</li><li>#23676 on `dev` gets it on merge-forward, exactly as now.</li></ul> | <ul><li>The fork's CI has to rerun against the new base.</li><li>The base is John's choice. The record's `upstream_base_branch`, compare link and queue entry all have to change together.</li></ul> |

<details>

`release_26.1` has the same `collection_types: terminalSource.collection_types` line and the same server payload. Galaxy merges forward, so `release_26.2` is the lowest target worth proposing, and `26.1` is optional. Older releases weren't checked.

</details>

### 3. Finish the `DataCollectionStepInput` type correction (recommended)

Remove `fields: FieldDict[]` and `column_definitions: SampleSheetColumnDefinitions` from `DataCollectionStepInput`, along with their now-unused imports, in the fix commit next to the `collection_types` / `collection_type` change.

| Pros | Cons |
| --- | --- |
| <ul><li>Neither `ToolModule.get_all_inputs` nor `SubWorkflowModule.get_all_inputs` sends them, so both are type fiction. They describe the input module's tool state, which `FormInputCollection.vue` already types for itself.</li><li>No client code reads either field from a step input.</li><li>About 4 lines, all in the interface the fix already edits and documents.</li><li>No runtime effect.</li></ul> | <ul><li>Type-only, so it fixes no user bug.</li><li>Not yet compiled. `vue-tsc` should confirm that no fixture or test literal relies on the fields.</li></ul> |

<details>

The baseline refactor rejected splitting the `collection_types` widening into its own commit, because that would spread one type edit across two commits. That argument favors this addition: the whole interface correction belongs in one commit. The fields arrived with `17de736ccba` ("record ui", 2025-03-12). Making them optional instead of removing them would be the minimal version.

</details>

### 4. Tool/subworkflow union type for collection step inputs (thermo-nuclear recommendation)

Split `DataCollectionStepInput` into a tool shape (plural `collection_types`) and a subworkflow shape (singular `collection_type`, `input_subworkflow_step_id`), and have `declaredCollectionTypes` narrow on which one it has.

| Pros | Cons |
| --- | --- |
| <ul><li>The two-shapes rule moves from doc comments into the type system.</li></ul> | <ul><li>The payload has no discriminant: both shapes say `input_type: "dataset_collection"`. Narrowing would test for `input_subworkflow_step_id`, which `BaseStepInput` already carries for every input kind.</li><li>One reader. `??` plus the doc comments already state the rule.</li><li>The existing test casts (`(step.inputs[0] as DataCollectionStepInput).collection_types = ...`) churn for no behavior change.</li></ul> |

### 5. Shared server-generated `InputDescription` contract

Expose the server's `InputDescription` TypedDict through the API schema and generate the editor's step-input types from it.

| Pros | Cons |
| --- | --- |
| <ul><li>Would have prevented this bug and the `fields` / `column_definitions` fiction alike.</li><li>The server-side change is schema-only, with no scheduling effect.</li></ul> | <ul><li>The editor-style workflow download is an untyped dict today. Typing it is a separate project, far bigger than this branch.</li><li>It overlaps #23676's work on the same payloads.</li></ul> |

### 6. Server emits `collection_types` for subworkflow inputs (decided against)

`SubWorkflowModule.get_all_inputs` also sets the plural `collection_types: [collection_type]`, and the client stays unchanged.

| Pros | Cons |
| --- | --- |
| <ul><li>One wire shape for both input kinds.</li></ul> | <ul><li>It changes scheduling. `_declared_collection_input_types` prefers `collection_types` over `progress.subworkflow_structure`, so a mapped-over subworkflow invocation would consume the inner declared type instead of the outer structure.</li><li>The client fallback is already complete (single reader), so there is no correctness reason to move it. This is John's decision.</li></ul> |

### 7. Declared formats on subworkflow inputs (follow-up issue)

Have `SubWorkflowModule.get_all_inputs` declare the inner input step's `format` as `extensions`, instead of always `["data"]`.

| Pros | Cons |
| --- | --- |
| <ul><li>The same "editor looser than the inner declaration" bug, for datatypes.</li></ul> | <ul><li>Server-only. The client can't see the inner format.</li><li>It changes `InputModule.get_filter_set` run-form filtering for outer inputs connected to a subworkflow, which is a behavior change that needs its own review.</li><li>It touches the function John chose not to change here.</li></ul> |

### 8. Subworkflow end-to-end editor test

A Selenium variant of `test_map_over_output_indicator` that drops a real subworkflow, connects a list and checks the output badge and the rejection of a `paired` collection.

| Pros | Cons |
| --- | --- |
| <ul><li>The only test that exercises the real API payload, which is the drift that hid this bug.</li></ul> | <ul><li>Slow, and it duplicates what the unit tests prove once the fixture matches the server.</li><li>The server unit test `test_subworkflow_new_inputs_collection_type` already pins the singular field, and `_workflow_to_dict_editor` passes it through unchanged.</li></ul> |

### 9. Contract to tests only

Ship `f863340af98` alone, the original extraction from #23676, and file the editor bug separately.

| Pros | Cons |
| --- | --- |
| <ul><li>Pure test PR, trivial to review.</li></ul> | <ul><li>Leaves a confirmed, 18-line-fixable bug unfixed while its fixture and helpers sit in the same file.</li><li>Reviewers would ask for the fix.</li></ul> |

### 10. Fold the fix back into #23676

Drop this branch and carry the fallback in the standing subworkflow-mapping PR.

| Pros | Cons |
| --- | --- |
| <ul><li>Keeps all editor/backend subworkflow alignment in one place, which is what #23676 is about.</li></ul> | <ul><li>#23676 is large, in `author_work` and conflicting with `dev`, so a small, release-worthy fix would wait behind it.</li><li>This branch was extracted precisely so these pieces could be reviewed on their own.</li></ul> |
