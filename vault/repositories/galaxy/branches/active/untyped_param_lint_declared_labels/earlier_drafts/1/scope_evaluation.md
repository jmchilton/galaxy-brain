# Scope evaluation

**Recommendation: expand scope modestly.** Keep the client fix as is. Also narrow the backend `WorkflowModule.get_informal_replacement_parameters` for tool steps (`lib/galaxy/workflow/modules.py` ~3504) to `RenameDatasetAction.newname`, with one API or unit test, so the run form and the editor follow the same rename-only rule. Retarget from `dev` to `release_26.1`: the branch cherry-picks onto it cleanly, and the bug is present in every supported release. If the integration test turns out cheap, also have `extract_untyped_parameter` connect to an existing `parameter_input` that already has the requested label, instead of adding a duplicate input. That last part is optional and must not block the PR. The attributes "Parameters" list side effect is acceptable and should be called out in the PR body.

## Possible Decompositions

The branch is 139+/30− lines across 5 files. That is over 100 lines, but none of it is generated. Its commits already fall into clean layers: `ab51b21a059` baseline tests, `c10a9a88099` refactor, `91ac72393ce` fix, `3d381403e21` E2E.

- **A. One PR (as is, or with the expansion).** It contains baseline, refactor, fix, E2E, plus the backend narrowing as a 5th commit. It lands as a single unit.
- **B. Client PR, then backend PR.**
  1. The 4 existing commits.
  2. Then, as a separate small PR, backend `get_informal_replacement_parameters` narrowing plus an API test, and optionally the extract label reuse.

  Either order works. Backend-first makes the "same rule as run form" claim true before the client PR lands.
- **C. Baseline + refactor, then fix + E2E.**
  1. `ab51b21a059` and `c10a9a88099`, which make no behavior change.
  2. Then `91ac72393ce`, `3d381403e21` and any expansion.

  The first PR is a pure test/cleanup PR, so it would target `dev` under the "missing tests → dev" convention. That would split the base branches.

## Scopes considered

### 1. As implemented (client only, `dev`)

The editor lint (`getUntypedWorkflowParameters`) skips rename `${name}` when a `parameter_input` is labelled `name`, and scans only `RenameDatasetAction.newname` among post-job actions. Tool-state `${...}` is still flagged. The change has unit tests and an E2E test.

| Pros | Cons |
|---|---|
| - Small, reviewed (Codex: no findings; thermo-nuclear: approve), red-to-green verified at unit and E2E level.<br>- Fixes the reported loop: the extract fix never cleared the warning.<br>- No API change. | - The editor now disagrees with the run form for non-rename `${X}`: the backend still reports tag-action `${X}` as a replacement parameter, so the run form prompts for a value that `TagDatasetAction` ignores.<br>- The attributes "Parameters" list now drops tag-only `${X}` while the run form still prompts for it.<br>- The debrief's claim "same rule as the run form" is true only for rename.<br>- `dev` base has no stated justification under the release policy. |

<details>

- Side effect: the attributes "Parameters" list (`WorkflowAttributes.vue` via `Index.vue` `ensureParametersSet`) now shows only what the run form would prompt for. Declared-label renames and non-rename post-job action args no longer appear.
  - For declared labels, this is what the user wants: those names are formal inputs, not informal parameters.
  - For tag-only `${X}`, it is correct by runtime semantics, but it is inconsistent with the run form until the backend is narrowed.
- Runtime check: the only consumer of `replacement_dict` in `lib/galaxy/job_execution/actions/post.py` is `RenameDatasetAction` (lines 196, 276 and 298 are all inside that class).
  - The run form's rename-only behavior would therefore be strictly more correct.

</details>

### 2. Expand: narrow backend `get_informal_replacement_parameters` to rename (recommended)

Restrict the tool-module implementation to `RenameDatasetAction` `newname`, mirroring the editor and `_iterate_over_rename_pjas`. The run form then stops prompting for `${X}` that appears only in a non-rename action.

| Pros | Cons |
|---|---|
| - Makes the backend method, the canonical owner of "what's an informal replacement parameter", agree with the editor, the runtime, and the extract refactor.<br>- Resolves the mismatch flagged in the thermo-nuclear review.<br>- Makes the attributes-list side effect fully consistent with the run form.<br>- About 5 lines. The method is identical on `release_25.1`, so it backports cleanly.<br>- Low regression risk: every existing `${...}` test workflow (`replacement_parameters_*.gxwf.yml`, `optional_param_default_value.gxwf.yml`) uses `rename:` only. | - Small user-visible change to run-form prompts and to the `replacement_parameters` field of the run API.<br>- Workflows that relied on the useless tag prompt lose it, harmlessly.<br>- Adds a backend test to a client-only branch, and the commit mixes layers. |

<details>

