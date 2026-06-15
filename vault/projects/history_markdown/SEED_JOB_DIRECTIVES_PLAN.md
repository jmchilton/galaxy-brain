# Seed Extraction from Job-Referencing Notebook Directives

One PR, off `dev`/`extract_next`, layered on the notebook-extraction feature
described in `EXTRACT_NOTEBOOK_PR.md`. Two ordered phases: **cleanup first**
(fix the missing `implicit_collection_jobs_id` directive handling, access-checked),
then the **seeding feature** (a notebook that references a job's metrics/stdout
pulls that job into the extracted workflow).

> **Status (2026-06-06):** Phase 1 is **done** — it shipped as commit
> `78ac9a1339` ("Markdown export: render mapped (ICJ) job directives; drop dead
> report data baking"), now rebased low in the `extract_next` tree. Phase 2 (the
> seeding feature) is **done** in the working tree (not yet committed): all five
> build steps landed and every test layer is green — collector unit 9/9, closure
> unit 15/15, API integration 11/11 (`TestNotebookWorkflowExtractionSummary`),
> vitest 33/33; vue-tsc/black/isort/eslint clean. See the per-step notes below.

## Why

Today the page→extraction seed comes only from dataset/collection directives
(`history_dataset_display`, `history_dataset_collection_display`). A notebook that
shows a job's `job_metrics` / `tool_stdout` / `tool_stderr` / `job_parameters` —
"I ran BWA, here are its metrics" — does **not** pull that job into the extracted
workflow. It should: a referenced job is part of the story the notebook tells.

Wiring that up forced us through the directive visitor's job branches, which
surfaced a pre-existing bug (the cleanup, Phase 1).

## Resolved decisions

| # | Decision |
|---|---|
| Expose vs check | A job-referenced output is **seeded** (its step + upstream inputs on the producing subgraph, row checked) but **not exposed** — showing metrics ≠ wanting the dataset as a workflow output. |
| ICJ identity | A map-over (`implicit_collection_jobs_id=`) directive seeds the **ICJ id** directly. A `job_id=` on an element job is folded to its ICJ **at the collector**, so the closure receives an ICJ id, not a stray element job. |
| Refs shape | `ReferencedContent` carries **split** `job_refs` + `icj_refs`; the collector decides job-vs-ICJ at the directive boundary (it already holds the resolved job). |
| Non-workflow job | `job_metrics` on an upload → seeded **input** row + a **per-row warning** (`seed_warning`, new schema field) the form surfaces on that row. |
| All four directives | `tool_stdout` / `tool_stderr` / `job_metrics` / `job_parameters` treated identically (seed the producing job). |
| Doc location | This doc, updated in place (was open Q4). |
| Security / process | Not a vulnerability in any release — Phase-1's ICJ branch was inert (no-op) before it landed, so no job data was fetched, nothing to leak. New code is access-checked from the first commit. **No SECURITY.md disclosure/embargo; one public PR.** |

## Phase 1 — Cleanup: handle `implicit_collection_jobs_id` in job directives ✅ DONE

Shipped as `78ac9a1339`. Recorded here for context; no remaining work.

The directive-arg regex recognized `implicit_collection_jobs_id`, and the
invocation-report remap **emits** it for map-over steps, but the parse dispatch
(`_walk_directives`) only branched on `object_type == "job_id"`. So
`job_metrics(implicit_collection_jobs_id=N)` was a no-op everywhere on parse, and
PDF/HTML export rendered the literal directive block instead of a table.

What landed:

- A shared `_job_for_job_directive(object_type, object_id)` resolver
  (`markdown_util.py:243`) that accepts either a job id or an ICJ id. For an ICJ it
  resolves `icj.representative_job` and runs it through
  `job_manager.get_accessible_job` — same access gate `job_id` already used; no bare
  `sa_session.get` reaching a handler.
- All four job-directive branches (`markdown_util.py:329-344`) call it; handler
  signatures unchanged (each still receives a `Job`).
- `ToBasicMarkdownDirectiveHandler` renders the representative job labeled
  "Representative job of N mapped jobs".
