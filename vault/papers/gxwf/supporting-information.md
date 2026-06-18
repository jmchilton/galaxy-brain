# Supporting Information

Supporting information for *Format 2 and gxwf: Schema-Aware Authoring and Validation of Galaxy Workflows*. Unlike a discovery paper's SI, these items are not biological vignettes — they are the **reproducible artifacts and extended figures** that let a reader regenerate the paper's validation claims from the `gxwf` CLI and inspect the authoring surfaces the body only summarizes.

The bundle lives in `si/` beside the manuscript; supporting figures live in `figures/` (inventory in `figures.md`, generation procedures in `figures/MANIFEST.md`). Every CLI-backed item is regenerable with the `gxwf` binary (`@galaxy-tool-util/cli` 1.7.2/1.8.0; the `--version` flag misreports `1.0.0`) against the IWC corpus checkout with a warm tool cache — the exact commands are in each item's MANIFEST entry.

**Caveats (read before relying on these).** Tool schemas are community ToolShed artifacts and change over time; outputs are pinned to the tool versions resolved at capture time (recorded per item). Corpus counts are a snapshot of the IWC corpus at the capture date and must be re-run against the corpus state at submission. The validator is a *floor* on correctness, not a ceiling: it can only catch what the tool XML declares.

**Numbering note.** Figures S1–S10 are the extended/supporting figures; Listings, Workflows, Data, and Reports carry their own S-series. Figure S2 is the supporting-figure form of the body's worked example ("Listing 1"); Listing S1 is its text/data form.

## Contents

| SI item | What it is | Body anchor | Source / command |
|---|---|---|---|
| Figure S1 | Native `.ga` vs Format 2 for one real step | §Format 2 | `gxwf convert --to format2 --stateful` |
| Figure S2 | Planted-error worked example + real diagnostics | §Schema-Aware Validation (Listing 1) | `gxwf validate --json` on the broken variant |
| Figure S3 | Collection / map-over connection validation | §Per-connection validation | `gxwf validate --connections`, `gxwf mermaid --annotate-connections` |
| Figure S4 | Native `.ga` parity in VS Code | §VS Code Extension | GUI screenshot |
| Figure S5 | Legacy string-encoded `tool_state` quick fix | §VS Code Extension | GUI screenshot |
| Figure S6 | Conditional-branch-aware completion | §VS Code Extension | GUI screenshot |
| Figure S7 | Tool cache lifecycle + graceful degradation | §VS Code Extension | GUI screenshot |
| Figure S8 | `gxwf-ui` browser editor, no server | §Browser-Based Editor | GUI/Playwright screenshot |
| Figure S9 | Bidirectional conversion + round-trip fidelity | §Conversion | `gxwf roundtrip` + GUI diff |
| Figure S10 | Tool ID search (`gxwf tool-search`) | §Authoring Surfaces (CLI) | `gxwf tool-search` |
| Listing S1 | Worked example: native + Format 2 + the four planted errors with their `gxwf validate` diagnostics | §Schema-Aware Validation | see MANIFEST `figS2_depth` |
| Workflow S1 | Worked-example workflow in Format 2 (`.gxwf.yml`) | §Format 2 | `gxwf convert --stateful` of Workflow S2 |
| Workflow S2 | Worked-example workflow, native `.ga` (verbatim IWC source) | §Conversion | `iwc/.../pe-artic-variation.ga` |
| Data S1 | ephemeris/shed-tools install list for the worked example's tools | Methods | derived from Workflow S2 `tool_id`s |
| Report S1 | `gxwf validate-tree --strict --report-html` over the IWC corpus | §Corpus Validation, Figure 4 | `gxwf validate-tree` |
| Report S2 | `gxwf roundtrip-tree --report-markdown` over the IWC corpus | §Conversion, Figure 4 | `gxwf roundtrip-tree` |

## Extended figures

Figures S1–S10 expand the body's four figures with the per-surface detail the main text only summarizes — native/Format 2 parity, the legacy quick fix, conditional-aware completion, cache degradation, the browser editor, conversion diffs, and tool search. Full descriptions and asset status are in `figures.md`; generation/capture procedures are in `figures/MANIFEST.md`. The CLI/diagram figures (S1–S3, S9–S10) are reproducible offline once a tool cache is warm; the GUI figures (S4–S8) require an interactive capture pass against `galaxy-workflows-vscode` and `gxwf-ui`.

## Worked example (Listing S1 + Workflows S1–S2)

The body's depth claim is demonstrated on a single named workflow — the IWC "COVID-19: variation analysis on ARTIC PE data" pipeline (33 steps, 25 tool steps, collection map-over over a paired collection). Workflow S2 is the verbatim native `.ga`; Workflow S1 is its schema-aware Format 2 conversion. Listing S1 takes that workflow, plants one mistake per error class in distinct steps — a misspelled parameter key (warning), an illegal select value (error, with legal options listed), a type mismatch (error), a stale `__current_case__`/removed parameter (warning), and a `list:paired`→`paired` connection with no flatten (connection error) — and shows the actual `gxwf validate` diagnostic for each, contrasted with what the equivalent Nextflow/Snakemake/WDL toolchain would or would not catch.

A smaller workflow may be substituted for the typeset listing if 33 steps proves unwieldy; the anchor choice should match the workflow used for Figure 3.

## Tool-install list and reproduction (Data S1)

Install the worked example's tools with `shed-tools install -g <server> -a <key> -t SI_Data_S1_*.yml` (ephemeris installed isolated via `uv tool`), or cache them for offline validation with `galaxy-tool-cache populate-workflow <Workflow S2> --cache-dir <dir>`. Either path makes Listing S1 and Figures S1–S3, S9 regenerable.

## Corpus reports (Reports S1–S2)

Reports S1–S2 are the full per-workflow validation and round-trip results behind Figure 4 and the manuscript's corpus counts. They are large generated artifacts; commit the HTML/Markdown reports plus the JSON they derive from, and record the corpus commit SHA and capture date in the report header so the counts are auditable.

## Not included

Internal working notes — `tasks.md`, `glossary.md`, `brc-tools-exploration.md` — are authoring scaffolding, not supporting information. The transient capture stash under `/tmp/gxwf_si/` is not part of the SI; only the curated artifacts promoted into `si/` are.
</content>
