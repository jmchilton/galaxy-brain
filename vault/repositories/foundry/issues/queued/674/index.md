# #674 Interface-tier notes have no rule for shape-changing params or meta-driven parameterization

[Issue](https://github.com/galaxyproject/foundry/issues/674) — opened 2026-10-12 (AI-assisted, filed for scottcain), only `needs-triage`. No comments. No PR or branch addresses it (`gh pr list --search 674` empty; related branch `nextflow-control-params-178` belongs to closed #178).

## Proposed labels

- `roadmap/off`: two doc corrections to Nextflow-source research notes; no `roadmap/main` backbone fits. Closest is #267 (collection-shape selection note), but it is a sibling topic, not a parent. Precedent: #219 (nextflow reference-data note) is `roadmap/off`. Alternative `roadmap/substep` under #267 if John wants it on the roadmap.
- Parent: none (`roadmap/off`).
- `priority/mvp`: the "keep as scalar" rule is unimplementable in gxformat2 for nf-core/rnaseq-style pipelines, so Nextflow-to-Galaxy runs get wrong results now. Same as #219; `v2` is defensible if Nextflow translation is not MVP.
- `agent/implement`: issue spells out the exact edits for both notes.
- No blocker labels.

## Derived status

`queued`: `agent/implement`, no PR or branch, no blocker (rule 4).

## Findings (verified on origin/main, 2026-10-24)

- Correction 1 target `content/research/nextflow-params-to-galaxy-inputs/index.md` line 128: "Keep as Galaxy scalar inputs when they alter workflow shape", with `aligner`, `trimmer`, `ribo_removal_tool`, `skip_alignment`, `skip_trimming`, `skip_fastqc` as examples ("Selects subgraph or tool branch", "Changes which steps run"). Claim holds. A closing line already allows "resolve to a fixed Galaxy design default" but gives no rule to choose, no `dropped` ledger entry, and no "second tool choice = second workflow" statement.
- Same guidance is echoed in `content/research/nextflow-workflow-io-semantics/index.md` (lines 260, 283); update for consistency.
- Correction 2 target `content/research/nextflow-to-galaxy-channel-shape-mapping/index.md`: line 76 `branch { ... }` row says "per-element routing needs review" (data routing only). Claim holds. Per-element `when` limits are already documented in `iwc-map-over-lifecycle-survey` (line 171) and pattern `cleanup-sync-and-publish-nonempty-results` (line 68); link to them rather than restate.
- Casts hold copies of both notes: `casts/claude/skills/nextflow-summary-to-galaxy-{interface,reference-data}/` (params) and `{interface,data-flow,implement-galaxy-tool-step}` (channel-shape). Recast after editing.
- Related: #178 (closed; origin of the keep-as-scalar default), #267 (open; counterpart for data shapes, land consistently), #665 (summary-nextflow gaps), #694 (direct Galaxy routes on Workflow Brief Molds; check overlap before editing interface Molds).

## Next

Edit the two notes per the issue's Expected section (decision test: does the param change the step set or only a step's arguments), update `nextflow-workflow-io-semantics`, recast, `make check`. Small PR; skim #267 first so shape language agrees.
