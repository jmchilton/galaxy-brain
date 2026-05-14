# IDEA_GTN_BACKGROUND.md

## Pitch framing

The Galaxy Workflow Foundry establishes a reusable architectural pattern — **Pattern 1: KB → Compile → Skill** — in which a schema-bound, version-controlled, community-curated knowledge base is compiled at build time into target-portable agent skills with full provenance back to source. To prove the pattern generalizes beyond workflow conversion, we propose a second instantiation in a structurally different domain: compiling **Galaxy Training Network (GTN) tutorials** into learner-facing tutoring skills. GTN brings 525+ peer-reviewed tutorials with a strict YAML frontmatter contract, a 527-contributor community, ELIXIR alignment, and active i18n work — all of which make it the ideal second-domain proof that compile-time KB→skill is a discipline-wide capability, not a single-purpose trick.

## 1. GTN current state

The Galaxy Training Network is hosted at `training.galaxyproject.org` and developed in the open at `github.com/galaxyproject/training-material` (1.1k forks, 36k+ commits, CC-BY 4.0 content, MIT code). As of mid-2026 the site reports **525 tutorials across 35 topics, 527 contributors, ~11 years** of project history. Coverage spans the full Galaxy methodology surface — assembly, epigenetics, metabolomics, proteomics, sequence analysis, single-cell, transcriptomics, variant analysis, imaging, machine learning, climate, computational chemistry, ecology, digital humanities — plus 55 admin and 39 developer tutorials.

Two anchor papers: Batut et al., *Cell Systems* 6(6):752–758 (2018), "Community-Driven Data Analysis Training for Biology"; and Hiltemann, Rasche, et al., *PLOS Computational Biology* 19(1):e1010752 (2023), "Galaxy Training: A Powerful Framework for Teaching!" A 2023 *CoRDI* paper documents FAIR-aligned scaling and TIaaS (Training Infrastructure as a Service), which served 17,000+ students across 330+ events between 2018 and 2022.

