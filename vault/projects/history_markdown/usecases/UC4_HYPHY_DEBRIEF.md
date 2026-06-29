# UC4 debrief + recipe — HyPhy selection landscape (Core + Compare), extracted & re-run

Driven via `/drive-scenario UC4_HYPHY_issue.md`. Dengue CDS molecular-selection vignette: every figure/table is a genuine on-graph tool output (auditable + workflow-extractable), analyses run as collection map-overs, off-graph artifacts avoided. This doc = what was done + how to redo it + what to change next time.

Validated end-to-end: hand-built history → clean auto-extracted workflow (no warnings) → faithful re-execution. The extractability thesis holds.

---

## Artifacts produced

| Artifact | ID |
|---|---|
| Original history | `32d48e3506ae8cf7` |
| Notebook Page (Core + Compare) | `8c49be448cfe29bc` (rev `f30a35c999095ed7`) |
| **Extracted workflow** | `63cd3858d057a6d1` → `/tmp/uc4_extracted.ga` |
| Rerun invocation | `df7a1f0c02a5b08e` |
| Rerun history | `d0bfe935d0f5258d` (48 datasets + 19 collections, 0 errors) |

Key on-graph outputs in the original history: codon_alignments `20dece60f529586f` (hid1), gene_trees `d94929fc9baceae5` (hid2), Core DRHIP Combined Summary `4ee04745186420cb` (hid31) / Combined Sites (hid32), Compare DRHIP Combined Comparison Summary `887665e3f67571a1` (hid61) / Combined Comparison Site `b77ad93e9ebe2b9a` (hid62), reconstructed RELAX-K headered table `bad19f833fd297e7` (hid67).

---

## Figures

Captured live via the Playwright MCP (page `8c49be448cfe29bc` rendered/edited at `localhost:5173`; workflow `63cd3858d057a6d1` in the editor):

- `uc4_report_source.png` — report **source**: the thesis intro + `galaxy` `history_dataset_collection_display(...)` directives (on-graph, extractable).
- `uc4_report_rendered_table.png` — headline result **rendered** in the report: the DRHIP Combined Comparison Summary (Foreground vs Reference dN/dS, on-graph).
- `uc4_report_rendered_inputs.png` — top of the **rendered** report: the input codon-alignment + gene-tree collections embedded.
- `uc4_workflow_graph.png` — the **extracted workflow** (`63cd3858d057a6d1`) in the editor: 3 inputs → MEME/FEL/BUSTED/PRIME → DRHIP, then Annotate → RELAX/CFEL → DRHIP → Collapse → Text reformatting.

## Environment / preconditions

- Galaxy worktree `/Users/jxc755/projects/worktrees/galaxy/branch/history_pages`, v26.2.dev0.
- Started with `/drive-scenario` conventions — **NO** `GALAXY_RUN_WITH_TEST_TOOLS` (that hides installed shed tools). Backend 8080, dev client 5173.
- `config/galaxy.yml`: MCP enabled, Docker job env, `enable_celery_tasks` + `calculate_dataset_hash: always`, `conda_auto_install: false` + `enable_mulled_containers: true` (containers, not conda).
- Admin key: `sqlite3 database/universe.sqlite "select key from api_keys where user_id=1 order by create_time desc limit 1;"`. Pass it as `-H "x-api-key: $KEY"` (form-field `key` is **not** honored on `/api/tools/fetch`).

## Tools (shed, container-resolved)

`hyphy_meme`, `hyphy_fel`, `hyphy_busted`, `hyphy_prime`, `hyphy_relax`, `hyphy_cfel`, `hyphy_annotate` (all `2.5.96+galaxy0`), `drhip 0.1.5+galaxy0`, `jq 1.8.1+galaxy0` (container `quay.io/biocontainers/jq:1.8.1`), Collapse Collection (`nml/collapse_collections`), Text reformatting (`tp_awk_tool`). BioContainers are amd64-only — slow under emulation on Apple Silicon but correct.

## Input data

From `~/projects/repositories/iwc/workflows/comparative_genomics/hyphy/test-data/`:
- `codon_alignments/{capsid_protein_C,membrane_glycoprotein}.fasta`
- `iqtree_trees/{capsid_protein_C,membrane_glycoprotein}.nhx`
- `foreground_seqs_list.txt` — 3 isolates: `PP563838_1_2023_09_30`, `PP563839_1_2023_09_29`, `PP563841_1_2023_09_25`.

---

## Build recipe (history as driven)

