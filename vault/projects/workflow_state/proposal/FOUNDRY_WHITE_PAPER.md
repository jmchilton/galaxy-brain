# The Galaxy Workflow Foundry

**A White Paper on Casting Durable, Inspectable Knowledge into Executable Agent Skills**

---

## Abstract

Computational biology has accumulated three decades of workflow systems — bash pipelines, Make, CWL, Nextflow, Snakemake, WDL, Galaxy. Each carries a corpus of working analyses encoded in its own dialect. Translating between them is the routine, unglamorous, error-prone integration tax of the field. Large language models can now read a paper or a Nextflow pipeline and propose an equivalent Galaxy workflow — but the proposals fail in the same boring ways: hallucinated tool IDs, dropped conditional branches, fabricated parameter names, plausible-looking `gxformat2` that the parser rejects on the first line.

The Galaxy Workflow Foundry is a response to that failure mode. It is neither a glossary, nor a documentation site, nor a pile of agent skills — though it looks superficially like all three. It is a deliberate fusion: a curated, citation-grounded, schema-typed **knowledge base** about Galaxy workflow construction, plus a **casting pipeline** that compiles selected slices of that knowledge into target-specific **agent skills**. Knowledge stays inspectable to humans; skills stay executable for agents; the link between them is reproducible and auditable.

This paper motivates the project, names the design pressure behind each major architectural choice, and shows how the pieces — Patterns, Molds, Pipelines, CLI manual pages, Schemas, Casts — connect into a single loop. The wager is simple: **a knowledge base becomes useful when its structure makes it executable, and a skill becomes trustworthy when its source remains inspectable.**

---

## 1. The Problem

### 1.1 Workflow conversion is the integration tax of bioinformatics

The Intergalactic Workflow Commission (IWC) hosts ~120 curated Galaxy workflows covering variant calling, RNA-seq, single-cell, proteomics, metagenomics, and assembly. nf-core hosts ~80 curated Nextflow pipelines. Many cover overlapping biology with different ergonomics, different deployment stories, and different user communities. Every year a non-trivial fraction of Galaxy contributor effort goes into the same shape of work: read a paper or a Nextflow pipeline, identify the steps, find or author the Galaxy tool wrappers, assemble a `gxformat2` workflow, attach test data, validate, debug.

This is straightforward translation work, but it is slow, error-prone, and a poor fit for human attention. Each conversion follows the same skeleton — summarize source, plan interface and data flow, find or build tool wrappers, assemble, validate, test — yet the work is rarely reusable. A maintainer who converts ten Nextflow pipelines does not produce a reusable skill on the eleventh; they produce a graveyard of in-flight branches and stale comments.

### 1.2 LLMs help, until they don't

Large language models are excellent at the interpretive part: reading prose, identifying tools mentioned in methods sections, mapping Nextflow processes to algorithmic intent, proposing a plausible Galaxy interface. They are also confident in the worst possible places. A model that has seen ten thousand Galaxy workflows in pretraining will cheerfully:

- Invent a Tool Shed owner that does not exist.
- Drop the `+galaxyN` revision suffix from a tool ID.
- Conflate `input_connections` parameter names across versions of the same tool.
- Hallucinate a conditional branch that the source pipeline doesn't have, or omit one it does.
- Generate `tool_state` blobs that look syntactically reasonable but reference parameters the conditional selector never exposes.

Every one of these failures is **detectable** by a schema or a CLI. The Galaxy `gxwf` static validator catches each of them deterministically. The problem is not detection; it is that hand-authored "convert a workflow" skills tend to enumerate failure modes as prose caveats — "remember to check the tool revision suffix; remember to validate UUIDs" — and prose caveats neither compose nor scale. The skill grows, the prose grows, the failures change shape, and the skill silently rots until the next regression slips through.

### 1.3 Monolithic skills are the wrong shape

The natural first response is to write a "convert a Nextflow pipeline to Galaxy" skill: one big prompt with embedded patterns, examples, and warnings. This works for one or two pipelines and then collapses. Symptoms:

- **Context flooding.** Every conversion run drags the full knowledge of collections, conditionals, tabular manipulation, tool wrapping, test fixtures, and validation into the prompt window, whether or not the workflow under conversion uses any of it.
- **Brittle composition.** "Convert paper to Galaxy" and "convert Nextflow to Galaxy" share most of their structure, but a monolithic skill cannot reuse the shared phases.
- **No inspectable source.** The skill *is* its own source — there is nothing upstream to point to when a Galaxy maintainer asks "where did that recommendation come from?"
- **Compressed evidence.** Working examples and IWC citations get summarized away into prose, and the prose drifts from the corpus.
- **One-runtime captivity.** A skill written for Claude does not run on another orchestration system without a rewrite.