**Frontmatter schema** (per the GTN's own "GTN Metadata" tutorial and the in-repo `bin/schema-*.yaml` files):
- Required: `layout: tutorial_hands_on`, `title`, `contributions` (typed dict: authorship/editing/testing/infrastructure/translation/funding/data/reviewing/ux), `time_estimation` (regex-validated `H/M/S`).
- Educational metadata: `questions`, `objectives` (SMART, Bloom-aligned), `key_points`, `requirements` (internal/external), `follow_up_training`.
- Discovery/governance: `level` (Introductory/Intermediate/Advanced), `tags`, `edam_ontology`, `zenodo_link` (input data), `draft`.
- **i18n-native**: `lang` (e.g. `en`, `es`, `fr`) and a `translations` list pointing at manually-translated sibling files.

**i18n status (2026)**: The EU-funded **BioNT consortium** (Digital Europe grant 101100604, 2023–2026) has produced human-quality translations of key GTN tutorials and the full FAQ set into **German, Spanish, and Italian**, with the Freiburg Galaxy Team as lead partner. The schema already supports translation linkage — the bottleneck is content volume, not infrastructure.

## 2. Existing GTN tooling

The repo ships a substantial validation and build apparatus that compile-time skill generation can ride on:

- **Schema validators** in `bin/`: `schema-tutorials.yaml`, `schema-slides.yaml`, `schema-topics.yaml`, `schema-quizzes.yaml`, `schema-faqs.yaml`, `schema-events.yaml`, `schema-contributors.yaml`, `schema-news.yaml` — each enforced by `bin/validate-frontmatter.rb`, `bin/validate-contributors.rb`, `bin/validate-other.rb`.
- **Linting**: `bin/lint.rb`, `bin/lint-test.rb`, `bin/lint-deploy.rb`, `bin/lint-diffs.py`, `bin/check-indent.rb`, `bin/check-valid-notebook.rb`.
- **Workflow integration**: `bin/workflow-test.rb`, `bin/workflows-fetch.rb` — every tutorial can link a tested Galaxy workflow.
- **Build**: Jekyll site with `_plugins/`, `_layouts/`, `_includes/`; `bin/knit.py` and `bin/knit-automated.sh` for content compilation; per-tutorial PDF, slide, and TTS-video generation.
- **Bot automation**: contributor-records bots, shortlink updaters, cache management, automated PR feedback (`prepare_feedback.rb`).
- **Tool-form integration**: every Galaxy tool surface in the Galaxy UI links to tutorials that exercise it (announced June 2024).
- **Galaxy Labs Engine**: separates GTN content from per-server presentation, deployed across four major Galaxy servers — already proves the "compile once, target many" model at the *human-UI* layer.

**Already structured**: frontmatter, hands-on boxes (numbered steps + nested Tip/Solution/Comment/Question), interactive tours (YAML in `config/plugins/tours/`, step selector + content), workflows (JSON), quizzes, FAQs, slide decks (with speaker notes consumed by TTS).

**Still prose-only**: free-text rationale paragraphs inside hands-on blocks, screenshots, narrative bridges between steps. This is exactly the surface where a compile step adds value — agents need the structured action *and* the surrounding pedagogical context surfaced as structured intent.

## 3. Why GTN is the right second domain

- **Schema-bound, not prose-bound.** Unlike a typical docs site, GTN frontmatter is enforced by CI and ships with explicit YAML schemas per artifact type. The compile target (Skill bundle) already has 80% of its inputs typed.
- **Versioned and reviewed.** Every change goes through GitHub PR review by topic maintainers; CC-BY 4.0 + git history give us a provenance ledger out of the box.
- **Retrieval miss = correctness failure.** When an agent walks a learner through DESeq2 in Galaxy, the *exact* tool ID (`Galaxy / DESeq2 / Differential expression analysis`), the *exact* parameter set, the *exact* input dataset shape, and the *exact* version pin matter. Vanilla RAG over prose produces plausible-sounding paraphrases that silently fail when the learner clicks. Compile-time emission of the structured invocation — pulled from the tutorial's hands-on box and validated against the linked workflow — eliminates that failure mode.
- **Architecturally distinct from workflow conversion.** Workflow Foundry compiles *one-shot tool-spec transforms*; GTN compiles *multi-turn, learner-facing, pedagogically-scaffolded interactions*. Same pattern, different action shape — exactly what's needed to demonstrate generality.
- **RFA-native soft deliverables.** OS4LS Track 2 explicitly funds training, accessibility, i18n, and community-building. GTN-as-skill-source converts those soft deliverables into hard, measurable artifacts (translated skills, accessibility-audited tutoring flows, contributor-onboarding capacity).

## 4. Related work in tutorial→agent / docs→skill compilation

- **llms.txt** (Jeremy Howard, Answer.AI, Sept 2024): a `/llms.txt` markdown index of LLM-friendly content links. Adopted at scale after Mintlify's Nov 2024 rollout (Anthropic, Cloudflare, Vercel). **Narrow precedent**: addresses discovery and context-window fit, but is *inference-time RAG-assist*, not *build-time skill compilation*. No provenance enforcement, no schema contract, no executable action surface.
- **Anthropic Agent Skills** (2025): the canonical bundled-skill format we'd target. Three-level progressive disclosure — metadata (~100 tokens), `SKILL.md` (<5k), bundled `references/` and code loaded on demand. ~1500 tokens of overhead supports 40+ skills. Defines the *output* shape but not the *compiler*; nobody has yet shipped a domain compiler that emits Skills from a versioned curriculum.
- **The Carpentries — Teaching LLM Assistants in Workshops** (Jan/May/Aug 2025 blog series): community is grappling with LLM integration *into* lessons, not lessons *into* LLMs. Lex Nederbragt, Brian Ballsun-Stanton, and others document failure modes — learners using LLMs to short-circuit exercises, instructors needing mental-model scaffolding. Their conclusion: clumsy LLM insertion is harmful; deliberate curriculum is required. This directly motivates a compile-time approach over ad-hoc chat integration.
- **Khanmigo (Khan Academy)**: the strongest functional analog. GPT-4-based tutor *grounded in Khan Academy's structured mastery graph* — student proficiency, prerequisite skills, problem state passed in as structured context. Anthropic-style scaffolding, Socratic prompting, cognitive-engagement measurement. Khanmigo proves that **curriculum-grounded** tutors materially outperform unbounded chat. GTN-as-skill is the open-source, scientific-computing analog: where Khanmigo's KB is K-12 math mastery, GTN's KB is reproducible bioinformatics methodology.
- **Academic gap**: searches surface plenty of "LLM in education" and "AI tutor evaluation" work, but no compile-time, schema-driven curriculum → agent-skill pipeline with provenance. This is open territory.

## 5. Agent-readiness story: what a compiled GTN skill does that vanilla RAG can't

Concrete scenarios — each impossible with prose RAG, native to compiled skills:

**(a) Walk a user through DE on their own Galaxy account.** Compiled skill carries the structured hands-on sequence: tool ID + version + parameter dict + expected input collection type. Agent invokes via Galaxy's Tool Request API against the *learner's* history, not a paraphrased command. Tutorial's linked tested workflow is the ground-truth oracle.

**(b) Adapt to the user's actual dataset.** Frontmatter declares EDAM ontology terms and expected input shape (paired collection, FASTQ, count matrix, etc.). Compile step emits a precondition check; agent can recognize "your dataset is single-end, the tutorial assumes paired-end" and adapt or redirect to the matching tutorial — discoverable because GTN tutorials are cross-linked via `requirements` / `follow_up_training`.

**(c) Detect history divergence.** Each hands-on step has a known post-state (datasets produced, tool invocations recorded). Compiled skill encodes these as checkpoints; agent compares against the learner's actual Galaxy history (now accessible via PR 21932 History Graph API in this vault's research corpus) and surfaces "you skipped FastQC — recommend re-running before proceeding."

