Fix 🎯 #24188 - `${label}` renames inside a subworkflow use the text value when the label's input is fed by an expression tool, not the dataset's Python repr.

The three new framework tests: the issue's `__BUILD_LIST__` repro (text input → "Pick parameter value" → subworkflow text input), plus mapped-over and tool-output variants, with `moocow` as the outer text input:

| Renamed output | `release_26.1` | This branch |
| --- | --- | --- |
| `__BUILD_LIST__` collection (the issue) | `<galaxy.model.HistoryDatasetAssociation(9) at 0x13b3f9450> renamed` | `moocow renamed` |
| Mapped-over `cat` collection and its elements | `<galaxy.model.HistoryDatasetAssociation(7) at 0x1376ded50> suffix` | `moocow suffix` |
| Tool dataset outputs, native `pick_value` output | `<galaxy.model.HistoryDatasetAssociation(1) at 0x136c89310> name` | `moocow name` |

The left column is the actual output from the new framework tests with `lib/galaxy/workflow/run.py` reverted to `release_26.1`.

A subworkflow's text input that is connected to an expression tool holds the tool's `expression.json` dataset, not a string. Tool steps inside the subworkflow already read the value from that file. But `WorkflowProgress.set_outputs_for_input` stored `str(dataset)` for `${label}` replacement. This branch stores `str(replace_expression_json_dataset(dataset, step))`, which is the issue's suggested fix and uses the reader tool inputs already use.

***The subworkflow step already waits for its parameter datasets to be ready before any inner step runs, and fails if they fail (`SubWorkflowModule.execute` → `compute_collection_info` → `replacement_for_input`). So the storage fix needs no new dependency on dataset state. The only new gate is a read of the file itself, for shared-filesystem lag (see Implementation).***

<details><summary>Implementation</summary>

- `run.py` `set_outputs_for_input`: store the resolved value. Primitive inputs are unchanged, since `replace_expression_json_dataset` passes non-datasets through.
- `run.py` `subworkflow_progress`: read the expression.json file for `parameter_input` subworkflow inputs while building the child progress, and throw the value away. This handles a shared filesystem that hasn't shown the file yet: the whole subworkflow step is delayed (and fails after the existing 60s grace period). Without it, only the inner input step is delayed, and an inner step that isn't connected to it, like the issue's `__BUILD_LIST__`, can schedule and rename with a literal `${Inner title}`.
- All runtime replacements are still resolved, not only the ones a step's PJAs reference. Renames expand `#{input}` before `${label}`, so the set of names a rename needs can't be known in advance.

</details>

## Why adding a test feature to 26.1

***The first commit adds one key to the workflow test format: `metadata: {name: ...}` on a `class: Collection` output. The bug is a wrong collection name, and without this key the only place to check a collection name is an API test. A key added only on `dev` couldn't be used by a 26.1 fix's tests, so the fix would ship API tests now that someone later rewrites as framework tests. Adding the key here lets the fix ship with the right tests, in the right framework, once.***

Until now a workflow framework test could check a collection's type, element count and elements, but not its name. `doc/source/dev/writing_tests.md` sends workflow-evaluation tests to `lib/galaxy_test/workflow/`. The alternative is what this branch first had (kept on the alt): two API tests in `test_workflows.py`. Each inlines the workflow and job YAML, runs it, fetches the invocation and then the collection, and asserts by hand, which repeats what the framework runner already does. They also needed a new invocation-output helper. With the key, both collection cases are plain `.gxwf.yml`/`-tests.yml` pairs next to the existing `replacement_parameters_*` tests and the dataset case. The branch adds no API tests.

- **It mirrors the existing format.** Dataset outputs already assert their name with `metadata: {name: ...}`. A top-level `name` on an output can't be used, because the test runner (and planemo) overwrite it with the output label.
- **It's strict and only adds.** `CollectionMetadata` declares only `name`, so test-format validation (e.g. `test_validate_workflow_tests`) rejects any other key. Collection `metadata` used to be rejected entirely, so no existing valid test file changes meaning. XML tool tests are unaffected.
- **It's shared.** The check lives in `verify_collection`, so planemo workflow tests get it too, for outputs that also declare `element_tests` (see Risks).
- **It can be split off.** It's the first commit, with its own unit tests, so it can become a separate PR if reviewers prefer.

<details><summary>What the commit touches</summary>

- `galaxy.tool_util_models`: `CollectionMetadata` and `TestCollectionOutputAssertions.metadata`.
- `TestCollectionOutputDef.metadata`, carried through `from_dict`/`to_dict`.
- `verify_collection`: the name check, with errors in the same style as the existing count checks: `Output collection 'out1': expected to have name [moocow renamed], but it had name [...]`.
- `client/src/components/Tool/ToolSourceSchema.json`, regenerated by `rebuild.py`.

</details>

## Risks

The fix is a two-way door. The one lasting commitment is the new `metadata: {name: ...}` key for Collection outputs in the published test format; it's additive and matches dataset outputs.

<details><summary>Risk Details</summary>

- Workflow test files and planemo users can start depending on `metadata.name` for collections, so removing it later would break them.
- Planemo's `for_collections()` only recognizes Collection outputs that have `element_tests`. A planemo test that asserts only `metadata.name` would fall through to the file checker. That limit already applies to `element_count`-only assertions; it's a planemo-side follow-up.
- If an expression dataset is purged by hand while its subworkflow is still scheduling, the invocation now fails. Base already fails in that case for inner tool steps that consume the value. `DeleteIntermediatesAction` skips active invocations and only deletes, so automatic cleanup can't trigger this.
- A mapped expression *collection* feeding a subworkflow text input still renders as `<HistoryDatasetCollectionAssociation(...)>`. This is unchanged from base, and fixing it needs a per-job replacement dict.

