# Figure asset MANIFEST

Capture/generation procedures and source provenance for every figure asset. Mirrors the role of `galaxy-notebooks/figures/MANIFEST.md` but, because this is a tooling paper, most entries are **reproducible commands** rather than Galaxy object IDs. Re-running the commands here regenerates the asset; that reproducibility is itself part of the paper's argument.

## Environment (verified 2026-06-18)

- `gxwf` and `galaxy-tool-cache` CLIs: **`@galaxy-tool-util/cli` 1.7.2** (homebrew global, used for the captures here); behavior verified identical on **1.8.0** (npm latest at capture date). Note: `gxwf --version` misreports `1.0.0` regardless of the installed version — a stale hardcoded string; read the real version from the package's `package.json`. Record the actual version per capture, not the `--version` output.
- IWC corpus checkout: `~/projects/repositories/iwc` (122 `.ga` workflows under `workflows/`).
- `gxwf-web` (browser editor) checkout: `~/projects/repositories/gxwf-web`.
- `galaxy-tool-util-ts` monorepo checkout: `~/projects/repositories/galaxy-tool-util-ts`.
- Anchor workflow for the worked example: `iwc/workflows/sars-cov-2-variant-calling/sars-cov-2-pe-illumina-artic-variant-calling/pe-artic-variation.ga` ("COVID-19: variation analysis on ARTIC PE data", 33 steps, 25 tool steps). Collection-heavy (paired collection input → map-over) so it exercises connection validation; a smaller workflow may be substituted for the typeset listing if 33 steps is too long.

### Warm the tool cache (prerequisite for state/connection/roundtrip assets)

```bash
WF=~/projects/repositories/iwc/workflows/sars-cov-2-variant-calling/sars-cov-2-pe-illumina-artic-variant-calling/pe-artic-variation.ga
C=/tmp/gxwf_si/cache
galaxy-tool-cache populate-workflow "$WF" --cache-dir "$C"   # ~25 tools, network (ToolShed TRS)
galaxy-tool-cache list --cache-dir "$C"
```

## Main figures

### fig1_stack — Format 2 / gxwf stack diagram
- Type: generated diagram (no capture). Author `figures/fig1_stack.mmd` (Mermaid) or TikZ; nodes: ToolShed (TRS) → tool cache → validation core (`@galaxy-tool-util/core`) → {CLI `gxwf`, VS Code `galaxy-workflows-vscode`, browser `gxwf-ui`, IWC CI}. Render → `figures/fig1_stack.png`.

### fig2_layers — validation depth layers
- Type: generated diagram. Three stacked bands (structural / per-step state / per-connection). Author `figures/fig2_layers.mmd` or TikZ → `figures/fig2_layers.png`.

### fig3_vscode — schema-aware editing in VS Code
- Type: **GUI screenshot.** Launch `galaxy-workflows-vscode` (F5 from the extension checkout, or install the marketplace build) with `C` as the configured cache. Open the worked-example Format 2 file. Stage one frame showing simultaneously: an invalid select value (red squiggle + message listing legal options), a `state:`-key completion popup, and a hover card with tool-XML help. Pick a tool with clean XML docs (e.g. `fastp` or `bwa_mem`). Save → `figures/fig3_vscode.png`. Resolution ≥ 1600 wide.

### fig4_corpus — IWC corpus validate + round-trip results
- Type: generated chart, gated on the corpus measurement run (same data as the manuscript `[NUMBER]` placeholders).
```bash
# Cache all corpus tools first (large, network-heavy):
for wf in $(find ~/projects/repositories/iwc/workflows -name '*.ga'); do
  galaxy-tool-cache populate-workflow "$wf" --cache-dir "$C"; done
gxwf validate-tree ~/projects/repositories/iwc/workflows --strict --cache-dir "$C" --json > captures/corpus-validate.json
gxwf roundtrip-tree ~/projects/repositories/iwc/workflows --cache-dir "$C" --json > captures/corpus-roundtrip.json
```
- Chart the category counts → `figures/fig4_corpus.png`. The Axis-4 categorical finding (modal diagnostic class, a named tool whose version bump introduced drift) comes from the same two JSON files.

## Supporting figures

### figS1_encoding — native vs Format 2 for one step
```bash
gxwf convert "$WF" --to format2 --stateful --cache-dir "$C" --output captures/pe-artic.gxwf.yml
```
- Excerpt one step's native `tool_state` (from `$WF`) beside the same step's `state:` block (from the converted file). Typeset two-column.

### figS2_depth — planted errors and real diagnostics  (= "Listing 1")
- **Real capture proven 2026-06-18.** Procedure used:
```bash
cp captures/pe-artic.gxwf.yml captures/pe-artic-broken.gxwf.yml
# plant (for the final figure, put each in a SEPARATE step so errors don't cascade):
#   illegal select:  single_paired_selector: paired_collection -> paired_coll
#   misspelled key:  disable_adapter_trimming -> disable_adaptor_trimming
#   type mismatch:   overrepresentation_analysis: false -> maybe
gxwf validate captures/pe-artic-broken.gxwf.yml --cache-dir "$C" --json > captures/validate-broken.json
```
- Real diagnostic text (illegal select): `single_paired.single_paired_selector: Expected "paired_collection", actual "paired_coll"` (+ the `"single"` union alternative). Structured form lives in `results[].errors[]` with per-step `status: fail|ok`.
- **Caveat learned:** an invalid *conditional selector value* cascades — the per-branch sub-errors collapse into one parent-object mismatch. To show distinct, legible categories, plant each error in a different step, and add a separate stale-`__current_case__`/removed-parameter step (warning class) and a bad-collection-connection step (see figS3).

