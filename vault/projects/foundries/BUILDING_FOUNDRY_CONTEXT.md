# Building a Foundry while improving the Foundry substrate

> Handoff snapshot: 2026-08-06. This is orientation, not a setup checklist. The immediate project is a new Topological Data Analysis (TDA) bioinformatics Foundry, but the engineering objective is to make the shared Foundry pattern, packages, and build instructions better as the third instance exercises them.

## Working posture

Do not optimize for getting a new site online quickly. Optimize for leaving less duplicated, less ambiguous infrastructure behind.

The TDA Foundry is the third adopter and therefore a falsification exercise for the abstractions produced by the Galaxy Workflow Foundry and Statistical Genomics Foundry. A successful slice may produce little TDA-visible functionality if it removes a copied mechanism, sharpens a package boundary, adds an executable example, or corrects the standing-up instructions upstream.

The desired end state is ambitious: Foundry instances should differ mainly in types, models, policies, presentation values, and domain knowledge. It may not be possible to erase every application-level difference, but a difference should be deliberate and named rather than a copied implementation that happened to drift.

Use this decision loop whenever a new file or behavior seems necessary:

1. Is it domain knowledge, vocabulary, a local policy choice, or instance identity? Keep it in the instance.
2. Does an existing `@galaxy-foundry/*` package own the mechanism? Consume it and improve its documentation or tests if adoption is unclear.
3. Do two instances already implement equivalent behavior? Converge the behavior, extract it to `foundry-lib`, then consume it.
4. Is TDA the first implementation? Keep it local while learning unless an explicitly experimental `0.x` extraction is itself the instrument for discovering the contract. Such a package must keep instance paths, vocabulary, and acceptance policy outside its API.
5. Never make permanent progress by copying shared machinery into the TDA repository. A temporary comparison or spike is fine; the landed source of truth should be upstream.

This is the admission rule documented by `foundry-lib`: duplication is evidence, not sufficient cause. The shared unit must be a contract, benefit from one versioned source, avoid inventing common policy, and accept instance facts explicitly.

## The Foundry model

The current pattern has four parts:

1. **Knowledge Base (KB):** the inspectable, human-readable source of truth. Typed frontmatter, controlled tags, resolvable wiki links, design records, examples, and generated catalogs make the authored knowledge both readable and mechanically checkable.
2. **Mold:** one abstract action, expressed as a procedure plus a typed reference manifest. It selects the minimum knowledge needed for that action and is independent of an agent runtime.
3. **Cast:** deterministic compilation of a Mold and its resolved references into a frozen, target-specific artifact. The artifact is scoped, isolated from the KB, and reproducible.
4. **Provenance:** the record beside the artifact: Mold revision and hash, target, resolved inputs, placement, hashes, and checks. It supports both drift detection and claim-level forensics.

A target configures the output of casting; it is not a fifth source of knowledge. A domain's external check decides whether work performed with a cast deserves trust; the requirement for an independent check is shared, but the implementation is domain-specific.

The stack-neutral growth route is: frame and ground the domain, establish vocabulary, stand up the reader, author one action, cast one target, build the external check, compose only if the work is actually sequential, and then grow from evidence. For this project, treat that route as a sequence of questions, not a mandate to implement every layer now.

Canonical pattern pages:

