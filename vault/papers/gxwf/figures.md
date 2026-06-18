# Figures

Canonical set = the figures referenced in `manuscript.md` (`## Figures` and `## Supporting Information`). Keep this file aligned with those sections. "Asset status" tracks whether a real asset exists yet and how it is produced (CLI capture, generated diagram, or GUI screenshot). Per-asset capture/generation procedures are in `figures/MANIFEST.md`.

Unlike the Galaxy Notebooks paper, this is a tooling/methods paper: most assets are **CLI captures** or **generated diagrams** that are reproducible offline once a tool cache is warm, plus a smaller set of **GUI screenshots** (VS Code extension, `gxwf-ui` browser editor) that require an interactive capture pass. The reproducible-from-commands property is itself part of the paper's argument, so prefer real captures over hand-mocked listings everywhere it is feasible.

**Figure count:** 4 main figures (Fig 1–4, in the manuscript body) + 10 supporting figures (Fig S1–S10, in `supporting-information.md`). Of these, the CLI/diagram assets (S1–S3, S9–S10, Fig 1–2, Fig 4) are generatable now from the `gxwf` CLI; the GUI screenshots (Fig 3, S4–S8) need an interactive capture session.

## Main figures (manuscript body)

### Figure 1 — the Format 2 / gxwf stack
ToolShed-served typed tool schemas flow into one validation core; the core is consumed by four surfaces (CLI, VS Code extension, `gxwf-ui` browser editor, IWC CI). "One core, one metadata cache, one diagnostic vocabulary; four surfaces."
- Asset status: **GENERATABLE** (diagram). Source committed as Mermaid (`figures/fig1_stack.mmd`) or TikZ; render to `figures/fig1_stack.png`. No screenshot needed.

### Figure 2 — validation depth in three layers
Stacked layers: (1) structural validation (document shape) — comparable across systems; (2) per-step state validation (per-tool parameter names, types, select options, conditionals) — depth claim; (3) per-connection validation (collection algebra, map-over depth) — depth claim. The contribution is layers 2–3.
- Asset status: **GENERATABLE** (diagram). Source committed (`figures/fig2_layers.mmd`/TikZ) → `figures/fig2_layers.png`.

### Figure 3 — schema-aware editing in VS Code
The money shot. One frame of a Format 2 workflow open in `galaxy-workflows-vscode` showing three diagnostics simultaneously: (a) an invalid select value flagged as an error with the legal options in the message, (b) a parameter-name completion popup inside a `state:` block, (c) a hover surfacing tool-XML help for a parameter. Align the depicted errors with the worked example (Fig S2 / Listing).
- Asset status: **SCREENSHOT NEEDED** (VS Code GUI). Capture against the worked-example workflow with a warm cache. See MANIFEST for the exact tool/parameter to stage so the three categories all show in one frame.

### Figure 4 — IWC corpus validation and round-trip results
Bar chart or compact table summarizing, across the IWC corpus: validate-clean / auto-cleanable-stale / human-attention counts, and round-trip identical / benign-diff / state-altering counts. Same data that fills the `[NUMBER]` placeholders and the Axis-4 categorical finding in `tasks.md`.
- Asset status: **GENERATABLE** (chart from data), gated on the corpus run. Produce the data with `gxwf validate-tree --strict --json` and `gxwf roundtrip-tree --json` over `iwc/workflows` (needs all corpus tools cached); chart → `figures/fig4_corpus.png`. This is the same measurement pass as the "Numbers to Fill In" task list.

## Supporting figures (`supporting-information.md`)

### Figure S1 — native `.ga` vs Format 2 for one step
Side-by-side of a single real step (e.g. `bwa_mem` or `fastp`): the native string-quoted JSON `tool_state` blob vs the Format 2 `state:` tree. Expands the inline Abstract/§"Format 2" snippet to a full, real step so the encoding contrast is concrete rather than elided.
- Asset status: **GENERATABLE** (CLI). `gxwf convert <wf>.ga --to format2 --stateful` produces the Format 2 side verbatim; the native side is the source `.ga`. Render as a typeset two-column listing.

### Figure S2 — depth demonstration: planted errors and real diagnostics
The worked example with a sequence of plausible authoring mistakes (misspelled parameter key, illegal select value, type mismatch, stale `__current_case__`/removed parameter, and a bad collection connection), each paired with the **actual** `gxwf validate` diagnostic (path, category, legal alternatives). This is the figure form of "Listing 1" (tasks.md Axis 1).
- Asset status: **PARTIAL — REAL CAPTURE PROVEN.** A real planted-error run is captured (illegal select on `single_paired_selector` → `Expected "paired_collection" / "single", actual "paired_coll"`; misspelled `disable_adaptor_trimming`; non-boolean `overrepresentation_analysis: maybe`). Caveat learned in capture: when a **conditional selector value itself** is invalid, the per-branch sub-errors cascade into a single parent-object mismatch. For the final figure, plant each error class in a **separate step** so each surfaces independently and legibly. The structured `--json` report (`results[].errors[]` with per-step `status`) is the clean form to typeset.

