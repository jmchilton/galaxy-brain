# Issue draft: Notebooks MCP — polish for agent-driven analysis

> Draft prepared for filing against the Galaxy notebooks MCP server (the `mcp_notebooks` surface — agent operations in `lib/galaxy/agents/operations.py` and the MCP tools in `lib/galaxy/webapps/galaxy/api/mcp.py`). Sibling to `FETCH_MCP_ISSUE.md` (which covers the `upload_file_from_url` decode bug). Severity is from an agent's POV, not end users.

## Motivation

I built an end-to-end comparative-genomics notebook entirely through the MCP — import 4 *S. aureus* assemblies, run staramr / ISEScan / Integron Finder / Bakta, convert outputs to BED, `bedtools closest`, render figures, and author the notebook page. The *authoring* half of the MCP was excellent (`search_tools`, `get_tool_details` with `io_details`, `create_page`/`update_page` with revisions, and the `history_dataset_*` embed directives). But the *drive-the-analysis* half repeatedly pushed me out of the MCP and into raw `POST /api/tools` and `curl .../display`. None of these are exotic needs — they're the spine of a Galaxy analysis (collections, map-over, reading outputs, debugging jobs).

Important caveat after cross-checking the code: **several of these gaps are smaller than they felt from the agent's seat.** Three of the items below are capabilities that already exist on `AgentOperationsManager` but are undocumented or simply not exposed as MCP tools — I dropped to raw HTTP because I didn't know the MCP could already do it (or could with a one-line passthrough). Those reframe from "build a new tool" to "**expose / extend / document what's already there**," which should make them cheap. The remaining items are genuine missing capabilities.

---

## 1. `run_tool` map-over is possible today but undocumented  — **ergonomics / docs**

**What I hit.** Map-over (run a tool once per collection element) is *the* Galaxy idiom. Passing a collection to a single `data` input fails:

```
run_tool(history_id, "isescan", {"input_file": {"src": "hdca", "id": "<coll>"}})
→ "dataset collection supplied to single input dataset parameter; to run the tool
   over each element of the collection, use the map-over option"
```

I concluded `run_tool` couldn't express map-over and dropped to raw `/api/tools` with the batch encoding for **every** mapped step (staramr, ISEScan, Integron Finder, awk×2, SortBED×2, bedtools closest, Bakta).

**Correction (it already works).** `run_tool` forwards its `inputs` dict **verbatim** to `tools_service._create` (`operations.py:304`) — the exact same code path as `POST /api/tools` — and the MCP signature is `inputs: dict[str, Any]` with no flattening (`mcp.py:303`). So the batch encoding maps over elements through `run_tool` today, unchanged:

```
run_tool(history_id, "isescan",
         {"input_file": {"batch": true, "values": [{"src": "hdca", "id": "<coll>"}]}})
→ 4 jobs, one implicit output collection per output.
```

The gap is **discoverability**, not capability — nothing in the `run_tool` description or `get_tool_details` output hints that the `batch`/`values` shape is accepted.

**Proposed.**
- **Document the batch form** in the `run_tool` tool description and in `get_tool_details(io_details=True)` output, with a worked map-over example.
- **Optional convenience:** when `run_tool` receives a bare `hdca` for a single (non-collection) input, auto-wrap it as `{"batch": true, "values": [...]}`, and/or accept an explicit `map_over: true` flag. Nice-to-have, not required for capability — and clearly surface the resulting implicit output collections either way.

## 2. No inline read of a dataset's *content*  — **highest impact**

**What I hit.** To inspect `summary.tsv`, `resfinder.tsv`, the ISEScan GFF, BED files, `bedtools closest` output, Bakta GFF3, etc. I called `curl .../api/histories/{id}/contents/{ds}/display` **dozens** of times. An agent doing interactive analysis lives by reading tool outputs.

