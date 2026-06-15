# Workflow Extraction: Allow Step Labels

## Status — IMPLEMENTED & VERIFIED (2026-06-08)

Built on branch `extract_step_labels` exactly as planned below; all open questions resolved (see
Decisions). 12 files changed, +511/−21.

**Backend**
- `schema/workflows.py` — `StepLabelHint {kind: "job"|"implicit_collection_jobs", id, label}` +
  `step_labels: list[StepLabelHint]` on `WorkflowExtractionByIdsPayload`.
- `extract.py` — `step_labels` threaded through `extract_workflow_by_ids` → `extract_steps_by_ids`;
  `work_items` became a 3-tuple `(job, output_hdcas, label)` resolved at append time; `step.label`
  applied with **raise**-on-collision against the renamed `step_labels_seen` set.
- `services/workflows.py` — `_validate_input_names` → `_validate_extraction_labels(...,
  step_labels=None)` (raw reject-not-sanitize, combined namespace); selected-step + same-`(kind,id)`
  guards in `_validate_extract_by_ids_payload`; `step_labels=payload.step_labels` passed to the
  extract call.

**Client** (schema regenerated via `make update-client-api-schema`)
- `histories.ts` `StepLabelHint` export; `stepLabel` on `ToolStep`.
- `WorkflowExtractionCard.vue` — "Label Step" pencil badge → "Step Label: …" + edit + **clear** badge.
- `WorkflowExtractionForm.vue` — `selectedStepLabels` (mapped→`implicit_collection_jobs` by ICJ id),
  `hasDuplicateStepLabels` (**raw** union with input names — not the output-label whitespace
  collapse), rename/clear handlers, step `RenameModal` (`item-type="step"`), payload wiring.
- `navigation.yml` — 5 selectors for the step-label badges + step rename modal.

**Verification** — all green:
- Selenium `test_extract_step_label_creates_labeled_step` — **passed live** (playwright driver against
  the running dev server; full badge→modal→submit→labeled-step round-trip).
- API: 9 new step-label tests + full extraction file (**69 passed / 1 pre-existing skip**, no regression).
- vitest: **35 passed** (5 new step-label tests).
- Lint/format clean: black, isort, ruff, eslint; no TS errors in changed files.

Not yet done: commit / PR open. The detail below is the as-built spec (kept for review + the notebook
rebase).

## Where this sits

PR progression:

1. **HEAD / #22853** — keep input + output labels unique (backend 400s on dup/empty/overlong;
   form de-dups input names client-side, predicts the output-label 400 inline).
