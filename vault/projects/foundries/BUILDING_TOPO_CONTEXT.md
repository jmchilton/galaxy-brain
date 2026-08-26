# Building the TDA Bioinformatics Foundry: current context

> Handoff snapshot: 2026-08-06. The immediate aim is not to stand up the entire Foundry. Use this corpus to exercise and improve shared Foundry infrastructure and instructions one small slice at a time. See `BUILDING_FOUNDRY_CONTEXT.md` for the architecture and ownership boundary.

## Mission and constraints

The working name is **Topological Data Analysis Bioinformatics Foundry**. Its purpose joins two poles:

- move the field through TDA/TDL research, mathematical results, and agent-executable analysis actions;
- harden TDA software into reproducible environments and eventually deliver it through Galaxy tools, workflows, and training.

The current spine is a **frontier -> hardening -> delivery** maturation arc:

```text
manuscript / proof / mold
          -> package / method
          -> recipe / environment
          -> Galaxy tool / workflow / training
```

It is a loose atlas, not a gate. A note can be valuable at any stage; nothing must traverse the entire arc before it belongs.

Engineering constraints:

- TDA is instance #3, closest to the Statistical Genomics Foundry's current Astro/type architecture.
- Reuse the shared substrate, not Statistical Genomics' vocabulary or early accidents.
- Shared mechanics should land upstream in `foundry-lib` and shared instructions in `foundry-pattern`.
- TDA-local differences should be domain kinds, schemas, registries, policy, identity, rendering needs, and content.
- Bioinformatics-specific presentation or packaging may justify a focused new `foundry-lib` package, including an explicitly experimental `0.x` package, but only with a named boundary and falsification plan.
- Do not rush through the full standing-up checklist. Small adoption steps are probes of the infrastructure.

## Current source snapshot

Primary worktree:

`/Users/jxc755/projects/worktrees/topological-data-analysis-bioinformatics-foundry/branch/topo_meta`

Observed state on 2026-08-06:

- branch `topo_meta`, clean and tracking `origin/topo_meta`;
- branch commit `cc287b3`; merged `origin/main` is `ca081aa`;
- no `site/`, `package.json`, `meta_tags.yml`, `reference_contract.yml`, typed schemas, cast tree, or Foundry validator yet;
- this is a corpus and design workspace, not a partially configured application.

The nearest clean implementation exemplar is:

`/Users/jxc755/projects/worktrees/statistical-genomics-foundry/branch/converge-content-model`

Use its structure to understand the composition seam. Do not copy its kinds, tags, base envelope, or domain policy.

## Completed upstream prerequisite