- `SubWorkflowModule.get_informal_replacement_parameters` aggregates its child steps' parameters and filters by `input_steps` labels, so it inherits the narrowing for free.
- A test could be a unit test on the module, or an API test that fetches the run form for a workflow with a tag `${X}` and a rename `${Y}` and checks that `replacement_parameters == ["Y"]`.

</details>

### 3. Expand: base on a release branch instead of `dev` (recommended)

Retarget the PR to a release branch per `GX_DEVELOPMENT.md`.

| Pros | Cons |
|---|---|
| - The bug is present on every supported release. `parameters.ts` is identical on `release_26.1`/`release_26.2` and only 2 lines different on `release_25.1`.<br>- A simple, clean, low-risk fix, which the policy pushes toward an older branch.<br>- A simulated cherry-pick (`git merge-tree`) of the 4 commits onto `release_26.1` and `release_26.2` is clean. The selectors the E2E test relies on (`linting formal inputs`, `best_practices`) exist on both. | - `release_25.1` is the oldest supported branch with the bug (25.1.0 shipped 2025-12-12), but the cherry-pick conflicts in `test_fixtures.ts` and `test_workflow_editor.py`. Tests would need adapting, while `parameters.ts` and `navigation.yml` merge cleanly.<br>- Severity is low (a lint false positive with a failing fix), which argues against the oldest branch. |

<details>

- Release candidates:
  - `release_26.2` is untagged; it is the in-progress release.
  - `release_26.1` is the latest tagged release (26.1.1, 2026-08-04).
- `release_26.1` balances the policy: the backport is clean, the fix ships to the current release, and it merges forward.
- `release_25.1` is defensible if John prefers the strict oldest-supported rule. The cost is resolving the two test-file conflicts.
- Under the "missing tests → dev" memory rule, only a tests-only PR goes to dev. This branch carries a real fix, so that rule doesn't force `dev`.

</details>

### 4. Expand: make `extract_untyped_parameter` reuse an existing labelled input (optional)

In `_apply_extract_untyped_parameter` (`lib/galaxy/workflow/refactor/execute.py:326`), when a step already has `new_label`:
- if it is a `parameter_input` of a compatible type, connect the target tool inputs to it and skip `add_input`;
- otherwise, raise a clear `RequestParameterInvalidException`.

| Pros | Cons |
|---|---|
| - Closes the remaining duplicate-label hole. The editor still (correctly) flags tool-state `${sample}` when a `sample` parameter input exists, but today the offered fix fails with `Duplicated step label`. With this change the fix would wire the input to the existing parameter.<br>- Gives a clear error for rename `${data_input_label}`, which is still flagged and whose fix also hits the duplicate label.<br>- Fixes the backend gap listed in the initial debrief's "Not done". | - The editor no longer offers the fix for the original declared-label rename case, so this only helps tool-state and data-label cases. Those are adjacent symptoms, not the reported one.<br>- Needs a type-compatibility check (text vs integer/float) and an integration test in `test/integration/test_workflow_refactoring.py`, which is slow to run locally.<br>- Larger than scope 2. Mixing refactor-API semantics into a lint fix may draw review questions. |

<details>

- A minimal alternative is a guard alone that raises a clear error when the label exists. That only improves the error message, because the rebuild already raises `DuplicatedIdentifierException`.
- Reuse is the more valuable version, but only if the type check stays simple.

</details>

### 5. Expand: unify the declared-label rule with the run form `Run/model.js` (rejected)

Share one helper between the editor and `model.js` `_handleWorkflowParameter`.

| Pros | Cons |
|---|---|
| - A single client-side definition of the rule. | - The thermo-nuclear review found the inputs differently shaped (run API `step_type`/`step_label` vs store `type`/`label`). An adapter would cost more than the 4-line `Set`.<br>- Churn in legacy JS.<br>- Scope 2 removes the real duplication (which args count) at its source in the backend instead. |

### 6. Expand: mid-string tool-state `${X}` and subworkflow-internal post-job actions (rejected)

Make the extract fix handle tool-state values that contain `${X}` mid-string, and have the editor lint scan inside subworkflows.

| Pros | Cons |
|---|---|
| - Covers more legacy-workflow shapes. | - These are separate features with different semantics: mid-string extraction needs string templating that a connected input can't express. They are unrelated to the reported false positive.<br>- The editor lint never descended into subworkflows; the run form handles nested ones via `SubWorkflowModule`. |

### 7. Contract: client lint fix without the E2E, or without the rename-only scan (rejected)

Drop the E2E test, or keep scanning every post-job action argument and only add the declared-label skip.

| Pros | Cons |
|---|---|
| - Smaller diff. | - The E2E is the only test of the user-visible loop (fix → warning clears), and it is already stable on both drivers.<br>- Keeping the all-arguments scan leaves a warning whose fix always fails, for tag-only `${X}`. |