Each of these is a different facet of the same underlying mistake: treating the skill as the unit of authorship. The Foundry is built around the opposite premise — the skill is a **compilation target**, not an authoring surface. Authoring happens against a richer source of truth; skills fall out by casting.

---

## 2. Core Insight: Knowledge Bases and Skills, Together

Two communities have built half of what is needed:

- **Knowledge base communities** (wikis, documentation sites, Obsidian vaults) preserve rich context: cross-links, citations, evidence, design rationale. They are excellent for humans browsing depth-first; they are poor at driving deterministic agent action.
- **Skill / agent-tool communities** (Claude skills, MCP tools, LangChain chains) preserve execution: a procedure plus the references it needs to run. They are excellent at action; they tend to compress away the evidence and design rationale that makes the action maintainable.

The Foundry's central claim is that **neither half is enough on its own, and the two should be linked by a compilation step rather than written independently**.

Concretely:

- A **Pattern** ("how do you build a named collection in Galaxy from per-sample tabular outputs?") is knowledge — it cites real IWC workflows, explains the move, footnotes legacy alternatives, and survives across many actions.
- A **Mold** ("implement a single concrete `gxformat2` tool step from an abstract step description and a tool summary") is an action — atomic at the harness step tier, with a procedure body and a typed manifest of which Patterns, CLI pages, schemas, prompts, and examples it depends on.
- A **Cast** is the compiled output — a `SKILL.md` plus a `references/` tree, frozen, isolated, target-specific, and traceable via `_provenance.json` back to the exact Mold revision, references, prompt version, and model that produced it.

The same knowledge surface — the Pattern page — is browsable on a static site for humans **and** packaged into casts for agents. The two views never drift, because they share a source. A maintainer who improves a Pattern improves every cast that references it on the next rebuild.

This is the keystone idea: the knowledge base is not a stale rendering of skill content, and the skill is not a runtime snapshot detached from documentation. They are two views of the same artifact, linked by a deterministic compiler.

---

## 3. Architecture

The Foundry's structure follows the data: organize the content well — typed frontmatter, registered tags, wiki-linked references, generated indexes — and validation, casting, and rendering fall out naturally. The full layout is documented in `docs/ARCHITECTURE.md`; this section motivates the shape.

### 3.1 Six content types

The Foundry's content model under `content/` is small and stratified:

| Type | Role | Audience |
|---|---|---|
| `pattern` | Galaxy construction idiom, citing IWC exemplars | Humans (browse) + Molds (reference) |
| `source-pattern` | Source→target mapping idiom (Nextflow→Galaxy, etc.) | Humans + template-generation Molds |
| `cli-command` | One CLI subcommand reference (gxwf, planemo) | Humans + action Molds |
| `schema` | Renderable note over a JSON Schema (owned by a TS package) | Humans + casts (verbatim copy) |
| `mold` | An atomic action — manifest + procedure | The casting compiler |
| `pipeline` | Ordered sequence of Molds composing into a harness journey | Humans (subway map) + harness orchestration |
| `prompt` | Wrapper note over a reusable prompt sidecar | Casts |
| `research` | Background syntheses (component, design-problem, design-spec) | Humans + on-demand Mold references |

Each type has a directory under `content/`, a row in `meta_schema.yml`, a controlled tag in `meta_tags.yml`, and a conditional required-fields block enforced by the validator. The schema is strict — `additionalProperties: false` — so frontmatter cannot grow ad-hoc fields without a deliberate schema extension.

### 3.2 Pipelines are the journey surface

The five named conversion paths — `paper-to-galaxy`, `nextflow-to-galaxy`, `cwl-to-galaxy`, `paper-to-cwl`, `nextflow-to-cwl` — live as `pipeline` notes whose `phases` field is an ordered list of Mold references, `[loop]` markers, and `[branch]` routing steps. Pipelines do two jobs at once:

1. **Build artifact.** They name the Molds a harness will orchestrate. The validator enforces "Molds = union of pipeline phases": every Mold is part of at least one pipeline, every phase resolves to a real Mold.
2. **Navigation surface.** Rendered as subway maps over the knowledge base. A contributor or agent landing cold should first see the journeys ("convert a Nextflow workflow to Galaxy"), then drill into Molds, then into Patterns and CLI pages as the reference layer beneath.

Pipelines are the primary IA. Type-based indexes (Molds, Patterns, CLI commands) are the secondary reference surface. The dashboard reflects this: pipelines lead, type sections follow.