### 0. Two keyed list collections (paired by gene name)
Build via `/api/tools/fetch` (NOT `/api/tools` — `__DATA_FETCH__` can't run directly). **`collection_type` and `name` go at the TARGET level**, siblings of `destination`/`elements`, not inside `destination`:
```json
targets=[{"destination":{"type":"hdca"},"collection_type":"list","name":"codon_alignments",
          "elements":[{"src":"path","path":".../capsid_protein_C.fasta","ext":"fasta","name":"capsid_protein_C"}, ...]}]
```
Element identifiers (`capsid_protein_C`, `membrane_glycoprotein`) must **match between the two collections** — map-over pairs alignment↔tree by identifier. (Verified: mismatched taxa would make HyPhy error, so successful runs prove pairing.)

### 1. Core map-overs (MEME / FEL / BUSTED / PRIME)
The MCP `run_tool` rejects hdca→single-data param ("use the map-over option"); use the `/api/tools` **batch** shape instead:
```json
{"tool_id":"...hyphy_meme...","history_id":"...",
 "inputs":{"input_file":{"batch":true,"values":[{"src":"hdca","id":"<codon_alignments>"}]},
           "input_nhx":{"batch":true,"values":[{"src":"hdca","id":"<gene_trees>"}]}, ... }}
```
Each produces a 2-element result collection + per-element markdown report. `gencodeid: Universal`.

### 2. Core DRHIP (reduction)
DRHIP has `multiple="true"` data params `meme_files` / `fel_files` / `busted_files` / `prime_files`. Pass each method's **collection** directly (reduction) → `Combined Summary` (gene × BUSTED stats + site counts) and `Combined Sites`.

### 3. Compare branch — foreground labeling
1. Upload `foreground_seqs_list.txt` (hid33); Text reformatting cleanup → hid34.
2. **Annotate #1** on gene_trees: `label=Foreground`, `invert=False`, `internal_nodes=All descendants`, `selection_method=list` → foreground-labeled trees (hid35).
3. **Annotate #2** on hid35: `label=Reference`, `invert=True` → fully `{Foreground}/{Reference}`-labeled trees (hid41).

### 4. Compare map-overs + DRHIP
- **RELAX** map-over: `input_file`←codon_alignments, `input_nhx`←hid41 (labeled trees) → hid47.
- **CFEL** map-over: same inputs → hid53.
- **DRHIP compare**: `relax_files`←RELAX coll, `contrastfel_files`←CFEL coll → `Combined Comparison Summary` (per-group dN/dS) + `Combined Comparison Site`.

### 5. RELAX-K reconstruction (DRHIP 0.1.5 schema-gap workaround)
DRHIP 0.1.5 reports group dN/dS but **omits RELAX K**. Reconstructed on-graph (no off-graph JSON parsing):
- **jq** map-over on RELAX coll, tsv: `[."test results"."relaxation or intensification parameter", ."test results"."p-value", ."test results".LRT]` → hid63.
- **Collapse Collection** (`add_name`, `place_name=same_multiple`) prepends element/gene name per line → hid66.
- **Text reformatting** (awk header): `BEGIN { print "gene\tK\tp_value\tLRT" }\n{ print }` → hid67 (`bad19f833fd297e7`). Verified value-for-value against raw RELAX JSON.

### 6. Notebook page
Page `8c49be448cfe29bc`, ```galaxy fences with `history_dataset_display` / `history_dataset_collection_display` directives embedding the on-graph outputs (renders in display view, shown as code in source editor).

---

## Extraction recipe (history → workflow)

1. **Pre-check** — `GET /api/histories/{id}/extraction_summary`. Returns the seeded jobs/inputs + any `warnings`. For UC4: **`warnings: []`**, 3 input steps + 14 tool steps (map-over jobs collapse to one representative step each). Empty warnings = Galaxy believes the whole DAG (map-overs, reductions, the jq/collapse/awk tail) is reconstructable.
2. **Extract** — `POST /api/workflows`:
```json
{"from_history_id":"32d48e3506ae8cf7","workflow_name":"UC4 HyPhy Selection Landscape (extracted)",
 "job_ids":[<14 tool job ids>],
 "dataset_collection_ids":[1,2],   // HIDs of the two input collections
 "dataset_ids":[33]}               // HID of the foreground-list input dataset
```
   `dataset_ids` / `dataset_collection_ids` are **HIDs**; `job_ids` are encoded job ids. → workflow `63cd3858d057a6d1`, 17 steps.
3. **Check it over** — `GET /api/workflows/{id}/download`. Verified: all 17 steps wired correctly — 4 DRHIP reductions → right map-over outputs; two-pass Annotate preserved with distinct params (`Foreground/invert=False`, `Reference/invert=True`); MEME `gencodeid=Universal` preserved; conditional param paths (`input_type_cond|input_file`, `selection_method|list_file`) intact.

## Rerun recipe (workflow → new history)

Endpoint is `POST /api/workflows/{id}/invocations` (**not** `/invoke` — that 404s):
```json
{"new_history_name":"UC4 HyPhy — workflow rerun","inputs_by":"step_index",
 "inputs":{"0":{"src":"hda","id":"<foreground hda>"},
           "1":{"src":"hdca","id":"<codon_alignments>"},
           "2":{"src":"hdca","id":"<gene_trees>"}},
 "use_cached_job":true}
```
Poll `GET /api/invocations/{inv_id}` → `state:completed` and history contents until no `new/queued/running/waiting`. Result: 48 datasets + 19 collections, **0 errors**.

---

## Reproduction fidelity (rerun vs original)

| Output | Result |
|---|---|
| Core DRHIP discrete counts (neg/pos sites, N, sites) | **identical** |
| CFEL Comparison Summary (all dN/dS, T, N, aa_conserved) | **identical** (value-for-value; only row/column order differs) |
| RELAX / BUSTED LRT test statistics | match (2.49 vs 2.54; 0.745 vs 0.760) |
| BUSTED omega3 / pval, RELAX K **point estimate** | **wobble** (capsid K 1.8e-10 vs 0.127; both K≪1) |

The wobble is **HyPhy optimizer non-determinism** (random restarts on the likelihood surface), not an extraction/workflow defect — every discrete count, every CFEL estimate, and every LRT reproduces; only continuous gene-wide MLE nuisance params drift. Qualitative conclusions hold exactly: **no positive selection (Core); relaxed selection, non-significant (Compare).** The capsid K→0 instability reinforces the page's "directional/illustrative, thin 3-foreground panel" caveat.

Headline results: Core — BUSTED p 0.47/0.33, no positive sites post-FDR. Compare — RELAX K<1 both genes (capsid ~0.13, prM ~0.31), not significant; CFEL Foreground dN/dS > Reference but no significant sites.

---

## Snags / gotchas (each cost time — pre-empt next time)

- **Fetch auth** — `/api/tools/fetch` ignores form-field `key`; must use `-H "x-api-key: $KEY"` (else "History is not owned by user").
- **Fetch target shape** — `collection_type` + `name` belong at the TARGET level, not inside `destination`. Wrong nesting → upload job hangs `running`, celery `finish_job` AssertionError (`assert "collection_type" in unnamed_output_dict`).
- **`__DATA_FETCH__` / `__EXTRACT_DATASET__`** can't run via `/api/tools` ("Cannot execute tool directly") — use the `/api/tools/fetch` endpoint.
- **MCP `run_tool`** won't map hdca→single-data param — use the `/api/tools` batch shape for map-overs.
- **Invocation route** — `POST /api/workflows/{id}/invocations` (plural); `/invoke` 404s.
- `use_cached_job:true` did **not** hit cache on rerun (jobs recomputed). Identity caching needs the exact same source HDAs + params; map-over re-expansion and/or pre-`always` hashes likely missed. Recompute was fast enough here; don't rely on cache for a clean reproduction test.

---

## Changes to make next time

1. **Harden HyPhy reproducibility via `--starting-points` (there is NO RNG seed).** Grep of all `hyphy_*` wrappers for `--seed`/`random_seed` = empty; HyPhy exposes no optimizer seed for these methods. The only relevant knob is **`--starting-points`** (Advanced options → "Specify values"; shared `macros.xml`), default `1` = a single random start → the run-to-run jitter in BUSTED omega3 and RELAX K. Set it to **10–50** on BUSTED and RELAX (the multi-start-sensitive, gene-wide mixture optimizations) so HyPhy tries many starts and keeps the best fit → converges toward the global MLE and collapses the variance. Caveats: it's variance-reduction, **not** bit-for-bit determinism; cost ≈ linear per start (already slow under amd64 emulation). FEL/CFEL/PRIME are fixed-effects per-site fits and already reproduced — lower priority. In the extracted workflow these steps currently have `advanced=None` (defaults); edit the BUSTED + RELAX steps to `advanced → specify → --starting-points`.
2. **Label workflow inputs/steps.** Extraction left generic labels ("Input Dataset", "Input Dataset Collection" ×2, all tool steps `label=None`). Set meaningful labels (codon_alignments / gene_trees / foreground_list) for a publishable `.ga`.
3. **Drop the RELAX-K reconstruction tail if DRHIP gains K.** The jq→collapse→awk chain (steps 13/15/16) is a DRHIP 0.1.5 schema-gap workaround. If a later DRHIP adds RELAX K to the comparison summary, remove the tail and embed DRHIP's native column.
4. **Cosmetic:** extracted tool_state carries a baked map-over `__identifier__` (e.g. `capsid_protein_C`) from the representative job. Harmless on rerun (map-over re-expands fresh) but noise in the `.ga`.
5. **Thicker foreground panel.** 3 isolates make the Compare branch directional/illustrative; the capsid K→0 boundary behavior is a symptom. A larger foreground set would stabilize K and give a real significance call.

---

## Suggested next moves

- Apply change #1 (starting-points on BUSTED+RELAX) and rerun to demonstrate the K/omega3 estimates tighten between passes.
- Clean, labeled `.ga` export for iwc submission alongside the existing `hyphy-core.ga` / `hyphy-compare.ga`.
- Embed a rerun-vs-original comparison in the page to document reproducibility (and the inherent HyPhy non-determinism) as part of the vignette.
