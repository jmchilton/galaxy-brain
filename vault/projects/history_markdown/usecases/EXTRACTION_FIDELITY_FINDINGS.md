# Notebook → Workflow Extraction Fidelity Findings

Three extraction/round-trip gaps surfaced while building UC1 (MRSA Bakta+JBrowse). Each was
verified by reading the Galaxy source (worktree `history_pages`); line numbers are against that
branch and may drift vs `dev`. Verdicts are deliberately honest — **none is a clean core-extraction
bug**: #1 is a notebook-authoring defect with a UX wart, #2 is a representational fidelity gap, #3
is tool-design + a JBrowse robustness gap.

| # | Finding | Verdict | Where the fix lives |
|---|---------|---------|---------------------|
| 1 | Mapped-collection-element embed dropped on page→workflow extraction | **NOT a core bug**: notebook should have used Extract Dataset; secondary UX wart = silent drop | Notebook authoring (+ optional rewriter warning) |
| 2 | `multiple` data input that was mapped element-wise reduces on re-invocation | **EXPECTED-SEMANTICS + FIDELITY GAP** (representational, not a wiring bug) | Galaxy core model + runtime (new capability) |
| 3 | awk (tp_awk) output keeps input datatype → JBrowse silently drops track | **NOT a core bug**: tool-design (`format_source`) + JBrowse silent-drop | Tool XML / JBrowse wrapper |

All three are confirmed by static reading only — none were reproduced end-to-end. Each has a
red-test repro sketch below; run before filing.

---

## Finding 1 — Mapped-collection-element embed dropped on extraction (NOT a core bug: notebook-authoring defect + UX wart)