### 3.3 Molds are typed reference manifests, not free-form prose

A Mold is the unit the compiler operates on. Its `index.md` carries:

- **Frontmatter contract:** axis (source-specific / target-specific / tool-specific / generic), `source` / `target` / `tool` as required, IO contracts on `input_artifacts[]` / `output_artifacts[]`, a typed `references:` manifest, and a `summary` clipped to 20–160 characters.
- **A procedural body.** Author-time procedure for the action, rendered into the cast skill verbatim. The body is for the runtime agent. Author-facing meta-content (changelog, open questions, casting hints) lives in sibling files (`changes.md`, `refinement.md`, `casting.md`) and is never packaged.

The `references:` manifest is the load-bearing innovation. Each entry declares:

- **`kind`** — `pattern`, `cli-command`, `schema`, `prompt`, `example`, `research`. This selects the casting transformation.
- **`ref`** — usually a `[[wiki-link]]` to the source note.
- **`used_at`** — `cast`, `runtime`, or `both`. Some references shape the cast (e.g., a prompt template); others ship into the cast for the agent's runtime use.
- **`load`** — `upfront` or `on-demand`. Upfront references shape the skill body; on-demand references sit in `references/` and the skill body explains *when* to consult them.
- **`mode`** — `verbatim`, `condense`, or `sidecar`. Determines whether casting copies the source byte-for-byte or condenses it through an LLM step.
- **`evidence`** — `hypothesis`, `corpus-observed`, or `cast-validated`. A confidence axis the validator can audit.
- **`trigger`** — required when `load: on-demand`. The skill body uses this to decide when to open the reference.
- **`verification`** — required when `evidence: hypothesis`. A maintainer-visible reminder that the reference's value is not yet validated.

This is the manifest's whole job: tell the compiler *which* knowledge to pull, *how* to transform it, *when* the runtime agent should reach for it, and *how confident* the maintainer is about each piece. The validator resolves every entry by kind; the caster dispatches per kind. The same metadata that powers static validation drives runtime behavior — there is no second authoring surface.

### 3.4 Sibling files: separate decay rates

A Mold directory contains more than `index.md`. The sibling files are deliberately separated because they age differently and serve different audiences:

- `index.md` — runtime instruction.
- `eval.md` — maintainer-facing assertions. Each case is runnable: a fixture plus something that could fail. If you cannot sketch what failure looks like, it isn't eval.
- `usage.md` — illustration without assertion. "Here is what running this Mold tends to look like."
- `refinement.md` + `refinements/<date>-<slug>.md` — open design questions and an append-only journal of refinement runs.
- `casting.md` — guidance read by the caster (skill assembly notes, condensation prompts).
- `cast-skill-verification.md` — dynamic-review checklist for a generated skill.
- `changes.md` — author-facing revision history.

The cast packager reads only `index.md` plus declared references. Everything else is for maintainers. This is the body discipline: keep author meta-content out of `index.md` so it does not leak into runtime artifacts.

### 3.5 Casts are isolated, frozen, target-specific

Casting produces `casts/<target>/<name>/`, committed to the repo, generated by `foundry-build cast`, skipped by the validator, and verified by `cast-skill-verify.ts`. For the Claude target:

```
casts/claude/<mold-name>/
├── SKILL.md                # deterministic render of Mold body + artifacts + refs
├── references/
│   ├── schemas/<slug>.schema.json
│   ├── cli/<slug>.json     # deterministic sidecar
│   ├── patterns/<slug>.md  # verbatim or condensed
│   ├── notes/<slug>.md     # research notes
│   ├── prompts/<slug>.md
│   └── examples/
└── _provenance.json        # schema v2, hash-stable diff target
```

The cast carries no links back to the Foundry. An agent loading it sees a self-contained skill. The provenance file records the Mold revision, content hash, commit SHA, model name, prompt identity, every resolved reference with `src_hash` and `dst_hash`, and the cast history. Drift detection compares hashes; re-casting an unchanged Mold with unchanged deterministic references produces byte-stable output (modulo cast history and timestamps).

The Claude target is the first cast target. Web (`skill.json`-shaped) and generic (single-markdown) targets are designed but unbuilt; portability is structural, not retrofitted.

---

## 4. Why Decomposition Works

### 4.1 Atomicity at the harness-step tier

The Mold inventory is derived as the union of phases across the named pipelines. A phase is atomic relative to the harness — it is one step a harness orchestrates, with a discrete artifact handoff to the next step. "Atomic" does not mean "small": `summarize-nextflow` reads an entire pipeline source tree and emits a structured schema-validated summary; `implement-galaxy-tool-step` runs once per workflow step. Both are atomic at the harness tier.

