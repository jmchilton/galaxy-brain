# EXTRACT_IO_VALIDATION_PLAN

Make input-name and output-label uniqueness validation symmetric across the
workflow-extraction frontend and backend.

## Status: IMPLEMENTED

All three changes + tests landed on branch `extract_io_validation`. Frontend
vitest 29/29 green locally; backend API tests authored (py_compile-clean) and
deferred to CI (worktree had no `.venv`). Four files touched:
`services/workflows.py`, `WorkflowExtractionForm.vue`,
`test_workflow_extraction.py`, `WorkflowExtractionForm.test.ts`.

Two deltas vs. the plan as written (see **Implementation notes** at bottom):
- HID-path test targets the **new** `POST /api/histories/{id}/extract_workflow`
  route, not the legacy `POST /workflows?from_history_id=` (which bypasses the
  service entirely).
- Frontend output-label normalization also **truncates to 255** to fully mirror
  `_sanitize_output_label` (the plan only specified trim + collapse).

## Problem

Workflow extraction names inputs (step labels) and labels outputs (workflow
output labels). Both namespaces require uniqueness for a valid workflow, but
enforcement is lopsided — the only uniqueness check that exists today is the
output check, and it lives backend-only:

| | frontend uniqueness | backend uniqueness |
|---|---|---|
| **inputs** | none (empty-only) | none — silently drops the dup's `label` (`extract.py:161-163,177-179`) |
| **outputs** | none (empty-only) | hard 400 (`services/workflows.py:342-346`) |

Consequences:
- **Outputs**: two exposed outputs with colliding labels (easy — defaults are
  dataset/output names) pass the frontend's enabled Create button, then 400 at
  submit with a raw error string instead of the inline disabled-button pattern
  used for empty labels.
- **Inputs**: colliding input names never error anywhere; the second input
  silently loses its label, producing a quietly-malformed workflow.

Target end state — all four cells enforced:

| | frontend | backend |
|---|---|---|
| **inputs** | inline disabled + reason | hard 400 |
| **outputs** | inline disabled + reason | hard 400 (already done) |

## Targeting: dev (verified)

This work targets `dev`, independent of the notebook-extraction commit
(`44dd1b1d65`) on this branch:

- Backend files to change (`lib/galaxy/workflow/extract.py`,
  `lib/galaxy/webapps/galaxy/services/workflows.py`) are **byte-identical**
  between the dev merge-base (`a25a180ab0`) and HEAD — `git diff` is empty. The
  output-label validation we mirror is from `#22762`, already on dev.
- Frontend file (`WorkflowExtractionForm.vue`): all validation computeds we
  extend (`hasUnnamedSelectedInputs`, `hasUnnamedSelectedOutputs`,
  `selectedInputs`, `selectedOutputLabels`) exist at the dev merge-base. The
  notebook commit only added the `fromPageId`/`seeded` hunks, which don't
  overlap the validation block.

No dependency on notebook extraction. Can branch from dev.

## Changes

### 1. BACKEND — input-name validation (hard 400)

Add a module-level helper `_validate_input_names(dataset_names,
dataset_collection_names)` in `lib/galaxy/webapps/galaxy/services/workflows.py`,
called from **both** service entry points so the by-ids and HID/from-history
API paths are guarded identically (DECISION: BACKEND_VALIDATION_LOCATION):

- `extract_by_ids` — invoke from within `_validate_extract_by_ids_payload`
  (beside the existing `output_labels` block).
- `extract_from_history` (`services/workflows.py:222`) — invoke directly before
  the `extract_workflow(...)` call (`:230`).

Input step labels share one namespace across datasets and collections (the
single `step_labels` set in `extract_steps`), so the helper validates the
**combined** provided names. It only inspects names that were actually supplied
— the no-names default path (`"Input Dataset"` constants) is untouched, so
legacy unnamed extraction does not regress. Three checks, each raising
`RequestParameterInvalidException` naming the offender:

1. **Non-empty** — reject a provided name that is empty / whitespace-only
   (parity with `_sanitize_output_label`; UI already blocks this, so it guards
   direct API callers).
2. **Length** — reject a provided name >255 chars. `WorkflowStep.label` is
   `Unicode(255)` (`model/__init__.py:9224`); an over-long input name is a
   commit-time error today. **Reject**, not truncate, to keep accepted names
   verbatim (DECISION: INPUT_NAMES_RAW).
