# Workflow Extraction UI — ICJ-Aware Polish

> **Date:** 2026-05-13
> **Branch:** `history_notebook_extract` (`jmchilton/galaxy`, currently at `efbd2e1156`)
> **Predecessor:** [[ICJ_NATIVE_PLAN]] (this PR's parent plan; explicitly punted UI to follow-up)
> **Trigger:** CI run [25799914411](https://github.com/jmchilton/galaxy/actions/runs/25799914411) — 6 Selenium failures in `test_workflow_extraction.py` traced to the new strict validator vs. legacy UI payload.
> **Related research:**
> - `vault/research/Workflow Extraction Issues.md`
> - `vault/research/Component - Workflow Extraction Models.md`

---

## Why this exists

[[ICJ_NATIVE_PLAN]] declared `WorkflowExtractionForm.vue` out of scope on the assumption that the form's existing payload (`job_ids=[mapped_job]`) would keep working. Commit `17595cefcb` made that payload a 400. The interim fix on this branch (4-file patch — bucket mapped jobs into `implicit_collection_jobs_ids` client-side) restores Selenium green but leaves the UI with no signal that a card represents an implicit collection vs. a plain job, an overloaded `loading` ref, errors that wipe the form, and no client test coverage of the new bucket.

This plan hardens the UI so the API contract and the UX agree, and so the failure modes (server 400 on validator, in-flight POST, ICJ identity) are honestly surfaced.

**Important correction to the initial review:** `WorkflowSummary.__summarize` already collapses an ICJ to its representative job (`jobs.items()` keys one entry per ICJ). There is **no** multi-card-per-ICJ desync. Mapped-tool cards already render as one row. The polish gap is *visual identity* and *error/loading discipline*, not selection semantics.

---

## Current state to build on

Reuse as-is:

| File | Reuse |
|---|---|
| `lib/galaxy/workflow/extract.py` `WorkflowSummary.__summarize` | already collapses ICJs to representative job |
| `lib/galaxy/schema/workflows.py` `WorkflowExtractionJob` | now has `implicit_collection_jobs_id` |
| `lib/galaxy/webapps/galaxy/services/histories.py` `create_workflow_extraction_summary` | now populates ICJ id from `job.implicit_collection_jobs_association` |
| `client/src/components/History/WorkflowExtractionForm.vue` `selectedJobBuckets` | partitions selected tool jobs into `job_ids` vs deduped `implicit_collection_jobs_ids` |
| `client/src/components/History/WorkflowExtractionForm.test.ts` | 16 passing vitest tests |
| `client/src/components/History/WorkflowExtraction/WorkflowExtractionCard.vue` | step-type meta, badge generation |

Rewrite:

| File | Rewrite scope |
|---|---|
| `lib/galaxy/schema/workflows.py` | add `implicit_collection_jobs_size: Optional[int]` to `WorkflowExtractionJob` |
| `lib/galaxy/webapps/galaxy/services/histories.py` | populate the new size from `len(icj_assoc.implicit_collection_jobs.jobs)` |
| `client/src/components/History/WorkflowExtraction/types.ts` | discriminated union, `isMappedTool` narrow helper |
| `client/src/components/History/WorkflowExtraction/WorkflowExtractionCard.vue` | "Mapped × N" badge for ICJ rows; drop `STEP_TYPE_META[...]` cast |
| `client/src/components/History/WorkflowExtractionForm.vue` | split `loading` / `submitting`; restructure error placement; new data-attrs; drop unnecessary `(job as ...)` cast |
| `client/src/components/History/WorkflowExtractionForm.test.ts` | fixtures + assertions for mapped bucketing, dedup, mixed, error/loading discipline |
| `client/src/utils/navigation/navigation.yml` | `data-icj-id`, `data-step-kind` selectors |
| `lib/galaxy_test/selenium/test_workflow_extraction.py` | new assertion: mapped cards show "Mapped" badge |

Delete:
- Nothing — earlier deletions in [[ICJ_NATIVE_PLAN]] stand.

---

## Target shape

### Schema addition

```python
# lib/galaxy/schema/workflows.py
class WorkflowExtractionJob(Model):
    # ... existing fields ...
    implicit_collection_jobs_id: Optional[EncodedDatabaseIdField] = None  # already added
    implicit_collection_jobs_size: Optional[int] = Field(
        None,
        description="Number of constituent jobs in the ICJ (only set when implicit_collection_jobs_id is non-null).",
    )
```

### Card badges

| Card kind | Badges (in order) |
|---|---|
| plain tool | View Job (if id), tool-version-warning (conditional), "Workflow Step" |
| mapped tool | View Job (representative), tool-version-warning, **"Mapped over N items"**, "Workflow Step" |
| input dataset | Renamable, "Input Dataset" |
| input collection | Renamable, "Input Dataset Collection" |

Mapped badge uses `faLayerGroup`, variant `info`, class `unselectable`. Label `"Mapped over {N} items"` when size known; `"Mapped"` if size missing. `title` attr explains the row represents the whole ICJ (no tooltip component for v1).

### Form refs

```ts
const loading = ref(true);           // initial summary fetch only
const submitting = ref(false);       // POST in flight
const errorMessage = ref<string | null>(null);
const warnings = ref<string[]>([]);
```

### Form template structure (semantic, not literal)

```
<header>
  <breadcrumb/>
  <error-alert v-if="errorMessage"/>            ← inline, never hides list
  <loading-alert v-if="loading"/>
  <actions v-if="!loading && jobsList.length">
    <name-input :disabled="submitting"/>
    <create-button :disabled="submissionDisabled || submitting">
      <FontAwesomeIcon :icon="submitting ? faSpinner : faCheck" :spin="submitting"/>
      {{ submitting ? "Creating..." : "Create Workflow" }}
    </create-button>
  </actions>
  <warnings-row v-if="!loading && jobsList.length"/>
  <empty-alert v-if="!loading && !errorMessage && !jobsList.length"/>
</header>
<list v-if="jobsList.length">
  ...cards...
</list>
```

Submission errors do **not** hide `jobsList`. Loading (initial fetch) still does — there's nothing else to show.

**Note on `submitting` UX:** `GButton` has no `:busy` / `:loading` prop (verified in `client/src/components/BaseComponents/GButton.vue`). Follow the established pattern from `client/src/components/Form/FormGeneric.vue:16-17`: `:disabled="submitting"` plus a `faSpinner` swap-in via `FontAwesomeIcon :spin="submitting"`. Disable the name input via `:disabled="submitting"`. Cards stay interactive during the POST window — re-toggling them does no harm, and the button is the only path to re-submit.

### data-attrs on each card

| Attr | Source | Notes |
|---|---|---|
| `data-job-id` | `job.id` | existing; representative-job id for mapped tool rows |
| `data-step-type` | `job.step_type` | existing; one of `tool` / `input_dataset` / `input_collection` |
| `data-icj-id` | `job.implicit_collection_jobs_id` | new; omitted when null |
| `data-step-kind` | computed | new; one of `tool` / `mapped-tool` / `input-dataset` / `input-collection` |

### Types

```ts
// types.ts
export type WorkflowExtractionToolJob = WorkflowExtractionJob & { step_type: "tool" };
export type WorkflowExtractionInput = WorkflowExtractionJob & {
    step_type: "input_dataset" | "input_collection";
    newName: string;
};
export type WorkflowExtractionRow = WorkflowExtractionToolJob | WorkflowExtractionInput;

export function isWorkflowExtractionInput(row: WorkflowExtractionRow): row is WorkflowExtractionInput;
export function isMappedTool(
    row: WorkflowExtractionRow,
): row is WorkflowExtractionToolJob & { implicit_collection_jobs_id: string };
```

`selectedJobBuckets` uses `isMappedTool` instead of `(job as WorkflowExtractionJob).implicit_collection_jobs_id`.

---

## Implementation per file

### `lib/galaxy/schema/workflows.py`
- [ ] Add `implicit_collection_jobs_size: Optional[int]` field on `WorkflowExtractionJob` with description.

### `lib/galaxy/webapps/galaxy/services/histories.py`
- [ ] When `icj_assoc is not None`, set `implicit_collection_jobs_size = len(icj_assoc.implicit_collection_jobs.jobs)`.
- [ ] Eager-load the relationship up-front to avoid N+1 across a history's mapped jobs. Two patterns viable in this codebase; pick whichever the existing `summarize` query already supports:
   - **Preferred** — at the call site in `create_workflow_extraction_summary`, after `summarize(...)` returns, batch-load via `sa_session.scalars(select(ImplicitCollectionJobs).options(selectinload(ImplicitCollectionJobs.jobs)).where(ImplicitCollectionJobs.id.in_(icj_ids)))` keyed by ICJ id, then look up the count from that dict.
   - **Alternative** — push `joinedload(Job.implicit_collection_jobs_association).joinedload(ImplicitCollectionJobsJobAssociation.implicit_collection_jobs).selectinload(ImplicitCollectionJobs.jobs)` onto the query inside `WorkflowSummary.__summarize` (only if that query is reachable for modification without breaking the HID-based path).
- [ ] Imports: `from sqlalchemy.orm import joinedload, selectinload`, `from galaxy.model import ImplicitCollectionJobs, ImplicitCollectionJobsJobAssociation`.

### `_schema.yaml` + `client/src/api/schema/schema.ts`
- [ ] Run `make update-client-api-schema` (or the equivalent two-step: `python scripts/dump_openapi_schema.py _schema.yaml`, then `pnpm openapi-typescript ../_schema.yaml -o src/api/schema/schema.ts && pnpm prettier --write src/api/schema/schema.ts`).

### `client/src/components/History/WorkflowExtraction/types.ts`
- [ ] Replace `WorkflowExtractionInput` widening with the discriminated-union shape above.
- [ ] Add `WorkflowExtractionRow` union.
- [ ] Add `isMappedTool` narrowing helper.

### `client/src/components/History/WorkflowExtraction/WorkflowExtractionCard.vue`
- [ ] Add `MAPPED_BADGE` factory (or `mappedBadge(size)`).
- [ ] In `badges` computed: when `props.job.step_type === "tool"` and `props.job.implicit_collection_jobs_id`, insert the mapped badge before the step-type badge.
- [ ] No template change — badge list drives rendering.

### `client/src/components/History/WorkflowExtractionForm.vue`
- [ ] Split `loading` / `submitting`. Initial fetch only flips `loading`; `submitWorkflow` flips `submitting`.
- [ ] In `submitWorkflow`'s `finally`, clear `submitting`, not `loading`.
- [ ] Template: move `BAlert v-if="errorMessage"` out of the `v-if/v-else-if` chain — render alongside the actions, never as a replacement for the list. Show actions row as `v-if="!loading && jobsList.length"`. List renders independent of `errorMessage`.
- [ ] Add `:disabled="submitting"` to the name input. Swap the Create button's icon to `faSpinner` with `:spin="submitting"` and toggle the label to "Creating..." while in-flight (mirroring `Form/FormGeneric.vue:16-17`). Add `submitting` to the `submissionDisabled` computed so the button reflects the busy state via the existing disabled path.
- [ ] In `selectedJobBuckets`, replace `(job as WorkflowExtractionJob).implicit_collection_jobs_id` with `isMappedTool(job)` from `types.ts`.
- [ ] Add `data-icj-id`, `data-step-kind` props to the `<WorkflowExtractionCard>` element. `data-step-kind` computed inline: `job.implicit_collection_jobs_id ? "mapped-tool" : job.step_type.replace("_", "-")`.

### `client/src/components/History/WorkflowExtractionForm.test.ts`
- [ ] Add `MAPPED_TOOL_JOB` fixture (`step_type: "tool"`, `implicit_collection_jobs_id: "icj-1"`, `implicit_collection_jobs_size: 4`).
- [ ] Add `MAPPED_TOOL_JOB_2` fixture sharing the same ICJ (`implicit_collection_jobs_id: "icj-1"`, `id: "job-tool-3"`).
- [ ] New tests:
  - `submits mapped tool job via implicit_collection_jobs_ids` — single mapped job → `implicit_collection_jobs_ids: ["icj-1"]`, `job_ids: []`.
  - `dedupes ICJ ids when two cards share an ICJ` — defensive (summarize already collapses but client should still cope).
  - `mixes plain and mapped job buckets correctly` — one plain + one mapped → both buckets populated.
  - `submission error keeps job list visible` — mock `extractWorkflowByIds` reject; assert the `WorkflowExtractionCard` instances still rendered and the `BAlert variant="danger"` appears.
  - `submit shows submitting state without hiding list` — assert button enters busy state and list remains; loading alert does not appear.

### `client/src/utils/navigation/navigation.yml`
- [ ] Add `card_by_icj_id` selector keyed on `data-icj-id`.
- [ ] Add `mapped_tool_card` selector keyed on `data-step-kind="mapped-tool"`.
- [ ] Add `mapped_badge` selector for the "Mapped" badge.

### `lib/galaxy_test/selenium/test_workflow_extraction.py`
- [ ] Fold the badge assertion into the **existing** `test_extract_nested_collection_ui` (lines 452-478). That test already (a) navigates separately from submit, (b) inspects cards via `count_job_checkboxes()` between the two, and (c) exercises a list:paired mapped flow — exactly the case the badge is meant to surface. One-line insertion right after the existing `count_job_checkboxes` assertion:

  ```python
  mapped_cards = self.find_elements_by_selector('[data-step-kind="mapped-tool"]')
  assert len(mapped_cards) >= 1, "Expected at least one mapped-tool card on a list:paired mapped flow"
  # Sanity: every mapped-tool card should carry a data-icj-id
  for card in mapped_cards:
      assert card.get_attribute("data-icj-id"), "mapped-tool card missing data-icj-id"
  ```

  Do **not** add a new test method — reuse keeps the Selenium shard count flat and the failure (if the badge regresses) lands in a test whose name already names the mapped case.

---

## Red-to-green test order

1. **Commit 1 — server-side size field.** Add `implicit_collection_jobs_size` to schema. Populate in service. Regenerate `_schema.yaml` + `schema.ts`. Existing tests stay green. Optional: API-level assertion that summary jobs for a mapped flow carry a non-null size.
2. **Commit 2 — vitest fixtures + RED tests.** Add `MAPPED_TOOL_JOB`, `MAPPED_TOOL_JOB_2`. Add the 5 new tests. Mapped-bucketing tests pass immediately (logic exists). The error-keeps-list-visible and submitting-state tests FAIL — current form replaces list on error and on submit.
3. **Commit 3 — form discipline.** Split `loading`/`submitting`. Restructure template so error alert and list coexist. Disable interactions during submit. Vitest commit-2 RED tests turn GREEN.
4. **Commit 4 — types + card badge.** Convert `types.ts` to discriminated union. Drop the cast in `selectedJobBuckets`. Add `mappedBadge(size)` to `WorkflowExtractionCard.vue`. Run `vue-tsc --noEmit` (must stay green) + vitest (must stay green).
5. **Commit 5 — data-attrs + Selenium badge assertion.** Add `data-icj-id` / `data-step-kind` to card rendering. Update `navigation.yml`. Add the Selenium assertion for the mapped badge. Run targeted Selenium subset locally if possible; otherwise rely on CI.

Run after each commit:
- Commits 1, 2, 3, 4: `cd client && npx vitest run src/components/History/WorkflowExtractionForm.test.ts && npx vue-tsc --noEmit`
- Commit 1: also `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py` to confirm the new schema field round-trips.
- Commit 5: full Selenium subset via CI push.

---

## Out of scope (do not pull into this PR)

- **Renaming mapped-tool steps.** Today only inputs are renamable. Mapped tool steps would need a server-side workflow-step label override that the extraction path doesn't currently expose.
- **Expanding constituent jobs under an ICJ row.** `summarize` already collapses; reintroducing constituent display would require a new server payload and a new selection model.
- **Replacing `BPopover` with `GPopover`.** Pre-existing TODO comment in `WorkflowExtractionMessages.vue`.
- **Surfacing per-icj `populated_state` / `output_hdca_count`** on the summary so the UI can pre-flight reject. Out-of-scope note already in [[ICJ_NATIVE_PLAN]] unresolved questions.
- **API ergonomic for `job_id → icj_id` lookup.** Open question from [[ICJ_NATIVE_PLAN]]; not needed now that the summary exposes `implicit_collection_jobs_id`.
- **`WorkflowExtractionMessages.vue` rename / error split.** Rename to `WorkflowExtractionWarnings.vue` would be cleaner but is churn. Leave for a future cleanup PR.

---

## What this PR fixes downstream

| Issue | How |
|---|---|
| CI run 25799914411 — 6 Selenium fails | The 4-file UI fix on this branch already lands them; commits 1-5 polish on top. |
| User confusion: "is this card a single job or a map?" | Mapped × N badge, `data-step-kind` attribute. |
| User loses selections when submit fails | Error alert no longer replaces the list. |
| User can't tell submit is in-flight without losing context | `submitting` state shows on the button only. |
| Selenium can't target ICJ-level selections | `data-icj-id`, `data-step-kind` attrs + navigation.yml entries. |
| Client test suite silently green despite weak `objectContaining` assertion | Explicit assertions on both `job_ids` and `implicit_collection_jobs_ids`. |

---

## References (in-repo)

- ICJ field plumbing: `lib/galaxy/webapps/galaxy/services/histories.py` `create_workflow_extraction_summary` (just edited on this branch).
- Server-side ICJ row collapse: `lib/galaxy/workflow/extract.py:336-411` (`WorkflowSummary.__summarize_dataset_collection`).
- ICJ → jobs relationship: `lib/galaxy/model/__init__.py:2928` (`ImplicitCollectionJobs.jobs`).
- Card meta + badges: `client/src/components/History/WorkflowExtraction/WorkflowExtractionCard.vue:24-83`.
- Form template: `client/src/components/History/WorkflowExtractionForm.vue:260-314`.
- Existing GCard / GButton patterns: `client/src/components/Common/GCard.vue`, `client/src/components/BaseComponents/GButton.vue` — check for `:busy` / `:disabled` props before assuming.
- Navigation selectors: `client/src/utils/navigation/navigation.yml` → `workflow_extract` block.

---

## Resolved questions (from initial draft)

- **Badge wording** → "Mapped over N items".
- **GButton `:busy` / `:loading`** → none exists. Pattern: `:disabled="submitting"` + `faSpinner` icon swap (`Form/FormGeneric.vue:16-17`).
- **`data-step-kind` value for mapped tools** → `mapped-tool`.
- **Selenium badge assertion** → fold into existing `test_extract_nested_collection_ui` (list:paired mapped flow); no new test method.
- **Tooltip on mapped badge** → `title` attr only for v1.
- **`icj.jobs` size load strategy** → eager-load (selectinload preferred, joinedload acceptable) to avoid N+1 across a history's mapped jobs.

## Unresolved questions

- Should `data-step-kind="mapped-tool"` also imply a CSS hook (`.mapped-tool { border-left: 3px solid info; }`) for at-a-glance scanning, or is the badge alone enough? Lean: badge only.
- The plan adds `implicit_collection_jobs_size` to the summary payload but not to the extraction *result*. Is there a downstream UI that wants the size on the created workflow object? Probably not — workflow steps don't track ICJ identity.
- If `selectinload(ImplicitCollectionJobs.jobs)` is added at a second query after `summarize()` returns (preferred pattern above), confirm that re-attaching the count by ICJ id doesn't cause a session/identity-map detach for the already-loaded Job rows. Should be fine — same session — but worth a quick check.
- For the Selenium assertion, do we want to also verify the badge **text** ("Mapped over") or just the data-attr presence? Text adds churn if we ever reword. Lean: data-attr only.