This sizing decision is load-bearing. Going smaller (per-tool-call Molds) would explode the catalog into hundreds of micro-skills with no clear reuse boundary. Going larger (per-pipeline Molds) would re-introduce the monolithic skill problem. The harness-step tier is the sweet spot where the same Mold (`implement-galaxy-tool-step`, `validate-galaxy-step`, `discover-shed-tool`, `run-workflow-test`) shows up across paper-to-Galaxy, Nextflow-to-Galaxy, and CWL-to-Galaxy paths without modification.

### 4.2 Discover-first, author-on-fallthrough

The Galaxy per-step loop is `discover-shed-tool → on-fallthrough → author-galaxy-tool-wrapper`. This is a harness-level branch, not a Mold. The two underlying capabilities are clean Molds:

- `discover-shed-tool` wraps `gxwf tool-search` / `tool-versions` / `tool-revisions`, classifies candidates by owner trust, version proximity, container availability, and `+galaxyN` revision posture, and recommends a pick or falls through.
- `author-galaxy-tool-wrapper` consumes container/environment info from the source summary and authors a new Galaxy user-defined tool YAML when discovery yields nothing acceptable.

Naming `discover-shed-tool` for the **mechanism** (Galaxy Tool Shed) leaves room for siblings — `discover-tool-via-galaxy-api`, `discover-tool-on-github` — if other discovery surfaces get wrapped. The branch shape is structural; new discovery sources are additive.

### 4.3 Schema-driven validation in the inner loop

Every per-step phase is followed by `validate-galaxy-step` (or `validate-cwl`). The validator runs `gxwf validate` on the just-implemented step; on red, the harness loops back to step implementation or wrapper authoring. The terminal `validate-galaxy-workflow` is a separate Mold that runs after assembly.

This shifts the per-step loop from "author and hope" to **author → validate → fix**, with validation running inline after each step. The Foundry does **not** maintain a parallel prose "caveat catalog" of failure modes (`+galaxyN` revisions, UUIDs, parameter mismatches). `gxwf`'s schema is the source of truth; the validation loop is the enforcement mechanism. Prose caveats were what made monolithic skills brittle in the first place.

### 4.4 CLI knowledge is reference content, not a Mold tier

A previous design instinct was to make every CLI subcommand its own Mold ("`gxwf-tool-search` Mold," "`gxwf-validate` Mold"). This is wrong. A CLI subcommand is **reference content** — synopsis, args, flags, examples, exit codes, gotchas — that action Molds wrap. `discover-shed-tool` references `[[gxwf-tool-search]]`, `[[gxwf-tool-versions]]`, `[[gxwf-tool-revisions]]`. The CLI pages are cast to JSON sidecars so the runtime agent can consult them without prose bloat. There is no whole-CLI Mold tier, only action Molds with CLI references.

Wrapping a CLI does not disqualify a Mold. `discover-shed-tool`, `validate-galaxy-step`, `run-workflow-test` all wrap CLIs and are Molds. The criterion is whether there is **procedural content worth casting** — when to run, how to interpret results, when to loop back — not whether the underlying mechanism is a CLI.

---

## 5. Connecting Knowledge Bases to Skills: The Casting Compiler

Casting is the bridge between the inspectable knowledge base and the executable skill. Its design encodes the project's strongest opinions.

### 5.1 Per-kind dispatch, not one-shot inlining

Casting is not "resolve every wiki link and concatenate." Each reference kind has a tailored transformation:

| Kind | Transformation | Output | Rationale |
|---|---|---|---|
| `pattern` | Verbatim copy or LLM-condense per `mode` | `references/patterns/<slug>.md` | Patterns vary in length; condensation is opt-in. |
| `cli-command` | Deterministic JSON sidecar from registered upstream CLI metadata + framing note | `references/cli/<slug>.json` | Structured at source; no need to spend tokens on prose. |
| `schema` | Import named runtime export from owning TS package; serialize verbatim | `references/schemas/<slug>.schema.json` | Schema is authoritative; the cast is a copy at a pinned version. |
| `research` | Verbatim copy or condense per `mode`; `used_at` and `load` shape integration | `references/notes/<slug>.md` | Background notes are progressive-disclosure surfaces. |
| `prompt` | Raw sidecar copied verbatim | `references/prompts/<slug>.md` | Prompts are bytewise contracts. |
| `example` | Verbatim copy | `references/examples/...` | Reserved; caster fails fast until first real consumer. |
| `eval` | **Never packaged** | — | Eval is Foundry-only by design. |

