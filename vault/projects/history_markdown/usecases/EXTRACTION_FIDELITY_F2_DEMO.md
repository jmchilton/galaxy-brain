# Finding 2 — Visual: `multiple` data input cannot map over a flat list in a workflow

> **REFRAMING (confirmed by client + backend code review): this is an API-vs-UI/workflow asymmetry, not an extraction-drops-a-map-over bug.**
> A human **cannot** map-over a `multiple="true"` data input anywhere in the Galaxy GUI — not in the tool form, not in the workflow editor. The tool-form `data_multiple` variant is hard-coded `batch: BATCH.DISABLED` (`client/src/components/Form/Elements/FormData/variants.ts:46-62`; single `data` params get `BATCH.LINKED`), and the workflow editor treats a flat `list` into a multiple input as a direct **reduce** match (`client/src/components/Workflow/Editor/modules/terminals.ts:506-512`, with an explicit code comment); only a higher-dimension `list:list` maps (outer) / reduces (inner). The client mirrors the backend (`lib/galaxy/workflow/modules.py:642-675`) exactly.
> The **only** thing that can element-wise map a flat collection over a multiple input is the **API** `{"batch":true,"values":[{"src":"hdca",...}]}` request. So the original UC1 notebook (built via the API/MCP) did something **no human, no UI, and no workflow can express**. Page→workflow extraction then faithfully produces the only expressible behavior (reduce). **The `build_list` → `list:list` nesting is therefore not an extraction-only workaround — it is the normal, and only, human/UI/workflow-reachable way to map a multiple input.** That recasts Finding 2: the gap is that the API's `batch:true` over a multiple input creates histories that cannot round-trip, and the fix (build_list nesting) is what a human would have been forced to do from the start. (UI behavior confirmed read-only against `variants.ts`, `FormData.vue:401-448/565-603/1208-1235`, `FormElement.vue:433-451`, `terminals.ts:486-552`.)


The one-line claim: **a `list` collection wired into a `multiple="true"` data input always
*reduces* (whole list → one job). A workflow connection has no way to say "map this input
element-wise." So any history that ran such an input mapped element-wise (via run-time
`batch:true`) cannot be faithfully extracted — it silently degrades map → reduce.**

