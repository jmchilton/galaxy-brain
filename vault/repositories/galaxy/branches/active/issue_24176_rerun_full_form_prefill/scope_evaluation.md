# Scope evaluation (round 2, after re-scope)

**Recommendation: keep as implemented.** The expansion bias has already been spent. Round 1's expansion was applied (resolver delegation, `step_effective_label`, `withRerunValues` in `model.js`), and phase 2's Codex fix pulled in the one related bug that was left, in `/request`. I found no new reason to expand or contract. The `/request` duplicate-name change belongs here and not in a sibling. `Workflow.request_input_labels()` is one policy with two consumers, `recover_inputs()` and the run dict. Splitting them would bring back the client/server disagreement Codex found, and #24178 is final while #24175 doesn't touch input export. The PR description should call out the one visible API change: for legacy workflows whose input steps share a name, `/request` now emits index keys with `inputs_by="name|step_index"` instead of one collapsed name key.

Evaluated: head `ced412c6248` on final parent `57bf3eebd77` (#24178). Branch diff `57bf3eebd77..HEAD`: 18 files, +639/−53, of which about 330 lines are implementation and about 310 are tests.

## Possible Decompositions

This is for John to decide later. I'm not recommending a split. Whatever the split, the coordinator's rule still holds: no PR may regress on its own. In particular, the `rerunHasStepParameters` guard sends reruns to the expanded form, so it has to land together with, or after, both the server seeding and the expanded form's input prefill. Without the seeding the guard gains nothing, and without the prefill the rerun loses the input prefill the simple form gives it today.

**Option A: legacy input-key fix first, three PRs.**
1. **Legacy input references** (about 150 lines, can target `dev` directly with no #24178 dependency).
   - `Workflow.request_input_labels()`, `recover_inputs()` using it, and the `step_effective_label` run-step field.
   - `rerunInputValue` moved out of `WorkflowRunFormSimple.vue` into `model.js`.
   - Tests: `test_request_references_legacy_input_steps`, the `model.test.js` `rerunInputValue` cases and `test_run_form_input_steps_carry_request_input_keys`.
   - This stands alone: it fixes the simple form's rerun of legacy unlabeled inputs on dev, and `/request` for same-named inputs.
2. **Server seeding** (about 290 lines, needs #24178).
   - `invocation_id` on `style=run`, `recover_step_parameters()` over the parent's resolver, and `_compute_seeded_runtime_state` / `_seedable_step_args` / `_seed_subworkflow_run_inputs`.
   - Tests: the six `test_run_form_seeded_from_*` API tests and `test_run_form_seeding_requires_invocation_access`, `test_recover_step_parameters_skips_unusable_rows`, and the populator kwarg.
   - It does nothing until a client asks for it.
3. **Full-form client prefill** (about 250 lines).
   - `getRunData(…, invocationId)`, the `rerunRequest` props through `WorkflowRerun`/`WorkflowRun`/`WorkflowRunForm`, `withRerunValues` and the `rerunHasStepParameters` guard.
   - Tests: the vitest cases and the Selenium/Playwright E2E with its navigation entries.

**Option B: by layer, two PRs.**
1. Server: piece 2 above plus the server half of piece 1 (`request_input_labels`, `recover_inputs` and the run-step field) and their Python tests.
2. Client: piece 3 plus the client half of piece 1 (the `rerunInputValue` extraction and its legacy lookup).

**Option C: as is, one PR.** Server and client stay together, which is the shape of the issue's proposed approach. #24177 stacks on it.

## 1. As implemented (recommended)

The run-style download is seeded from `invocation_id`. Tool steps go through `compute_runtime_state(step_args=…)` with the `${}` and connected-input skips, subworkflow run-time inputs are set directly, and rows come from the parent's resolver. The client prefills inputs, workflow parameters, resource parameters and job re-use, and the guard forces the expanded form. One reference policy, `request_input_labels()`, decides the keys for both the `/request` export and `step_effective_label`. A label that is missing or shared is referenced by index.

| Pros | Cons |
|---|---|
| Covers every row of the issue's table except object stores, which the issue excludes. Follows the issue's proposed approach. | Visible `/request` output change for legacy workflows whose inputs share a name. Reviewers of a "prefill the full form" PR won't expect an export change, so the PR description has to say so. |
| Round 1's expansion is done, and the re-scope removed code: the branch's own STEP_PARAMETERS parsing is gone, and there's one rerun-helper module. | `ced412c6248` changed `rerunInputValue`: a field that is present but `null` now looks the step up by index instead of falling back to `step_label`. #24177's merge base is `b5c7505e1b3`, which predates this change and `b5603b823cb`, so #24177 has to rebase and recheck its prefill cases. |
| A single policy keeps the client and server consistent, and also fixes resubmitting `/request` for same-named legacy inputs, which collapsed to one dataset. | The legacy path can't be built through the API, so coverage of the duplicate-name case is unit-level only. |
| Reviewed again after the re-scope (normal, test challenges, Codex, thermo) with red checks. | |

<details><summary>Where the <code>/request</code> change belongs</summary>

The change sits in `WorkflowInvocation.recover_inputs()`, which exports inputs, not step parameters.
- **Here (as implemented).** `step_effective_label` and `recover_inputs()` must agree on every step's key, or the client looks up keys the export doesn't contain. That disagreement is the Codex P2. A shared model method is the right abstraction, and this branch introduced its second consumer.
- **Parent #24178.** It owns the `/request` fixes for subworkflow step parameters. But it's final at `57bf3eebd77`, input export is a different concern from step-parameter export, and moving the method would separate it from its run-dict consumer.
- **#24175.** Its diff touches neither `recover_inputs` nor `effective_label`, so it's unrelated.
- **A standalone PR below the stack.** Workable: it's Option A piece 1 above. Without it, this branch would have to send `null` for shared names and leave such steps unfilled, which is the pre-Codex state. That's no regression against dev, but it isn't consistent.

</details>

## 2. Contract: drop the `/request` change and the legacy field

Revert to the pre-re-scope lookup (`step_label` or `step_index`). That leaves `recover_inputs()` and legacy unlabeled inputs as they are on dev.

| Pros | Cons |
|---|---|
| No change to `/request` output. The PR stays purely about form prefill. | Reverses a John-approved re-scope (settled). |
| | Brings back the expanded form inheriting the simple form's legacy-input gap. A required single dataset input silently falls back to the first listed dataset. |
| | #24177 already builds on `step_effective_label`. |

Verdict: out. It's settled, and there's no new reason.

## 3. Expand to the input side: `_normalize_inputs` uses `request_input_labels()`

`run_request._normalize_inputs` still resolves `inputs_by="name"` through the raw `effective_label`. So a plain `name` submission feeds one dataset to every step that shares that name. That includes a `/request` export saved before this branch, or a hand-written API request. Moving the resolution onto `request_input_labels()` would close the loop.

| Pros | Cons |
|---|---|
| Submission and export would share one policy. | Changes which requests are accepted. A `name` key that used to bind several steps would no longer bind them, so existing API callers and saved exports could fail as "input not provided". |
| | `run_request.py` is untouched by this branch, and the case needs a never-resaved workflow from roughly 2016-2019. |
| | A `name` key that matches several steps is arguably the caller's ambiguity. Neither run form submits by name: the simple form uses `step_index`. |

Verdict: out. If it's wanted, it's its own small PR with an ambiguity error, not silent rebinding.

## 4. Server-emitted request key, replacing the client's label/index branching

From the thermo review. The server would send the request key itself (the label, otherwise `str(order_index)`), which would delete `rerunInputValue`'s branching.

| Pros | Cons |
|---|---|
| Less client logic, and the server owns the key outright. | The field name and meaning of `step_effective_label` are settled, and #24177 builds on them. The client still needs the positional `""` fallback for older exports. |

Verdict: out (settled contract).

## Considered and settled (not re-argued)

- **Restack onto #24175 / hoist the resolver into #24178:** settled. This branch is a sibling of #24175 on #24178, and delegation is already done.
- **Imported-invocation seeding assert:** deferred to whichever of #24175 and #24176 lands second.
- **Client merge instead of server seeding:** settled. Keep server seeding, and leave it as a reviewer question in the PR description.
- **Object stores in the expanded form:** settled out. It's a feature of the full form in its own right.
- **Sibling split:** #24177 owns the reason message, hidden toggle, simple-form step-param prefill and `replacement_dict`.
- **Round-1 out-of-scope items still stand:** the `param_map` keyed-by-id bug (with #24178 or standalone), unifying tool and subworkflow seeding through `check_param`, and switching `serialize_workflow_invocation_to_request` (resolved by the parent's resolver).