Most paths are deterministic. LLM-driven condensation runs only for kinds where it adds value (patterns, research notes), and runs as a two-phase contract: the deterministic caster writes a `pending_llm: true` placeholder; the LLM phase fills it in; the verifier rejects committed provenance with any unfilled entry.

### 5.2 Casting from structured sources, not rendered prose

When an upstream project ships both a structured source (YAML, JSON Schema, IDL) and a derived human-rendered form (LaTeX-heavy Markdown, generated HTML), **cast from the structured source**. The structured form is denser per token, schema-regular, and preserves identifiers (test pin names, labels) that the renderer typically discards.

Canonical example: Galaxy's collection-semantics spec lives upstream as `collection_semantics.yml` and is rendered to a MyST Markdown page via `semantics.py`. The Foundry vendors both at the same SHA:

- `galaxy-collection-semantics.yml` — canonical for casting and for agent reasoning. Carries `tests:` blocks pinning concrete Galaxy test names.
- `galaxy-collection-semantics.upstream.myst` — vendored only so the site can render the upstream prose for human readers.

Casts that need collection-semantics knowledge resolve the YAML and inline or condense from there. The MyST is a site concern. The pattern generalizes: **when both forms exist, agents read structure, humans read prose.**

### 5.3 Provenance as the audit substrate

Every cast records `_provenance.json` with schema v2: the Mold revision and content hash, the commit SHA at cast time, the model name and version, the prompt identity and hash per LLM-produced reference, every resolved reference with `src_hash` and `dst_hash`, the artifact contracts after producer inheritance, and a cast history.

This is not bookkeeping; it is what makes the Foundry honest. A reviewer can:

- Check whether a cast is up-to-date (`foundry status` enumerates stale entries).
- Reproduce a deterministic cast and compare byte-for-byte.
- Trace why a generated skill contains a specific paragraph — back to which reference, which version, which prompt.
- Diff two casts' provenance to explain why their outputs differ.

The provenance schema is **a versioned contract**, separate from the cast targets. Schema v2 is the current iteration; future fields land deliberately.

### 5.4 Identity is content hash, not semver

There are no semantic versions on Molds and no versions on casts. Identity is name + content hash + commit SHA. Re-casting is the migration path. If a generated skill needs to be frozen — for a marketplace, for a deployment — the consumer pins it by commit SHA.

This decision keeps the iteration loop fast. Change a Mold, re-cast, review the diff. Don't bump versions, don't manage compatibility matrices, don't write changelogs for every cast. The tradeoff is real — there is no automatic "breaking change" signal — but the alternative was an authoring tax that nobody would have paid.

---

## 6. Schema-Driven Trust

### 6.1 Two schema worlds, kept separate

The word "schema" appears in the Foundry in two distinct senses, and conflating them was a recurring early confusion:

- **Frontmatter schema** (`meta_schema.yml`) — the contract for Foundry content notes. JSON Schema Draft 07 in YAML, strict mode, allOf/if/then for type-conditional fields. Enforces "every note has type/tags/status/created/revised/revision/ai_generated/summary; Molds also have name/axis; pipelines also have title/phases; etc."
- **Mold IO schemas** (`content/schemas/<name>.md` plus a `package`/`package_export` pointer to a TS package) — the contracts for what Molds consume and produce. `summary-nextflow`, `galaxy-tool-discovery`, `summary-cwl`, `tests-format`, etc.

The split is deliberate: different audiences, different lifecycles. The frontmatter schema rarely changes; Mold IO schemas evolve with corpus understanding. The validator handles both, but with different code paths.

### 6.2 Schemas live with their producers

The rule is **schema lives with its producer; orphan schemas live in `foundry`.** A schema with a TypeScript producer in this repo lives in the producer's package. `summary-nextflow` lives in `@galaxy-foundry/summarize-nextflow` because that package emits it. Orphans (`summary-cwl`, `galaxy-tool-discovery`, `galaxy-tool-summary`, `tests-format`) live in `@galaxy-foundry/foundry`. Vendored upstream schemas (nf-core meta schemas, parsed-tool from `@galaxy-tool-util/schema`) live in whichever package needs them at runtime.

There is no separate `*-schema` package. All validators funnel through `foundry validate-<name>` subcommands so generated skills validate against a single CLI surface.

### 6.3 The test-format schema as the canonical case

`@galaxy-tool-util/schema` ships `tests.schema.json`, generated from the `galaxy.tool_util_models.Tests` Pydantic models. It carries every assertion's parameters, types, defaults, required fields, the `that` discriminator constant, and the original Python docstring as `description`. An agent equipped with that schema can author syntactically valid `<workflow>-tests.yml` and look up what each assertion does — **no prose vocabulary catalog required**.