**(d) Citation per step.** Every compiled action carries provenance: source tutorial slug, git commit SHA, contributor list, Zenodo DOI for data, EDAM terms, license. Agent surfaces these inline — solving the "where did the AI get this from" problem that's blocking AI adoption in regulated/scientific contexts.

**(e) i18n by construction.** Because `lang` and `translations` are first-class frontmatter, the compiler emits one skill per language from the same source graph. A Spanish-speaking learner gets a Spanish-grounded tutor automatically when BioNT (or future translators) ship the translation — no separate prompt engineering, no model fine-tuning.

## 6. Galaxy Training community fit

GTN governance is mature and well-documented: **topic maintainers** safeguard per-domain content quality; the broader steering function is anchored by the long-tenured lead maintainers — **Bérénice Batut (Freiburg, now Mulhouse), Saskia Hiltemann (Erasmus MC), Anthony Bretaudeau (INRAE), Helena Rasche (Erasmus MC)**, with Hans-Rudolf Hotz, Wendi Bacon, Nicola Soranzo, and others as regular reviewers. The 2023 PLOS CB paper documents 2,500+ PRs reviewed since 2016.

**GTN as an ELIXIR resource**: GTN is listed as an ELIXIR service (`elixir-europe.org/services/galaxy-training-network`), integrated with **TeSS** (the ELIXIR training portal) via BioSchemas markup, and aligned with the **SPLASH** recommendations for training life-cycle management. ELIXIR-UK, ELIXIR-IT, ELIXIR-DE all host Galaxy training instances. A 2025 GTN news item ("Enhancing Scientific Training: The Galaxy Training Network's Role in the ELIXIR Training Life-Cycle") formalizes this position.

**Letter of support content**: a GTN LoS would attest to (i) the schema stability and contributor velocity that make compile-time generation tractable; (ii) community willingness to accept compiler-driven frontmatter extensions (precedent: `contributions` typed dict and `edam_ontology` were both added via ADR-style process); (iii) co-development capacity through the annual **GCC** and the **Galaxy Smörgåsbord** training event; (iv) ELIXIR-aligned dissemination paths.

## 7. Suggested LOI landscape-analysis paragraph (≤200 words)

