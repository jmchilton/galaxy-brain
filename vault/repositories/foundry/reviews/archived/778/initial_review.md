# Initial review: galaxyproject/foundry#778

- Profile: default
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `4e4df0290d0b6e4be25fbfc8df7d206bb2bf3f77` (base `origin/main`, merge-base `94ce4ea2`)

## Verdict

Direction is right and matches the #678 research: no new enum value, `weak` stops authoring, `miss` is defined by what a wrapper runs, and the capability gap rides the existing blocking-entry → repair path. Schema description, generated TS and changeset agree. Casts spot-checked in sync (all 22 ledger copies and the draft-format copies carry the new text; discover cast carries the new schema hash). No P1. The main gap is the fold: its only worked case can't arise from the loop it is meant to serve, and repair's own eval properties would plausibly fail a correct fold.

CI: `test` is red on `validate:roadmap` (live-GitHub check: #768 / #774 roadmap metadata), unrelated to this PR. Because the job stops there, `check-casts`, `check-verify`, `check-generated` and `check-assemble-pipelines` never ran in CI. I couldn't run them locally (worktree has no `node_modules`, kept read-only), so that gate is unconfirmed.

## Findings

### P2 1 — Fold case assumes realized consumers, which the topological picker never produces

`draft-next-step` is topological: "a step waits until its `in:` sources are concretized" (`content/cli/gxwf/draft-next-step.md:59`). The STAR index step feeds both aligners, so when implement raises the new blocking entry on it, both `rna_star` consumers are still drafty. Yet:

- `repair-galaxy-draft-topology/scenarios.md` "a consumer's wrapper builds the index" uses "two realized `rna_star` steps" and expects `refGenomeSource.geneSource: history` set in their `state` and `--concrete --strict-state` green.
- The fold sentence in `repair-galaxy-draft-topology/index.md:118` ("`change-parameter` on the consumers to select that mode", "a consumer's wrapper does the step's work") presumes the consumer has a wrapper. In the reachable case it is at most identity-pinned, with `state` still in `_plan_state`. Repair's Claims paragraph says a claim about a step with no resolved wrapper is not a fact and "Picking a wrapper is not" allowed, so the fold as written conflicts with repair's own rules on exactly the case this PR routes there.

The #678 research flagged this ("The picker is topological, so a consumer is usually still drafty. A concrete consumer still needs a stated rule").

Fix: state the drafty-consumer fold. Rewire the genome into the consumer's `in:`/`_plan_in`, record the mode in `_plan_state`/`_plan_context` (e.g. "build index from history genome, `geneSource: history`"), and let the loop realize it. Say the entry's quoted wrapper option is the evidence that permits this without picking a wrapper. Make the scenario's consumers drafty (identity-pinned `rna_star`, `tool_version: TODO`). Keep the realized-consumer variant only as a secondary case if the template can emit one.

### P2 2 — Repair's eval properties would fail a correct fold

The fold removes a step whose output the consumers consume, and it does so without `kind: dropped`. Two existing `repair-galaxy-draft-topology/eval.md` properties read against it:

- "a removal needs standing": "no step is removed when a consumer truly needs its output". The aligners do need an index, and the property doesn't carve out "the consumer now builds it".
- "a narrowing is recorded": a removed step / "cut source work" needs a `kind: dropped` entry with a quoted `because`. The fold paragraph says nothing about whether a fold is a narrowing. The Removal paragraph requires a `because` that quotes a primary artifact for every removal.

An LLM judge applying these as written can mark the PR's own expected fold outcome a failure. Fix: add a fold property, or amend those two: a fold is not a narrowing (no `dropped` entry), and the removal's standing is the consumer wrapper's option quoted in the entry. Also say in the fold sentence what the resolve note must cite.

### P3 1 — `author-galaxy-tool-wrapper` still accepts a `weak` fall-through

`content/molds/author-galaxy-tool-wrapper/index.md:84`: "Continue only when discovery returned `miss`, or when the selected hit was weak enough that the harness explicitly fell through". `:67` says the same ("unless discovery evidence is weak or missing"). The schema, discover and advance now say `weak` never authors. Until #773 lands, the shipped author cast contradicts the contract this PR publishes. The PR description defers author to #773, so this may be intentional. If so, a one-line removal of the `weak` clause at `:84` is cheap and doesn't touch #773's gate.

### P3 2 — "Never a miss" vs. dropping data-manager hits

`discover-shed-tool/index.md` now says "A wrapper that runs the named executable is never a `miss`" and "Drop data-manager hits". A STAR index data manager runs `STAR --runMode genomeGenerate`. If a data manager were the only thing running the named executable, the two rules disagree. The eval property ("a wrapper that runs the named executable is never a miss") has the same gap. Fix: say "a non-data-manager wrapper" in both, or "after the drops in step 2".

### P3 3 — Fold's per-sample index cost isn't recorded

The #678 research caveat: folding into `rna_star` with `geneSource: history` rebuilds the index in every alignment job, once per sample when mapped over a collection. The fold paragraph doesn't ask repair to record this. The ledger already has a `decisions` collection for exactly this (`open-requirements-ledger/index.md:102`). Fix: one clause in the fold sentence ("append a `decisions` entry noting the index is rebuilt per job"), and add it to the scenario's `expect`.

### P3 4 — Dropping a parameter setting is logged as a plain entry, not `dropped`

`advance-galaxy-draft-step/index.md` wrapper-choice bucket: "When no wrapper that runs the step's work satisfies the contract and it lacks only a parameter, drop that setting and append a plain entry." A source parameter the workflow silently stops honoring is "source work it decided not to carry", which is what `kind: dropped` is for (ledger:21, :51). A plain `gap` entry doesn't count toward the drop totals. Either use `kind: dropped` with `units`, or say why a parameter setting isn't a drop. Also, "it" in "it lacks only a parameter" reads as the contract, not the wrapper. Name the wrapper.

### P3 5 — Missing routing scenario for advance

The research change list asked for an advance routing case (STAR index step: `hit` → implement → blocking entry → repair, never author). `advance-galaxy-draft-step/scenarios.md` is untouched. Only the eval property was rewritten. The repair fold case is also "No committed fixture yet", while `repair-galaxy-draft-topology/examples/star-sa-index-input/` already has realized `rna_star` steps with `geneSource: history`. A drafty-consumer variant of that fixture (see P2 1) would cover both scenarios at small cost.

## Notes (not findings)

- The schema text change alters the discover cast's `--schema-sha256`. Until `@galaxy-foundry/gxwf-foundry` releases with the changeset, the recast discover skill exits 4 against the published validator. Expected per the plan. Release the package with the recast.
- The research's other change-list items (glossary `:105`, `content-model.md`, `nextflow-to-galaxy-reference-data-mapping:95,102`, pipeline eval `:37-41`, `summarize-galaxy-tool:186`) are untouched. They read as still-correct or as #669/#773 scope, so I'm not raising them.
