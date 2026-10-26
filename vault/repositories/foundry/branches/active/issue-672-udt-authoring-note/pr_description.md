Fix 🎯 #672 - the UDT authoring note gets `inputs.x` wrong for collections and never says how to vendor a pipeline's scripts.

Two recent runs lost correctness to gaps in `content/research/galaxy-user-tool-authoring`:

| Run | Expression the agent wrote | What Galaxy gives the job | Result |
|---|---|---|---|
| ncbi/egapx `star_wnode` (`paired_or_unpaired` reads) | `inputs.reads.unpaired ? … : inputs.reads.forward.path` | `inputs.reads.elements.forward.path`, `inputs.reads.has_single_item` | Would fail every job, single or paired, under runtimeify (emulated run, code-read). Validation passed. |
| nf-core/rnaseq dupRadar (mapped over a list) | static `sample_name` text input, because no accessor was documented | `element_identifier` is `null` on a mapped `data` input | Every per-sample MultiQC row gets the same name |
| nf-core/rnaseq `dupradar.r` template | vendored verbatim | Nextflow `$bam`, `$task.cpus` are never interpolated | A literal `$bam` reaches R. Validation passed. |

***This branch changes only the note, its recast and the generated `Dashboard.md`. It does not change Galaxy or gxwf, and it does not rewrite the collection-output example into `structure:`.*** The note's flat shape is what Galaxy 26.1 and dev accept. gxwf 1.14.0 rejects it because its bundled schema is stale.

***Only the map-over `element_identifier` behavior was executed in Galaxy. The collection shapes are code-read.***

- **§3 `data` input.** Lists the fields of the file object. `element_identifier` renders `null` when the tool is mapped over a collection. This was API-tested on Galaxy dev `51e0a80a`. Fixes are open in galaxyproject/galaxy#24434 and galaxyproject/galaxy#24422, whose "Before" table shows the same `null`. ***This keeps the issue's prohibition for map-over, contrary to the later issue comment: runtime.py's `element_identifier` branch for collection elements never fires on map-over.***
- **§3 `data_collection` input.** Adds the runtime object (`class`, `name`, `collection_type`, `tags`, `elements`):
  - `list` and `sample_sheet` give an array of files, each with `element_identifier`.
  - `paired` and `record` give an object keyed by identifier, read as `inputs.x.elements.forward.path`.
  - `paired_or_unpaired` adds `has_single_item`, with the single dataset under `unpaired`.
  - Nested types give inner collections, with the identifier in `name`.

  Each case has a copyable idiom. Taking the collection as input is how a tool gets sample names today.
- **§4 types.** Adds `data_collection` and `color`, and names the grouping types.
- **§5 collection outputs.** Keeps the flat shape and adds a discovery `format`. A temporary paragraph says gxwf ≤1.14.0 rejects it. The example passes `validate-tool-source` built from galaxy-tool-util-ts `main` (`539c16c9`).
- **§6 script placement.** `configfiles` content is evaluated and checked like `shell_command`. Two new recipes:
  - Vendoring a script the source puts on `PATH`: audit it for `$(`/`${`, keep its license header, and name the source version.
  - Rendering a Nextflow template: enumerate the interpolation sites, resolve each one, and record the resolutions in `help`.

<details><summary>Where the collection shapes come from</summary>

- **Code-read, Galaxy dev `87d295c9`.** The shapes come from `lib/galaxy/tools/runtime.py` (`is_list_like`, `_build_collection_runtime_dict`, `_element_to_runtime`) and the runtime models in `tool_util_models/parameters.py`. `collection_paired_test_y.yml` uses `inputs.f1.elements.forward.path`.
- **No Galaxy test covers the rest from a user-defined tool.** Nothing reads leaf `element_identifier`, `has_single_item` or a mapped pair's `name`.
- **Galaxy has two input builders.**
  - Runtimeify is used for `/api/jobs` and for workflow steps whose request state Galaxy captures.
  - Legacy `to_cwl` is used for `/api/tools` and when that capture fails. It returns a bare array for `list` and a bare keyed object otherwise, with no collection fields.

  The egapx expression `inputs.reads.forward.path` is correct only under the legacy builder. The note documents the runtimeify form and warns that a legacy pass proves nothing.
- **gxwf checks only the input name.** It verifies that `inputs.X` is declared, not the property path after it. That is why `inputs.reads.forward` validated.

</details>

## Risks

Risks are minimal. This is a reference-note change in a two-way door, and a later edit reverses it.

<details><summary>Risk Details</summary>

- The collection shapes are code-read, not executed. If runtimeify changes, or a deployment submits through `/api/tools`, the documented `elements` form is wrong there.
- The temporary §5 "validator defect" paragraph goes stale once a gxwf release with galaxy-tool-util-ts#198 is pinned.
- The map-over `element_identifier` line goes stale once galaxy#24434 or #24422 merges.

</details>

<details><summary>Risk Review Advice</summary>

Check the §3 collection idioms against your sense of what Galaxy should guarantee. Two things are worth a look: the runtimeify/`to_cwl` divergence, and the advice that taking the whole collection is the current way to get identifiers.

</details>

## Context

Follow-up, not a blocker: once a gxwf release contains jmchilton/galaxy-tool-util-ts#198 (merged 2026-10-25, npm latest is still 1.14.0), bump the `^1.14.0` pin and drop the §5 paragraph. Related to galaxyproject/galaxy#24434 and #24422 (map-over `element_identifier`). Independent of 🔀 #617: the only overlap is the generated cast, which a recast resolves.

## Agentic Checks

### ✅ Second Frontier Model Review

<details><summary>Codex flagged two items: one fixed (nested-list idiom), one refuted (a backslash it misread).</summary>

- **Fixed.** For `list:*`, `elements` holds inner collections, so `e.path` is `undefined`. The bullet is now split and gives a `list:paired` idiom.
- **Refuted.** The `\$(` escape has one backslash on disk.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