### Figure S3 — connection / collection (map-over) validation
Two panels: (a) `gxwf mermaid --annotate-connections` (or `cytoscapejs --annotate-connections`) rendering of a real collection-heavy workflow with map-over depth and reduction edges annotated; (b) the diagnostic for an invalid connection (e.g. a `list:paired` output wired to a `paired` input with no intervening flatten), produced by `gxwf validate --connections`. Demonstrates that the diagram renderer and the static validator share the `workflow-graph` package and therefore agree.
- Asset status: **GENERATABLE** (CLI). Clean baseline proven: `validate --connections` on the ARTIC PE workflow reports `46 ok, 0 invalid, 0 skip`. Need to (i) render the annotated diagram and (ii) construct one invalid-connection variant for panel (b).

### Figure S4 — native `.ga` parity in VS Code
Same diagnostics, completions, and hover working on a native `.ga` file as on Format 2, including the two-pass validation (object-valued vs legacy string-encoded `tool_state`). Shows the format-parity claim from PR #85.
- Asset status: **SCREENSHOT NEEDED** (VS Code GUI).

### Figure S5 — legacy string-encoded `tool_state` quick fix
A native `.ga` whose `tool_state` is a JSON string: the whole value carries a `Hint` diagnostic and the **"Clean workflow (convert tool_state to object form)"** quick fix; after one click, the file is in object form with precise sub-diagnostics, completions, and hover enabled. Before/after pair.
- Asset status: **SCREENSHOT NEEDED** (VS Code GUI).

### Figure S6 — conditional-branch-aware completion
A `state:` completion popup that reflects the **currently selected** conditional case (and descends into `section`/`repeat`/`conditional`): the parameters offered change with the selector value. The behavior a working editor requires but which is non-trivial against a representation where the case selection is implicit.
- Asset status: **SCREENSHOT NEEDED** (VS Code GUI).

### Figure S7 — tool cache lifecycle and graceful degradation
`Populate Tool Cache` command run, the `Tools: N cached` status-bar item, and the three diagnostic tiers side by side: uncached tool → `Information` ("run Populate"), failed-to-resolve tool → `Warning`, cached tool → full validation. Shows the offline-after-warm-cache property.
- Asset status: **SCREENSHOT NEEDED** (VS Code GUI). The status-bar text and diagnostic tiers can be cross-checked against `galaxy-tool-cache list` CLI output.

### Figure S8 — `gxwf-ui` browser editor, no Galaxy server
The same LSP validation running in a browser tab against an IndexedDB tool cache: a diagnostic and a completion in Monaco, plus the Cytoscape diagram with map-over annotations from the shared `workflow-graph` package. "A diagnostic surfaced here is, by construction, the same diagnostic the CLI and VS Code report."
- Asset status: **SCREENSHOT NEEDED** (browser). Source checkout present at `repositories/gxwf-web`; capturable via a local dev server + Playwright once running.

### Figure S9 — bidirectional conversion and round-trip fidelity
(a) The VS Code `previewConvertToFormat2` / `previewConvertToNative` read-only diff view; (b) the `gxwf roundtrip` summary on a real workflow distinguishing benign from state-altering diffs.
- Asset status: **PARTIAL.** Panel (b) proven via CLI (`roundtrip` on ARTIC PE: `23/25 step(s) ok, 54 benign diff(s), 0 real diff(s)`). Panel (a) is a VS Code GUI screenshot.

### Figure S10 — tool discovery: `gxwf tool-search`
The "tool ID search" surface: `gxwf tool-search`, `tool-versions`, and `tool-revisions` resolving a query to versioned, reproducibly-pinnable ToolShed tool IDs — the front door that connects a human/agent's intent to the typed schema the validator consumes.
- Asset status: **REAL CAPTURE PROVEN** (CLI). `gxwf tool-search bwa` returns scored hits with `owner/repo`, `tool_id`, name, description (e.g. `devteam/bwa → bwa → "Map with BWA"`). Typeset the terminal output directly.

## Reproducibility note
Every CLI-backed asset above is regenerable from the `gxwf` binary (`@galaxy-tool-util/cli` 1.7.2, verified identical on 1.8.0; the `--version` flag misreports `1.0.0`) against the IWC corpus checkout (`repositories/iwc`) with a warm tool cache; the exact commands are in `figures/MANIFEST.md`. The GUI screenshots are the only assets requiring an interactive capture session. This bias toward command-reproducible figures is deliberate — it mirrors the paper's claim that the validation core is a programmable interface, not a presentation.
</content>
</invoke>