2. **This PR (implemented)** — *allow* labeling **tool / mapped-tool steps**, the way we already
   label inputs and outputs. **Off by default** in both UI and API: an unlabeled step stays
   `label = None` (today's behavior). Labels join the existing single uniqueness namespace.
3. **Notebook extraction (rebase of `extract_next` / EXTRACT_NOTEBOOK_PR.md)** — *seed* step
   labels from the notebook so a report can reference workflow steps by stable label. This PR only
   adds the capability; the notebook PR fills in the seeding.

This is the missing prerequisite for "extract the report along with the workflow": a report
references a step, and a referenced step needs a stable label to point at — exactly as an exposed
output needs a label. Today only **inputs** (`dataset_names` / `dataset_collection_names`) and
**outputs** (`output_labels`) can be labeled; **tool steps cannot be labeled at all**.

The downstream consumer is `Workflow.step_by_label` (model `__init__.py`), which raises on duplicate
labels — so app-enforced label uniqueness (there is **no** DB-level uniqueness constraint;
`WorkflowStep.label` is just nullable `Unicode(255)`) is exactly what the report PR will rely on.

---

## High-level review of the notebook plan (EXTRACT_NOTEBOOK_PR.md)

The notebook plan is sound and *already assumes this PR exists implicitly but never builds it*:

- It seeds **steps** (`seeded`), exposes **outputs** (`exposed` → `suggested_name` →
  `output_labels`), and synthesizes **inputs** (`seed_warning`). There is a labeling path for
  outputs (`suggested_name` on `WorkflowExtractionOutput` → `OutputLabelHint`) and for inputs
  (`suggested_name`/`newName`), but **none for the step itself**. A notebook that says "here are
  BWA's metrics" seeds the BWA *step* but has nowhere to put a human label on that step.
- To extract a **report** alongside the workflow, the report's directives must resolve to workflow
  artifacts by **label** (a workflow step output is addressed by step label + output name). So the
  notebook PR will need, per tool row, a `suggested_label` analogous to the output `suggested_name`,
  and the closure will populate it. **That field is out of scope here** — this PR adds the
  plumbing (`step_labels` in the payload, application in `extract_steps_by_ids`, UI affordance) so
  the notebook PR only has to (a) add `suggested_label` to `WorkflowExtractionJob`, (b) populate it
  in the closure, (c) pre-fill the form's new per-step label field from it.

One thing the notebook plan should add when it rebases (note for that PR, not this one): the §7
"schema/workflows" and "WorkflowExtractionForm.vue" bullets gain a `suggested_label` row, mirroring
the existing `suggested_name`/`exposed` rows. Nothing in the notebook plan **conflicts** with this
PR; it cleanly slots a label seed onto the step rows this PR makes labelable.

No correction needed to the notebook plan's architecture. The only gap is the one this PR fills.

---

## Design decisions

### STEP_LABEL_API_SHAPE — structured hints (recommended)

Add to `WorkflowExtractionByIdsPayload`:

```python
class StepLabelHint(Model):
    kind: Literal["job", "implicit_collection_jobs"]   # plain tool job vs. mapped (ICJ) step
    id: DecodedDatabaseIdField       # the job id or icj id (same id you already pass in the bucket)
    label: str

step_labels: list[StepLabelHint] = Field(default_factory=list, ...)
```

Mirrors `output_labels: list[OutputLabelHint]` exactly. A step is labeled **iff** it appears in
`step_labels`; absence = unlabeled. Tool steps already arrive in **two buckets** (`job_ids` and
`implicit_collection_jobs_ids`), and `kind` discriminates which — the hint references the same id
the caller already put in the bucket.

**Rejected — STEP_LABEL_PARALLEL_ARRAYS.** Mirror `dataset_names`: `job_labels` parallel to
`job_ids`, `implicit_collection_jobs_labels` parallel to `implicit_collection_jobs_ids`. Two
parallel arrays, and because most steps are unlabeled you'd need null sentinels to hold position —
fragile and noisier than the structured list. Inputs use parallel arrays only because every input
*always* has a name (a default); steps are *optionally* labeled, which is the `output_labels` shape,
not the `dataset_names` shape.

### NAMESPACE — one combined uniqueness check (recommended)

`extract_steps_by_ids` already keeps a single `step_labels: set[str]` covering input step labels
(extract.py:661). Tool-step labels go into the **same** set: a workflow step label is globally
unique among all steps. So a provided step label must be unique against other step labels **and**
against the input names. Generalize HEAD's `_validate_input_names` into one validator over the
union {dataset_names ∪ dataset_collection_names ∪ step_labels}: non-empty, ≤255, unique. Same
rejection-not-truncation rule HEAD established.

### LEGACY_HID_PATH — unchanged (recommended)

`POST /api/histories/{id}/extract_workflow` (`WorkflowExtractionPayload` → `extract_steps`) is the
HID-based legacy submit; the **client does not use it** (the form uses `POST /api/workflows/extract`
→ `extract_by_ids`). Do **not** add step labels there. It keeps its existing input-name validation
from HEAD; nothing else changes. Scoping step labels to the by-ids path keeps the surface minimal
and matches where `output_labels` already lives (also by-ids-only).

---

## API piece

**`lib/galaxy/schema/workflows.py`**
- Add `StepLabelHint` (above). Add `step_labels: list[StepLabelHint] = Field(default_factory=list)`
  to `WorkflowExtractionByIdsPayload`.

**`lib/galaxy/webapps/galaxy/services/workflows.py`**
- Generalize `_validate_input_names(dataset_names, dataset_collection_names)` →
  `_validate_extraction_labels(dataset_names, dataset_collection_names, step_label_strings=None)`
  that checks the union for empty/over-255/duplicate. Give `step_label_strings` a default so the HID
  call site (line 254) stays a 2-arg call and its behavior is identical. Step labels follow the
  **raw reject-not-sanitize** rule (like input names) — *not* the output-label
  `_sanitize_output_label` whitespace-collapse — because they join the raw input-name namespace.
- Pass `step_labels=payload.step_labels` in the `extract_workflow_by_ids` call at `extract_by_ids`
  (services/workflows.py:287, beside `output_labels=payload.output_labels`).
- In `_validate_extract_by_ids_payload`, after the existing job/icj/output-label checks, validate
  `payload.step_labels`:
  - each hint's `(kind, id)` must be a **selected** step — `("job", id)` ∈ `job_ids`,
    `("implicit_collection_jobs", id)` ∈ `implicit_collection_jobs_ids`; else 400
    `"step_labels includes {kind} id {id} that is not a selected extraction step"` (mirrors the
    output-label "not produced by a selected step" guard).
  - no two hints target the same `(kind, id)` → 400 (mirrors output-label same-id guard).
  - feed the hint label strings into `_validate_extraction_labels` alongside the input names so a
    step-vs-input or step-vs-step collision 400s up front.

**`lib/galaxy/workflow/extract.py`** (`extract_steps_by_ids` + `extract_workflow_by_ids`)
- Thread `step_labels` through `extract_workflow_by_ids` (signature ~521) → `extract_steps_by_ids`
  (signature ~624).
- Build two maps from the hints: `job_label[job_id]` and `icj_label[icj_id]`.
- **Change `work_items` from `(job, output_hdcas)` to a 3-tuple `(job, output_hdcas, label)`** and
  resolve the label **at append time** — plain-job loop (extract.py:698-701) appends
  `job_label.get(job_id)`; icj loop (707-712) appends `icj_label.get(icj_id)`. This is load-bearing:
  after `work_items.sort` (717) the original `icj_id` is unrecoverable
  (`representative_job.id ≠ icj_id`), and the consumer loop can't distinguish plain-vs-icj except by
  `output_hdcas` truthiness — so the label must be captured where the ids are still in scope. The
  consumer loop (extract.py:719) unpacks the third element.
- In the tool-step loop, after `step.tool_inputs = tool_inputs` (extract.py:725), set the label the
  way the input rows do: `if label and label not in step_labels: step.label = label;
  step_labels.add(label)`. Inputs are created first, so their names already populate `step_labels`;
  a step label colliding with a *defaulted* input name (e.g. literally `"Input Dataset"`, which the
  service validator can't see) hits this guard. **Decided: raise** here — an explicitly-provided step
  label that can't be applied gets a clear error, never silently vanishes. Add a one-line code
  comment on the asymmetry: input dedup *silently drops* a colliding name (extract.py:669, no
  `else`), step labels *raise* — intentional, so a future reader doesn't "fix" it to match.

`output_labels` application (extract.py:760-772) is unchanged; step labels and output labels are
orthogonal (one labels the step, the other labels a concrete output port).

**Client API schema regen** (required before the UI piece compiles)
- Run `make update-client-api-schema` after the schema change so `StepLabelHint` / `step_labels`
  reach `components["schemas"]`.
- Add a `StepLabelHint` type export in `client/src/api/histories.ts` mirroring `OutputLabelHint`
  (histories.ts:19), so the Form's `selectedStepLabels` computed is typed.

**Tests — `lib/galaxy_test/api/test_workflow_extraction.py`** (red→green, mirror the
`output_labels` tests at 1154+, reuse `_extract_and_download_workflow_by_ids` /
`assert_steps_of_type` / `_assert_extract_rejected` / `_seed_two_inputs_and_run_cat1`):
- `test_extract_with_step_label_labels_tool_step` — `step_labels=[{"kind":"job","id":job,"label":"align"}]`
  → downloaded tool step has `label == "align"`.
- `test_extract_step_label_for_icj_step` — `kind:"implicit_collection_jobs"` → mapped step labeled.
  One hint suffices: an ICJ collapses to exactly one workflow step (one `work_items` iteration), and
  the UI already dedups mapped jobs to one `implicit_collection_jobs_id` (Form `selectedJobBuckets`).
- `test_extract_without_step_labels_leaves_steps_unlabeled` — regression: no `step_labels` → tool
  step `label is None`.
- `test_extract_duplicate_step_label_rejected` — two hints same label → 400.
- `test_extract_step_label_colliding_with_input_name_rejected` — `dataset_names=["x"]` +
  step label `"x"` → 400 (proves the shared namespace).
- `test_extract_step_label_for_unselected_step_rejected` — hint id not in any bucket → 400.
- empty / >255 step label → 400.

**Unit — `test/unit/.../workflow/test_extract*.py`** (cheapest layer for the wiring):
- `extract_steps_by_ids` sets `step.label` for a job hint and an icj hint; leaves `None` when absent;
  collision with a default input name **raises**.

---

## UI piece

The tool card has affordances for **outputs** (star + rename pencil) but none for the **step
itself**. Step labels behave like **output labels**, not like input names: explicit, optional, and
validated by disabling submit on collision — *not* auto-suffixed (inputs auto-suffix only because
they always carry a default name).

**`client/src/components/History/WorkflowExtraction/types.ts`**
- Add `stepLabel: string` to `ToolStep` (default `""` = unlabeled).
- `toExtractionRow` tool branch sets `stepLabel: ""`. (Notebook PR will seed it from a future
  `job.suggested_label`.)

**`WorkflowExtractionCard.vue`**
- For tool rows: a "Label Step" pencil affordance near the title (parallel to the input rename
  pencil and the `OUTPUT_IS_RENAMABLE_BADGE`). When `stepLabel` is set, render it (a `Labeled Step`
  badge + the label text), a pencil to edit, and a **clear/✕ button** to remove (decided: a
  dedicated clear action, since `RenameModal` can't submit empty); when empty, offer "Label Step".
  Emit `rename-step` (open modal) and `clear-step-label`. Gate on `props.job.checked` like the
  output star.

**`WorkflowExtractionForm.vue`**
- Reuse `RenameModal` with `item-type="step"` (free-string `itemType`, already supported). Add
  `stepLabelTarget`, `toRenameStep`, `renameStep(newName)` mirroring the output rename path. Note:
  `RenameModal` blocks empty/no-op names, so **removing** a label needs a separate clear action, not
  the modal.
- `selectedStepLabels` computed → for each checked tool row with non-empty `stepLabel`, emit
  `{ kind: isMappedTool(job) ? "implicit_collection_jobs" : "job", id: isMappedTool(job) ? job.implicit_collection_jobs_id : job.id, label }`.
  Add `payload.step_labels` only when non-empty (keeps the off-by-default wire shape clean).
- Uniqueness prediction: add `hasDuplicateStepLabels` checking the **union** of provided step
  labels + the final (already-uniquified) input `newName`s; wire into `submissionDisabled` /
  `submissionDisabledMsg` ("Step labels must be unique and distinct from input names").
  **Trap:** use the **raw** input-name comparison (no normalization) — *not* the
  `_sanitize_output_label`-style `.trim().replace(/\s+/g," ").slice(0,255)` that
  `hasDuplicateOutputLabels` applies (Form.vue:222). Step labels join the raw input-name namespace,
  so applying output-style whitespace collapse here would mispredict the backend (flag a collision
  the server won't raise, or miss one it will).

**Tests — `WorkflowExtractionForm.test.ts`** (mirror the existing input/output blocks):
- label a plain tool step → payload `step_labels` has `{kind:"job", id, label}`.
- label a mapped tool step → `{kind:"implicit_collection_jobs", id: implicit_collection_jobs_id, label}`.
- unlabeled steps → no `step_labels` key in payload.
- step label duplicating another step label, and one duplicating an input name → submit disabled.
- clearing a step label removes it from the payload.

**Selenium — `TestWorkflowExtraction`** (one round-trip, since the label field is a genuinely new
UI path the form translation tests can't prove end-to-end): label a tool step, extract, assert the
created workflow's step carries the label. One test only — collection topology / namespace rejection
stay at API+vitest per the notebook plan's "cheapest faithful layer" rule.

---

## Decisions (resolved)

- **Default-input collision** → **raise** in `extract_steps_by_ids` (explicit label, clear error).
- **Unlabel UX** → **dedicated clear/✕ button** on the card (RenameModal can't submit empty).
- **Summary `suggested_label`** → **leave to the notebook PR**; this PR keeps the summary schema
  untouched and stays minimal.
- **Legacy HID `extract_from_history`** → **leave unchanged** (client-unused; `output_labels` is
  also by-ids-only).
- **Hint type** → `StepLabelHint` / `step_labels` (parallels `OutputLabelHint` / `output_labels`).
- **`kind` values** → `"job"` / `"implicit_collection_jobs"` (fully spelled out, no `icj` jargon for
  API consumers; maps directly to the `job_ids` / `implicit_collection_jobs_ids` buckets).

All open items resolved — plan is ready to implement.
