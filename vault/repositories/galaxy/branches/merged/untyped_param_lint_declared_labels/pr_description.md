Fix 🎯 #24379 - workflow editor flags rename `${name}` as untyped even when a parameter input with that label fills it.

The editor's best-practices lint warns about a rename's `${replaceme}`, and its one-click fix adds a parameter input `replaceme`, the intended fixed form. The lint then flags `${replaceme}` again, so the warning never clears; clicking again tries to add a second `replaceme` input, which the refactor rejects as a duplicate label. With this PR the warning clears after the fix:

| Before clicking the fix (rename `${replaceme} suffix`, no input) | After "extract untyped parameter" |
|---|---|
| ![Best practices: "This workflow uses legacy workflow parameters" warning with a fix link for Step 2 replaceme](screenshots/workflow_editor_best_practices_untyped_parameter.png) | ![Best practices: "Workflow parameters are using formal input parameters" is ok; new text input replaceme added](screenshots/workflow_editor_best_practices_untyped_parameter_extracted.png) |

Before this PR, the after-fix state still showed the warning (the E2E test fails on base at this check). The editor lint, the run form and runtime now agree on one rule:

| Where `${name}` appears | Filled at run time? | Editor lint before | Editor lint after | Run form prompt before | Run form prompt after |
|---|---|---|---|---|---|
| Rename `newname`, parameter input labelled `name` exists | ✅ from the input | ❌ warns | ✅ silent | ✅ no prompt | ✅ no prompt |
| Rename `newname`, no such input | ✅ from the run form prompt | ✅ warns | ✅ warns | ✅ prompts | ✅ prompts |
| Other post-job actions (tags, change datatype…) | ❌ never substituted | ❌ warns, fix fails | ✅ silent | ❌ prompts, value ignored | ✅ no prompt |
| Tool state value | ⚠️ by the run form only, not API runs | ✅ warns | ✅ warns | ✅ prompts | ✅ prompts |

✅/❌ mean right/wrong for that cell; ⚠️ means partly. Tool state still warns even with a matching input on purpose: API runs never fill it.

***Runtime substitution is unchanged. The only behavior that changes outside the editor: a workflow whose `${X}` appears only in a non-rename post-job action no longer gets an `X` prompt on the run form. Runtime never substituted those values (e.g. `add_tags: ["name:${X}"]` was always stored literally), so nothing a user typed there ever reached a job.***

The editor's Attributes → Parameters list follows the lint: it no longer lists rename names backed by an input or non-rename `${X}`.

***Targets `release_26.1` as a bug fix: the lint's own one-click fix can never clear the warning, and the backend change only stops prompting for values runtime already discarded.***

<details><summary>Implementation</summary>

- `client/.../Editor/modules/parameters.ts`: `getUntypedWorkflowParameters` scans only `RenameDatasetAction.newname` among post-job actions and skips names matching a labelled `parameter_input` step; tool-state `${...}` is still flagged. This mirrors `Run/model.js`, which already skips post-job action parameters that match parameter input labels.
- `lib/galaxy/workflow/modules.py`: `ToolModule.get_informal_replacement_parameters` (the run form's `replacement_parameters`) returns only rename `newname` names, matching `RenameDatasetAction._gen_new_name`, the only place runtime applies `replacement_dict`. `SubWorkflowModule` aggregates it, so subworkflows follow.
- A small no-op refactor first: one capture-group helper replaces `substring(2, length - 1)` slicing of `${...}` matches.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). ***It narrows the run form's `replacement_parameters` API field to names runtime actually substitutes;*** a client that read it to prompt for tag or datatype `${...}` would stop prompting for values that were already discarded.

## Context

Matches the untyped-parameter lint in galaxyproject/gxformat2#271 and jmchilton/galaxy-tool-util-ts#195, which already exempt declared-label renames. Alternative kept on 🌿[`untyped_param_lint_declared_labels_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/untyped_param_lint_declared_labels_alt_original_scope) - client-only fix on `dev`, without the backend run-form narrowing. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Re-scoped once: added the backend run-form narrowing and retargeted from <code>dev</code> to <code>release_26.1</code>; round 2 kept that scope.</summary>

- Kept out: making `extract_untyped_parameter` reuse an existing labelled input (no longer reachable from the lint for the reported case), a per-action "substituted names" hook replacing the `"RenameDatasetAction"` checks, moving ~6 inline run-form tests onto the new API helper, and sharing the `${...}` regex with `Run/model.js`. All are `dev` follow-ups.
- Not retargeted to `release_25.1`: low-severity lint bug, and the cherry-pick conflicts in editor test files.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve after two fixups: a reusable run-form API helper and a tighter backend loop.</summary>

- The single-purpose test helper became the general `_yaml_workflow_run_form` (upload + run-form download), a sequence written inline ~6 times in `test_workflows.py`.
- `get_informal_replacement_parameters` uses one guard and `set.update`, and tolerates `newname: None`.
- Deferred to `dev`: the polymorphic action hook and the shared client regex.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Moved the backend tests from mocked unit tests to the run-form API and dropped one redundant client test.</summary>

- The API tests assert the `replacement_parameters` field the run form consumes; the fix test fails on base with `['a', 'd', 't'] == ['a']`.
- Client vitest: 4 cases through the public function; the per-name skip and rename-only scan cases fail on base.
- The E2E test is red on base at its final lint-ok check.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings.</summary>

It read the changed files plus the runtime rename action, refactor executor, run request, run form model and editor lint components.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No further refactoring; the client capture-group helper already sits in its own commit before the fix.</summary>

The backend fix has nothing worth splitting out with base behavior kept.

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The Best Practices "Workflow parameters" item stays a warning with an extract link, as today for tool-state `${X}` and for rename `${X}` with no matching input.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Vitest goes through `getUntypedWorkflowParameters` on built steps, and the API tests read the run form payload; no mocks.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. Client and API baselines are the first two commits and pass on base.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Workflows with `${X}` only in non-rename post-job actions stop prompting for `X` on the run form; workflows whose rename `${X}` matches a parameter input label stop getting the lint warning.
- [x] Who hits this in practice and what is the evidence? Authors who name outputs after a parameter input (`rename: "${sample_name} reads"`); #24379 reproduces it, and the run form already exempts these names.
- [x] Were simpler or existing approaches considered? Yes.

<details><summary>Approaches considered</summary>

- Client-only lint fix (kept as the alt branch): leaves the editor and run form disagreeing about tag-only `${X}`.
- Making `extract_untyped_parameter` reuse an existing labelled input: no longer reachable from the lint for the reported case; needs a type check and a slow integration test. `dev` follow-up.
- A per-action "substituted names" hook in place of the `"RenameDatasetAction"` checks: touches every action class, too much for a release branch. `dev` follow-up.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `client/src/components/Workflow/Editor/modules/parameters.test.ts`: 4 cases; 2 fail on base.
- `lib/galaxy_test/api/test_workflows.py::test_run_form_replacement_parameters_*`: baseline + fix; fix test fails on base.
- `lib/galaxy_test/selenium/test_workflow_editor.py::test_best_practices_extract_untyped_rename_parameter`: green under Playwright and Selenium; red on base at the final lint check.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