> Compile-time generation of agent skills from curated knowledge bases is a new architectural pattern with no production precedent in life sciences. The narrowest adjacent work is Jeremy Howard's `llms.txt` (Sept 2024) — an inference-time discovery file now served by Anthropic, Cloudflare, and Vercel — which addresses context-window fit but provides no schema contract, no provenance ledger, and no executable action surface. Anthropic's Agent Skills format (2025) defines the bundle shape via progressive disclosure but ships no domain compiler. Khan Academy's Khanmigo proves that curriculum-grounded tutors materially outperform unbounded chat by passing structured mastery state to GPT-4, but the curriculum is proprietary and the compiler is closed. The Carpentries' 2025 community sessions on LLMs in workshops conclude that clumsy AI insertion harms learners and that *deliberate curriculum-AI integration* is required — yet provide no tooling. No prior work compiles a versioned, schema-bound, peer-reviewed scientific curriculum into provenance-bearing agent skills. The Galaxy Training Network — 525 tutorials, 527 contributors, ELIXIR-aligned, i18n-native — is uniquely positioned as the substrate, and the Workflow Foundry's already-shipped KB→Compile→Skill pattern is the architectural template.

## 8. Risks and weaknesses

- **Community schema buy-in.** GTN schemas evolve by ADR; adding a `agent_skill: …` block or stricter typing on hands-on parameter dicts requires steering-committee assent, not a unilateral PR. Mitigation: write the GTN LoS *into* the schema-extension process — make the maintainers co-authors of the contract.
- **"AI tutor" framing reads as AI/ML model development.** OS4LS Track 2 funds software, not model training. Risk: a reviewer skims and codes this as "build an LLM for biology." Mitigation: emphasize *compiler* and *infrastructure* in the LOI; never describe GTN-skill as "the AI tutor" — describe it as "the build system that produces agent-ready training artifacts; the agent runtime is upstream Anthropic/OpenAI/local."
- **Pedagogical mediation risk.** An agent that *walks* a learner through DESeq2 may short-circuit the cognitive lift the tutorial was designed to produce. Carpentries community blog already flagged this. Mitigation: compile skills with *scaffolding modes* (Socratic / hint-first / answer-on-request), borrowed directly from Khanmigo's help-seeking research; treat the agent as a TA, not a solver.
- **Accessibility regression.** GTN already runs accessibility audits on the Jekyll site. An agent-mediated path bypasses screen-reader-tested HTML. Mitigation: bake WCAG-aware response shaping into the compile target; co-design with ELIXIR accessibility leads.
- **Translation quality drift.** Auto-translated skills could ship before human review. Mitigation: the `translations` frontmatter list is the gate — compiler refuses to emit a localized skill unless the source tutorial has a *manually-translated* sibling. BioNT's human translators stay in the critical path.
- **Provenance churn.** GTN edits tutorials in place; compiled skills pin to commit SHAs. Need a re-compile + re-publication cadence and a "skill is stale" signal. Mitigation: build the CI re-compile into the same GitHub Actions deploy that already publishes the site.

## Open questions for the human

- Pitch GTN compile as own deliverable or as Foundry "Year 2" extension?
- Target Skill output format only (Anthropic), or also MCP server + OpenAI function-calling for portability claim?
- LoS strategy: single multi-author GTN LoS, or separate from Batut/Hiltemann/Rasche + ELIXIR + BioNT?
- Scope i18n: en-only MVP w/ schema hooks, or ship es/de/it skills in Y1 leveraging BioNT?
- Galaxy Labs Engine — extend it to emit skills per-subdomain, or keep skill compilation orthogonal?
- Khanmigo cite OK given proprietary, or stick to academic refs only for landscape para?
- Carpentries — solicit collaborative letter, or just cite their LLM blog series?
- "Agent tutor" terminology — replace w/ "compiled training skill" / "training artifact compiler" throughout LOI to dodge AI-development framing?

## Sources

- training.galaxyproject.org
- github.com/galaxyproject/training-material
- PLOS CB 19(1):e1010752 (Hiltemann/Rasche 2023)
- Cell Systems 6(6):752 (Batut 2018)
- CoRDI 2023 TIaaS paper
- elixir-europe.org/services/galaxy-training-network
- GTN BioNT news (Apr 2026)
- GTN ELIXIR life-cycle news (Jul 2025)
- llmstxt.org / answer.ai/posts/2024-09-03-llmstxt.html
- platform.claude.com/docs Agent Skills
- khanmigo.ai + Wharton Knowledge interview
- carpentries.org/blog 2025 LLM teaching reports
- preprints.org/manuscript/202508.0199 (Galaxy Labs Engine)
