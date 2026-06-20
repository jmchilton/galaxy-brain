# Figure asset MANIFEST

Source provenance and regeneration procedures for the foundry paper's figure assets. Mirrors `gxwf/figures/MANIFEST.md`: where an asset is a generated artifact rather than a drawn diagram, the entry is a **reproducible command** so re-running it regenerates the asset.

## Environment

- `gxwf` CLI: `@galaxy-tool-util/cli`. The draft-aware subcommands (`draft-validate`, `draft-extract`, `draft-next-step`) and `gxwf mermaid`'s draft overlay live on the **`draft-validate-concrete`** branch of `galaxy-tool-util-ts` (unmerged at capture date).
- **Renderer-fix dependency.** The step→step connectivity in these diagrams depends on the `@galaxy-tool-util/schema` parse fix that is currently **uncommitted** in the `parsed_tool_fixes` worktree. Pre-fix, both diagrams render under-connected (missing the staramr fan-out and the isescan → reshape chain). Regenerate only against a tree that carries that fix.
- Draft source workflows: `~/draft_workflows/MRSA/` (an MRSA antimicrobial-resistance conversion walk; **not** checked into this repo). `step-07-mobile_reformat.gxwf.yml` is the step-07 snapshot used here.

## Mechanism figures (draft format)

> These illustrate the **draft format mechanism** — what a `GalaxyWorkflowDraft` and its `draft-extract` projection look like. They are *not* a completed end-to-end case study and must not be captioned as Evidence-section results (see `evidence.md`, `case-study.md`). The vehicle happens to be the MRSA walk; the claim is about the format.

### draft_extract — draft (planned overlay) → extracted concrete subset

Pairs with the manuscript's "the workflow draft is the typed handoff between tiers" (Why Decomposition Works) and the `draft-validate --concrete` description in Methods. Two panels:

- `mobile_reformat_draft.png` (2753×411) — the step-07 snapshot as-is: 7 concrete steps solid/purple, 7 planned steps grey-dashed (the scaffold the per-step loop has not yet filled), `mobile_reformat` itself just gone solid.
- `mobile_reformat_extracted.png` (1205×443) — after `gxwf draft-extract`: the drafty steps dropped, `_plan_*` stripped, `class` promoted to `GalaxyWorkflow` — the clean 7-step concrete workflow that the `--concrete` validation stage checks against real tool schemas.

```bash
cd ~/draft_workflows
gxwf mermaid MRSA/step-07-mobile_reformat.gxwf.yml                          # → draft (planned overlay)
gxwf draft-extract MRSA/step-07-mobile_reformat.gxwf.yml -o mobile_extracted.gxwf.yml
gxwf mermaid mobile_extracted.gxwf.yml                                      # → extracted concrete subset
```

- Figure number / main-vs-SI placement: **TBD** (editorial). Distinct from Figure 5 ("the workflow draft *resolves*" across three tiers); this shows the *extraction/projection*, not the per-step resolution.
- For a deterministic repro, copy `step-07-mobile_reformat.gxwf.yml` (and/or the extracted output) into a `capture-kit/` here once the renderer fix is committed.