**Symptom.** A page embeds an element HDA of a collection produced by an implicit collection job
(ICJ / map-over): `history_dataset_embedded` (or `as_image`/`as_table`/`as_pdf`) pointing at one
element of a map-over result. On page→workflow extraction (PR #22860: `from_page_id`), the
directive is silently dropped from the extracted report (a "Dropped a dataset reference…" warning
buried in `report_warnings`). Single datasets from plain (non-mapped) jobs survive — the observed
asymmetry.

**Why it is NOT a core extraction bug (corrected framing).** The embedded element is an **output**
element of an ICJ that is **inside** the extracted subgraph (the map-over job is selected via
`implicit_collection_jobs_ids`; its output HDCA *is* indexed, `extract.py:854-862`). The canonical,
already-supported way to reference one element of a collection is to run the **Extract Dataset**
tool (`__EXTRACT_DATASET__`) on the collection first — that yields a *standalone HDA with its own
creating job*, which `_original_hda` deliberately does not normalize back to the collection element
(`extract.py:920-928`, guard commented "Collection-operation tools that yield a single dataset … are
real workflow steps"), and which registers a resolvable `("dataset", …)` key (`extract.py:863-869`).
So an embed of an Extract-Dataset output resolves and survives — pinned by existing tests
(`test/unit/workflows/test_extract_report.py:157-169`
`test_index_does_not_normalize_collection_operation_output`; API
`test_extract_keeps_extract_dataset_operation_step`). **The defect is upstream in the notebook
authoring:** the agent embedded a *raw* map-over element with no anchoring node. Fix = the notebook
should insert an Extract Dataset step per element it wants to embed.

**Why "should dangle as an input" does NOT apply here.** Extraction has no auto-promotion of an
unresolved reference into a synthesized input step. Input steps are created only from explicitly
passed `dataset_ids`/`dataset_collection_ids` (`extract.py:171-199` HID path, `:755-779` ID path).
An unresolved upstream during wiring is merely **left unwired** (`if other_hid in hid_to_output_pair`,
`:217-226`; ID path `:847-851`), not turned into an input. The only input-like inference is
`FakeJob`, and only for datasets with *no creating job at all* (`:445-446`, class `:260-277`) — still
requiring user selection to become a real input. Moreover the UC1 element has a creating job that IS
in the subgraph, so it is an output, not an external input; promoting it to an input would fabricate
a duplicate of an output the workflow already produces and break the map-over flow. A map-over yields
a *collection*, not N standalone datasets, so there is no per-element output handle to point at.

**The legitimate secondary issue — silent drop (UX wart).** The report-directive rewriter is a pure
read-only id→label lookup that runs *after* every step is built (`services/workflows.py:291-311`),
against a frozen index; it cannot create steps even in principle. On a lookup miss it drops the
directive with a warning (`workflow_extraction_report.py:109-113`, `:119-120`; miss returns `None`
at `extract.py:618-620`). This is *consistent* with the connection path (both treat "not in subgraph
/ not expressible" by silently omitting), but the warning is buried in `report_warnings`. Reasonable
hardening: surface the miss loudly to the author (actionable: "embed references a collection element;
add an Extract Dataset step"), or optionally resolve the element to its containing collection
(`output=`/`output_collection=`) instead of dropping — at the cost of widening one-element semantics
to the whole collection.

**Repro (to confirm the supported path, not a red bug test).** (1) Negative: build a page embedding a
raw map-over element, extract with `from_page_id` + `implicit_collection_jobs_ids` → directive
dropped, warning in `report_warnings`. (2) Positive (canonical): run Extract Dataset on the
collection, embed the resulting HDA, select that job → directive survives. The positive path is
already covered by `test_extract_keeps_extract_dataset_operation_step` /
`test_index_does_not_normalize_collection_operation_output`; the notebook-seeding analogue is
`test_notebook_seeds_referenced_subgraph` (the redundant Selenium `test_notebook_keeps_extract_dataset_step`
was dropped in commit `c28ac6746c`).

**Issue-ready text (frame as notebook authoring + optional UX hardening, not a core bug).**
> When a notebook page embeds a *raw element of a map-over (implicit-collection) output* and a
> workflow is extracted from the page, the embed directive is silently dropped from the extracted
> report. This is expected given how extraction works: the element is an output of an in-subgraph ICJ
> with no per-element workflow handle, and extraction only indexes the whole output HDCA
> (`extract.py:854-862`), so the element-HDA lookup misses and the rewriter drops it
> (`workflow_extraction_report.py:109-120`). The supported pattern is to run **Extract Dataset**
> (`__EXTRACT_DATASET__`) on the collection to create a standalone-HDA node and embed *that* — which
> extraction resolves and existing tests cover. Two improvements worth considering: (1) notebook
> authoring should insert an Extract Dataset step for any single collection element it wants to embed;
> (2) the rewriter should surface the dropped-reference warning loudly and actionably (recommend
> Extract Dataset) rather than burying it in `report_warnings` — or optionally resolve the element to
> its containing collection output instead of dropping. Note: promoting the dropped reference to a
> workflow *input* is not correct here — the producing job is in-subgraph and the item is an output,
> not an external input.

---

## Finding 2 — `multiple` data input maps→reduces on re-invocation (FIDELITY GAP, not a wiring bug)

**Symptom.** A step run with element-wise map-over into a `multiple="true"` data input (e.g.
`bedtools closest` `inputB`) is extracted and re-invoked. The connection reduces the upstream
collection (one job, whole list) instead of mapping element-wise (N jobs). Downstream per-element
outputs collapse — an N-isolate matrix becomes one column, heatmaps fail.

**Root cause — representational gap, not a defect.** A native Galaxy workflow connection carries no
map-vs-reduce signal, and a flat-`list` → `multiple`-input connection is *defined* to reduce. So
extraction does the only thing it can, and re-invocation behaves deterministically — both correct in
isolation, but together lossy.

- **Re-invocation decides reduce:** `lib/galaxy/workflow/modules.py:642-672`
  (`ToolModule._find_collections_to_match`). A `multiple` data param gets
  `effective_input_collection_type = ["list"]` (`:644-646`); a flat `list` upstream `direct_match`es
  (`lib/galaxy/model/dataset_collections/query.py:62-69`), so the input is **not** added to
  `collections_to_match` → not mapped → whole list to one job = REDUCE. A non-`multiple` data param
  unconditionally maps (`:648`). Map-over of a `multiple` input only happens for a *higher-dimension*
  upstream (`list:list`) via `can_map_over` (`:675`) — so the gap is specifically the **flat-list**
  case.
- **Extraction can't record intent:** `_connect` (`extract.py:85-93`) creates a bare
  `WorkflowStepConnection` with no map/reduce field; mapped-step inputs are rewired to the whole
  pre-map HDCA (`extract.py:841-851`) — inputA (non-multiple) and inputB (multiple) wired
  identically. `WorkflowStepConnection` (`lib/galaxy/model/__init__.py:9577-9607`) has nowhere to put
  the signal. (`WorkflowStepInput.merge_type`/`scatter_type` exist at `:9527-9548` but are CWL-only,
  `tool_util/cwl/parser.py:989-993`, and not consulted by `_find_collections_to_match`.)

**Conclusion.** Loss is both at extraction (intent flattened) and re-invocation (only one defined
semantic), but the irreducible cause is representational: there is no field to write the map-over to
and no runtime path to honor a flat list scattered into a `multiple` input. Cannot be closed in
extraction alone — needs a new map-over connection mode in model + runtime (generalize the
subcollection-mapping path). Until then extraction of such histories is lossy and should at least
**warn**.

**Repro (red test).** Fixture exists: `test/functional/tools/multi_data_param.xml` (`multiple="true"`
data input `f1`). Upload a flat `list` of N; run map-over (`{"batch":true,"values":[{"src":"hdca",…}]}`)
→ ICJ of N jobs; extract via `extract_steps_by_ids(..., implicit_collection_jobs_ids=[icj],
hdca_ids=[upstream])`; re-invoke with the same `list`. Faithful = N jobs / N-element output; actual =
1 job / 1-element output. Assert on output-collection element count. Unit harness:
`test/unit/workflows/test_modules.py`.

**Issue-ready text.**
> **Extracted workflows reduce a `multiple="true"` data input that was originally mapped
> element-wise.** When a tool with a `multiple` data parameter is run with element-wise map-over over
> a collection (batch/ICJ) and a workflow is extracted, re-invoking it does not reproduce the
> per-element jobs — the upstream collection is reduced into a single job, collapsing per-element
> outputs. Root cause is representational, not a wiring bug: extraction records mapped inputs as plain
> step→step collection connections with no map-over signal (`extract.py:841-851`, `_connect` at
> `:85-93`), and `WorkflowStepConnection` (`model/__init__.py:9577`) has no field to carry one. At
> invocation `ToolModule._find_collections_to_match` (`modules.py:642-672`) treats a `multiple` data
> input as directly accepting a `list` (`:646`), so a flat-list upstream `direct_match`es
> (`query.py:62-69`) and is not mapped — the defined, deterministic behavior is to reduce; a
> non-`multiple` input always maps (`:648`). Closing the gap needs (a) a way to encode "map this
> `multiple` input element-wise" on the connection/step-input and (b) runtime support (likely
> generalizing subcollection mapping so a flat list scatters into a `multiple` input). Until then,
> extraction of such histories is lossy and should warn. Corroboration: the editor-side
> `get_step_map_over` applies the same reduce rule (`managers/workflows.py:1525-1533`).

---

## Finding 3 — awk output keeps input datatype → JBrowse silently drops track (NOT a core bug)

**Symptom.** `tp_awk_tool` ("Text reformatting") emits BED content but the output keeps the input's
datatype: tabular-in → `tabular`-out, gff-in → `gff`-out, never `bed`. JBrowse then receives a
mis-typed "BED" and silently drops a feature track. Fix used in UC1: route through `tbl2gff3` to get
a real `gff3`.

**Verdict.** **Tool-design consequence + JBrowse robustness gap. Galaxy core is correct.**

- **Why output inherits input type:** `tp_awk` declares `format_source="infile"` (awk.xml:46). Core
  copies the input extension verbatim at job-setup, *before* the job runs:
  `lib/galaxy/tools/actions/__init__.py:1283-1289` (returned `:1367`), invoked from
  `determine_output_format` at `:570`. So it structurally cannot reflect output content.
- **Galaxy does not sniff ordinary tool outputs.** Output sniffing is gated on the `_sniff_` sentinel
  (i.e. tool declares `format="auto"`): `lib/galaxy/metadata/set_metadata.py:127-129`. For a concrete
  declared extension, sniffing is skipped — the declared format is authoritative. Uploads sniff; tool
  outputs do not unless opted in.
- **The silent drop is in the JBrowse wrapper:** it dispatches the tabix parser purely on declared
  datatype — `jbrowse.py:926-931` (`gff/gff3`→`add_gff`→`tabix -p gff`; `bed`→`add_bed`→`tabix -p
  bed`). Unknown ext → `log.warn('Do not know how to handle %s')`, no exception → track silently
  omitted (`jbrowse.py:970-971`). Two failure paths: (1) gff-typed BED → passes the
  `format="gff,gff3,bed"` filter → GFF3 tabix parser on BED content → garbage/empty; (2) tabular-typed
  BED → `tabular` is a *supertype* of bed/gff (`datatypes/interval.py`), so it fails instance-match,
  is unselectable in the form, or hits the else-drop.

**Proper fixes.** (a) Tool: declare `format="auto"` to opt into output sniffing — but sniffing every
awk output is sometimes undesirable, likely why the author chose `format_source`. (b) Pipeline (used
in UC1): convert explicitly via `tbl2gff3` → proper `gff3`. (c) JBrowse: the `else` at
`jbrowse.py:970-971` should hard-error / sniff / convert instead of `log.warn`-and-drop, so a
mis-typed track fails loudly.

**Issue-ready text (frame as JBrowse robustness, not a Galaxy bug).**
> Not a Galaxy core bug. Galaxy treats a tool's declared output format as authoritative and only
> re-sniffs outputs when a tool opts in via `format="auto"` (`metadata/set_metadata.py:127-129`).
> `tp_awk_tool` declares `format_source="infile"` (awk.xml:46), so Galaxy copies the input datatype
> onto the output at job-setup (`tools/actions/__init__.py:1283-1289`) — correct per the tool's
> contract, but wrong for a content-changing transform that emits BED from a tabular/gff input. The
> silent failure is in the IUC JBrowse wrapper, which selects its tabix parser solely from the
> declared datatype (`jbrowse.py:926-931`) and, on any unrecognized extension, only `log.warn`s and
> skips the track (`:970-971`). A BED-content dataset labeled `gff` is parsed as GFF3; one labeled
> `tabular` is dropped. Recommended: (a) JBrowse should fail loudly / sniff / convert rather than
> silently drop unknown-typed feature tracks; (b) authors should not rely on `tp_awk`
> (format-preserving) to change a dataset's effective type — convert explicitly (`tbl2gff3`) or use a
> tool with `format="auto"`. Tool revisions checked: `bgruening/text_processing` `ab83aa685821`,
> `iuc/jbrowse` `a6e57ff585c0`.

---

## Where to file

- **Finding 1** → primarily a **notebook-authoring contract**, not a Galaxy issue: the notebook must
  insert an Extract Dataset (`__EXTRACT_DATASET__`) step per collection element it embeds. Optional
  Galaxy-side hardening (galaxyproject/galaxy, near the page-extraction PR #22860): make the
  dropped-reference warning loud + actionable, or resolve element→containing-collection instead of
  silently dropping. Not a clean core bug.
- **Finding 2** → already tracked: **#4623** "Allow Mapping (Batch-Mode) over multiple data
  parameters" (open, 2017) + **#18541** "Codify Map/Reduce Semantics for Multi-select Parameters".
  Add the extraction angle (warn on lossy map→reduce downgrade) as a comment there rather than a new
  issue. Works-today fix for UC1: map `__BUILD_LIST__` to make `list:list`, then feed the `multiple`
  input (map outer / reduce inner singleton). See `EXTRACTION_FIDELITY_F2_DEMO.md`.
- **Finding 3** → galaxyproject/tools-iuc JBrowse wrapper (silent-drop robustness); optionally a doc
  note on `tp_awk` + `format="auto"`. Not a Galaxy core issue.
