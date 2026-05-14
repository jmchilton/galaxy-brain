# Foundry Hardening Follow-Ups

Candidate work to strengthen the Foundry's docs, motivation, and external credibility. Drawn from gaps surfaced while writing `FOUNDRY_WHITE_PAPER.md` and the three background docs (`KNOWLEDGE_BASES_IN_AI.md`, `SKILLS_IN_AI.md`, `BRIDGING_KB_AND_SKILLS.md`).

Grouped by intent. Each item names the gap, the fix, and an estimate of effort.

## Positioning and Motivation

- **Name the pattern.** The white paper calls it "casting" internally, but externally the Foundry's pattern is "KB → compile → skill with provenance." Pick a one-line public framing and use it consistently across README, docs, and any external posts. Today the README says "Knowledge base + casting pipeline"; that's good but never reused. *Effort: low.*

- **Lead with the failure mode, not the solution.** README and `GUIDING_PRINCIPLES.md` both open from the project's side. A reader who doesn't already know Galaxy workflow conversion needs the "monolithic skills rot for these specific reasons" frame first. Borrow §1 of the white paper. *Effort: low.*

- **Add a one-page "why now" doc.** The white paper is long. A 1–2 page elevator pitch sized for a PR description or grant intro is missing. *Effort: low.*

- **Compare-and-contrast section.** The white paper has §11 comparing Foundry to "just a wiki," "just skills," "auto-gen docs," "monolithic conversion skills." The repo docs do not. A standalone `docs/COMPARISONS.md` would help readers who arrive via "how is this different from MCP / Custom GPTs / llms.txt." *Effort: medium.*

- **Connect to the broader field.** The Foundry never cites external prior art. Add a `docs/PRIOR_ART.md` or appendix that situates the project against Corpus2Skill, MCP resources, OpenAPI-to-skill, Voyager, llms.txt — even one paragraph per. Credibility multiplier. *Effort: medium.*

## Doc Structure and Discoverability

- **Add a docs index / reading order.** `AGENTS.md` has a reading order for agents. There's no equivalent landing for humans. A short `docs/README.md` mapping which doc to read for which question. *Effort: low.*

- **Glossary surfacing.** `content/glossary.md` is canonical but only loaded by agents. A static-site glossary page with anchor links plus inbound links from every doc would make the vocabulary scrutable to outsiders. Check whether the site already exposes it; if not, surface. *Effort: low.*

- **Architecture doc length.** `ARCHITECTURE.md` is 559 lines and mixes layout, validation pipeline, and design rationale. Split into `ARCHITECTURE.md` (structural authority — what files exist, what they mean) and `DESIGN_RATIONALE.md` (why the choices). Lowers onboarding cost. *Effort: medium.*

- **Diagram inventory.** Zero diagrams in `docs/`. The pipeline → Mold → reference → cast flow, the artifact-graph contract, the validation layers, and the casting per-kind dispatch all have natural diagrams. Even Mermaid in-markdown would help. *Effort: medium.*

- **Subway-map rendering.** `HARNESS_PIPELINES.md` describes pipelines as subway maps and the site is meant to render them that way — verify that's actually rendered. If not, ship one canonical pipeline as a real subway map and link from the white paper. *Effort: medium to high.*

## Evidence and Validation

- **Show a real cast end-to-end.** The docs describe casting in abstract terms. The most credibility-multiplying thing the project could do is publish one fully cast Mold (`SKILL.md` + `references/` tree + `_provenance.json`) in the white paper or a "Day in the Life" doc, with annotations explaining what came from where. *Effort: low if a cast exists; medium otherwise.*

- **Cite the prior-art failures concretely.** The white paper says monolithic skills fail in specific detectable ways (UUIDs, `+galaxyN` revisions, parameter mismatches). Link or quote actual instances from prior `nf-to-galaxy` runs or `find-shed-tool` skill outputs. Concrete failure cases beat enumerated ones. *Effort: medium.*

- **First-Mold case study.** When `summarize-paper`, `implement-galaxy-tool-step`, `validate-galaxy-step`, and `validate-galaxy-workflow` reach a workable state, write `docs/CASE_STUDY_FIRST_PIPELINE.md` showing what a real PAPER → GALAXY run looks like, with cast diffs, validation hits, and provenance excerpts. This becomes the primary external artifact. *Effort: high but high-value.*

