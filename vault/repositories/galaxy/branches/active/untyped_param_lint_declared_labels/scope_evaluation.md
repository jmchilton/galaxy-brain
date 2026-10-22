# Scope evaluation (second, after re-scope)

**Recommendation: keep scope as implemented.** The branch is based on `release_26.1` and carries the client lint fix plus the backend rename-only narrowing of `ToolModule.get_informal_replacement_parameters`, so the editor lint, the run form, runtime (`RenameDatasetAction`) and the extract refactor all follow one rule. This covers both expansions the first evaluation recommended (scopes 2 and 3). The one optional item left out, `extract_untyped_parameter` reusing an existing labelled input, was explicitly marked "must not block". It also doesn't touch the reported symptom any more, because the editor no longer offers the fix for declared-label renames. The deferred dev follow-ups are refactors that churn every action class or legacy JS, or unrelated tests, on a release branch: the polymorphic action hook, migrating inline run-form tests to `_yaml_workflow_run_form`, and sharing the `${...}` regex with `Run/model.js`. They belong on `dev`. No scope change is recommended, so the branch should not park.

## Possible Decompositions

The branch is 181+/35− lines across 7 files, none of them generated. In order:
- `f3775945b2e`: client baseline
- `6c9eb77d2fe`: API baseline
- `e9b935736d4`: client helper refactor
- `6fd00c8e64a`: client fix
- `5fcd37e1fc0`: E2E
- `e953ff7344a`: backend narrowing

- **A. One PR (as is).** All 6 commits land as one unit. The "same rule as the run form" claim is true at merge time.
- **B. Client PR, then backend PR.**
  1. Client baseline, refactor, fix and E2E (`f3775945b2e`, `e9b935736d4`, `6fd00c8e64a`, `5fcd37e1fc0`).
  2. API baseline and backend narrowing (`6c9eb77d2fe`, `e953ff7344a`).

  Neither depends on the other, so either order works. Landing backend first makes the run form consistent before the attributes-list side effect ships.
- **C. Baselines first, then the change.**
  1. The two "Baseline tests" commits plus the no-op helper refactor. These are tests and cleanup only, so under the "missing tests → dev" convention this piece would naturally target `dev`, which splits bases.
  2. Then the fix, the E2E and the backend narrowing on `release_26.1`.

## Scopes considered

### 1. As implemented (recommended)

On `release_26.1`:
- The editor lint skips rename `${label}` backed by a `parameter_input`, scans only `RenameDatasetAction.newname`, and still flags tool state.
- The backend run-form `replacement_parameters` is rename-only.
- Tests: client unit, API (baseline + red→green), and E2E (Playwright and Selenium).

| Pros | Cons |
|---|---|
| - Fixes the reported loop: the extract fix now clears the warning.<br>- Removes the editor/run-form mismatch at its backend source.<br>- Targets the current release, per policy.<br>- Codex: no findings. Thermo-nuclear: approve. Normal review bugs fixed. E2E green on both drivers.<br>- Small enough to review in one sitting. | - Small user-visible change: the run form stops prompting for `${X}` that appears only in a tag or other non-rename action. Runtime ignored those values anyway, and the PR body should call this out.<br>- The `"RenameDatasetAction"` string check is repeated across `modules.py` and `refactor/execute.py`; the polymorphic hook is deferred.<br>- The duplicate-label hole in `extract_untyped_parameter` remains for adjacent cases (scope 2). |

### 2. Expand: `extract_untyped_parameter` reuses an existing labelled input (not recommended now)

In `_apply_extract_untyped_parameter` (`refactor/execute.py:326`), when `new_label` already exists:
- if it is a compatible `parameter_input`, connect to it;
- otherwise raise a clear error.

| Pros | Cons |
|---|---|
| - Closes the remaining `Duplicated step label` failure for tool-state `${sample}` with a `sample` input, and for rename `${data_input_label}`.<br>- Clears the backend gap noted in the initial debrief. | - The reported case no longer reaches it: the editor stops offering the fix for declared-label renames.<br>- Needs a type-compatibility check (text vs int/float) and an integration test in `test_workflow_refactoring.py` (slow), and it changes refactor-API semantics on a release branch.<br>- The first evaluation marked it optional and non-blocking. Adding it now would mean parking the branch and another hardening round for an adjacent symptom. |

<details>

A guard that only raises a clearer error is cheaper, but the rebuild already raises `DuplicatedIdentifierException`, so it would improve only the message. It would be a good small dev or `release_26.2` follow-up issue alongside the hook in scope 3.

</details>

### 3. Expand: polymorphic "names this action substitutes" hook on action classes (dev follow-up)

Add a method on `DefaultJobAction`/`ActionBox`, overridden by `RenameDatasetAction`. Then `modules.py` and `_iterate_over_rename_pjas` ask the action instead of string-matching.

| Pros | Cons |
|---|---|
| - Puts the rule in its canonical home.<br>- Removes the `"RenameDatasetAction"` literals. | - Touches every action class: too much churn for a release-branch bug fix.<br>- No behavior gain over the current 2-line check.<br>- Natural on `dev` after this merges forward. |

### 4. Expand: migrate ~6 inline run-form test sites to `_yaml_workflow_run_form` (dev follow-up)

Route the value-restriction tests near `test_workflows.py:9360` through the new helper.

| Pros | Cons |
|---|---|
| - The new helper gets real reuse.<br>- Removes the duplicated upload → history → `_download_workflow(style="run")` sequences. | - These are unrelated tests on a release branch.<br>- Pure test refactor, which belongs on `dev` per the "missing tests → dev" convention. |

### 5. Expand: share the `${...}` regex with `Run/model.js` (dev follow-up)

Use `replacementParameterNames` in `model.js` (two copies) as well as in `parameters.ts`.

| Pros | Cons |
|---|---|
| - One client definition of the regex. | - Churns legacy JS on a release branch.<br>- The run-form rule now comes from the backend anyway.<br>- Different input shapes (`step_type`/`step_label` vs store `type`/`label`) make it more than a one-line swap. |

### 6. Expand: retarget to `release_25.1` (not recommended)

Use the oldest supported branch with the bug.

| Pros | Cons |
|---|---|
| - Strict reading of the oldest-supported-branch policy. | - The cherry-pick conflicts in `test_fixtures.ts` and `test_workflow_editor.py`, and the E2E selectors and helpers would need re-verification.<br>- Low severity: a lint false positive with a failing fix. The policy leans toward a newer branch for low-severity bugs. |

### 7. Contract: drop the backend narrowing (back to `alts/original_scope.md`) (rejected)

Ship only the client fix.

| Pros | Cons |
|---|---|
| - Smaller diff, client-only. | - Reintroduces the mismatch: the editor would drop tag-only `${X}` while the run form still prompts for it.<br>- Throws away reviewed, tested work.<br>- Reverses the first evaluation for no new reason. |

### 8. Contract: drop the E2E or the API tests (rejected)

| Pros | Cons |
|---|---|
| - A shorter test diff, avoiding a slow test. | - The E2E is the only test of the user-visible loop (fix → warning clears) and is green on both drivers.<br>- The API test is the only red→green check of the run-form field. |
