# Research Goals — CSHL Biological Data Science 2026 Poster

Briefing for research agents. Read the whole thing before starting. Self-contained on purpose.

## 1. What we're making

A poster for **Biological Data Science (7th meeting), Cold Spring Harbor Laboratory, Nov 4–7, 2026**.
Session fit: *Tools, Visualization, and Infrastructure*. The audience is genomics-facing: organizers
and keynotes work on assembly, annotation, population genetics and ML. Jeremy Goecks (Galaxy) is a
discussion leader.

The subject is the **Galaxy Workflow Foundry**. It turns Nextflow pipelines, CWL workflows, published
methods sections, and domain-expert conversations into runnable Galaxy workflows. Deterministic tools,
not the model, judge whether a result is correct.

Authors: John Chilton¹, Marius van den Beek¹, Dannon Baker², Danielle Callan³, Anton Nekrutenko¹
(¹Penn State, ²Johns Hopkins, ³Temple). Presenter TBC.

## 2. What the abstract commits us to

### Claims made (need support on the poster)

1. Faithful translation is a knowledge problem, not a syntax problem. Current Galaxy practice
   lives in fast-moving code and schemas, not in model training data.
2. The Foundry is an inspectable knowledge base of current Galaxy practice. It extends Karpathy's
   "LLM wiki" pattern.
3. Translation is broken into dozens of action-sized units called **Molds**. Each declares the
   schemas, exemplars and command contracts it needs. Each compiles into a self-contained agent
   skill with a **provenance record**.
4. **Seven pipelines** compose the skills into routes from Nextflow, CWL, published methods, or an
   expert interview to Galaxy.
5. Correctness is decided by independent programs:
   - **Tool Shed discovery** pins tools to installable revisions.
   - **gxwf** validates structure, parameters and connections against tool schemas.
   - **Planemo** installs the tools and runs source-derived or generated tests.

   Their structured failures feed the next revision.
6. Incompleteness is explicit. Unresolved source behavior is listed as a stated requirement, not
   hidden.
7. A developer can update the knowledge behind a failed conversion and recompile the skill.
8. Early results: working workflows from free-form expert specs, and partial Nextflow translations.
9. The knowledge base and the compiled skills are released openly.

### Promises made (what we said we'd present)

- A conversion of **nf-core/sarek**, a template-conformant variant-calling pipeline.
- A conversion of **NCBI EGAPx**, eukaryotic genome annotation with no template. Confirm the
  `EGAPx` styling against NCBI's docs; the repo is `ncbi/egapx`.
- A workflow built **from a published methods section**.
- A workflow built **from a domain-expert interview/conversation**.
- Pipelines the skills were **never written against**, i.e. selected after the skills were built.
- For each one: **tool coverage and version pinning, gxwf validation, whether Planemo tests run
  green, observed failure modes, and where the translation is incomplete**.

### Known weak spots

- **No benchmark exists yet.** The number we want: *of N upstream pipelines, how many yield a Galaxy
  workflow that `gxwf validate` accepts and `planemo test` runs green.*
- **Retracted claim, do not resurrect.** An nf-core sweep reported "six of eight returned zero
  processes" against an 80% threshold. It came from a debugging log, the oracle was `grep -c
  '^process '`, the "zero processes" was a one-line bug that has since been fixed, and the result is
  stale. If extraction fidelity is reported at all, the oracle has to be `nextflow inspect` or a
  hand-labeled set.
- **CWL is named in the title and body but has no demo target.** Either find one or accept the gap.
- **Sarek and EGAPx status is unknown.** Nobody has reviewed whether results exist.
- **Corpus figures last checked 2026-08-26.** They need re-checking against current `main`: 341 notes,
  47 Molds, 7 pipelines, 54 patterns, 32 CLI manual pages, 14 schemas, 54 cast skills, 36 `eval.md`
  oracles, 32 `scenarios.md`. Looser figures were "38 pinned pipelines (16 nf-core / 10 ad-hoc /
  12 CWL)" and "120 curated Galaxy workflow skeletons". The skeleton corpus is gitignored and the
  "12 CWL" lumps non-pipelines.

## 3. Sources and their rules

| Source | Location | Rules |
| - | - | - |
| Foundry (flagship) | `~/projects/repositories/foundry` | Open. `git fetch` and read `origin/main`, not just the checkout. `content/log.md` is the history. |
| Foundry pattern docs | `~/projects/repositories/foundry-pattern` (`content/pattern/glossary.md`, `guiding-principles.md`, `the-model`) | Open; vocabulary and conceptual framing. |
| foundry-lib | `~/projects/repositories/foundry-lib` | Shared code for foundries; context only. |
| Anton's replication data | `~/projects/repositories/foundry-paper` | **Sensitive. Summarize and point; do not copy results, figures, tables or numbers wholesale into our files.** Anything meant for the poster gets flagged for John's go-ahead. |
| Orbit paper | `~/Documents/private_papers/manuscript_v2.pdf` | **Private, unpublished manuscript.** Read for context and overlap only; don't quote at length. The abstract rules require "new and unpublished material", so overlap matters. |

### What foundry-paper appears to hold (first look, 2026-10-24)

The paper assesses published nf-core analyses and Foundry's Galaxy conversions of them, in two
stages: conversion with test data, then paper replication. As of 2026-10-20 its scoreboard covers
**nf-core/rnaseq** and **nf-core/atacseq**, with source-pinned comparisons and replications of
published results. It also has a literature assessment, a candidate report, agent prompts, and an
open-questions list on release, maintenance and attribution, including an IWC strategy.

**This is a key tension.** Anton's strongest evidence is for rnaseq and atacseq, which the abstract
doesn't name. Sarek and EGAPx, which the abstract does name, may not appear there at all.

## 4. What the poster likely needs (to steer research)

- **Hero:** input (Nextflow / CWL / paper / conversation) → Foundry → Galaxy workflow, plus a
  validation report and a gap list.
- **System panel:** knowledge base → Molds → compiled skills with provenance → seven pipelines.
- **Oracle panel:** Tool Shed → gxwf → Planemo, with failures feeding back.
- **Results panel:** per-target table covering tool coverage, pinning, gxwf, Planemo, and gaps,
  plus any benchmark number.
- **Biology hook:** named, real genomics pipelines (variant calling, annotation, and possibly
  RNA-seq/ATAC-seq if John approves using Anton's work).
- **Get it:** open knowledge base, installable skills, QR codes.

## 5. Ground rules for agents

- Read-only everywhere except `./biodata_poster/`. Don't commit, push, open issues or post anywhere.
- No wholesale copying from foundry-paper or the Orbit manuscript. Summarize, cite, and flag.
- Don't restate retracted claims (section 2) as findings.
- Prefer primary evidence (code, logs, CI output, artifacts) over prose docs that describe intent.
- Date everything. The poster date is Nov 4–7, 2026; today is 2026-10-24.