- [The Model](https://galaxyproject.github.io/foundry-pattern/pattern/the-model/)
- [What a Foundry Needs](https://galaxyproject.github.io/foundry-pattern/pattern/anatomy-of-an-instance/)
- [Plan Your Foundry](https://galaxyproject.github.io/foundry-pattern/pattern/setting-up-a-foundry/)
- [Build with the Astro Stack](https://galaxyproject.github.io/foundry-pattern/pattern/standing-up-a-foundry/)

## Architecture and ownership

```text
instance-authored domain knowledge
  content, glossary, examples, Molds
              |
              v
instance composition and policy <----> versioned foundry-lib mechanics
  kinds, schema context, registries       schemas, formats, links,
  collections, renderers, targets         shell, casting primitives
              |
              v
generated and checked outputs
  site, kind manifest, catalogs, cast bundles, provenance
```

The most useful boundary is “who can truthfully know this fact?” Shared functions take explicit inputs; they do not discover an instance container, registry, current directory, domain vocabulary, or acceptance rule.

| Concern | Shared owner | Instance owner |
|---|---|---|
| License to redistribution posture | `license-policy` | note-shape/license coherence and source posture |
| Kind declaration/assembly and manifest format | `kind-schema`, `kind-manifest` | actual kinds, base envelope, field primitives, schema context |
| Collection matching machinery | `kind-schema` | collection table, paths, route policy |
| Typed-reference behavior vocabularies | `reference-contract` | reference kinds, supported-capacity narrowing, cross-field coherence |
| Tag registry format and accessors | `tag-registry` | facets, values, corpus drift policy |
| Wiki-link grammar, slugging, and transforms | `wiki-links` | link map, note addresses, unresolved-link acceptance |
| Reading shell and its behavior contract | `site-kit` | identity, palette/tokens, routes, domain renderers, corpus |
| Deterministic cast assembly and reconciliation | `cast` | kind cast declarations, slug map, target config, hook implementations, domain skill sections, process verdict |
| Scholarly citation audit mechanics | `audit-citations` (experimental) | source selection, trusted hosts, artifact kinds, acceptance gate |
| Domain correctness | none | external validator, referee, benchmark, proof, or human review |

Two recurring distinctions matter:

- A package may ship **data** (instances agree on content) or only a **format** (instances agree on rules while retaining different content). `reference-contract` deliberately does both: four shared vocabularies plus instance-supplied `kinds`.
- A shared view is not automatically a shared policy. `site-kit` can render a reference card, but the instance owns reference kinds and per-kind accents. `cast` can assemble a bundle, but the instance owns what its references mean and what success means.

## Repository and worktree map

Treat fetched remote refs and clean worktrees as snapshots; do not assume the checkout named `main` is current.

| Role | Preferred path for this work | Snapshot observed 2026-08-06 |
|---|---|---|
| TDA instance | `/Users/jxc755/projects/worktrees/topological-data-analysis-bioinformatics-foundry/branch/topo_meta` | clean, `b9f5646` (2026-08-05) |
| Statistical Genomics exemplar | `/Users/jxc755/projects/worktrees/statistical-genomics-foundry/branch/converge-content-model` | clean, `5aba90d` (2026-08-05), also fetched `origin/main` |
| Shared packages | `/Users/jxc755/projects/repositories/foundry-lib` | local `main` is behind; fetched `origin/main` was `3b80725` (2026-08-06) |
| Pattern/specification | `/Users/jxc755/projects/repositories/foundry-pattern` | fetched `origin/main` `25bbb0b` (2026-08-06), including PR #48 |
| Flagship Galaxy Workflow Foundry | `/Users/jxc755/projects/repositories/foundry` | consult when a second concrete implementation is needed |
| Cross-repository working notes | `/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/foundries` | long-form convergence history; status headers may lag source |

The local `foundry-lib` `main` checkout was behind `origin/main`. Read current source with `git show origin/main:<path>` or create/update a clean worktree before editing. Do not silently work from the older checkout.

## Completed upstream thread: capability-based package adoption

Work began on 2026-08-06 in the clean worktree
`/Users/jxc755/projects/worktrees/foundry-pattern/branch/reference-stack-refresh`, branch
`agent/reference-stack-refresh`, based on `foundry-pattern/origin/main` at `8dd8f2a`.

The published patch:

- removes mirrored `@galaxy-foundry/*` version pins from the standing-up checklist and assigns
  package release/API authority to current `foundry-lib` documentation and metadata;
- distinguishes the seven baseline reader/contract capabilities from capability-triggered
  `cast` and experimental `audit-citations` adoption;
- updates the documented `license-policy`, `site-kit`, `wiki-links`, and `cast` ownership seams,
  including removal of the obsolete `allowed_modes` license-row field;
- upgrades the pattern site's own `@galaxy-foundry/wiki-links` consumer range from `^0.3.0` to
  `^0.4.0`.

Validation is green: 22 Vitest tests, wiki-link validation over 21 files/targets, Astro checking
with zero errors, and a production build of 28 pages. The build still reports an existing CSS
ordering warning for a Google Fonts `@import`; Astro also reports the existing unused `i` callback
parameter as a hint. `npm ci` reports seven audit findings (four moderate, three high); none were
changed as part of this documentation-boundary patch.

Do not redo this edit in the repository checkout. PR
[`galaxyproject/foundry-pattern#48`](https://github.com/galaxyproject/foundry-pattern/pull/48) was
merged on 2026-08-06 as `4c644ff`; the dedicated worktree remains useful only for historical diff
inspection.

## `foundry-lib` package map

Versions below are the package versions declared on fetched `origin/main` at `3b80725`. That commit also contains unreleased `site-kit` specimen work under a pending changeset, so package version and branch behavior are not always synonymous.

| Package | Version | Maturity | Owns |
|---|---:|---|---|
| `@galaxy-foundry/audit-citations` | 0.1.1 | experimental N=1 | deterministic citation extraction, evidence capture, replay, reporting |
| `@galaxy-foundry/cast` | 0.6.0 | early adoption N=1 | `castMold`, cast contract loading, generic skill-document shape, bundle placement, reconciliation, licensing, provenance |
| `@galaxy-foundry/kind-manifest` | 0.4.0 | admitted | portable manifest schema, parsing, and derivation from Zod shapes |
| `@galaxy-foundry/kind-schema` | 0.5.1 | admitted | kind definition/assembly, collection routing, companion contracts |
| `@galaxy-foundry/license-policy` | 0.3.1 | admitted | shared redistribution-policy table and readers |
| `@galaxy-foundry/reference-contract` | 0.4.0 | admitted | shared typed-reference vocabularies and composition |
| `@galaxy-foundry/site-kit` | 0.4.2 | admitted; pending unreleased specimen changes on branch | Astro shell, navigation/theme/search behavior, reference card, style checks |
| `@galaxy-foundry/tag-registry` | 0.1.0 | admitted | `meta_tags.yml` parser, validator, accessors |
| `@galaxy-foundry/wiki-links` | 0.4.0 | admitted | exact `[[Target]]` grammar, file and term slugging, Markdown transforms |

Current package documentation starts at:

- `/Users/jxc755/projects/repositories/foundry-lib/docs/concepts/shared-substrate.md`
- `/Users/jxc755/projects/repositories/foundry-lib/docs/architecture/package-boundaries.md`
- `/Users/jxc755/projects/repositories/foundry-lib/docs/getting-started.md`
- `/Users/jxc755/projects/repositories/foundry-lib/docs/packages/README.md`
- `/Users/jxc755/projects/repositories/foundry-lib/docs/architecture/site-kit-runtime.md`
- `/Users/jxc755/projects/repositories/foundry-lib/docs/architecture/cast.md`
- package READMEs under `/Users/jxc755/projects/repositories/foundry-lib/packages/*/README.md`

Use `origin/main` versions of these paths until the local checkout is updated.

## Statistical Genomics as the nearest implementation exemplar

The Statistical Genomics Foundry is useful because its current code is an instance composition over shared packages, not because its domain model should be copied. Its own agent notes explicitly warn that the domain vocabulary and early architecture were ad hoc. Copy the seam; re-derive the TDA values.

The implementation is one Astro application under `site/`; there is no local package workspace or caster. Important paths:

| Concern | Path relative to Statistical Genomics root |
|---|---|
| Current implementation map | `content/meta/code-architecture.md` |
| Knowledge/content contract | `content/meta/content-model.md` |
| Build and validation | `content/meta/build-and-validation.md` |
| Physical layout | `content/meta/repository-layout.md` |
| Domain vocabulary authority | `content/meta/glossary.md` |
| Installed dependency declarations | `site/package.json`, `site/pnpm-lock.yaml` |
| One injected kind context | `site/src/types/context.ts` |
| Single kind enumeration | `site/src/types/index.ts` |
| One directory per kind | `site/src/types/<kind>/{schema.ts,kind.md,example.md}` |
| Schema and collection composition | `site/src/lib/frontmatter-schema.ts` |
| Astro adapter | `site/src/content.config.ts` |
| Instance registries | `meta_tags.yml`, `reference_contract.yml`, `site/src/lib/registries.ts` |
| Shared-link adapter and corpus walk | `site/src/lib/wiki-links.ts`, `site/src/lib/corpus-files.ts` |
| Shell composition and identity | `site/src/layouts/Base.astro`, `site/src/lib/site-identity.ts`, `site/src/styles/global.css` |
| Route model | `site/src/pages/[collection]/[...slug].astro` plus per-collection index pages |
| Contract and corpus tests | `site/tests/` |
| Kind/catalog generators | `site/scripts/` |

The important architecture is:

- `type` is the sole note-kind discriminator.
- Every kind has a strict local Zod definition, rationale, and executable example.
- `types/index.ts` is the kind enumeration; `COLLECTIONS` in `frontmatter-schema.ts` is the path/route enumeration.
- Astro and standalone tests consume the same assembled schema objects.
- Registries are loaded once, composed in `registries.ts`, and injected into the kind context.
- Pages do not carry a second collection list.
- Shared link grammar and the instance link map are used by both rendering and validation.
- Built-output checks cover silent failures that typechecking and `astro build` cannot see: Tailwind scanning, shell tokens/classes, base URLs, search coverage, page counts, and link routing.

Do not copy Statistical Genomics kinds (`book`, `paper`, `tutorial`, `mold`, `pattern`, `meta`), its one-field base envelope, its reference kinds, or its facets into TDA. They are evidence that the shared machinery supports a structurally different instance.

### Snapshot cautions in the exemplar

- The tracked `site/package.json` and `site/pnpm-lock.yaml` declare newer shared packages than the currently installed `node_modules`. `pnpm list --depth 0` reflected the stale installation. Run `pnpm install --frozen-lockfile` before treating local runtime behavior as evidence.
- The exemplar dependency ranges still trail fetched `foundry-lib/origin/main` releases in several places (`cast` is absent; `reference-contract`, `site-kit`, and `wiki-links` have newer incompatible `0.x` minors). Adopt current packages deliberately and read changelogs; do not transplant its versions mechanically.
- `site/src/styles/global.css` currently contains the `@source "../../node_modules/@galaxy-foundry/site-kit/src"` directive twice. It is harmless duplication but a useful example of why the third instance should pressure the instructions and shared integration surface instead of copying source wholesale.
- Some `foundry-lib` overview prose still describes the pre-0.6 cast boundary as “renderers stay local.” Current source is more precise: the package owns the generic skill document shape and row helpers, while the instance supplies its lede, ordered domain sections, non-verbatim mode renderers, extra bundle files, aliases, and checks through `CastHooks`. Treat this as an upstream documentation-polish candidate.

## Existing cross-repository history

These vault notes explain why current boundaries look the way they do. Read targeted sections; their status lines can lag newly merged code.

- `SITE_KIT_PLAN.md` — convergence of the two reading shells, adoption, CSS contract, reference card, and search indexing.
- `CAST_CONVERGENCE_PLAN.md` — cast extraction history and the distinction between primitives, the caster, and instance hooks. Its 2026-08-05 header predates `cast@0.6.0`; current package source now includes `castMold` and cast-contract loading.
- `REPLICATION_EXPERIMENT.md` — cross-instance experiments and TDA/TopoQA context.
- `LICENSE_ACCEPTANCE_PLAN.md` — broader Galaxy license acceptance work; related to restricted tools but not part of Foundry substrate by default.
- `DEVELOPMENT_LAYOUT.md` — old path map; prefer the worktrees listed above.

## How to improve upstream while building TDA

For each small TDA slice, record four outcomes:

1. **Installed:** existing `@galaxy-foundry/*` behavior consumed as-is.
2. **Mechanical:** repository wiring that every Astro instance repeats. If this is repeated for the third time, investigate a package, generator, executable example, or instruction correction.
3. **Instance-owned:** TDA kinds, schemas, vocabulary, policy, identity, styles, routes, and domain rendering.
4. **Evidence:** the test, built-output comparison, or corpus case that justified the decision.

When a shared change is needed, land it in dependency order:

1. `foundry-lib` implementation, tests, docs, changeset/release as appropriate;
2. `foundry-pattern` instructions or conceptual correction;
3. exemplar adoption if the contract claims more than one mature consumer;
4. TDA adoption and its instance-level test.

Do not declare success from a green build alone. The recent convergence work found green builds with missing links, missing pages, unstyled shells, incomplete Pagefind indexes, stale cast bundles, and wrong deployment bases. Assertions should read the emitted artifact or generated site whenever the defect exists only after compilation.

## Good next-agent entry point

Do not execute the whole standing-up checklist. Take one narrow vertical slice of the reader/type seam:

- one TDA kind with one real note;
- the authoritative glossary as an explicit loose document;
- the minimum shared registries needed to validate that note;
- a reader route that proves the note and glossary are reachable;
- tests that classify every required file as shared package behavior, repeated mechanical wiring, or TDA-owned policy.

Before writing each mechanical file, compare the Statistical Genomics implementation, the flagship implementation, current `foundry-lib`, and the standing-up instructions. If the same glue is appearing for the third time, stop and improve the upstream surface first. This produces useful evidence without committing the TDA Foundry to a complete taxonomy, full site, caster, or delivery pipeline.

## Commands for re-orientation

```sh
# Confirm the snapshots before relying on this document.
git -C /Users/jxc755/projects/repositories/foundry-lib fetch origin
git -C /Users/jxc755/projects/repositories/foundry-lib show -s --format='%H %cs %s' origin/main
git -C /Users/jxc755/projects/repositories/foundry-pattern fetch origin
git -C /Users/jxc755/projects/repositories/foundry-pattern show -s --format='%H %cs %s' origin/main

# Verify the chosen instance worktrees are still clean.
git -C /Users/jxc755/projects/worktrees/statistical-genomics-foundry/branch/converge-content-model status --short --branch
git -C /Users/jxc755/projects/worktrees/topological-data-analysis-bioinformatics-foundry/branch/topo_meta status --short --branch

# Once dependencies are synced, the exemplar's checks live in site/.
pnpm install --frozen-lockfile
pnpm run validate
pnpm run typecheck
pnpm run build
```

The `pnpm` commands above are examples for the Statistical Genomics `site/` directory, not instructions to mutate it as part of TDA work.