</details>

<details><summary>Risk Review Advice</summary>

Check the read-and-discard pre-read in `subworkflow_progress`: it's guarded to `parameter_input` subworkflow inputs, so data inputs fed by expression.json are unaffected. On the test-format side, check that `metadata: {name:}` is the key you want to support long term.

Forward merge to `release_26.2`/`dev` conflicts in 4 files. On 26.2 the test-format models moved to `galaxy/tool_util_models/_models.py`, so `CollectionMetadata` has to be added again there. `interface.py` and `test_modules.py` clash with the `X | None` typing upgrade. `ToolSourceSchema.json` needs regenerating with `rebuild.py`.

</details>

## Context

Targets `release_26.1`, where it was reported. `release_25.1` and `release_26.0` also have the bug but lack `read_expression_json`/`replace_expression_json_dataset`, so fixing them would mean backporting the expression.json reader too.

Alternative kept on 🌿[`issue_24188_subworkflow_rename_expression_json_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24188_subworkflow_rename_expression_json_alt_original_scope) - the one-line fix without the `subworkflow_progress` pre-read, so a filesystem-lagged file can still produce a literal `${label}` in unconnected inner steps. Its collection-name cases are API tests in `test_workflows.py`, written before the `metadata: {name:}` key existed.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the scope: the storage-line fix plus the filesystem-lag pre-read.</summary>

The first evaluation added the `subworkflow_progress` pre-read. A fresh evaluation after re-hardening said to keep that scope. Going back to the one-line fix would reopen a real lag edge just to save 5 lines. Mapped expression collections need new per-job plumbing. `PickValueModule` not reporting its informal `${x}` names is a separate small 26.1 bug, better as its own PR. Both evaluations ran before the tests moved to framework tests; that move doesn't change the source scope.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No blockers; the read-and-discard pre-read stays, since all three ways to remove it are worse.</summary>

The earlier round cut a larger draft down to the one-line storage fix. In the latest round:
- Resolving to a primitive in `subworkflow_progress` was rejected: it changes the recorded inner inputs and step outputs.
- Seeding the child's `runtime_replacements` was rejected: it adds plumbing and the storage line still has to change.
- Dropping the pre-read is the alt branch.

The `parameter_input` guard is required, so data inputs fed by expression.json aren't read.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Each new test fails on the base branch at its own assertion; one weak test was strengthened, one overlapping test dropped.</summary>

- `test_collection_output_metadata_unknown_key_rejected` passed on the base branch, where any `metadata` was rejected. It now pins the `extra_forbidden` error to `metadata.dbkey`.
- The unit test for the stored replacement value was dropped, since all three framework tests cover the same line with real objects.
- The `__BUILD_LIST__` case got its own workflow file. When it shared a file with the dataset renames, a failure on an earlier output hid it on the base branch.

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding, the mapped expression-collection case, recorded as a follow-up.</summary>

Codex ran a read-only review, with only the issue and the intended behavior as its brief. It found the HDCA repr for mapped expression collections, which is the same on base. An earlier round caught that filtering replacements to the names a PJA references broke second-order `#{input}` → `${label}` substitution, so all replacements are resolved.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>The expression.json test helper moved to <code>workflow_support.py</code> in its own commit.</summary>

The `expression_json_hda` helper moved from `test_modules.py` to the shared `test/unit/workflows/workflow_support.py`, so the new `test_workflow_progress.py` test can use it. It's a pure test refactor, and the base unit suite still passes.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? If the expression.json file is still unreadable after the 60s grace period, the invocation fails with the existing unreadable expression.json error, as tool steps that read the value already do, instead of renaming with a repr.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The scheduler unit test checks that an unreadable expression.json delays the outer subworkflow step. It fails on the base branch and on the alt. The tool_util tests check the behavior of the new test-format key.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A: every new test covers new behavior or the fix.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Only subworkflows whose rename actions use `${label}` for a text input fed by an expression tool. They got the repr before, and get the value now.
- [x] Who hits this in practice and what is the evidence? The #24188 reporter, on 26.1.1, with a minimal workflow that uses only built-in tools.
- [x] Were simpler or existing approaches considered? Yes. Resolving at the use site in each module's PJA path, and filtering replacements to the names a PJA references, were tried and dropped in favor of the one-line storage fix.

<details><summary>Approaches considered</summary>

- **Resolving at the use site** in `ToolModule`/`PickValueModule` touched `modules.py` and duplicated the readiness check the subworkflow step already does.
- **Filtering replacements to the referenced names** broke `#{input}` → `${label}` second-order substitution.
- **Resolving to a primitive in `subworkflow_progress`** changes the recorded inner invocation inputs.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] Instructions for manual testing are as follows:

<details><summary>Tests and manual steps</summary>

- **Framework workflow tests** in `lib/galaxy_test/workflow/`. Each fails with the HDA repr when `run.py` is reverted to `release_26.1`.
  - `replacement_parameters_nested_expression`: tool dataset renames and a native `pick_value` rename.
  - `replacement_parameters_nested_expression_mapped`: mapped-over subworkflow; checks the collection name and the element name.
  - `replacement_parameters_nested_expression_collection`: the issue's `__BUILD_LIST__` repro.
- `test/unit/workflows/test_workflow_progress.py::TestWorkflowProgress::test_subworkflow_unreadable_expression_json_parameter_delays_subworkflow`: an unreadable expression.json delays the subworkflow step.
- `test/unit/tool_util/test_verify.py::test_verify_collection_name`, plus 2 model tests in `test/unit/tool_util_models/test_output_assertions.py`.
- Manually: import the workflow attached to #24188 and run it with Title = `test`. The list should be named `test renamed`.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