- Unit coverage in `test_markdown_export.py` for ICJ rendering and access-denied.
- (Bundled, unrelated to seeding) dropped the orphaned `extra_rendering_data`
  baking the client no longer reads.

## Phase 2 — Feature: seed the producing subgraph from job directives ✅ DONE

Depends on Phase 1's access-checked ICJ resolution (done). Implemented in the
working tree as described below; the only deviations from the original plan:

- Frontend files live one level up from where the plan guessed: the form is
  `client/src/components/History/WorkflowExtractionForm.{vue,test.ts}`, and the
  `seed_warning` badge renders in `WorkflowExtraction/WorkflowExtractionCard.vue`
  (on `RowBase`, applies to both tool and input rows). The vitest mounts the
  **Card** directly (`shallowMount` + read `GCard` `badges` prop) since the form
  test uses `shallowMount` and stubs the card.
- `make update-client-api-schema` regenerates only the api-client *source*
  schema; the package `dist` (gitignored) must be rebuilt (`pnpm build` in
  `client/packages/api-client`) for local `vue-tsc` to see the new field.
- Schema regen run command is `./run_tests.sh -api …` (leading dash).

### The mechanism: seed via the job's outputs (reuse the existing walk)

The closure already walks **backward from content**: pop a dataset/collection →
find its creating job → seed that job → enqueue the job's inputs. A job directive
gives us a *job*, not content. Rather than re-implement job-processing (input
enqueue, the four boundaries, **and the map-over input recovery**) for a job seed,
we **enqueue the referenced job's outputs into that same content walk, unexposed**:

- For a **plain job** (`job_refs`): enqueue all `job.output_datasets[*].dataset` and
  `job.output_dataset_collection_instances[*].dataset_collection_instance` (all
  outputs, not just visible — seeding re-derives the job from any one output's
  `creating_job_associations`, so visibility doesn't affect seeding correctness).
- For an **ICJ** (`icj_refs`): enqueue `icj.output_dataset_collection_instances`
  (the implicit output HDCAs). The existing content loop then reads
  `implicit_input_collections` off each (`workflow_extraction_summary.py:139-146`)
  and the map-over input recovery runs for free; the row seeds via `icj_ids`.

Critically, these enqueued outputs are **not** added to `referenced_output_refs`,
so the producing step is `seeded` but its outputs are **not `exposed`** (not
starred as workflow outputs). The whole upstream subgraph then seeds through the
unchanged walk — your BWA example: metrics on BWA → BWA step seeded → its reads /
reference inputs walked back and seeded as workflow inputs, nothing starred.

Only inherent limitation (shared by any seeding approach): a row is flagged only if
`summarize()` produced one for it, and `summarize()` scans **visible** contents. A
job whose every output is hidden/purged has no row to flag — note as a warning, not
a crash. (Same constraint already noted in `EXTRACT_NOTEBOOK_PR.md §9`.)

New closure capability: the walk today resolves only **content**
(`_resolve_content`, `workflow_extraction_summary.py:86`). Phase 2 adds
`sa_session.get(Job, id)` / `sa_session.get(ImplicitCollectionJobs, id)` at the
seed entry points. The ICJ id is resolved **without re-gating** — access was
already enforced at the collector (Phase-1 `get_accessible_job`); add a one-line
comment at the resolution site stating that precondition (mirroring the existing
note at `workflow_extraction_summary.py:312-314`) so a future caller doesn't reach
the closure with an unchecked id.

### Changes

1. **Collector** (`_ReferencedContentCollector`, `markdown_util.py:772-782`) — the
   four job handlers stop being no-ops. Each receives the resolved (representative)
   `Job`. Read `job.implicit_collection_jobs_association`:
   - present → `content._record_icj(icj_assoc.implicit_collection_jobs_id)`
   - absent → `content._record_job(job.id)`

   This folds a `job_id=` on an element job to its ICJ at the boundary.

2. **`ReferencedContent`** (`markdown_util.py:694`) gains `job_refs: list[int]` and
   `icj_refs: list[int]` (deduped like `refs`), with `_record_job` / `_record_icj`.

3. **Closure** — `_backward_job_closure(trans, refs, job_refs, icj_refs, history_id)`:
   - Content refs: unchanged (added to `referenced_output_refs`, walked).
   - `job_refs`: resolve `Job`; resolve its tool via `_tool_for_job`.
     - workflow-compatible → enqueue its visible outputs **unexposed**; the walk
       seeds the row via `job_ids` and continues upstream.
     - not compatible / cross-history / tool missing → enqueue outputs unexposed so
       it surfaces as a seeded **input** row, **and** record its content key(s) in a
       new `ClosureResult.seed_warning_refs: set[ContentRef]`. (Compatibility is
       checked here at the seed entry point — we already hold the job — so an
       upstream upload reached by an ordinary walk is *not* warned, only a
       *directly job-referenced* non-step is.)
   - `icj_refs`: get `ImplicitCollectionJobs` by id (access already enforced at the
     collector via Phase-1's `get_accessible_job`); enqueue
     `icj.output_dataset_collection_instances` unexposed.

4. **`ClosureResult`** gains `seed_warning_refs: set[ContentRef]`.

5. **Schema** — add `seed_warning: Optional[str]` to `WorkflowExtractionJob`
   (`schema/workflows.py:387`). Plumb it through `_input_extraction_row`: that
   helper (`workflow_extraction_summary.py:244`) takes no `closure`, so **add a
   `seed_warning: Optional[str]` parameter** to it rather than reaching into closure
   from inside. Compute the value in each caller that holds the closure —
   `_extraction_row` (the fake-job path ~line 283 and the non-compatible-tool path
   ~line 322; both already have `content_keys` and `closure`, so
   `content_keys & closure.seed_warning_refs`) and `_synthesize_cross_history_inputs`
   (line 373). Regenerate the client schema (`make update-client-api-schema`,
   `Makefile:199`) so `client/packages/api-client/.../schema.ts` carries the field.

6. **`summary_from_page`** (`workflow_extraction_summary.py:405`) threads
   `referenced.job_refs` + `referenced.icj_refs` into `_backward_job_closure`.

7. **Frontend** — `seed_warning` lands on **input** rows (a non-step job becomes an
   `InputStep`), so it must live on `RowBase`, not on `ToolStep` where
   `tool_version_warning` sits. Concretely (the form file is the wrong target — the
   row type and card own this):
   - `client/src/components/History/WorkflowExtraction/types.ts` — add
     `seed_warning?: string | null` to `RowBase` (~line 23), and map it in **both**
     branches of `toExtractionRow` (the `tool` branch ~66-72 and the input branch
     ~80, alongside the existing `tool_version_warning` mapping at line 69).
   - `client/src/components/History/WorkflowExtraction/WorkflowExtractionCard.vue` —
     render `seed_warning` next to the existing `tool_version_warning` block
     (~lines 115-120).
   No change to checked/seeded logic — a job-seeded row arrives with `seeded`/
   `checked` already set and flows through the existing `job.checked = job.seeded`
   path (`WorkflowExtractionForm.vue:242`).

### Out of scope for this PR

- Per-element metrics aggregation (Phase-1 renders the representative job; unchanged).
- Batched provenance loads (per-seed resolution stays, per `EXTRACT_NOTEBOOK_PR.md §9`).

## Test plan (red → green, per layer)

Mirrors the existing four-layer split in `EXTRACT_NOTEBOOK_PR.md §8`; each concern
is tested at the cheapest faithful layer.

**Closure unit** — `test/unit/app/managers/test_workflow_extraction_summary.py`
(extend the mock harness: `MockJob` needs `output_datasets` /
`output_dataset_collection_instances`; add a mock `ImplicitCollectionJobs` with
`output_dataset_collection_instances`; and **extend `MockSession.get`** (test:52-54),
which today branches only `Collection`→hdca else→hda — it must also resolve `Job`
and `ImplicitCollectionJobs` by id or the new seed paths silently mis-resolve):

- plain `job_refs` seed → job in `job_ids`, its upstream inputs walked & in
  `content_refs`, its outputs **not** in `referenced_output_refs`.
- `icj_refs` seed → `icj_ids` contains the ICJ; the mapped-over input collection
  recovered & seeded (reuses the map-over recovery path). Do **not** assert
  `job_ids == set()` here: the implicit output HDCA's `creating_job_associations`
  are the element jobs, so element job ids legitimately land in `job_ids` (harmless
  — `summarize` keys the map row by representative job, so stray element ids match no
  row). Assert the ICJ id is in `icj_ids` instead.
- `job_id` on an element job is folded to the ICJ **at the collector** (assert in the
  collector test below), so the closure only needs the `icj_refs` path proven.
- non-workflow-compatible `job_refs` seed → content key in `seed_warning_refs`;
  an upstream upload reached only via an ordinary walk is **not** in
  `seed_warning_refs` (proves the warn-only-direct distinction).
- a content also displayed elsewhere (exposed) + its job referenced → exposed **and**
  seeded, deduped (cycle/`seen` guards hold).
- plain job with **two** outputs, neither referenced as content, the job referenced
  → job seeded once, **neither** output exposed (multi-output dedup + no mis-expose).

**Collector unit** — `test_markdown_export.py::TestReferencedContentCollector`
(reuse `_mapped_job_and_icj`, test:334 — but **set a concrete
`icj_assoc.implicit_collection_jobs_id = 7`** on it; the helper currently leaves it a
bare `MagicMock`, and the collector records exactly that attribute):

- `job_metrics(job_id=N)` on a plain job → `job_refs == [N]`, `icj_refs == []`,
  `refs == []`.
- `tool_stdout(implicit_collection_jobs_id=7)` → `icj_refs == [7]`.
- `job_metrics(job_id=<element job of an ICJ>)` → folded to `icj_refs == [7]`, not
  `job_refs` (the fold-at-collector assertion).
- inaccessible job id → skipped with a warning (existing `handle_error` path).

**Closure API (real server)** — `test_pages_history_attached.py::TestNotebookWorkflowExtractionSummary`;
extend the populator helper `new_notebook_referencing(..., job_ids=, icj_ids=)`
(`populators.py:2147`) to emit `job_metrics(job_id=…)` / `(implicit_collection_jobs_id=…)`
blocks:

- `cat1` then a notebook with `job_metrics(job_id=<cat1 job>)` → cat1 row `seeded`,
  its output **not** exposed, the two uploads seeded as inputs.
- `random_lines1` mapped over a pair, notebook with
  `job_metrics(implicit_collection_jobs_id=…)` (and a variant with `job_id=` on an
  element job) → map row seeded via `implicit_collection_jobs_id`, mapped-over input
  collection seeded.
- upload job referenced by `job_metrics(job_id=…)` → seeded input row + `seed_warning`
  populated on it.

**Translation vitest** — `WorkflowExtractionForm.test.ts`:

- a row with `seed_warning` set renders the warning; a row without it does not.
  (No new checked/seeded behavior — that seam is already covered.)

**Selenium** — none new. A job-seeded row is structurally identical to an
existing seeded row in the form; re-proving the round-trip through the browser
buys no confidence (per `EXTRACT_NOTEBOOK_PR.md §8`, "what we deliberately did not
port to the UI").

## Build / commit order

1. Schema field + regenerate client types (compiles, unused).
2. `ReferencedContent` split refs + collector recording + collector tests (red→green).
3. Closure job/icj seeding + `seed_warning_refs` + closure unit tests (red→green).
4. `summary_from_page` threading + API tests (red→green).
5. Frontend `seed_warning` rendering + vitest.

## Unresolved questions

1. `seed_warning` copy — **resolved**: badge label "Seeded as Input"; tooltip
   text `SEED_AS_INPUT_WARNING` = "Referenced by a notebook job directive, but its
   tool is not a workflow step (e.g. an upload or data fetch). It was seeded as a
   workflow input instead." (`workflow_extraction_summary.py`). Tweakable.
2. ICJ access — **resolved**: Phase-1 `_job_for_job_directive` access-checks the
   representative job before the collector records the ICJ id, so on the page
   endpoint the id only enters `icj_refs` after a passing check, and the closure's
   later bare re-fetch is safe. Mitigation, not an open question: add the
   access-precondition comment (see the closure-capability note above) so the
   closure isn't later called with an externally-supplied, unchecked ICJ id.
3. Backport — none needed (Phase-1's render fix is the only release-25.0 bug and it
   already merged).