This is not speculation — Galaxy already ships a *passing* test that pins the reduction
(`collection_semantics_multi_data_optional.gxwf-tests.yml`, doc: *"LIST_REDUCTION … produces a
single dataset"*) and a *passing* extraction test that pins map-upstream→reduce-into-multiple
(`test_extract_reduction_from_history`, `lib/galaxy_test/api/test_workflow_extraction.py:314`).
There is **no** test for the mirror case (mapping a `multiple` input) because it isn't expressible.

---

## The mechanism, visually

Same `list` collection `[el1, el2, el3]`. The *only* difference between the two cases is the
`multiple` attribute on the tool's data parameter.

```
INPUT (both cases):   list collection
                      ┌──────┬──────┬──────┐
                      │ el1  │ el2  │ el3  │      collection_type: list
                      └──────┴──────┴──────┘

═══════════════════════════════════════════════════════════════════════════════════
 CASE A — single data input           →  MAP-OVER        (this is what people expect)
   <param name="input1" type="data"/>     arity 1: one element per job
═══════════════════════════════════════════════════════════════════════════════════

        el1 ─►┌─────────────────────┐─► out1
              │ job#1  input1 = el1 │
        el2 ─►┌─────────────────────┐─► out2
              │ job#2  input1 = el2 │
        el3 ─►┌─────────────────────┐─► out3
              │ job#3  input1 = el3 │
                                              OUTPUT:  list[out1, out2, out3]   ✅ N jobs
                                                       collection STRUCTURE PRESERVED

═══════════════════════════════════════════════════════════════════════════════════
 CASE B — multiple="true" data input  →  REDUCE          (no way to make it map a flat list)
   <param name="f1" type="data" multiple="true"/>   arity N: the whole list to ONE job
═══════════════════════════════════════════════════════════════════════════════════

   {el1, el2, el3} ─►┌──────────────────────────────────┐─► out (el1+el2+el3)
                     │ single job   f1 = [el1, el2, el3] │
                     └──────────────────────────────────┘
                                              OUTPUT:  single dataset           ⚠ 1 job
                                                       collection STRUCTURE GONE
```

`Galaxy decides this at run time in` `lib/galaxy/workflow/modules.py:642-672`: a `multiple` data
param is treated as *directly accepting* a `list` (`effective_input_collection_type = ["list"]`),
so a flat list `direct_match`es and is **not** added to the set of collections to map over → reduce.
A non-`multiple` param is unconditionally mapped. (Map-over of a `multiple` input only happens for a
*higher-dimension* upstream, e.g. `list:list` → maps the outer list, reduces the inner.)

---

## Why this breaks extraction (the UC1 pairing case)

In UC1, `bedtools closest` has `inputA` (single data) and `inputB` (`multiple="true"`). The history
was built by forcing **element-wise map-over on BOTH** inputs at run time via
`{"batch": true, "values": [{"src": "hdca", ...}]}` — pairing isolate *i*'s ARG with isolate *i*'s
IS. That is expressible at the *tool-run* layer but **not** at the *workflow-connection* layer.

```
ORIGINAL HISTORY  (run-time batch:true on BOTH inputs → element-wise, paired)

   ARG list [a1 a2 a3 a4]          IS list [b1 b2 b3 b4]
        │ mapped                        │ mapped (paired by element)
        a_i ─────────┐        ┌───────── b_i
                     ▼        ▼
            ┌──────────────────────────────────┐
            │ closest job_i  inputA=a_i  inputB=b_i │     4 jobs, one per isolate
            └──────────────────────────────────┘
                     │
              out_i  └─► list[o1 o2 o3 o4] ─► collapse ─► 4-column matrix   ✅

EXTRACTED WORKFLOW, re-invoked  (connection layer cannot encode "map inputB")

   inputA (single data)  : list ─► MAPS     ─► a_i per job                ✅
   inputB (multiple data): list ─► REDUCES  ─► {b1 b2 b3 b4} in EVERY job ✗

            ┌──────────────────────────────────────────┐
            │ closest job_i  inputA=a_i  inputB={b1..b4} │   pairing destroyed:
            └──────────────────────────────────────────┘   every job sees the whole IS list
                     │
              downstream per-isolate matrix collapses ─► heatmap fails
```

The connection `closest.inputB ← IS_list` is the only thing the workflow can store
(`WorkflowStepConnection` has no map/reduce field — `lib/galaxy/model/__init__.py:9577`), and that
connection *means reduce*. The element-wise intent from the run-time batch request is dropped at
extraction (`lib/galaxy/workflow/extract.py:841-851`) and is unrecoverable at re-invocation.

---

## Minimal gxformat2 artifact — "should work but doesn't"

Drop these two files in `lib/galaxy_test/workflow/`. The workflow is the *mirror* of the existing
passing reduction fixture; the test asserts the **mapped** result a user would want if preserving
map-over. It FAILS today because the list reduces to a single dataset — and there is no gxformat2
syntax to make it pass.

`map_over_multi_data.gxwf.yml`
```yaml
class: GalaxyWorkflow
inputs:
  input1:
    type: collection
    collection_type: list
outputs:
  wf_output:
    outputSource: tool_step/out1
steps:
  tool_step:
    tool_id: multi_data_optional      # input1 is type="data" multiple="true"
    in:
      input1: input1
```

`map_over_multi_data.gxwf-tests.yml`
```yaml
- doc: |
    DESIRED (currently impossible): map a multi-data input element-wise over a list.
    A 3-element list SHOULD yield a 3-element output collection (one job per element).
    ACTUAL: the list reduces — wf_output is a single dataset concatenating all three —
    so this Collection assertion fails. There is no gxformat2 syntax to force map-over
    of a `multiple="true"` data input fed a flat list; the connection always reduces.
  job:
    input1:
      class: Collection
      collection_type: list
      elements:
        - identifier: el1
          class: File
          contents: "element 1"
        - identifier: el2
          class: File
          contents: "element 2"
        - identifier: el3
          class: File
          contents: "element 3"
  outputs:
    wf_output:
      class: Collection            # <-- expectation: still a list of 3
      collection_type: list
      elements:
        el1:
          asserts:
            - { that: has_text, text: "element 1" }
        el2:
          asserts:
            - { that: has_text, text: "element 2" }
        el3:
          asserts:
            - { that: has_text, text: "element 3" }
```

**Contrast (already passing, proves the default is reduce):**
`collection_semantics_multi_data_optional.gxwf.yml` wires the *same* tool the *same* way but its
test asserts a **single** `wf_output` containing both elements' text — i.e. the documented
reduction. Our file above is identical except it asserts a collection, which is why it fails.

The single-data control (`type="data"`, no `multiple`) maps fine and is covered everywhere
(e.g. `random_lines1` mapped over a collection in `test_extract_reduction_from_history`). The whole
delta is the `multiple="true"` attribute.

---

## Prior art — this is a known, open issue (filed by jmchilton, 2017)

- **#4623 "Allow Mapping (Batch-Mode) over multiple data parameters"** (open) — the canonical issue.
  States the default is reduce; the essential ask is *"map a `list` over these parameters (run N jobs
  each with a single input)"* and the pairing case *"supply two lists of size N and run N jobs each
  with the matching two datasets"* (= UC1 `closest` inputA+inputB). Also documents the tool-authoring
  workaround: replace `type="data" multiple="true"` with a `conditional` whose second path is a plain
  (non-multiple) `data` param (and a `repeat`/`data_collection` path for the richer cases).
