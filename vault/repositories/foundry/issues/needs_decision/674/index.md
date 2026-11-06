# #674 Interface-tier notes have no rule for shape-changing params or meta-driven parameterization

[Issue](https://github.com/galaxyproject/foundry/issues/674) — opened 2026-10-12 (AI-assisted, filed for scottcain), only `needs-triage`. No comments. No PR or branch addresses it (`gh pr list --search 674` empty; related branch `nextflow-control-params-178` belongs to closed #178).

## Re-triage 2026-11-06 (supersedes the Next section and the "link, don't restate" advice below)

John's direction: the blanket prohibition is wrong; there are known bugs, and this is a harness concern. Read here as the Expected section's "a second tool choice is a SECOND Galaxy workflow" plus its premises "no runtime subgraph selection" and "NO Galaxy expression". The gap is real; the prescribed fix is not.

Draft correction for the issue: [scope_correction_comment.md](scope_correction_comment.md). Not posted.

### Status and claim

- GitHub has `work/in-progress`, so the label mapping says `wip` (rule 2). The directory and index line stay in `needs_decision` until the claim below settles, to avoid colliding with its holder's move.
- A comment at 12:49Z claims branch `issue-674-shape-changing-params`, "per the Expected section". At last check there was no worktree, no branch on either remote, and no record move. Holder unknown; asked busy sessions wf-foundry-4e, -cb and -70 to hold. No reply yet.

### Labels

- Keep `roadmap/off`, `priority/mvp`.
- `work/ready-implement` once the claim is released and the scope comment is posted (the label doc has the holder restore it). Nothing staged while the claim stands.

### Findings (read from source; no workflow run)

- **§1 premise false.** `when:` is on tool and subworkflow steps; one-of-N routing is enum, `map_param_value` booleans, gated alternatives, `pick_value` ([[conditional-route-between-alternative-outputs]], high-confidence IWC exemplars including an eggNOG enum route). [[nextflow-conditional-to-galaxy-subworkflow-when]] already sets the v1 posture as one Galaxy workflow per source.
- **§1 root cause.** `nextflow-summary-to-galaxy-interface` references neither conditional note; only the data-flow and template Molds do. The interface tier reads "keep as scalar" with no route to how. It does load the ledger, whose `kind: dropped` rule already covers recording a cut.
- **§2 premise false.** Mapped `param_value_from_file` gives per-element values. `map_over_expression.gxwf.yml` feeds one to a tool param (outputs A, B per element); `test_run_workflow_conditional_step_map_over_expression_tool` skips 1 of 2 elements via a mapped `when`. Both are on `release_24.2`, `release_25.1`, `release_26.0` and dev.
- **Evidence tier.** Galaxy tests, not IWC: 43 IWC workflows use `param_value_from_file`, 0 fed directly by a collection input. Heuristic; misses those fed through a mapped intermediate step.
- **Stale Foundry text this contradicts.** `iwc-map-over-lifecycle-survey` ("`when` is step-level, not arbitrary per-element"), `cleanup-sync-and-publish-nonempty-results` ("Do not gate per-element routing with Galaxy `when`"), and possibly `galaxy-conditionals-patterns` ("a `when` gate skips a whole step"). Correct with this issue.
- **Kept from the issue.** The step-set vs step-argument test is useful. Carrying one path with `kind: dropped` entries is legitimate, as a scope choice rather than a Galaxy limit. Sibling workflows remain an option; the conditional note notes IWC reviewers prefer them and that runtime tool selection wasn't observed in IWC (2026-05 claim, not re-verified).

### Known bugs to cite rather than encode (open as of today)

- #653: `gxwf --strict-state` can't go green on any gated step.
- #661: mapped `when` arms yield null elements; `__MERGE_COLLECTION__` gives 3N, `pick_value` is right.
- #667: connections into a conditional's test param; `--connections` can't resolve them.
- galaxy#22817: API invocation double-nests `parameter_input` values, breaking `pick_value`.

### Not verified

- #661 says connecting into a tool conditional's test param 500s in Galaxy; #667 reports the same kind of edge running green on usegalaxy.org. Per-element strandedness into salmon's `--libType` hits this edge, so that route is open. The gated-branches route is what #661 built.
- The issue's nf-core/rnaseq counts (136 params, 21 conditionals).
- "Known bugs" and "harness" are my reading of John's words: harness as the run driver that chooses scope and handles gate failures, as #678 uses it.

### Next

Scope for the implementer, after the claim is released and John OKs:

1. `nextflow-params-to-galaxy-inputs`: split step-set from step-argument params. Link the conditional notes for routing. Say carry-all vs pin-one is a run-scope choice; a cut gets a `kind: dropped` entry.
2. `nextflow-to-galaxy-channel-shape-mapping`: add a meta-driven parameterization row built on mapped `param_value_from_file`, with evidence tier and open bugs. Run-once-and-re-run becomes a fallback, not the rule.
3. Correct the stale `when` text above; update `nextflow-workflow-io-semantics`.
4. Reference the conditional note from `nextflow-summary-to-galaxy-interface`; recast; `make check`.

Overlap: #661 owns the fan-in recipe; link it, don't duplicate. Skim #267 and #725.

### Open questions for John

- Is the §1 "second workflow" line the prohibition you meant?
- Post the scope comment, or edit the issue body?
- Keep §2 here, or split the test-param route out as `work/ready-research`?

## Proposed labels (2026-10-24 triage, applied)

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

Moved to `needs_decision` 2026-11-03: staged labels in `issue_tags.md` await John.

Staged labels applied 2026-11-06: +roadmap/off, +priority/mvp, +work/ready-implement.
