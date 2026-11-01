# Thermo-nuclear code quality review (re-harden after re-scope)

Verdict: approve after two small fixups. There's no structural regression. Each layer keeps its logic where it already lived: the editor lint in a pure function, the run form rule in `ToolModule`. No file crosses 1k lines because of this PR. `test_workflows.py` was already about 11.4k lines and `modules.py` about 3.5k.

Acted on (fixups autosquashed; the "Baseline tests" commits are still first; nothing pushed):
- **API helper made reusable:** `_run_form_tool_step_replacement_parameters` -> `_yaml_workflow_run_form(workflow_yaml) -> dict`.
  - Nothing existing already does upload + run-form download. A grep of `lib/galaxy_test/` for `style="run"` hits only `test_workflows.py`, and the populators have no such helper.
  - That upload -> `test_history()` -> `_download_workflow(style="run")` sequence is written inline about 6 times in `test_workflows.py`, in the value-restriction tests near line 9360.
  - The old helper also hard-coded "single tool step + sorted `replacement_parameters`", so only these two tests could ever use it.
  - Now the helper does just the generic sequence. The tests index `steps[1]`, the same index-based access as their neighbours.
  - Change went into baseline `6c9eb77d2fe` and fix `e953ff7344a`.
- **Backend loop tightened (`e953ff7344a`):**
  - `get_informal_replacement_parameters` now uses a positive `if` with `set.update(re.findall(...))` instead of `continue` plus an inner add loop.
  - The docstring is one line.
  - `(pja.action_arguments or {}).get("newname") or ""` closes the `newname: None` TypeError left open by the normal review.
  - No behavior change for known data.

Not acted on:
- **Polymorphic "names this action substitutes" hook** on `DefaultJobAction`/`ActionBox`, overridden by `RenameDatasetAction`. This is the canonical home for the rule. It would delete the `"RenameDatasetAction"` string checks in `modules.py` and `refactor/execute.py:_iterate_over_rename_pjas`. It touches every action class, though, so it's too much churn for a release branch. Dev follow-up.
- **Migrating the ~6 inline run-form call sites to `_yaml_workflow_run_form`:** they're unrelated tests on a release branch. Dev follow-up.
- **Shared `${...}` regex:** the backend has only one copy (grep `-F '\$\{('` over `lib/galaxy`), so there's nothing to reuse. On the client, `Run/model.js` (lines 111 and 224) and `parameters.ts` each have their own. Sharing them means churning legacy JS on a release branch. Dev follow-up, same as the earlier passes.
- **Client `parameters.ts` and E2E:** no new findings. The first-pass judgments in `earlier_drafts/1/thermo_nuclear_review.md` still hold for the client code, which is unchanged since then apart from the rebase. The E2E file is unchanged in this pass.

<details>
<summary>Full review</summary>

### Scope
`git diff origin/release_26.1...c6bee9917cf`, 6 commits:
- client lint fix: `parameters.ts`, `parameters.test.ts`, `test_fixtures.ts`
- `navigation.yml` selectors
- `ToolModule.get_informal_replacement_parameters` narrowing
- 2 API tests and a helper
- 1 E2E test

### Backend: `ToolModule.get_informal_replacement_parameters`
- **Correctness:** runtime applies `replacement_dict` only in `RenameDatasetAction._gen_new_name` (`job_execution/actions/post.py`), to `newname`. Narrowing to rename/`newname` makes the run form agree with runtime and with the editor lint. `SubWorkflowModule` aggregates child modules, so the narrowing reaches subworkflows.
- **Structure before the fixup:**
  - `if action_type != X or not action_arguments: continue`, then an inner `for match ...: add(match)` loop.
  - A three-line docstring.
  - `.get("newname", "")` still passed `None` to `unicodify` when the key was explicitly null.
  - Fine, but not the most direct form.
- **After the fixup:** a single positive guard, a single `update`, and a one-line docstring.
- **Reuse search:**
  - No backend constant or helper for `${name}` extraction exists; the grep finds only this line.
  - `refactor/execute.py:_iterate_over_rename_pjas` filters rename PJAs, but it works on step dicts from `_as_dict`, while this code works on model `PostJobAction` rows. Sharing a generator would need a shape adapter that costs more than the one-line `if`.
- **Code judo (not taken):** make the action class own the answer, e.g. `DefaultJobAction.replacement_parameters(action_arguments) -> []`, with `RenameDatasetAction` parsing `newname`, and the module calling `ActionBox` to dispatch. Then no caller needs the action-type string, and the "only rename substitutes" knowledge lives next to `_gen_new_name`, which actually does the substituting. That's the right dev direction. On `release_26.1` it widens a 4-line bug fix into an API on every action class.
- Imports: none added. `re` and `unicodify` were already at the top of the module.

### API test helper
- **The question:** does an existing helper already do workflow upload + run-form download? No.
  - `WorkflowPopulator` has `upload_yaml_workflow` and `download_workflow` separately.
  - `BaseWorkflowsApiTestCase._download_workflow` is a thin pass-through.
  - `_latest_instance_id` downloads the run form but takes an id and returns only `workflow_id`.
  - Every other site writes the three-step sequence inline: lines 938, 9368, 9389, 9412, 9444 and 9495.
- **Problem with the branch version:** it bundled the reusable sequence with test-specific post-processing:
  - picking the single tool step through a tuple unpack
  - reading `replacement_parameters`
  - sorting
  
  That made it a single-purpose helper sitting next to a missing general one.
- **Fix:** split along that line. `_yaml_workflow_run_form` is the general one, and the tests keep their own projection. The existing inline sites can adopt it on dev.
- The step-type filter was dropped in favour of `steps[1]`. Format2 inputs come first, and the other run-form tests use the same index style.
- A wrong index still can't pass:
  - The run model sets `replacement_parameters` on every step. The input step's list is `[]`.
  - Both expected lists are non-empty.
  - All of the `${...}` text is on the tool step.

### Client (unchanged in this pass)
- `replacementParameterNames` (capture group via `matchAll`) and the `parameterInputLabels` `Set` are direct, and they mirror `Run/model.js`.
- `createTestStep` was extended instead of forking a new fixture. Its return type widened from `NewStep` to `Step`, which is safe because it always sets `id`.
- The `.map(step => step.label)` gives a `Set<string | null | undefined>`. That's harmless: it is only queried with regex capture strings, and the filter already drops falsy labels.
- The 4 vitest cases still pin all four rules on 26.1:
  - undeclared rename flagged
  - per-name skip in a mixed rename
  - tool state not exempt
  - rename-only scan
- No file-size or branching concerns. The PJA loop is flatter than base.

### E2E
- `test_best_practices_extract_untyped_rename_parameter` reuses the `WORKFLOW_RENAME_ON_REPLACEMENT_PARAM` fixture and the navigation selectors.
- The `canvas_loading` selector backport matches dev line-for-line.
- The section-status retry closure is still duplicated across 3 tests. Deduping it means editing unrelated tests in an already 2.4k-line file, so it's deferred as before.

### Verification
- Backend unit tests (`PYTHONPATH=lib pytest -p no:asyncio test/unit/workflows/`): 121 passed, 1 skipped.
- Client vitest (Editor + `workflowStepStore.test.ts`, node 22.20.0): 273/273 in 30 files.
- API tests `-k test_run_form_replacement_parameters`: 2 passed on the branch. With base `modules.py`, the baseline test passes and the fix test fails with `['a','d','t'] == ['a']`.
- ruff, black, flake8, and mypy on `modules.py` are clean. Pre-commit passed on both amended commits.

</details>