The Foundry's casting policy is: pin the schema's source-of-truth upstream, vendor it at a known SHA into `packages/<name>-schema/src/`, and copy it verbatim into casts that need it. The same vendored JSON powers casting output and site schema rendering, so research notes and Mold bodies can deep-link individual `$defs` like `[[tests-format#has_text]]`.

The reference-kind `schema` does not distinguish Foundry-authored from upstream-vendored at cast time. Both are verbatim copies. The distinction matters only for sync flow: upstream schemas update via package bumps; Foundry-authored schemas update via direct edits.

---

## 7. Corpus Grounding: IWC Without a Mirror

### 7.1 No ingestion pipeline

A naive "build a knowledge base about Galaxy" project would start by mirroring IWC into local notes. The Foundry deliberately does not. There is no IWC ingestion pipeline, no exemplar mirror, and no `workflow-fixtures` runtime dependency. The corpus is referenced through:

1. **Patterns cite IWC by URL in the page body.** `## Exemplars` sections list IWC workflows as free-form Markdown links, optionally pinned to commit SHAs when stability matters.
2. **Inline excerpts when they earn it.** A pattern author may paste 10–30 lines of cleaned `gxformat2` directly into a body to illustrate an idiom. Cleaning happens at authoring time; the excerpt is committed verbatim; no build-time regeneration.
3. **`compare-against-iwc-exemplar` operates against live IWC at runtime.** The generated skill loads with instructions to fetch IWC via `WebFetch` or `gxwf` at runtime, not against Foundry-hosted exemplar pages.

The cost of this choice is real: there is no per-workflow inverse view ("which Foundry patterns does this IWC workflow demonstrate"), no auto-detection of structural drift in cited workflows, and no build-time inlining of full workflow content into casts. The benefit is that the Foundry never competes with IWC as the canonical home of its content. Upstream stays authoritative; the Foundry adds synthesis.

### 7.2 The skeleton tier

For research and survey work, the Foundry maintains a generated-corpus workspace at `workflow-fixtures/` (gitignored, materialized on demand via `make fixtures`). Survey work has three tiers:

1. **Grep** over `$IWC_FORMAT2/**/*.gxwf.yml` — cheap, blind to step sequence patterns.
2. **Skeleton scan** over `$IWC_SKELETONS/**/*.gxwf.yml` — cheap structural read; sees topology, control flow, tool sequences. All 120 skeletons fit in agent context (median ~6KB, total ~1MB).
3. **Whole-workflow reading** of selective `$IWC_FORMAT2` files — expensive; reserved for parameter-level evidence on recipes that look promising.

A skeleton is the format2 workflow with non-structural fields stripped: `tool_id`, `label`, `doc`, `in:` / `out:` / `when:`, subworkflow descents, workflow-level metadata. `tool_state` parameter blobs, step UI positions, redundant tool-shed metadata, and post-processing fields are dropped.

The pattern is **skeletons plus selective full reads**, not skeletons replacing full reads. Survey work for workflow-shape topics scans skeletons first and drills into full files only when needed. Skeletons are a research tool, not a casting artifact.

### 7.3 Corpus-first authoring

A working pattern earns its page only when the corpus shows uptake. **No exemplar in IWC, no pattern page.** If a survey turns up an interesting capability with zero corpus uptake, the gap is documented as a one-line note in the survey; no speculative pattern page is written. This is what stops the Foundry from accreting tool documentation that nobody actually reaches for.

The same posture applies to research notes Molds reference at runtime. A reference note starts as a stub — frontmatter, title, primary-source link — and grows paragraph-by-paragraph from observed gaps in cast runs. Each paragraph earns its place by naming a motivating case: a workflow, a log entry where the runtime agent guessed, fell back, or contradicted the schema. Pre-written comprehensive notes are an anti-pattern; they read as plausible, sound authoritative, and quietly propagate the author's prior beliefs into every downstream cast. The runtime agent has no way to tell invented prose from earned prose, so the safer default is to write nothing until contact with the corpus demands it.

---

## 8. Progressive Disclosure

### 8.1 The principle

Agents should see the right knowledge at the right time. The Foundry does not flatten every pattern, CLI page, schema, example, research note, and design rationale into a single prompt body just because the information exists. Progressive disclosure is both an authoring principle and a runtime contract.