A narrow `foundry-pattern` correction was completed from
`/Users/jxc755/projects/worktrees/foundry-pattern/branch/reference-stack-refresh` on branch
`agent/reference-stack-refresh`. It makes the standing-up checklist adopt `@galaxy-foundry/*`
packages by capability instead of mirroring a stale all-at-once version table, documents the
current package ownership seams, and upgrades the pattern site's own `wiki-links` dependency to
0.4. Tests, link validation, Astro checking, and the production build are green. PR
[`galaxyproject/foundry-pattern#48`](https://github.com/galaxyproject/foundry-pattern/pull/48) was
merged on 2026-08-06 as `4c644ff`; see `BUILDING_FOUNDRY_CONTEXT.md` for exact files and
non-blocking warnings.

The TDA worktree remained untouched by that upstream thread; the glossary pass below is the first
instance-local follow-up.

## Completed TDA thread: glossary alignment

On 2026-08-06, `content/meta/glossary.md` was reconciled with current `foundry-pattern` and compared
term-by-term with the Statistical Genomics glossary. The published edit now:

- carries the invariant pattern and Astro-stack meanings without provenance labels or lineage
  narration in the reader-facing glossary;
- aligns shared bioinformatics-instance conventions for source notes, own-words and license-aware
  summaries, summary posture, license policy, and wiki links;
- distinguishes authored note kinds from reference kinds, and a runnable TDA `Pipeline` from the
  Galaxy `Workflow` kind; and
- contains durable definitions only: implementation-status blocks, historical examples,
  cross-instance archaeology, and “proposed/planned/current” narration were removed in response to
  review.

Only `git diff --check` is available at this stage and it passes. The next vocabulary additions
should come from the first real Mold: `docking pose`, `decoy`, `DockQ`, and `interface QA` are named
in `initial-mold-plans.md` but should be pinned from the TopoQA corpus when `score-docking-poses`
becomes a note, not invented as infrastructure vocabulary.

Commits `ed549e2` and review cleanup `cc287b3` were merged by PR
[`jmchilton/bio-topo-foundry#15`](https://github.com/jmchilton/bio-topo-foundry/pull/15) as
`ca081aa` on 2026-08-06.

## Next TDA thread: one real `package` note

Use the six existing `content/packages/*.md` writeups to derive the minimum durable `package`
contract, then exercise it with `petls-pytorch.md` as the first typed note. It is the smallest
complete hardening vertical: writeup, Apache-2.0 software, locked environment, and working recipe.
This tests the package↔environment↔recipe boundary without starting with an aspirational kind.

Do not stand up every kind or the full site in the same change. Compare the required package fields
against current `foundry-lib`, the Statistical Genomics composition seam, and the standing-up
instructions first. Then implement only enough shared package consumption, collection/schema
wiring, and validation to make that one note real. Record any third-copy glue as an upstream
candidate before adding a TDA-local helper.

## Read these TDA files first

| File | What it owns | Important caution |
|---|---|---|
| `content/meta/glossary.md` | current vocabulary authority | merged PR #15; durable definitions without status or archaeology |
| `foundry-design-draft.md` | proposed identity, kinds, facets, and substrate/domain split | counts and some open-question text lag later corpus work |
| `resource-map.md` | mapping from assembled resources to proposed kinds | snapshot says 28 environments; current tree has 31 directories |
| `initial-mold-plans.md` | first proposed action, `score-docking-poses` | only the first Mold is sketched; reference-kind names remain provisional |
| `top-down-goals.md` | north-star verticals, environment priorities, aspirational workflows/training | explicitly direction, not committed work |
| `content/environments/README.md` | current environment inventory, grades, build caveats | stronger current inventory than older counts in design docs |
| `ecosystem-hardening.md` | hardening issues and upstream constraints | useful when deciding whether work is domain delivery or Foundry substrate |
| `topodockq-featurizer-spike.md` | clean-room reproduction evidence and remaining assembly | some “remaining” statements predate later completed packaging |
| `persistent-laplacian-implementation-review.md` | search-first decision that found `petls-pytorch` | demonstrates the preferred adopt/validate-before-reimplement posture |
| `replications/hiponet/` | executable HiPoNet replication evidence | domain evidence; not yet Foundry content modeling |

The glossary wins when TDA planning documents disagree on terminology. `foundry-design-draft.md`
still carries the older “Substrate-12” list; do not treat that list as authority or sweep it until
the glossary edit is reviewed.

## What exists now

The repository has a much stronger scientific/tooling corpus than its earliest planning counts imply:

- **31 environment directories** under `content/environments/`;
- **16 recipe directories** under `recipes/`;
- **6 package writeups** under `content/packages/`;
- **2 external-paper/survey notes** under `content/papers/`;
- one authoritative draft glossary;
- clean-room/open replacements for the previously blocked structure-QA path;
- a HiPoNet replication workspace and several detailed engineering/scientific reviews.

The three newer environments missing from the old `resource-map.md` count are the open structure-QA deliveries: `open-topodockq-featurizer`, `open-topoqa-featurizer`, and `open-topoqa-scorer`. Treat inventory counts in prose as snapshots; generated catalogs should eventually replace them.

Still absent as Foundry artifacts:

- typed notes/frontmatter and executable kind examples;
- method pages;
- authored Molds and cast skills;
- Galaxy tool wrappers, workflows, and GTN training;
- a reader site and generated kind/tag catalogs;
- deterministic casting and provenance in this instance.

Do not describe those layers as implemented until code and checks exist.

## Proposed TDA content model

The current draft uses `type` as the sole discriminator: one kind, one schema. Directories are locations, not identities.

| Group | Proposed kind | Meaning and current evidence |
|---|---|---|
| Frontier | `manuscript` | original scholarship authored here; intentionally empty |
| Frontier | `proof` | theorem plus mathematical proof; intentionally empty |
| Frontier | `mold` | one authored TDA analysis action; first plan is `score-docking-poses` |
| Software | `package` | upstream software plus its KB profile; 6 writeups plus latent packages behind environments |
| Hardening | `environment` | composite, runnable biopixi fixture with portability grade; 31 directories |
| Hardening | `recipe` | catalog/display record pointing at real repo-root recipe files; backing files exist, note kind is unimplemented |
| Delivery | `tool` | Galaxy wrapper exposing a package; empty |
| Delivery | `workflow` | runnable Galaxy/TDA bioinformatics pipeline; empty |
| Delivery | `training` | GTN article teaching delivered tools/workflows; empty |
| Connective | `method` | a TDA/TDL concept linking scholarship to implementations; latent |
| Source | `paper` | faithful note about an external paper/survey; 2 current notes plus latent primary sources |

The important distinctions are:

- `manuscript` is our new scholarship; `paper` is our faithful note about someone else's work; `package` is our profile of external software.
- `package` is the abstract software subject; `environment` is a composite actionable runtime.
- `mold` is authored source; `skill` is a cast output, not a note kind.
- `recipe` is borderline because it is catalog/display-only and never cast. Let an executable first slice test whether it needs to be a kind rather than assuming the draft is final.
- Galaxy `tool`, `workflow`, and `training` are TDA-local kinds even if the flagship has similarly named concepts. Shared kind machinery does not imply shared kind definitions.

Proposed tag facets are `method`, `application`, and `modality`, with a closed declared vocabulary. The registry format belongs upstream; these names and values belong here. Seed only values carried by real notes.

## Scientific and delivery priorities

The top-down document currently identifies three buildable north-star verticals:

1. **Structure QA:** now fully open end-to-end after clean-room replacements. `petls-pytorch`, `open-topodockq-featurizer`, `open-topoqa-featurizer`, and `open-topoqa-scorer` are packaged at L1. This is the readiest route to a real user-facing pipeline/training slice.
2. **Methodological benchmark harness:** fully open and scientifically defensible. It should test both attribution (topological feature ablation) and competitiveness against ordinary baselines.
3. **Single-cell cohorts:** core TopoMetry and supporting tools are open and packaged; HiPoNet is reproducible but remains restricted by a non-commercial Yale license.

The clean-room epic is complete. Do not reopen it as the default next project. Current value lies in delivery, validation, upstream contribution, and making the Foundry machinery honest around the assembled evidence.

The first planned Mold, `score-docking-poses`, owns the genuinely topological node and adopts the surrounding pipeline context. Its intended action is to featurize candidate complexes, score each with the open retrained ProteinGAT, rank by predicted DockQ-like quality, and return ranked models plus top-k selections.

Its currently named prerequisites are:

- a composite runnable environment for the scorer plus featurizer;
- a domain writeup for decoy ranking/interface QA;
- the `open-topoqa-featurizer` and `open-topoqa-scorer` package notes;
- pinned glossary terms for docking pose, decoy, DockQ, and interface QA.

The scope rule is useful beyond this Mold: own the TDA node deeply, adopt its context, and require the surrounding pipeline to be real rather than stubbed. Non-TDA stages are in scope only when they are necessary to make the TDA action usable end to end.

## What should be shared and what should stay local

| Candidate                                                                        | Default home                                                        | Reason                                                                                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Kind definition/assembly machinery                                               | `foundry-lib/kind-schema`                                           | already shared                                                                                                        |
| Portable kind catalog                                                            | `foundry-lib/kind-manifest`                                         | already shared                                                                                                        |
| License policy                                                                   | `foundry-lib/license-policy`                                        | already shared; TDA supplies note coherence                                                                           |
| Reference behavior vocabulary                                                    | `foundry-lib/reference-contract`                                    | already shared; TDA supplies reference kinds                                                                          |
| Tag registry parser                                                              | `foundry-lib/tag-registry`                                          | already shared; TDA supplies facets and values                                                                        |
| Wiki-link grammar and transforms                                                 | `foundry-lib/wiki-links`                                            | already shared; TDA supplies link map                                                                                 |
| Shell/search/reference-card behavior                                             | `foundry-lib/site-kit`                                              | already shared; TDA supplies identity, theme, routes, domain furniture                                                |
| Cast assembly/reconciliation/provenance and generic skill shape                  | `foundry-lib/cast`                                                  | current `0.10.0` supplies the caster; TDA supplies hooks and domain sections and is the important second-adopter test |
| TDA kinds, fields, base envelope                                                 | TDA instance                                                        | domain model                                                                                                          |
| `method/application/modality` vocabulary                                         | TDA instance                                                        | domain browse axes                                                                                                    |
| biopixi portability grade and environment fields                                 | TDA instance unless a second bio Foundry proves a reusable contract | currently domain/ecosystem policy                                                                                     |
| Bioinformatics package/environment presentation shared by multiple bio Foundries | possible focused `foundry-lib` package                              | acceptable if driven by two consumers or explicitly experimental with a falsification plan                            |
| TDA package, environment, method, workflow, and training renderers               | TDA instance first                                                  | presentation follows domain shapes; extract only after convergence                                                    |
| Benchmark/referee correctness                                                    | TDA instance                                                        | scientific acceptance policy cannot be answered by the framework                                                      |

The user-level goal that instances differ mostly by types/models/domain material should be used as pressure, not as a reason to hide real policy differences behind generic configuration.

## Current Mold vertical and immediate priority

The bounded reader-and-kind slice is complete. The working branch `agent/mold-contract` adds:

- a directory-shaped `mold` Kind with recommended, Foundry-only `eval.md` and `scenarios.md` companions;
- a corpus-first `reference_contract.yml` containing only the `environment` kind used today and a `verbatim`-only mode narrowing;
- schema validation for reference vocabularies, on-demand triggers, hypothesis verification, strict fields, and reference resolution;
- Mold browse/detail/tag routes and the shared `ReferenceContract.astro` rendering surface;
- `content/molds/score-docking-poses/index.md`, referencing the existing composite `open-topoqa-scorer` Environment;
- generated-manifest and built-output coverage without fixed corpus totals.

The full TDA validation passes: Kind-manifest freshness, 73 tests, Astro typechecking, and the production build.

This slice exposed a second-adopter defect before casting was enabled. The Environment Kind already
declares `pixi.toml` and `pixi.lock` as bundled companions, but cast `0.10.0` still asks each note to
repeat a `companions:` list and each reference kind to opt in with a boolean. The working
`foundry-lib` branch `agent/cast-kind-companions` makes the Kind layout authoritative. It carries
fixed bundled companions, respects their dispositions and requirements, handles directories,
permits additional per-note companions only for open layouts, and removes the redundant cast
boolean. Full workspace build, typecheck, tests, lint, format, docs, and unused-export checks pass.

The next step is to review and release that upstream cast change. After publication, finish the TDA
vertical by adding the `cast:` behavior to the Environment reference kind, the TDA caster binding,
one target/bundle contract, provenance assertions, and CI that casts `score-docking-poses`. Do not
duplicate Kind-owned companion declarations in TDA while waiting for the release.

## Known drift and questions to resolve on contact

- `foundry-design-draft.md` says the seed is roughly 14 environments; `resource-map.md` says 28; the current tree has 31. Prefer generated inventory over manually repeated counts.
- `resource-map.md` and `top-down-goals.md` include dated “remaining work” statements superseded by later commits. Preserve their rationale, but verify status against the tree and git history.
- The TDA glossary's inherited Foundry terms need a direct comparison with current `foundry-pattern/origin/main`, not the Statistical Genomics glossary.
- The current base note envelope is `{tags}`. Add a shared field only when more than one TDA kind and a real consumer require it.
- The `recipe` kind may be a note kind, a companion/view over repository files, or a generated catalog row. Test its consumer before freezing the model.
- The reference vocabulary currently contains only `environment`, because the first real Mold needs only the composite scorer fixture. Add `package`, `method`, glossary, command, or schema kinds when a real Mold first references one.
- The Pattern's long Astro checklist contains version pins and implementation commentary that can lag `foundry-lib` releases. Current package docs/changelogs own package behavior; the pattern owns the composition seam.
- Statistical Genomics' installed `node_modules` is stale relative to its tracked lockfile. Sync dependencies before using runtime results as comparison evidence.
- `foundry-lib` local `main` is behind fetched `origin/main`; current source included unreleased site-kit specimen work at `3b80725`. Use a clean updated worktree when changing it.

## Paths for the next agent

### TDA instance

```text
/Users/jxc755/projects/worktrees/topological-data-analysis-bioinformatics-foundry/branch/mold-contract
  content/meta/glossary.md
  foundry-design-draft.md
  resource-map.md
  initial-mold-plans.md
  top-down-goals.md
  content/environments/README.md
  content/packages/
  content/papers/
  content/environments/
  recipes/
  replications/hiponet/
```

### Closest exemplar

```text
/Users/jxc755/projects/worktrees/statistical-genomics-foundry/branch/converge-content-model
  AGENTS.md
  content/meta/glossary.md
  content/meta/code-architecture.md
  content/meta/content-model.md
  content/meta/build-and-validation.md
  content/meta/repository-layout.md
  meta_tags.yml
  reference_contract.yml
  site/src/types/
  site/src/lib/frontmatter-schema.ts
  site/src/lib/registries.ts
  site/src/content.config.ts
  site/src/pages/
  site/tests/
```

### Shared infrastructure and instructions

```text
/Users/jxc755/projects/worktrees/foundry-lib/branch/cast-kind-companions
  docs/concepts/shared-substrate.md
  docs/architecture/package-boundaries.md
  docs/getting-started.md
  docs/packages/README.md
  packages/

/Users/jxc755/projects/repositories/foundry-pattern
  content/pattern/the-model.md
  content/pattern/anatomy-of-an-instance.md
  content/pattern/setting-up-a-foundry.md
  content/pattern/standing-up-a-foundry.md
  content/pattern/standing-up-a-foundry.instructions.txt
```

Use fetched `origin/main` for current source until clean worktrees are updated.

### Cross-repository history

```text
/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/foundries
  BUILDING_FOUNDRY_CONTEXT.md
  SITE_KIT_PLAN.md
  CAST_CONVERGENCE_PLAN.md
  REPLICATION_EXPERIMENT.md
  LICENSE_ACCEPTANCE_PLAN.md
```

## What not to do next

- Do not execute all eight pattern phases in one change.
- Do not copy the Statistical Genomics `site/` tree and rename it.
- Do not formalize all proposed TDA kinds before one real note exercises their contracts.
- Do not create TDA-local replacements for existing `@galaxy-foundry/*` behavior.
- Do not upstream TDA vocabulary merely because two bioinformatics Foundries could someday use it.
- Do not hand-maintain another inventory count that can be generated from the corpus.
- Do not call a site or cast healthy solely because its build exits zero; inspect emitted pages, links, styles, search index, and provenance.
- Do not let infrastructure work displace the scientific acceptance question: a valid schema says the artifact is well formed, not that the TDA method is correct or useful.

## Definition of a useful stopping point

This work is intentionally open-ended. A session can stop after one small improvement when it leaves:

- a real TDA corpus case better represented or rendered;
- a shared package or pattern instruction measurably clearer;
- a test that would have caught the observed failure;
- the shared/local boundary recorded;
- this context file updated with the new snapshot and next unresolved seam.

That is progress even while the TDA Foundry has only one Mold and no cast artifact.
