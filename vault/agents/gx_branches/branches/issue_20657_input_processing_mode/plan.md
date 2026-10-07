# issue_20657_input_processing_mode — plan

Worktree: `~/projects/worktrees/galaxy/branch/issue_20657_input_processing_mode` (based on origin/dev `4fe00d9e7ab`, bootstrapped).

Issues: galaxyproject/galaxy#19234 (batch hint missing when a collection-typed input is mapped over, e.g. megahit `list:paired` into `paired`), #20657 (always show and explain how collections / `multiple="true"` inputs are processed; in-app docs preferred over GTN; help-term scheme suggested by John).

## Root cause (#19234)

`client/src/components/Form/Elements/FormData/FormData.vue` hint block (~L1238-1268) is gated on `currentVariant.batch !== BATCH.DISABLED` (input *type*), never on the *selected value*. All `data_collection`/`data_multiple` variants in `variants.ts` are `BATCH.DISABLED`. Server already tags map-over options with `map_over_type` (`lib/galaxy/tools/parameters/pagination.py` `make_hdca_entry`), and `createValue()` emits `batch: true` when present — so the job maps over correctly, UI is silent.

## Phases

1. **Processing-mode hint + help terms.** A single computed "processing mode" from the selected value + variant: `batch` (map over / multiple datasets → N jobs) vs `bulk` (whole selection consumed by one job) vs none. Always render a hint for data/collection inputs in the tool form describing which. Batch text names the split when `map_over_type` known (e.g. "one job per `paired` element of the selected `list:paired`"). Bulk text e.g. "All selected datasets will be processed together in a single job." Each links (HelpText) to a help term in `lib/galaxy/schema/terms.yml` (client symlink `client/src/components/Help/terms.yml`; full-page route `/help/terms/:term` exists). Extend `collections.mapOver` to cover sub-collection map over; add sibling terms for bulk processing and for batch-running a bulk tool by nesting a collection (and linked/unlinked if useful). Keep workflow-run form behaviour (module flavor, linked toggle) intact.
2. **Dropdown markers.** Map-over options (`map_over_type` set, or collection into plain `data` input) visibly marked in the select list (badge or label suffix) so user knows before choosing. Keep search/filter working.
3. **Server job count.** Count-only helper in `lib/galaxy/tools/parameters/meta.py` reusing `split_inputs_flat`/`split_inputs_nested` classification and `build_combos` semantics (MATCHED zip — equal lengths; MULTIPLIED product); never raises; returns `{job_count, reason, ...}`. Wired into `Tool.to_json` (build endpoint) after `populate_state` on a deep copy of raw incoming; gated: not workflow_building_mode, history present, job is None, some input `batch: true` (else skip/1). Test asserting agreement with `len(expand_meta_parameters(...)[0])`. Add field to client `ToolFormConfig` (`client/src/api/tools.ts`) / schema as appropriate.
4. **Job count UI.** Show "This will run N jobs" (or mismatch/unknown reasons) near the Run button in `ToolForm.vue`; client tests.

## Research notes (job count)

- Job count is `len(expanded_incomings)` from `expand_meta_parameters` (meta.py ~211-281); legacy flat keys via `split_inputs_flat`, nested via `split_inputs_nested`. It **mutates incoming** (pops `|__identifier__`) — copy first.
- Classifier reads `linked` (default True) → MATCHED; `linked: false` → MULTIPLIED. `product` is only read by workflow `expand_workflow_inputs`. Tool form data variants are all `BATCH.LINKED` → tool form batches are always matched; count = common length or mismatch.
- Collection batch: `__expand_collection_parameter` (meta.py ~442-486). With `map_over_type` → `subcollections._split_dataset_collection` (number of subcollections of that type at any depth). Without → `collection.dataset_elements` (all leaves). Requires `populated_optimized` else `ToolInputsNotReadyException`. Cost: N+1 hda loads + lazy tree walk — avoid full expansion in build; count via elements/SQL instead.
- Don't use `collection_info.structure` for counts (None w/o collections, ignores multi-dataset batches, uninitialized tree len raises).
- Build round-trip: `ToolForm.vue` `onChange` → `onUpdate` → POST `api/tools/{id}/build` (`Tool/services.ts`); every data param has `refresh_on_change` (basic.py `BaseDataToolParameter`); build also reruns on history updates. Server `ToolsController.build` (webapps/galaxy/api/tools.py ~657) → `Tool.to_json` (tools/__init__.py ~2962-3088). `DataToolParameter.from_json` collapses batch wrapper → add computation on raw kwd before that.
- No dry-run endpoint; `/api/jobs` and `/api/tools` both have side effects.
- Edge cases: multiple="true" input + flat list = 1 job (reduction); deeper → map_over_type "list" sublists. Conditionals/repeats fine (flat keys; client only sends active case). Implicit conversions not counted. Unpopulated collection → unknown. Empty → 0 (warn). Job remap / data source tools reject >1 job (`_ensure_expansion_is_valid` ~2184).
- Latent: `__expand_collection_parameter` `src` unbound for string values (meta.py ~451-464).

## Process

Sequential phase subagents; review subagent between phases (focus: `vault/agents/_shared/REVIEW_FOCUS.md`). One commit per phase (+ review fixups). No PR. Handoff per `vault/agents/_shared/GX_IMPLEMENTATION_HANDOFF.md`.