- **Failure-mode catalog (selective).** The Foundry deliberately doesn't maintain prose caveats — schemas are the truth. But for external motivation, a *one-time* doc enumerating the failure classes `gxwf` catches deterministically (with examples) demonstrates why schema-driven validation is load-bearing. Frame as "these are the bugs we no longer have to write about." *Effort: medium.*

## Conceptual Hardening

- **Tighten the Mold-vs-pattern boundary.** `MOLDS.md` "Not Molds" section is good but the line between an action Mold and a recipe Pattern can blur (e.g., `compare-against-iwc-exemplar` versus a multi-step pattern). One worked example showing why a candidate landed on one side would help. *Effort: low.*

- **Document the cast-target adapter contract more formally.** `casts/<target>/_target.yml` is referenced but not specified in one place. Cleaning this up makes "add a new cast target" a real public extension point rather than a future-work hand-wave. *Effort: medium.*

- **Provenance schema reference page.** `_provenance.json` schema v2 is described inline in `COMPILATION_PIPELINE.md`. Surface it as its own renderable schema note so external readers can read the contract without hunting. *Effort: low.*

- **Versioning posture rationale.** "No semver, identity is content hash" is unusual and reads as a missing feature to newcomers. Add a short FAQ-style entry justifying the choice and pointing to lockfile-style mitigations. *Effort: low.*

- **Eval philosophy doc.** `MOLD_SPEC.md` has the eval contract but the *why* of eval — property checks over prescriptive solutions, hallucination guardrails, handoff fidelity — is buried. A standalone `docs/EVAL_PHILOSOPHY.md` would generalize the lessons. *Effort: medium.*

## Audience Targeting

- **A "for Galaxy maintainers" doc.** Why should a Galaxy contributor invest time here? What does this take off their plate? Different framing from "for AI engineers." *Effort: low.*

- **A "for AI/agent engineers" doc.** Why is this interesting outside Galaxy? Generalize the pattern (KB-as-compile-source for high-stakes domain skills). Could borrow heavily from the white paper plus `BRIDGING_KB_AND_SKILLS.md`. *Effort: medium.*

- **A "for IWC contributors" doc.** Explain corpus-first authoring, how Patterns earn pages from corpus uptake, why Foundry doesn't mirror IWC. Pre-empts the "why aren't you just contributing to IWC" question. *Effort: low.*

## External Surface

- **Project tagline on README that survives skim reading.** Current README opens "Knowledge base + casting pipeline for building Galaxy workflows with `gxwf`." Strong, but the next line is "Site: ...". Consider adding the failure-mode hook between them. *Effort: trivial.*

- **A "see also" cluster.** Link out to MCP, Anthropic Agent Skills, Corpus2Skill, llms.txt, Voyager from a single page so readers can place the Foundry in the field's geography. *Effort: low.*

- **Blog-post-shaped writeup.** When ready externally, an "introducing Galaxy Workflow Foundry" post written for the broader AI-engineering audience — not Galaxy-specific. The white paper is too long; a 1500-word version would land. *Effort: medium.*

- **Sample cast as a shareable artifact.** A standalone gist or repo containing one fully cast skill plus its provenance, downloadable, so people can browse the artifact without cloning the Foundry. *Effort: low once a real cast exists.*

## Process and Continuity

- **CI-publish key invariants.** "Molds = union of pipeline phases" is machine-checked. Surface that check's output as a badge or per-Mold widget. Same for cast staleness — a public dashboard showing "N casts up-to-date, M stale" would make the provenance story tangible. *Effort: medium.*

- **Refinement-journal digest.** `refinements/*.md` per Mold is append-only. A periodic rollup (monthly?) of decisions across all Molds would surface the project's evolution and make corpus-first authoring legible from outside. *Effort: medium.*

- **Status page or roadmap.** The README's "Status" section is one paragraph. A real `docs/STATUS.md` or live status page enumerating which Molds, Patterns, CLI pages, and casts exist with last-touched dates would communicate momentum. *Effort: low — could be generated.*

## Quick Wins (low effort, high signal)

1. One-page elevator pitch alongside the white paper.
2. Docs index / reading order in `docs/README.md`.
3. Publish one annotated end-to-end cast as a reference artifact.
4. Add `docs/COMPARISONS.md` cross-referencing MCP, Custom GPTs, Corpus2Skill, llms.txt.
5. Add `docs/PRIOR_ART.md` — even one paragraph per related project.
6. Surface `_provenance.json` schema as a renderable schema note.
7. README tagline tweak adding the failure-mode hook.