3. **Uniqueness** — reject duplicates in the combined list, compared **raw**
   (no strip/collapse) to match how `extract_steps` keys `step_labels`.

The silent-dedup in `extract_steps` stays as a safety net for the no-names
default path.

### 2. FRONTEND — output-label uniqueness (inline)

In `WorkflowExtractionForm.vue`, add `hasDuplicateOutputLabels` over the
already-built `selectedOutputLabels` array (which is filtered to
exposed + has-output_name + non-empty). Detect duplicate normalized `label`
values. Wire into `submissionDisabled` and add a `submissionDisabledMsg` branch
(e.g. "Exposed output labels must be unique").

Normalize the same way the backend's `_sanitize_output_label` does — `.trim()`
plus collapse of internal whitespace — so the frontend check and the backend
guard agree exactly (see DECISION: NORMALIZATION_PARITY).

### 3. FRONTEND — input-name uniqueness (inline)

Add `hasDuplicateInputNames` over `selectedInputs` (the flattened checked-input
list). Detect duplicate `newName` values across all selected input steps
(datasets + collections together — single namespace). Wire into
`submissionDisabled` + `submissionDisabledMsg` (e.g. "Workflow input names must
be unique"). Required so that change #1 doesn't recreate the submit-time-400
disconnect for inputs. Compare raw `newName` (backend uses input names raw, no
sanitize).

## Design decisions

### DECISION: BACKEND_VALIDATION_LOCATION

Where to enforce input-name validation on the backend. Note both API paths
forward input names — `extract_from_history` (HID) at `services/workflows.py:238`
and `extract_by_ids` at `:260` — so a by-ids-only check would leave the HID
path on silent-dedup.

- **SHARED_HELPER, BOTH SERVICES (chosen)** — `_validate_input_names(...)` called
  from both `extract_from_history` and `_validate_extract_by_ids_payload`.
  - Guards both API surfaces identically; the HID path is otherwise unguarded
    (it can't label outputs, but it *can* name inputs).
  - Stays in the service layer alongside the output validation.
  - Cost: two call sites (acceptable — one helper, one line each).

- **SERVICE_BY_IDS_ONLY (rejected)** — validate only in
  `_validate_extract_by_ids_payload`. Mirrors output-label location exactly and
  covers the UI, but leaves the HID API path silently dedup'ing duplicate input
  names — the same disconnect, just narrower.

- **EXTRACT_STEPS (rejected)** — error at the label-assignment site, covering
  every caller in one place. Rejected for consistency: output validation lives
  in the service layer, and putting input validation deep in `extract.py` while
  outputs sit in the service splits the seam. (The provided-vs-default
  regression is avoidable either way by only checking supplied names.)

### DECISION: NORMALIZATION_PARITY (parity — chosen)

Frontend uniqueness must compare the **same normalized form** each side keys on,
or a residual disconnect remains:
- Outputs: backend keys on `_sanitize_output_label` output — `.strip()`, then
  `re.sub(r"\s+", " ", ...)` to collapse internal runs of whitespace to a single
  space, then truncate to 255. The frontend's `selectedOutputLabels` currently
  only `.trim()`s, so `"a  b"` (two spaces) and `"a b"` (one) look distinct on
  the frontend but the backend collapses both to `"a b"` and 400s the second.
  Fix: apply the same trim + internal-collapse in the frontend duplicate check
  so the disabled-button prediction matches the backend exactly.
  **As implemented**, the frontend also truncates to 255 (`.slice(0, 255)`) —
  `_sanitize_output_label` dedups on the *post-truncation* value, so two labels
  identical for 255 chars but differing after collide on the backend; without
  the truncation the frontend would predict them distinct. Locked by a paired
  truncation-collision test on each side.
- Inputs: backend uses names raw (no sanitize). Frontend compares raw `newName`.

### DECISION: EMPTY_INPUT_NAMES (reject — chosen)

The backend helper rejects empty / whitespace-only *provided* input names,
matching the output path. The UI already blocks empties via
`hasUnnamedSelectedInputs`, so this is a safety net for direct API callers.

### DECISION: INPUT_NAMES_RAW (keep raw — chosen)

Accepted input names are stored verbatim — no whitespace-collapse, no silent
truncation — so generated input step labels are unchanged (avoids snapshot/iwc
drift). The only limits are hard rejections: empty and >255. Truncation was
rejected because it would alter the user's chosen label without telling them.

## Test plan (red → green)

### Backend (`lib/galaxy_test/api/test_workflow_extraction.py`)

Mirror the existing output tests
(`test_extract_duplicate_output_label_rejected`,
`test_extract_distinct_outputs_with_duplicate_label_string_rejected`) using
`_assert_extract_rejected` + `_seed_two_inputs_and_run_cat1`:

- `test_extract_duplicate_dataset_names_rejected` — two `hda_ids` with identical
  `dataset_names` → expect 400. (Red first: currently extracts 200 with the
  second input silently unlabeled; assertion of 400 fails → implement #1 →
  green.)
- `test_extract_duplicate_name_across_dataset_and_collection_rejected` — same
  name string spanning `dataset_names` and `dataset_collection_names` → 400
  (proves the combined namespace).
- `test_extract_empty_input_name_rejected` — a whitespace-only provided name →
  400 (Q3).
- `test_extract_overlong_input_name_rejected` — a >255-char provided name → 400
  (length guard, Q4).
- `test_extract_unique_dataset_names_ok` — distinct names → 200, both input
  steps carry their labels (guard against over-rejection).
- `test_extract_default_unnamed_inputs_unchanged` — multi-input extraction with
  **no** names supplied → still 200 (proves the no-names default path is
  untouched).
- HID-path coverage: add a duplicate-name rejection case against the
  from-history endpoint too (the helper runs there as well), reusing the
  `TestWorkflowExtractionApi` HID fixtures.

### Frontend (`WorkflowExtractionForm.test.ts`)

The file already exists (notebook commit added cases). Add, asserting on
`submissionDisabled` / `submissionDisabledMsg`:

- Two selected inputs sharing a `newName` → disabled + "input names must be
  unique"; rename one → enabled. (Red first against current code.)
- Two exposed outputs sharing a label → disabled + "output labels must be
  unique"; relabel one → enabled.
- Whitespace-collapse case (if parity adopted): `"a  b"` vs `"a b"` outputs →
  disabled.

Run: backend via `/galaxy-backend-tests` (single suite, one at a time);
frontend vitest under the venv-bootstrapped node per repo convention.

## Resolved decisions

1. **Backend location** — shared `_validate_input_names` helper, called from
   **both** `extract_from_history` and `extract_by_ids` (covers HID + by-ids).
2. **Normalization parity** — frontend output check collapses internal
   whitespace to mirror `_sanitize_output_label` (trim + `\s+` → single space).
3. **Empty input names** — backend rejects empty / whitespace-only provided
   names (parity with outputs).
4. **Input names raw** — accepted names stored verbatim; limits enforced by
   rejection (empty, >255), never truncation.

## Open questions

None outstanding.

## Implementation notes

### HID-path endpoint correction

The test plan said to reuse `TestWorkflowExtractionApi`'s HID fixtures, but that
class drives the **legacy** `POST /workflows?from_history_id=` endpoint
(`api/workflows.py:287`), which calls `extract_workflow` **directly**, bypasses
`WorkflowsService` entirely, and never forwards `dataset_names`. The validated
`extract_from_history` service is served by the **new**
`POST /api/histories/{history_id}/extract_workflow` route
(`api/histories.py:887`). The HID-path test
(`test_extract_from_history_duplicate_input_names_rejected`) posts there directly
with `dataset_hids` + `dataset_names`. The legacy endpoint never names inputs, so
leaving it unguarded is fine.

### Output-label truncation parity (added)

See the addendum under DECISION: NORMALIZATION_PARITY. Frontend now
`trim → collapse \s+ → slice(0,255)`; paired truncation-collision tests added
front and back.

### Deferred (out of plan scope — backend-only safety nets)

- **Frontend input-name >255 length guard.** Backend rejects (DECISION:
  INPUT_NAMES_RAW); the UI does not predict it. Plan framed length/empty as
  direct-API safety nets, so the rename-modal path can still eat a >255 input
  400. Add a `hasOverlongInputNames` computed + message for full symmetry if
  desired.
- **Fail-fast hoist.** `_validate_input_names` sits after the job/ICJ DB-loops in
  `_validate_extract_by_ids_payload` (grouped with output validation). Could move
  above the loops since it's a pure-payload check; cosmetic, no behavior change.

### Test results

- Frontend `WorkflowExtractionForm.test.ts`: 29/29 passing locally.
- Backend `test_workflow_extraction.py`: 8 new cases (7 by-ids + 1 HID), authored
  and py_compile-clean, run deferred to CI (no `.venv` in the worktree).
