# Research Tasks — CSHL Biological Data Science 2026 Poster

Read `RESEARCH_GOALS.md` in this directory first.

Each agent writes its findings to `./biodata_poster/research/<task-slug>.md`. Cite every claim with
a file path plus a commit SHA or page number. Clearly separate **verified**, **inferred** and
**not found**. Don't produce poster copy yet.

### R1. Foundry system inventory (`foundry`, `foundry-pattern`)

- Re-verify the corpus figures on current `origin/main`: notes, Molds, pipelines, patterns, CLI
  pages, schemas, cast skills, `eval.md`, `scenarios.md`, fixture counts by real type.
- Name the seven pipelines: source → target, and the Molds each one composes.
- Pick one Mold and one compiled skill as worked examples. Show the declared schemas, exemplars
  and command contracts, then the provenance record. That's poster-figure material.
- How the validation loop is actually wired: Tool Shed discovery → gxwf → Planemo, and what a
  structured failure looks like and where it goes.
- The "update knowledge, recompile" story (claim 7). Find a real instance in `log.md` or git history.
- How "explicit incompleteness" appears in an output. Find a real gap list.
- The Karpathy LLM-wiki lineage. What does "extends" concretely mean here? Gloss it in a sentence.
- How it's distributed: Claude Code / Codex plugin, install steps, license, public URLs.

### R2. Demonstration-target status (`foundry`, plus `foundry-paper` for overlap)

For **sarek, EGAPx, a methods-section workflow, an expert-interview workflow, and any CWL target**:

- Does an attempt exist? Where: branch, log entry, worktree, artifacts?
- What exists today: tool coverage, pinned revisions, gxwf result, Planemo result, failure modes,
  stated gaps.
- Which pipelines were chosen *after* the skills were built? Note the dates.
- What would it take to get each one poster-ready by about Nov 1? Estimate S/M/L effort.
- Look at `~/projects/worktrees/foundry/branch/*` and remote branches as well as `main`.

### R3. Anton's data, read-only assessment (`foundry-paper`)

- Map what's there per workflow: stage, metrics, evidence, and date.
- Which results are mature enough to show? Which are explicitly provisional?
- How does it relate to the abstract's claims? The rnaseq/atacseq replications could support claims
  5, 6 and 8 and the end-to-end benchmark.
- Which Foundry version or commit produced the conversions?
- The open questions (IWC, release, attribution): which ones bear on what a public poster can say?
- **Output is a summary with pointers only.** List candidate items for the poster as "ask John"
  items. Don't reproduce numbers beyond what's needed to describe them.

### R4. Orbit manuscript (`manuscript_v2.pdf`)

- What is Orbit, and how does it relate to the Foundry? Is it the same system, a sibling or a
  consumer?
- What does it already claim or publish that overlaps the abstract? This is a "new and
  unpublished" risk.
- Are there figures, framings or terminology the poster should stay consistent with?
- Authorship and submission status, if stated.
- Cite page numbers; quote sparingly.

### R5. Benchmark feasibility (synthesizes R1–R3)

- Can we produce a defensible end-to-end number in time: N pipelines → gxwf-valid → Planemo-green?
- Which pipelines, with which held-out status? What compute is needed, and what's already run?
- If there's no time, what's the most honest smaller claim, e.g. per-pipeline case studies with
  explicit gap lists?
- Is extraction fidelity against `nextflow inspect` cheap enough to include?

### R6. Venue and poster logistics (light)

- CSHL poster dimensions and orientation.
- Audience expectations at this meeting: what makes a tools poster land for genomics people.
- QR-code targets: the repo, the docs site, the skill install.
