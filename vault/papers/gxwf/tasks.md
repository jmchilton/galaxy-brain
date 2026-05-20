# Manuscript Polish TODO

Working list of things needed to lift `manuscript.md` from honest first draft to submission-ready. Maintained alongside the draft, not as a planning document for a future paper. Items resolve as the manuscript improves; the list shrinks rather than grows.

## Highest-Leverage Work Still Ahead

These two items came out of the first sub-agent review pass and are the most impactful changes still outstanding. Both involve substantive writing and/or analysis beyond mechanical polish, so they sit at the top of the list rather than buried inside the polish sections below.

### Axis 1 — Add a central worked example threading depth claims through the paper

The depth-of-validation claim is currently asserted abstractly three times (BWA-MEM scoring matrix hypothetical in Abstract, Introduction, and Validation Across Workflow Systems) but never demonstrated. The Format 2 example shows encoding differences, not validation depth — it's a clean workflow being shown clean.

Introduce a single named workflow with a sequence of plausible authoring mistakes — a misspelled `output_sort`, a stale `__current_case__` carrying a parameter removed in a newer tool version, a `list:paired` collection wired to a tool expecting `paired` without a flattening operation, an illegal select on a `reference_source_selector`. For each mistake, show the gxwf diagnostic (path, category, legal alternatives), and contrast briefly with what the comparable Nextflow / Snakemake / WDL toolchain would or would not catch on the equivalent error.

This becomes "Listing 1" referenced from Introduction → Schema-Aware Validation → VS Code subsection → Validation Across Workflow Systems. The same listing also fixes a subtler problem: the three validation layers (per-step, per-connection, conditional/stale) are currently described at uneven concreteness levels. One example carrying all three layers solves all three.

- [ ] Pick a representative workflow from the IWC corpus to anchor the example (RNA-seq or variant calling are the obvious candidates — short enough to fit in a listing, structured enough to surface each error category).
- [ ] Construct the four-mistakes-and-diagnostics sequence; capture actual `gxwf validate` output for each.
- [ ] Add the Listing to the manuscript and rewrite the surrounding prose in three sections to thread through it.
- [ ] Estimated effort: ~2 days of writing, plus screenshot/output capture overlap with figure work.

### Axis 4 — Corpus section needs a finding, not just counts

Filling the `[NUMBER]` placeholders gives the corpus section quantity but not significance. A reviewer will read "X validate cleanly, Y surface auto-cleanable diagnostics, Z require human attention" and ask: so what? Which categories of error are most common? Are there real bugs in IWC workflows that the validator found? Was any of the stale-state propagating wrong scientific results, or was it all cosmetic?

The target-ladder in `index.md` already calls this out: "Strengthened materially if a PhD contributor lands one biological re-validation vignette." The corpus section should cash that in or, failing a full biological vignette, at least land one categorical finding: a histogram of diagnostic categories surfaced across the corpus with the modal category named and exemplified; or a before/after snapshot showing how many warnings the validator surfaced N months ago that have since been fixed by maintainers; or a single named tool whose version bump introduced a parameter rename the validator flagged across K workflows.

This is the upgrade from Methods to Resource framing at GR. The analysis is real work — a day of running the validator over IWC snapshots and categorizing the output — and likely needs a co-author or PhD contributor to execute. Distinct from the `[NUMBER]` items below, which track counts; this item tracks the categorical analysis that turns counts into a finding.

- [ ] Run validator across IWC corpus snapshots and categorize diagnostics by error class.
- [ ] Identify the modal diagnostic class and at least one named exemplar workflow + tool.
- [ ] If possible, find one historical case where the validator's diagnostic later turned out to correspond to a real scientific problem (corrected output, retraction, errata in the original workflow's downstream paper).
- [ ] Write the finding as a new subsection in Corpus Validation; reference from Discussion.
- [ ] Estimated effort: ~1.5 days writing + analysis time gated on contributor availability.

## Numbers to Fill In

Every `[NUMBER]` in the draft is an empirical claim the manuscript cannot make without measurement. Land these before any external review.

- [ ] IWC corpus size at submission time.
- [ ] IWC corpus: workflows validating cleanly under `--strict`.
- [ ] IWC corpus: workflows surfacing auto-cleanable stale-state diagnostics.
- [ ] IWC corpus: workflows surfacing diagnostics requiring human attention.
- [ ] IWC corpus: workflows round-tripping cleanly (identical bytes).
- [ ] IWC corpus: workflows round-tripping with benign diffs (UUID, key reorder).
- [ ] IWC corpus: workflows round-tripping with state-altering diffs (bugs).
- [ ] CLI subcommand count across gxwf / galaxy-tool-cache / galaxy-tool-proxy / gxwf-web.
- [ ] `@galaxy-tool-util/*` package count in the monorepo at submission time.
- [ ] Warm-cache validation latency on a representative workflow (median + tail).
- [ ] Cache population size/time for a representative IWC subset.

## Concrete Examples and Figures

- [ ] Replace BWA-MEM Format 2 / native YAML snippets with versions taken verbatim from a published IWC workflow (less risk of subtle representation drift than handwritten examples). Should align with the Listing 1 workflow chosen for Axis 1.
- [ ] Produce Figure 1 (stack diagram): TikZ or Mermaid source committed to the repo.
- [ ] Produce Figure 2 (validation depth layers): same.
- [ ] Capture Figure 3 (VS Code screenshot): real diagnostic, real completion, real hover; pick a tool with clean documentation; align with Listing 1 errors.
- [ ] Produce Figure 4 (IWC corpus results): from the same data that produces the numbers above and the Axis 4 finding.

