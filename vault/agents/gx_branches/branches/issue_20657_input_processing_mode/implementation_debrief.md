# issue_20657_input_processing_mode — implementation debrief

Branch `issue_20657_input_processing_mode` on `jmchilton` fork, 8 commits on origin/dev `4fe00d9e7ab`, head `9294237826c`. Fixes galaxyproject/galaxy#19234; addresses UI + in-app docs half of #20657 (docs-category / GTN tutorial / new nesting tool asks not done). Plan: [plan.md](plan.md). Screenshots: [screenshots/](screenshots/).

## What landed

| Commit | What |
|---|---|
| `ec283e0d829` + `1b1544a2f41` | Processing hint under every tool-form data input, driven by selected value not input type (root cause of #19234). Batch ("The selected list of pairs will be mapped over this tool: one job per dataset pair.") vs reduction ("…processed together/as a whole in a single job" + "Need one job per …?"). Pure `processingMode.ts` (`getProcessingMode`, `isBatchSelection` shared with `createValue`), `FormDataProcessingHint.vue`. Help terms: `collections.mapOver` extended, new `collections.reduction`, `collections.nestToMapOver` (Nest collection / Apply rules). `collectionTypeLabel`/`collectionTypeToText` moved to `buildCollectionModal.ts`. Server `make_hdca_entry` emits `collection_type`. |
| `02b5612b160` + `070cf50468a` | Dropdown badge on map-over options ("one job per dataset pair", `mapOverUnit()` shared with hint) via new FormSelect `label-area` slot (default = label span; FormSelection forwards to both FormSelect + FormSelectMany). Fixed pre-existing bug: inputs like `list,list:list` list same hdca twice (direct + multirun); id+src matching snapped the user's map-over choice back to direct. `itemUniqueKey` includes `map_over_type`; 3-tier `findDataOption`; keep-option merge lets server entry win; dropped-collection map-over type picks deepest match like server. |
| `814930b103f` + `b7a2dd21618` | `job_expansion` in `/api/tools/{id}/build` response: `summarize_meta_expansion` in `meta.py` (never raises; `{job_count, reason, inputs}`), counts without loading HDAs (`DatasetCollection.element_count_at_depth` single COUNT query; `subcollections.split_count`). Shared `_meta_value_classifier` / `_split_meta_inputs` / `_batch_collection` across sync, async and count paths; `permutations.matched_length` / `count_combos`. Gated on a batched input (zero extra queries otherwise). Count path checks `security_agent.can_access_collection`. Unknown ids → `ObjectNotFound` (execution path now 4xx instead of 500). Removed dead string-value branches (and the unbound-`src` latent bug). |
| `365405ed2b8` + `9294237826c` | "This will run N jobs." above footer Run (`ToolFormJobCount.vue`, pure `jobCount.ts`), breakdown for multiple batch inputs, warnings for empty collection / size or structure mismatch / remap > 1 job; Run tooltip " - N jobs". Stale build-response guard in ToolForm (`onUpdate` + `requestTool`). Deleted dead `v-slot:footer` Run button. |

## Verification

- vitest Tool/ + Form/: 50 files, 328 pass; other FormSelect consumers (RoleForm, QuotaForm, Workflow/Run, Collections): pass. vue-tsc clean.
- Unit: `test/unit/app/tools/test_meta_expansion.py` (20, each asserts agreement with `len(expand_meta_parameters)`; restricted-dataset access test), `test_misc.py::test_element_count_at_depth` (Postgres variants skipped locally — `_ids_in` array path not run), wider tools/model/workflow unit suites 316 pass.
- API (one at a time): new `TestToolsApi::test_build_job_expansion`; `test_build_collection_options_interleaves_direct_and_multirun_by_hid` (now asserts `collection_type`); 6 existing map-over API tests pass after the meta refactor.
- Live browser (local Galaxy, test tool conf): all scenarios pass — collection_paired_test + list:paired (the megahit case) shows badge, batch hint, "This will run 2 jobs.", submits 2 jobs; cat1 list → 3 jobs, submit matches; mismatch / empty warnings; multi_data_param reduction hint + popovers; list:list badge "one job per list". No console errors from branch code.
- Fork CI: not run yet.

## Review suggestions not acted on (and why)

- `match_collections` N+1 tree walk runs on every build when ≥2 linked nested collections are batched — left; only that case, follow-up candidate (threshold or SQL shape check).
- Server `_carry_selected_hdca` doesn't carry `map_over_type` on rerun — rerun values resolve to direct entry as before; would need reading job params.
- `NodeOutput.vue` `collectionTypeToDescription` not consolidated with `collectionTypeToText` — different labels/rank-based text, not a drop-in.
- FormSelectMany id-only `deselectOption` / `:key="option.label"` left — multiple-param server path never lists an hdca twice; createValue now dedupes src+id.
- Composed `localize()` fragments ("This will run" N "jobs.") — no placeholder/interpolation precedent in client; fragments minimized.
- `×` (unlinked/product) breakdown unreachable from tool form (no linked toggle there) — kept for API parity.
- `#execute` rendered twice by ToolCard (header + footer `buttons` slot) — pre-existing.

## Found along the way (not fixed here)

- **NestTool on a mapped DCE** (code reading, unverified): `NestTool.produce_outputs` iterates `hdca.collection.elements`; when mapped over a `list:paired` (form offers it as multirun over `paired`) each job gets a DCE whose `.collection` is the parent, so each job may re-nest the whole outer list. `nest_collection.xml` test doesn't map over. Worth an API test.
- Client `endsWith` collection-type matching has no `:` boundary (`"list:paired_or_unpaired".endsWith("paired")`) in `toDataOption` and `canAcceptSrc`; left consistent, small separate fix.
- Existing client check blocks datasets + collection batch combos ("Please select either dataset or dataset list fields…") before server mismatch notice is reachable for that combo.

## Polish candidates (from live check)

1. `list:list` has no friendly label ("selected list:list collection" vs "list of pairs").
2. Labels for inputs inside repeats/sections are bare ("Select") in mismatch/breakdown text — no parent context.
3. Run stays enabled on empty / mismatch warnings (server rejects) — could disable.
4. Remap warning untested live (needs failed job to rerun).

## Open questions

- Term keys `galaxy.collections.reduction` / `nestToMapOver` OK (uses collection_semantics.md "reduction" vocabulary rather than "bulk")?
- PR: one PR fixing #19234 + "partially addresses #20657", or split server job count into its own PR?
- `make_hdca_entry` now emits `collection_type` on every hdca option — fine payload-wise?
