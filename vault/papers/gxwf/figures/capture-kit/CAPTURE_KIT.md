# VS Code screenshot capture kit

Verified staging for the VS Code extension figures (Fig 3, Fig S4–S7). Every diagnostic below was confirmed via `gxwf validate` against the same cache the extension uses, so what the editor renders is known-correct before you capture it.

## Subject workflow

IWC "Taxonomy Profiling and Visualization with Krona" — 3 tool steps (`kraken2` → `krakentools_kreport2krona` → `taxonomy_krona_chart`). Small enough that all three steps + their diagnostics fit one editor viewport. Source: `iwc/workflows/microbiome/pathogen-identification/taxonomy-profiling-and-visualization-with-krona/`.

## Files in this kit

| File | Purpose |
|---|---|
| `krona-demo.gxwf.yml` | Clean Format 2 — validates strict-clean. Baseline / before-shots. |
| `krona-demo-broken.gxwf.yml` | Format 2 with 3 planted errors in distinct steps (below). Main subject for Fig 3 / Fig S2. |
| `krona-demo-broken.ga` | Same 3 errors in native `.ga` (object `tool_state`). For Fig S4 native parity. |
| `krona-legacy.ga` | Clean workflow with **string-encoded** `tool_state` (legacy form). For Fig S5 quick fix. |

## Planted errors (verified)

| Step | Edit | Class | What the editor shows |
|---|---|---|---|
| `kraken2` (step 2) | `min_base_quality: high` (was `0`) | type mismatch | **Error** on the value: `min_base_quality` expects a number, actual `"high"` |
| `kraken2` (step 2) | `use_name:` (was `use_names:`) | unknown parameter | **Warning** on the key: `Unknown tool parameter 'use_name'.` — *editor/LSP-only; the `gxwf validate` CLI does NOT surface this, so the screenshot is the only evidence for this class* |
| `taxonomy_krona_chart` (step 4) | `type_of_data_selector: txt` (was `text`) | illegal select | **Error** on the value listing legal options: must be one of `text`, `taxonomy` |

CLI cross-check (default cache): `gxwf validate krona-demo-broken.gxwf.yml --json` → `summary {ok:1, fail:2, skip:0}` (the third, the unknown-param warning, is editor-only).

## Prerequisite: warm cache (already done on this machine 2026-06-18)

The extension reads `~/.galaxy/tool_info_cache` by default. The 3 Krona tools were added there via:
```bash
galaxy-tool-cache populate-workflow <Taxonomy-Profiling-...-Krona.ga>
```
On a fresh machine, re-run that once so the extension validates offline. (`galaxyWorkflows.toolCache.directory` is machine-scoped, so prefer populating the default cache over a workspace setting.)

## Launch

From the extension checkout (`galaxy-workflows-vscode`, built — `client/dist` + server dists present):
```bash
code --extensionDevelopmentPath=. /tmp/gxwf_capture   # or this capture-kit folder
```
Diagnostics (squiggles + Problems panel) and the `Tools: N cached` status bar render automatically once the language server resolves — no interaction needed for those.

## Per-figure capture checklist

- **Fig 3 — schema-aware editing (money shot).** Open `krona-demo-broken.gxwf.yml`. Frame all three diagnostics, then stage the two transient popups in one composite (or three sub-panels):
  - (a) hover the `type_of_data_selector` value → hover card shows the param label/help + legal options.
  - (b) put the cursor on a new line inside the `kraken2` `state:` block, press `Ctrl+Space` → completion popup of kraken2 parameter keys.
  - (c) the red squiggle on `min_base_quality: high` with its error message visible.
- **Fig S4 — native `.ga` parity.** Open `krona-demo-broken.ga`. Same three diagnostics on the native file; also show one object-`tool_state` step beside a hover, to make the "parity" point.
- **Fig S5 — legacy quick fix.** Open `krona-legacy.ga`. The whole `tool_state` value carries a `Hint`; click the lightbulb → **"Clean workflow (convert tool_state to object form)"**. Capture before (hint) and after (object form with precise sub-diagnostics).
- **Fig S6 — conditional-aware completion.** In `krona-demo.gxwf.yml`, `kraken2` `single_paired.single_paired_selector` is a conditional. Capture completion inside the conditional for two selector values to show the offered params change. (May need a second tool with a richer conditional if Krona's is thin.)
- **Fig S7 — cache lifecycle.** Screenshot the `Tools: N cached` status bar; run `Populate Tool Cache` from the command palette; and (to show graceful degradation) open a workflow with one uncached tool to capture the `Information` vs `Warning` vs full-validation tiers. Cross-check N against `galaxy-tool-cache list`.

## Automation notes

`screencapture` (macOS) is available; `cliclick` is not, `osascript` is. Non-interactive shots (diagnostics, Problems panel, status bar) can be screen-captured after launch. Transient popups (hover/completion/quick-fix menu) need either a human at the keyboard (≈5 quick captures) or fragile `osascript` keystroke automation. Save captures as `figures/fig3_vscode.png`, `figS4_native_parity.png`, etc. (see `../MANIFEST.md`).
</content>