### figS3_connections — collection / map-over validation
```bash
gxwf validate "$WF" --cache-dir "$C" --connections          # clean baseline: 46 ok, 0 invalid, 0 skip
gxwf mermaid "$WF" --annotate-connections --cache-dir "$C" figures/figS3_mapover.mmd
# panel (b): build one invalid variant (list:paired output -> paired input, no flatten) and run --connections
```
- Render the annotated `.mmd` (map-over depth + reduction edges) for panel (a); capture the rejection diagnostic for panel (b).

### figS4_native_parity, figS5_legacy_quickfix, figS6_conditional_completion, figS7_cache — VS Code GUI screenshots
- All four are interactive captures from `galaxy-workflows-vscode`. See fig3 launch notes.
  - figS4: same diagnostics/hover/completion on a `.ga` file; show both an object-`tool_state` step and a legacy string-encoded step.
  - figS5: open a `.ga` with string-encoded `tool_state`; screenshot the `Hint` + "Clean workflow (convert tool_state to object form)" quick fix; then the object-form after applying.
  - figS6: completion popup that changes with the selected conditional case (capture two frames, two selector values).
  - figS7: run `Populate Tool Cache`; screenshot the `Tools: N cached` status bar and the three diagnostic tiers (uncached `Information`, failed `Warning`, cached full validation). Cross-check N against `galaxy-tool-cache list --cache-dir "$C"`.

### figS8_browser — gxwf-ui browser editor
- Run the `gxwf-web` dev server (`cd ~/projects/repositories/gxwf-web && <pnpm dev>`; confirm the exact script), warm the IndexedDB cache in-page, paste the worked-example Format 2, capture a diagnostic + completion + the Cytoscape diagram. Playwright-capturable (MCP browser tools available).

### figS9_conversion — bidirectional conversion + roundtrip
```bash
gxwf roundtrip "$WF" --cache-dir "$C" --brief     # panel (b): 23/25 ok, 54 benign, 0 real
```
- Panel (a) is the VS Code `previewConvertToFormat2`/`previewConvertToNative` diff view (GUI screenshot).

### figS10_toolsearch — tool ID search
- **Real capture proven 2026-06-18.**
```bash
gxwf tool-search bwa --max-results 8 > captures/tool-search-bwa.txt
gxwf tool-versions iuc/bwa_mem2/bwa_mem2_idx
gxwf tool-revisions devteam/bwa/bwa --latest
```
- Typeset the `tool-search` table directly (scored `owner/repo`, `tool_id`, name, description).
- GUI variant of the same capability: `web-shots/toolshed-search-dropdown.png` (the **Insert Tool Step** command's ToolShed-search QuickPick). See "Web-mode GUI captures" below.

## Web-mode GUI captures (`capture-kit/web-shots/`)

Five curated screenshots from the **browser** extension host (`vscode-test-web`), captured 2026-06-19 against the `web_tool_resolution_fixes` build (`galaxy-workflows-vscode`, `@galaxy-tool-util/*` 1.8.2). ToolShed was reached through a local CORS proxy configured via the workspace setting `galaxyWorkflows.toolShed.url` (settable per-workspace after the `machine`→`window` scope fix). These are the only web-shot assets — earlier exploratory/uncached frames were removed.

| File | Subject | Shows | Figure role |
|---|---|---|---|
| `format2-toolstate-select-dropdown.png` | clean `macs2-demo.gxwf.yml` | select-value completion (`format:` → BAM/BAMPE/BED), no squiggles | fig3_vscode (schema-aware editing) |
| `format2-toolstate-property-name.png` | clean `macs2-demo.gxwf.yml` | parameter-name completion inside `state:` with type badges | fig3_vscode |
| `autocomplete-toolstate-select-dropdown.png` | `krona-demo-broken.ga` (native) | select-value completion alongside live diagnostics | figS4_native_parity |
| `autocomplete-toolstate-property-name.png` | `krona-demo-broken.ga` (native) | parameter-name completion inside `tool_state` | figS4_native_parity |
| `toolshed-search-dropdown.png` | Insert Tool Step (query `fastqc`) | ToolShed-search QuickPick: tool name · `owner/repo`, description, "Open in ToolShed" button | figS10_toolsearch (GUI variant) |

## Working captures
Live under `/tmp/gxwf_si/captures/` during authoring (not committed): `tool-search-bwa.txt`, `connections-ok.txt`, `validate-broken.txt`, plus `pe-artic.gxwf.yml` / `pe-artic-broken.gxwf.yml`. Promote the curated subset into `si/` (see `supporting-information.md`) once the worked example is finalized.
</content>