- **#18541 "Codify Map/Reduce Semantics for Multi-select Parameters"** (open; `kind/bug`,
  `area/workflows`, `area/testing`) — sibling for `select multiple="true"`; calls for test coverage +
  *"a workflow syntax to get the other behavior"* (the missing map/reduce knob).
- Related: #3840 (tool form, multiple map-over collections), #20956 (closed — tool-form "map over
  instead of passing whole collection"), #21971 (workflow tool-state round-trip fidelity).

## The fix that works TODAY — map `build_list` to manufacture `list:list`

No new Galaxy capability required. `__BUILD_LIST__` (help: *"If providing a collection here the tool
will be run in batch and one collection per element is created"*, output `type="list"`) mapped over a
flat `list` yields `list:list` — one singleton inner list per element. Feeding that to the `multiple`
input triggers the existing higher-dimension path (`modules.py:675 can_map_over`): **map the outer
list, reduce the inner singleton** → exactly one dataset per job, paired with the non-multiple input's
own map dimension.

```
IS list [b1 b2 b3 b4]  ──map build_list──►  list:list [[b1][b2][b3][b4]]  ──► closest.inputB (multiple)
                                                                                map outer / reduce inner
                                                                                → job_i inputB = b_i  ✅
```

So UC1's extracted workflow can be made faithful by inserting a mapped `build_list` step before
`closest.inputB`. (`bedtools closest` itself offers no single-data escape hatch — its `inputB`
conditional `overlap_with` toggles history-file vs. built-in-GFF, not single-vs-multiple — so the
nesting trick is the right move for the unmodified tool.)

**Fragility caveat (positional pairing).** The pairing of `inputA` (flat `list`, mapped) with
`inputB` (`list:list`, outer-mapped) is done by **positional zip**, not by element identifier:
`MatchingCollections.compatible_shape` (`lib/galaxy/model/dataset_collections/matching.py`) compares
only lengths/nesting and **ignores identifiers**, and `walk_collections` yields `collection[index]`
per child (`structure.py`). Job *i* = `inputA[i]` + `inputB`-outer[*i*]. This is correct in UC1
because both branches descend from the **same** `data_collection_input` through 1:1
order/identifier-preserving map-overs (SortBED sorts rows *within* a dataset, not elements across the
collection), so positional and identifier order coincide. But the construct is **fragile to future
edits**: inserting any element-reordering or filtering step (Filter/Sort Collection, or a tool that
drops a failed element) into *one* branch only would silently mispair isolate *i*'s ARG with another
isolate's IS — and with equal lengths it raises **no error at all**. This positional fragility is the
real cost of the workaround versus a first-class map-over connection mode (#4623); note it in the
workflow annotation if the .ga is handed off for editing.

## What a first-class fix would require (per #4623)

1. a new connection/step-input *map-over mode* on `WorkflowStepConnection`/`WorkflowStepInput` that
   the runtime honors (generalize the subcollection-mapping path so a flat `list` can be *scattered*
   into a `multiple` input) + GUI language for it, **or**
2. tool-authoring the conditional+repeat/`data_collection` pattern #4623 describes, **or**
3. the workflow-level `build_list` → `list:list` nesting above (works now).

Minimum viable for extraction specifically: **warn at extraction** that a mapped `multiple` input is
being downgraded to a reduction, so the lossy round-trip is at least visible.

---

## Validated end-to-end + applied to UC1 (2026-06-15)

The `build_list` nesting was confirmed empirically and applied to make UC1 extract cleanly:

- **Workflow runtime pairs correctly.** A minimal `build_list(map over IS) → closest(inputA=ARG list, inputB=build_list/output)` workflow, invoked on the 4-isolate lists, produced **4 paired jobs, each with one `-b` file, 9 columns** (no `-mdb` index), line counts 2/10/7/9 — byte-matching the golden per-isolate closest. The full UC1 tail workflow then reproduced the location matrix, context matrix, and flank table **byte-identical** to the golden outputs.
- **IMPORTANT caveat — direct tool-execution can NOT reproduce this.** At the `run_tool`/tool-form layer the map-outer/reduce-inner pairing is unreachable: batching `inputA` (flat `list`) against `inputB` (`list:list`) fails with *"Cannot match collection types"*, and passing `list:list` plain to the `multiple` param **reduces the entire thing** (every job gets all 4 `-b` files + an `-mdb` index column). Only the **workflow runtime** (`can_map_over`, `modules.py:675`) aligns a flat-list `inputA` map dimension with a `list:list` `inputB` outer dimension. So to build a history whose extraction is faithful, the nested-`closest` tail had to be run **by invoking a workflow into the history**, not by direct tool calls. (This is itself a fidelity asymmetry worth noting: tool-form batch matching is stricter than workflow collection matching.)
- **Clean extraction achieved (structurally).** UC1 page → workflow extraction yields **31 steps, 0 dangling, 9 workflow outputs, and all 9 report embeds survive** (`report_warnings: []`), with both `closest.overlap_with|inputB ← __BUILD_LIST__` and all 4 browser embeds anchored to `__EXTRACT_DATASET__ ← JBrowse`. Artifact: `UC1_MRSA_Bakta_JBrowse_clean_extract.ga`.

### CRITICAL: the full re-run exposed a SECOND reduction the build_list fix didn't cover

Re-invoking the extracted workflow on a fresh copy of the assemblies (122 jobs, all `ok`, ~38 min) ran the closest steps **paired correctly** (4 elements × 9 columns, no `-mdb`), **but the ARG matrices/closest table came out wrong** — every gene present in every isolate, ~4× inflated context counts. Root cause: **`staramr`'s `genomes` parameter is also `multiple="true"`**, so connecting the assemblies collection reduced **all four isolates into ONE staramr job** (`staramr on dataset 1-4 and collection 6`), producing a single resfinder with every isolate's ARGs that then broadcast to all four closest jobs. The in-place tail workflow never caught this because it was fed the *pre-built* ARG list, bypassing staramr.

Per-tool job counts on re-run: **staramr=1 (REDUCED)**, ISEScan=4, Bakta=4, integron=4, JBrowse=4 (mapped).

**The real lesson:** the build_list workaround is **per-multiple-input**, and a realistic pipeline has several. Auditing all pipeline tools found **four** `multiple` data-input reduction points: `closest.inputB` ×2 (loc + flank), `staramr.genomes`, and `jbrowse`'s 3 track inputs; `collapse.input_list` also reduces but that is by design. "0 dangling + embeds survive" is **necessary but not sufficient** for faithfulness — every mapped `multiple` input needs its own build_list nest.

**RESOLUTION (verified faithful end-to-end).** Splicing a `build_list` nest before each of the six multiple-input connections (`staramr.genomes`; `closest.inputB` ×2; `jbrowse` ARG/IS/Bakta tracks ×3) and re-invoking the whole pipeline from scratch on the assemblies now reproduces faithfully:
- staramr runs **4 mapped jobs** (per-isolate resfinder), not 1;
- the location matrix, context matrix, and flank table are **byte-identical to golden**;
- all 4 JBrowse browsers carry **only their own isolate's** reference + tracks (7 inputs each, down from 16 contaminated) — confirmed by isolate-contig spread per browser.
The definitive artifact is `UC1_MRSA_Bakta_JBrowse_faithful.ga` (35 steps, **6 `__BUILD_LIST__` nests**). The earlier `UC1_MRSA_Bakta_JBrowse_clean_extract.ga` is **superseded** — it passed structural checks (0 dangling, embeds survive) but was NOT faithful (staramr + jbrowse reduced).

**Why this is the strongest evidence in the investigation:** a single realistic notebook needed **six** build_list nests to round-trip, none of which a human could discover from the UI (mapping a multiple input isn't GUI-reachable — see the reframing at the top). The manual pattern plainly does not scale; this is the concrete case for first-class map-over support (#4623) and extraction-time auto-nesting / warning (#22710).

## Verdict (unchanged from the findings doc)

EXPECTED-SEMANTICS + FIDELITY GAP. The reduce is correct and tested in isolation; the gap is that
run-time element-wise map-over of a `multiple` input has no workflow representation, so extraction
is silently lossy for that construct. Confirmed by static reading + two existing passing tests; the
failing mirror test above has not been run (would need a framework-workflows server).
