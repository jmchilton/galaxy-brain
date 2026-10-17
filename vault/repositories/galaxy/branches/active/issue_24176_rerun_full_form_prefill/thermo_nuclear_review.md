# Thermo-nuclear code quality review (round 2)

**Coordinator follow-up:** I acted on the first "not acted on" item below anyway, in `ced412c6248`, because it's a real defect. `rerunInputValue` now uses `step_label` only when the run data has no `step_effective_label` field. When the field is `null`, it looks the step up by index. The signature is unchanged and there's a red-first `model.test.js` case. The run data the existing tests use carries no field, so they're unaffected. The other items below still stand.

Scope: `git diff 57bf3eebd77..HEAD` (head `b5603b823cb`), focused on what changed since [round 1](earlier_drafts/1/thermo_nuclear_review.md). Verdict: approve, no code changes. The re-scope removed complexity rather than adding it. The branch's own STEP_PARAMETERS parsing is gone in favour of the parent's resolver. One model method now names the "request input key" concept, and both the `/request` export and the run form use it. The rerun value helpers live in one module. I found nothing structural left that pays for its churn, so there are no new commits.

Unit `test_run_parameters.py` passed 15, and vitest `Workflow/Run` passed 77. Both ran on the unchanged head as a sanity check. vue-tsc and the API tests weren't re-run, because nothing changed.

## Not acted on

- **`rerunInputValue` falls back to `step_label` when `step_effective_label` is falsy (`model.js`).** This is a latent mismatch. Take a labeled step whose label equals a legacy input step's stored name. The server sets `step_effective_label` to `null` for both steps and `/request` keys both by index. The fallback then looks up the label instead, so that step isn't prefilled.
  - Reaching it needs a workflow saved between 2016 and 2019, never re-saved, with a label/name collision. The cost is one input left for the user to fill.
  - The fix is to drop the fallback and use `String(step_index)` whenever `step_effective_label` is null. That changes the semantics of an exported helper #24177 calls, and the `model.test.js` cases that pass only `step_label` would need the field added.
  - Not worth it at this rarity. Revisit if #24177 changes `rerunInputValue` anyway.
- **Could the server emit the request key itself (`label`, else `str(order_index)`)?** That would delete the client's label/index branching. It's a real code-judo move. But the field name and its meaning are settled by the approved re-scope, #24177 builds on them, and the client still needs the positional `""` fallback for older exports. Not done.
- **`request_input_labels()` counts every step, not just input steps.** A tool label colliding with a legacy input name sends that input to index referencing. That's consistent on both sides (`/request` and `_normalize_inputs` with `name|step_index`), and restricting the count would break the uniform `request_input_labels[step.id]` lookup the run dict uses for every step. Left as is.
- **`recover_inputs` uses `labels.get(...)`, not `[...]`.** This is deliberate. An input association whose step isn't in `self.workflow.steps` falls back to the order index, as it did before, instead of a new `KeyError`.
- **Round-1 deferrals still stand:**
  - collapsing the client rerun props, and the redundant `isRerun &&` guard (both for #24177);
  - an options object for `getRunData`;
  - unifying tool and subworkflow seeding;
  - the `_find_run_input`/`_find_input` duplicate.
  - The round-1 "third copy of STEP_PARAMETERS parsing" is resolved: `serialize_workflow_invocation_to_request` and `recover_step_parameters()` both use the parent's `resolve_step_parameters()`.
- **Debrief naming nit.** `implementation_rescope_debrief.md` cites the unit test as `test_request_input_labels`, but the test is `test_request_references_legacy_input_steps`. There's no code impact.

<details><summary>Full review</summary>

### 1. Structural regressions
None.
- **Delegation (`recover_step_parameters`).** The method is now a thin loop over the parent's `resolve_step_parameters()`. It skips unusable rows, where `serialize_workflow_invocation_to_request` raises on them. The two callers need different policies (best-effort prefill versus a faithful export), so a shared resolver with per-caller error policy is the right split. No duplicated parsing remains.
- **`Workflow.request_input_labels()`** sits in the model next to `recover_inputs()`, the layer that owns the request's keying. The `/request` export and the run-form `step_effective_label` both read it, so the client and server key inputs the same way. Without it, the duplicate-legacy-name rule would have to be written twice.
- **`withRerunValues` in `model.js`** sits beside `rerunInputValue` and `rerunHasStepParameters`, which gives #24177 one place for rerun-request interpretation. Its JSDoc `@template` keeps the `.vue` callers typed without casts.

### 2. Code-judo opportunities
- **Server-provided request key.** Covered under "Not acted on". It's the only remaining move that would delete client branching, and it's ruled out by the settled field contract.
- I looked for a judo move on `stepModels` (expanded form) versus `buildFormInputs` (simple form). Both apply `rerunInputValue` to a step's first input, but they build different shapes: a step model copy versus a flattened form input. A shared "apply to step" helper would be a two-line wrapper with two call shapes. Not worth it.

### 3. Spaghetti / branching
- `_workflow_to_dict_run`'s changes since round 1 come to one line (`step_effective_label`) plus one precomputed map. No new conditionals.
- `recover_inputs` changed only its label source. The order-index fallback flow is untouched.
- `rerunInputValue` has a falsy-coalescing chain (`effective || label`, then index, then positional `""`). Each step corresponds to a real export shape. The one questionable link is covered under "Not acted on".

### 4. Boundaries / types
- `request_input_labels() -> dict[int, str | None]`: `None` means "reference by order index", which the docstring states. That's acceptable for a model helper. A sentinel type would be over-engineering.
- `recover_step_parameters()` maps `ValueError` and `None` to the same skip-and-warn. It's correct, and the log message covers both.
- The run-step field is emitted for every step type (label or `None` for non-inputs), so the step model keeps a uniform shape. Good.

### 5. File size
- `model/__init__.py` and `managers/workflows.py` were already far over 1k lines, and this branch adds about 40 and 80 lines.
- `model.js` is about 295 lines, `WorkflowRunForm.vue` about 400 and `WorkflowRun.test.js` grew by 40.
- No threshold crossings.

### 6. Modularity / tests
- The hoisted `mountRerun(props, runData)` removes duplicated mount setup from both rerun tests, and its default-unmount behaviour is explicit.
- `test_recover_step_parameters_skips_unusable_rows` characterizes the delegation in one table-driven test.
- `test_request_references_legacy_input_steps` checks the labels map and the `/request` keys together. Assertions are concrete.

### 7. Legibility
Docstrings are short and say why (legacy names, duplicate names, imported invocations). No dead code, and no comments that reference the plan.

</details>