- **Pipelines** disclose the journey: which phase comes next, where branches or loops exist.
- **Molds** disclose the action: what this step does and which references it may need.
- **Typed references** disclose the dependency surface: pattern, CLI command, schema, prompt, example, research note.
- **Reference metadata** declares whether material is used at cast time, runtime, or both.
- **`load` policy** distinguishes material needed upfront from material that should stay on-demand.
- **Casting mode** decides whether a reference is copied, condensed, inlined, or turned into a sidecar.

### 8.2 What this buys

A generated skill can start with a compact procedure and a required schema, then consult a deeper research note only when the work crosses into that topic. `summarize-nextflow` needs its output schema upfront, but details about Nextflow testing or container-resolution edge cases load only when those cases appear. The `references/` tree is structured so the runtime agent can locate any artifact deterministically without consuming context for material it does not need.

The goal is not minimalism for its own sake. It is **navigable depth**: humans browse from journey to Mold to reference; agents move from action to supporting evidence without dragging the whole library into every step.

---

## 9. Documentation That Serves Both Humans and Agents

The Foundry's site (Astro static, deployed to GitHub Pages) is not an afterthought. It is the human-facing view of the same content the caster compiles for agents. The same `[[wiki-link]]` resolver runs in the validator, in the site renderer, and in the remark transformer for body links. The same `dashboard_sections.json` drives both `Dashboard.md` (Obsidian Dataview) and the site's landing page.

Key surfaces:

- **Dashboard.** Pipeline-first, then type sections. The first thing a contributor sees is "what journeys exist?"
- **Pipeline pages.** Subway maps over the Mold inventory, with `[loop]`, `[branch]`, and inline phase annotations.
- **Mold pages.** Frontmatter rendered as a metadata `<dl>`, body rendered through the remark plugin, "Incoming References" backlink panel grouped by field, "Appears in pipelines" rollup, Mold health panel surfacing validator state, eval-plan coverage.
- **Pattern pages.** Body citations to IWC URLs, optional inline excerpts, related Molds, evidence tier.
- **Schema pages.** JSON Schema rendered with `$defs` deep-link anchors, so research notes and Mold bodies can target individual assertions or fields.
- **CLI pages.** Synopsis, args, flags, examples, exit codes, gotchas — the same content cast as JSON sidecars.
- **Raw markdown endpoints.** Every note has a `/raw/<slug>.md` URL serving `Content-Type: text/plain`. Trivially agent-consumable. A new orchestration runtime can fetch raw notes without any custom adapter.

Two properties matter:

1. **Backlinks come from typed frontmatter fields, not body link scanning.** Backlinks are bounded, fast, author-controlled. Body wiki-links render inline but do not contribute backlink edges.
2. **`additionalProperties: false` plus controlled tags means the schema can be relied on.** A site widget that wants to show "all Molds with `axis: source-specific` and `source: nextflow` and `target: galaxy`" can compose those filters deterministically.

The bidirectional consistency is the point. A maintainer who improves a Pattern improves the human view, the validator's reference graph, and every cast on the next rebuild — without writing the change three times.

---

## 10. Portable Artifacts Over Platform Fashion

Claude skills are useful. Other orchestration systems are useful. The agentic-coding landscape will keep changing. The Foundry does not bind its core knowledge to one agent runtime, editor, model vendor, or orchestration framework.

- **Molds are durable source artifacts.** They are not written as Claude-specific skills.
- **Cast skills are generated target artifacts.** A new orchestration runtime needs a new target adapter (`casts/<target>/_target.yml`) and a renderer; it does not require a knowledge-base rewrite.
- **Pipelines describe journeys; harnesses execute them.** Harnesses live in their own repos. The Foundry produces artifacts they load.
- **Reference content stays reusable.** A Pattern is the same Pattern whether it ships into a Claude `SKILL.md` or a Web `skill.json` or a generic single-markdown skill.

This separation is what lets the Foundry adapt as orchestration changes. A new target requires a new cast target or harness, not a rewrite of the knowledge base.

---

## 11. Comparisons

### 11.1 Versus "just put it in a wiki"

A wiki preserves context and supports human browsing. It does not produce executable artifacts, does not validate cross-references mechanically, does not record provenance when content is consumed, and does not enforce body-vs-meta separation. A wiki page that grows a runtime instruction section eventually contradicts another section that grew elsewhere, with no compiler to surface the contradiction.

### 11.2 Versus "just write Claude skills"

A bundle of skills executes well and packages clean. It tends to compress away the evidence and design rationale that makes the skill maintainable. The same content appears in multiple skills with subtle drift. Patterns get re-derived per skill. There is no single inspectable source the maintainer can fix once.

### 11.3 Versus generated documentation from code

