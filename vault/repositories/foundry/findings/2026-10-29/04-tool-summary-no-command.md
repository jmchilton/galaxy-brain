# Tool summary has no command or requirements, and the CLI can't fetch wrapper source

- Target: jmchilton/galaxy-tool-util-ts. The fetch-and-cache code for wrapper source shipped in #82 / PR #176 (2026-09-17), but neither `galaxy-tool-cache` command exposes it, and `summarize` still hardcodes `raw_tool_source_path: null`. Foundry tracking needed: yes. Use the existing galaxyproject/foundry#553 rather than a new issue, then a Foundry Mold/doc follow-up once the CLI ships.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-demo-v1-2026-10-29, phase 5 (per-step loop; seqtk_trimfq 1.4+galaxy0, fastqc 0.74+galaxy1), 2026-10-29. Ledger id `tool-summary-lacks-command-and-output-compression` (major).
- Existing issues/PRs: galaxyproject/foundry#553 (same gap, open, `needs-triage`; its "no reachable route" claim is now outdated, see Evidence). Foundry PR #559 closed this gap with docs only. galaxyproject/foundry#648 (summary drops output `<filter>`s; same remedy). jmchilton/galaxy-tool-util-ts#82 (closed; library side). No galaxy-tool-util-ts issue covers exposing it in the CLI or summary.
- Also seen in atacseq v0 (/home/ubuntu/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29, phase 5, ledgers `tool-summary-lacks-command-template-for-flag-check`, `tool-summary-outputs-drop-filter-conditions`, `tool-summary-outputs-drop-change-format`): the gffread `--keep-exon-attrs` check had no command to read, and the Tool Shed raw-file URL returned 403, so the check fell back to tools-iuc main. The deeptools plotProfile `outFileNameData` filter and the bedtools intersect `change_format` were missing from the summary (both #648). A command block would also have shown tp_awk's forced tab FS ([26](26-tp-awk-forced-tab-fs.md)).

## Symptom
`summarize-galaxy-tool` asks for the command template, requirements and stdio (Mold steps 3–4). The manifest has none of them: `parsed_tool` carries only id/version/name/description/inputs/outputs/citations/license/profile/edam/xrefs/help, and `artifacts.raw_tool_source_path` is null. The seqtk step's binding depended on whether the trimmed output stays gzipped, and only the command's `@CONDITIONAL_GZIP_OUT@` pigz pipe answers that. The step child tried a Tool Shed `raw-file` URL (403), then read tools-iuc XML through the GitHub API outside the procedure.

## Root cause
Confidence: high.
1. `summarize` is a pass-through. It embeds the cached `ParsedTool` verbatim, which `add` fetched from the Tool Shed TRS endpoint `/api/tools/{trs}/versions/{v}`. That Galaxy-defined model has no command, requirements or stdio. The summary doesn't strip these fields; the Galaxy `ParsedTool` model never carried them.
2. The raw-source path exists in the library but isn't wired into the CLI. `ToolInfoService.fetchToolSource` fetches `/api/tools/{trs}/versions/{v}/tool_source` and write-through caches it as `<cache_key>.source` (shipped for #82). Only the web UIs (`gxwf-ui`, `cache-ui`) and the HTTP proxy call it. No `galaxy-tool-cache` or `gxwf` command does, and `summarize` never looks for it.

## Evidence
- Installed CLI: `@galaxy-tool-util/cli@1.15.0` (worktree `node_modules`). Its `dist/commands/summarize.js:61` sets `raw_tool_source_path: null` unconditionally, and line 63 passes `parsed_tool: result.tool` through as-is. Source at main a047690: `packages/cli/src/commands/summarize.ts:104`.
- Library: `packages/core/src/tool-info.ts:71` (`fetchToolSource`), `packages/core/src/client/tool-source.ts:27-37` (Tool Shed `.../tool_source`), `packages/core/src/cache/storage/filesystem.ts:55-80` (`<key>.source` and `<key>.source.json`). `@galaxy-tool-util/core@1.15.0` dist contains `client/tool-source.js`. `grep fetchToolSource` finds callers only in `gxwf-ui`/`cache-ui` composables and `cache-http`, none in `packages/cli`.
- `galaxy-tool-cache --help` (1.15.0) lists add, add-local, list, info, clear, schema, summarize and populate-workflow; none of them returns source. `gxwf --help` has no source command either; its `validate-tool-source` validates local UDT YAML.
- Run cache `/home/ubuntu/foundry-runs/prose-wb2g-demo-v1-2026-10-29.bin/tool-cache/` holds only `<key>.json` and `index.json`, with no `.source` files. In `61733fb4….json` (seqtk_trimfq) the keys are those 13 ParsedTool fields only.
- Live, anonymous, 2026-10-29: `GET https://toolshed.g2.bx.psu.edu/api/tools/iuc~seqtk~seqtk_trimfq/versions/1.4%2Bgalaxy0/tool_source` returned 200 with header `language: xml`. The body is macro-expanded and includes `<requirement>seqtk 1.4`, `pigz 2.3.4`, `<command>` and the conditional pigz line. `devteam~fastqc~fastqc/versions/0.74%2Bgalaxy1` and the stock tools `Remove%20beginning1/versions/1.0.0` and `__FLATTEN__/versions/1.0.0` also returned 200. The routes #553 found dead were `raw-file`, `file`, `download` and `.../raw_tool_source`, not `.../tool_source`. Caveat: the route selects by tool version, not changeset, which is the same key the cached ParsedTool uses.
- Foundry side (pipeline-run-demo-v1 @ 8758f9ee): `content/molds/summarize-galaxy-tool/index.md:110` says requirements/stdio will arrive "as Galaxy upstream extends ParsedTool". `content/schemas/galaxy-tool-summary.md:48,56` says `raw_tool_source_path` stays null "until #82 ships". #82 has shipped, so that text is stale.

## Proposed fix
- Upstream (galaxy-tool-util-ts), primary:
  - (a) Add a `galaxy-tool-cache source <tool_id> [--tool-version] [--output] [--cache-dir]` command that calls `fetchToolSource` and prints the expanded wrapper.
  - (b) Add an `add --with-source` flag, or make it the default, so that `<key>.source` is cached next to the JSON.
  - (c) Have `summarize` set `artifacts.raw_tool_source_path` when `<key>.source` exists. Optionally add a `--with-source` flag that fetches it first.
  - Optional (d): a small `wrapper` block derived through `@galaxy-tool-util/tool-xml`, with requirements (type/name/version), containers, the command text, stdio/exit-code rules and output filters (#648).
- Upstream (Galaxy), secondary and slow: add requirements/stdio to `ParsedTool`. Not needed if (c)/(d) land.
- Foundry, after release:
  - Bump the CLI pin.
  - Have `summarize-galaxy-tool` run the source command and read `raw_tool_source_path` for command, requirements and failure semantics.
  - Have `implement-galaxy-tool-step` load it on demand for behaviour questions such as output compression and filters.
  - Fix the stale text at summarize Mold :110 and schema :48/:56, plus the `content/cli/galaxy-tool-cache/` pages.
  - Until the release, a Mold can name the `/tool_source` URL directly. That's a stopgap, not the fix.

## Draft issue
**jmchilton/galaxy-tool-util-ts — `galaxy-tool-cache`: expose cached wrapper source (`source` command; populate `summarize` `raw_tool_source_path`)**

`ToolInfoService.fetchToolSource` (#82, PR #176) fetches and caches the macro-expanded wrapper from the Tool Shed's `/api/tools/{trs}/versions/{v}/tool_source`, or from Galaxy's `raw_tool_source`, as `<cache_key>.source`. Only the web UIs and the cache proxy use it. From the CLI there is no way to get it: `galaxy-tool-cache` 1.15.0 has no source command, `add` never caches source, and `summarize` hardcodes `artifacts.raw_tool_source_path: null` (`packages/cli/src/commands/summarize.ts:104`).

Agents that bind workflow steps need the parts of the wrapper that `ParsedTool` lacks: the command template, requirements, stdio/exit codes and output filters. Example: whether `iuc/seqtk_trimfq` 1.4+galaxy0 keeps `.gz` output depends on its `@CONDITIONAL_GZIP_OUT@` pigz pipe. Today agents fall back to unpinned GitHub fetches.

Proposed:
1. Add `galaxy-tool-cache source <tool_id> [--tool-version <v>] [--output <file>] [--cache-dir <dir>]`, which calls `fetchToolSource` and writes the expanded source.
2. Add `add --with-source`, which also caches `<key>.source`.
3. Make `summarize` set `artifacts.raw_tool_source_path` when `<key>.source` exists. Optionally add `--with-source` to fetch it first.
4. Optional: a derived `wrapper` section (requirements, containers, command, stdio, output filters) parsed with `@galaxy-tool-util/tool-xml`.

Verified 2026-10-29: `/tool_source` returns 200 anonymously for `iuc~seqtk~seqtk_trimfq/1.4+galaxy0`, `devteam~fastqc~fastqc/0.74+galaxy1`, and the stock tools `Remove beginning1` and `__FLATTEN__`.

**Comment for galaxyproject/foundry#553 (label `upstream/galaxy-tool-util-ts`):**
> Recurred in a workflow-brief-to-galaxy run on 2026-10-29: seqtk_trimfq's output compression depends on its command, which the summary lacks. Status update: the Tool Shed's `/api/tools/{trs}/versions/{v}/tool_source` route works anonymously, including for stock tools, and the library has fetched it since #82. The remaining gap is CLI wiring, filed upstream: "`galaxy-tool-cache`: expose cached wrapper source (`source` command; populate `summarize` `raw_tool_source_path`)". Once it releases, Foundry should bump the pin, point `summarize-galaxy-tool` and `implement-galaxy-tool-step` at it, and fix the stale "until #82 ships" text in `content/schemas/galaxy-tool-summary.md`.