## Citations

The manuscript now carries inline citations (added in the second pass) and `references.md` carries the BibTeX records. The work remaining:

- [ ] Verify Bray 2023 author byline against the journal record (BibTeX byline drawn from search results, not the printed paper).
- [ ] Verify Hiltemann 2023 author list against the journal record (`et al.` placeholder in current entry — full byline before submission).
- [ ] **BioAgents 2025** — resolve author byline, exact venue, DOI; or remove citation from Discussion if unverifiable.
- [ ] **Xin 2024 (BIA)** — check whether a peer-reviewed form has appeared since the preprint; cite the published version if it has.
- [ ] Consider adding **Goecks 2010** (foundational Galaxy paper) — currently in references.md as optional companion; decide whether to include alongside Galaxy Community 2024.
- [ ] Consider adding **Köster 2012** (original Snakemake) — currently optional companion; some reviewers prefer original + update.
- [ ] Consider adding **Ewels 2020** (nf-core framework paper) — relevant if Validation Across Workflow Systems prose around nf-core's module collection grows.
- [ ] Replace any remaining placeholder URLs in Availability and Methods sections with the production URLs at submission time.

## Manuscript Hygiene Sweeps

- [ ] Format 2 spelling sweep: confirm zero instances of `Format2` (no space) in the draft or in section headings.
- [ ] gxwf/gxformat2/@galaxy-tool-util sweep: every introduction should match the canonical usage in `glossary.md`; confirm `gxwf` is consistently used as the umbrella term and as the CLI binary name without further ambiguity.
- [ ] `gxwf-ui` vs "browser editor" — current draft uses both. Settle on `gxwf-ui` as the package name with "browser editor" as descriptive paraphrase.
- [ ] Pronoun and voice pass: present tense, active voice for descriptive sections; "we" for design decisions; remove residual marketing-document tendencies inherited from the source executive summary.
- [ ] Author list, affiliations, ORCIDs, corresponding-author designation.
- [ ] Acknowledgements: Galaxy team, IWC contributors, ToolShed maintainers, anyone whose code or schemas are load-bearing.
- [ ] Funding statement.
- [ ] Data availability statement: IWC corpus URL, validation reports, scripts to reproduce the numbers above and the Axis 4 finding.
- [ ] Competing-interests statement.
- [ ] License confirmation for repository URLs in Availability section.

## Scope and Framing Decisions Still Open

Items here are decisions deferred during drafting, not unknowns. Resolve and propagate to the manuscript.

- [ ] **Foundry mention in Discussion.** Current draft refers to "separate work" on agent-authoring layers without naming Foundry. Decide whether to name it (one sentence in the agent-consumer paragraph) or leave the pointer anonymous. Naming improves discoverability for readers who already know the project; leaving anonymous keeps scope tight.
- [ ] **Naming consolidation in Implementation.** Draft alternates between "gxwf" (umbrella), "the CLI", "the validator", and "the validation core" depending on context. Pick a primary referent per paragraph and stick to it.
- [ ] **CI surface as a contribution.** The Authoring Surfaces section introduces IWC CI integration as a fourth authoring surface, but it is operationally lighter than the other three. The Consumers section now treats it more substantively. Decide whether the Authoring Surfaces subsection stays or folds into Corpus Validation.

## Honest Risks in the Current Draft

Concerns to raise with co-authors and reviewers; not procedural TODOs.

- [ ] The "10,000+ ToolShed tools" claim is a community footprint, not a validation footprint. Most workflows touch a small fraction of those tools. A reviewer may ask what fraction of the registry the IWC corpus actually exercises. Be prepared to answer.
- [ ] The agent-authoring discussion now has citations but they are thin (one peer-reviewed, one preprint, both fast-moving). Reviewers from the agent-skeptical camp may still find the consumer paragraph speculative; reviewers from the agent-enthusiast camp may want more. The consumer reorganization helps but does not eliminate this tension.
- [ ] The conversion section claims "loss-aware" without exhaustively defining what "benign" means at the byte level. A short subsection or supplementary section may be needed.
- [ ] The architectural-prerequisite framing in Validation Across Workflow Systems is stronger than the prior version but presents Galaxy's centralized registry as a structural advantage; a Nextflow advocate may still push back that the absence of a registry is a deliberate design choice, not a missing feature. Keep an eye on this in revision.

## Fallback Trim Plan (if retreating from Genome Research)

If the venue ladder retreats to Bioinformatics Original Paper (~5000 words), the trim ops are:

- [ ] Collapse Authoring Surfaces section: keep VS Code as primary, demote `gxwf-ui` to one paragraph at the end, drop the CI subsection (fold the CI material into Corpus Validation and the Consumers paragraph).
- [ ] Tighten Implementation: remove per-package detail, condense to a single architecture paragraph.
- [ ] Shorten Discussion: drop the low-install-cost consumer class (fold into IDE consumer), retain IDE / CI / agent consumers and the limits subsection.
- [ ] Drop the architectural-prerequisites paragraph; collapse to a single sentence inside the table footnote.
- [ ] Drop the LSP citation and Monaco citation; assume reviewer familiarity.

If retreating further to Application Note (~2000 words), the trim ops are:

- [ ] Cut Table 1 entirely; one paragraph of comparative framing.
- [ ] One authoring surface (VS Code) only.
- [ ] One validation depth example (per-step state) only.
- [ ] One paragraph of IWC results.
- [ ] No Methods section beyond a brief packaging paragraph.
- [ ] No Consumers reorganization in Discussion — single agent-focused paragraph only.

Maintained as a parallel checklist so the trim is mechanical, not creative, if the timeline forces it.