Auto-generated docs (`--help` dumps, schema-to-Markdown renderers) preserve fidelity at the cost of context. They tell you what a function does, not *when to reach for it* or *why* it should be combined with this other tool. The Foundry's CLI pages and schema notes are hand-framed wrappers around generated metadata — the framing is where the operational judgment lives.

### 11.4 Versus monolithic conversion skills (the prior art)

The hand-authored `nf-to-galaxy` skill and the `find-shed-tool` skill were prior art that motivated the Foundry. Their content feeds CLI manual pages and action Molds; their form does not. Decomposition into Molds, schema-driven validation in the inner loop, casting as the integration boundary, and `gxwf` as the source of truth for `gxformat2` correctness are the specific responses to specific failure modes in those skills.

---

## 12. Status and Roadmap

The Foundry is skeleton plus scaffolding plus an increasing amount of real content. The spine is in place:

- Content types and frontmatter contract enforced by Ajv.
- Cross-file validation: wiki-link resolution, bidirectional related-notes warnings, source-pattern link resolution, pipeline-phase resolution, Mold-reference dispatch, artifact-graph checks, schema-vendoring metadata, CLI command docs coverage, pattern evidence requirements.
- Mold authoring contract (`docs/MOLD_SPEC.md`) and reference vocabulary contract (`reference_contract.yml`).
- Pipeline lifting and the "Molds = union of pipeline phases" invariant.
- Cast scaffolding: per-kind dispatch, `_provenance.json` schema v2, deterministic verifier.
- Astro site with content collections, type-specific body components, raw markdown endpoints, theme tokens, schema deep-linking.
- Vendored upstreams flow (planemo CLI metadata, test-format schema, collection semantics, Galaxy XSD).
- Slash commands for agent-driven authoring (`/draft-mold`, `/draft-pattern`, `/cast`).

Forward work falls into a small number of buckets:

- **Real Mold authoring.** The first four exemplars — `summarize-paper`, `implement-galaxy-tool-step`, `validate-galaxy-step`, `validate-galaxy-workflow` — exercise source summarization, pattern-heavy authoring, CLI-reference action shape, and terminal validation.
- **Pattern and CLI page authoring.** Patterns earn their pages from IWC uptake; CLI pages seed from `--help` and humanize.
- **Casting tooling maturation.** Two-phase deterministic + LLM casting, drift detection on every committed cast, scheduled re-casts on Mold or reference change.
- **Multi-target casting.** Web and generic targets prove portability beyond Claude.
- **Eval execution.** Currently `eval.md` files declare cases; an eval harness that runs them against real casts closes the loop.

The Foundry does not need to be finished to be useful. The first four exemplar Molds plus the corresponding patterns and CLI pages are enough to convert a real pipeline end-to-end. Everything beyond is scaling the same loop.

---

## 13. Conclusion

The Galaxy Workflow Foundry is a bet on a specific shape: that **knowledge bases become useful when their structure makes them executable, and skills become trustworthy when their source remains inspectable**. The bet is structural — types, schemas, typed references, per-kind casting, provenance, deterministic tooling — not stylistic. None of the individual ideas are new. The combination is.

The Foundry connects pieces other projects keep separate:

- **Knowledge bases** preserve context. The Foundry's `content/` is a knowledge base.
- **Skills** drive action. The Foundry's `casts/` are skills.
- **Schemas** anchor trust. `gxwf` validation, `meta_schema.yml`, and the Mold IO schemas keep both knowledge and skills honest.
- **Corpora** ground abstraction. IWC, cited rather than mirrored, keeps the Foundry from becoming a speculative ontology.
- **Compilers** keep the two ends consistent. Casting is the compiler; provenance is the audit substrate; the validator is the type checker.

The work the Foundry takes off Galaxy maintainers' plates is not "writing a skill." It is **the long-term cost of keeping a skill correct as Galaxy, IWC, gxwf, Planemo, and the agent ecosystem all change underneath it**. The skill is the easy part. Keeping it accurate, citation-grounded, and aligned with the corpus over years is what makes hand-authored skills rot. Casting from a structured source — with provenance, schema validation, and corpus-first authoring discipline — is how the Foundry intends to make that durable.

If the central wager holds, the Foundry produces a steady stream of inspectable, reproducible, target-portable skills that move workflow knowledge from human heads into a shared substrate. Maintainers improve a Pattern once and every downstream cast gets better on the next rebuild. Researchers reading the static site see the same evidence the agents consume. New orchestration runtimes get a new cast target, not a new knowledge base. The thing that ages is the corpus — and the Foundry is built to track it.