**What already exists (and why it's not enough).**
- `download_dataset` is **already MCP-exposed** but returns only a `download_url` (`.../api/datasets/{id}/display`) plus metadata (`operations.py:875–900`) — i.e. it hands back the very URL I was curling, not the bytes.
- `peek_dataset_content` **exists on the manager but is not exposed via MCP** (`operations.py:840`). It returns `hda.peek` plus a truncated `text_data(preview=True)` preview — useful, but fixed-size, with no byte cap or offset control.

So there is no MCP path that returns dataset bytes with pagination — but the missing piece is small, since `peek_dataset_content` already does most of the work.

**Proposed.** **Expose and extend `peek_dataset_content`** rather than add a parallel tool: surface it as an MCP tool and add `max_bytes` / `offset` parameters for ranged reads (a Bakta GFF3 is ~3.5 MB, so a byte cap + pagination keeps it safe). Reuse the existing method; don't introduce a second content-reader. (Also worth a one-line note in `download_dataset` that it returns a URL, not content, so agents stop conflating the two.)

## 3. No `create_collection`

**What I hit.** Building the `MRSA isolate assemblies` list collection (the input every mapped step runs over) required a raw `POST /api/histories/{id}/contents` with `type=dataset_collection`. `get_collection_details` exists, but there's no create — so an agent can read collections it didn't make but can't assemble one.

**Proposed.** `create_collection(history_id, name, collection_type, element_identifiers)` accepting `[{name, src:"hda", id}]` (and nested for `list:paired`). `dataset_collections_service` is already a lazy handle on the manager (`operations.py:159`), so wiring this is low-effort. Collections are upstream of all map-over work; this pairs naturally with #1.

## 4. Expose `get_job_errors` (stderr/stdout already collected, just not surfaced)

**What I hit.** Debugging two Bakta *silent* failures (jobs reported `state: ok` with 0-byte outputs because `bakta … | tee` swallows the non-zero exit) required `curl /api/jobs/{id}?full=true` to read `tool_stderr`.

**What already exists.** `get_job_errors` on the manager (`operations.py:805–838`) **already returns** `stderr`, `stdout`, `exit_code`, and `info`, truncated at 4000 chars — exactly what I needed. It's simply **not exposed as an MCP tool**. `get_job_status`/`get_job_details` are exposed but deliberately omit the logs.

**Proposed.**
- **Expose `get_job_errors` as an MCP tool.** Note its key is **`dataset_id`** (it resolves `hda.creating_job`), not `job_id` — the agent's natural mental model is job-keyed, so either accept a `job_id` variant or document the dataset-keying clearly.
- **Net-new (genuinely missing):** flag jobs whose declared outputs are empty despite `state=ok` — the silent-failure case above isn't caught by anything today.

## 5. No way to create a dataset from inline / pasted text

**What I hit.** `upload_file_from_url` only takes a URL. For two small derived matrices (figure inputs) I used `POST /api/tools/fetch` with `src: "pasted"` directly. Agents routinely synthesize a small TSV/BED in-context and want it as a dataset without standing up a URL.

**Proposed.** Support pasted content through the **same `create_fetch` path** `upload_file_from_url` already uses (`operations.py:485`) — that wrapper hardcodes a `UrlDataElement(src="url")`, and the fetch service already accepts a pasted source. Add a `create_dataset_from_text(history_id, content, name, file_type)` tool (or a `pasted` mode on the existing wrapper) that swaps in the pasted element rather than building a separate ingest path.

## 6. Page-directive quoting is undocumented; the error is opaque  — papercut

**What I hit.** Two rules I learned only by hitting validation errors:
- Directive args with spaces **must be quoted**: `history_dataset_as_table(history_dataset_id=…, title="My title")` (unquoted `title=My title` → rejected).
- **One directive per** ` ```galaxy ` fence.

The error was just `Invalid embedded Galaxy markup line [...]`.

**Proposed.** Note both rules in the `create_page`/`update_page` tool descriptions, and make the validation error name the offending argument / the quoting rule (it already pinpoints the line).

---

## Summary of fix shapes

| # | Item | Shape |
|---|------|-------|
| 1 | map-over | **document** batch passthrough (works today); optional auto-wrap convenience |
| 2 | read dataset content | **expose + extend** `peek_dataset_content` with `max_bytes`/`offset` |
| 3 | `create_collection` | **new** method (service handle already present) |
| 4 | job stderr/stdout | **expose** `get_job_errors`; **add** empty-output-despite-ok flag |
| 5 | dataset from text | **extend** the existing `create_fetch` wrapper with a pasted source |
| 6 | directive quoting | **docs** + better validation error |

## What already works well (so the above is scoped, not a rewrite)

`connect`, `create_history`, `search_tools` / `search_tools_by_keywords`, `get_tool_details` (the `io_details` input schema is genuinely good), `run_tool` (including map-over via the batch encoding, once you know it — see #1), `get_history_contents`, `create_page` / `update_page` (revisioning + `content_editor` round-trip), and all the embed directives — these carried the notebook authoring cleanly. Per-tool `api_key` auth was a non-issue. The gaps are specifically the collection / read-output / debug-job axis, and several are exposure/documentation gaps rather than missing functionality.
