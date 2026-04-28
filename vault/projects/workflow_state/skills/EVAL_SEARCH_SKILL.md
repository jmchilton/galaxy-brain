# Evaluation review: `find-shed-tool` skill plans

Subagent review of `PLAN_SEARCH_CLI.md` and `STRETCH_TOOLSHED.md` from a
testability/evaluability standpoint, plus concrete proposals for
validating the skill itself (not the underlying CLI's unit tests).

Captured verbatim from a research subagent run; kept here as input to the
skill-design loop.

---

## 1. Plan critique

**`PLAN_SEARCH_CLI.md` is sound and evaluable for the CLI half.** Stages
1–3 have crisp inputs/outputs, JSON envelope locked, exit codes
specified — easy to assert on. A few gaps that matter for *skill* eval
(not CLI eval):

- **Section "find-shed-tool skill skeleton" (`PLAN_SEARCH_CLI.md:190-225`) under-specifies the triage step.** Step 3 says "discard hits whose name/description don't plausibly match" and "prefer iuc/devteam/bgruening (configurable allowlist)". Both are exactly the points an eval has to grade — but the plan doesn't say where the allowlist *lives* (skill prose? CLI flag? hardcoded?). Until that's resolved, you cannot write a fixture-replay eval because the same input could legitimately produce different picks depending on which arm of "configurable" wins. Resolve before evaluating: the unresolved-question on this exact issue is load-bearing.
- **Step 1 ("extract a search term, 1–4 words")** is the highest-leverage and least-specified part of the procedure. The Tool Shed search quirks (`Component - Tool Shed Search and Indexing.md:157` wildcard wrap, case asymmetry) mean term selection dominates outcome quality. Plan should commit to a recipe (e.g. "prefer concrete tool name over capability phrase; lowercase; strip punctuation; if zero hits, retry with shorter term"). Without that, ambiguous queries will produce nondeterministic skill behavior across model versions.
- **No graceful-degradation contract.** When `tool-search` returns exit `2` (zero hits), the plan doesn't say what the skill does — retry with a shorter term? fall back to repo search (Stage 4)? ask the user? Eval needs this nailed down.
- **Stage 7 (`tool-revisions`) and Stage 6 (enrichment)** are positioned as "later" but the skill's own pseudocode (step 7, schema fetch) presupposes the cached parsed tool. Make explicit which stages the v1 skill depends on vs. which it can grow into. Right now Stages 1+2+3 are the claimed MVP but the worked examples (`fastqc-pick.md`, `ambiguous-bwa.md`) will exercise different code paths.
- **Test strategy section (`PLAN_SEARCH_CLI.md:237-246`) covers CLI but not skill.** The single env-gated end-to-end against `fastqc` is for the CLI binary. Skill eval is unaddressed.

**`STRETCH_TOOLSHED.md` is fine as a roadmap** — clear effort/blast-radius
framing. One eval-relevant note: B3 (embedding reranker) and A1 (carry
version on hits) would each *change the skill's expected outputs*. Any
fixture corpus needs versioning so it can be re-baselined when those
land. Worth a one-line note in the stretch doc that fixtures are tied to
a search-backend snapshot version.

## 2. What "the skill works" means — concrete capability claims

An evaluation should verify each of these:

1. **Unambiguous tool name** ("fastqc", "samtools sort", "bwa mem") → picks `iuc/<tool>` (or documented preferred owner) within ≤3 CLI calls.
2. **Capability phrase** ("trim adapters from paired-end fastq") → picks a plausible tool from {trimmomatic, cutadapt, fastp, trim_galore} *and* explains the choice; eval grades "is this in the acceptable set" not "is this exactly X".
3. **Multi-owner collision** (e.g. tool_id `bwa` under devteam and iuc) → does not silently pick one; either applies the documented owner allowlist or surfaces ambiguity to the user.
4. **Zero hits** ("kjsdfgh") → exits cleanly with a "no tool found" message, does not loop endlessly or fabricate a `trsToolId`.
5. **Stale-index surface** (recently published tool not yet indexed) → degrades gracefully; documents the staleness caveat to the user.
6. **Resolved version is sensible** — the picked `(trsToolId, version)` is one TRS actually returns (no hallucinated versions).
7. **Cache landing** — at end of run, `galaxy-tool-cache info <trsId>` returns the picked tool; downstream skills can consume it.
8. **Bounded cost** — skill completes in ≤N CLI shell-outs and ≤M tokens for a typical query (set a budget so regressions are visible).

## 3. Evaluation approaches, ordered by cost/value

**A. Static fixture replay (cheapest, build first).** Record `gxwf
tool-search "<q>" --json` and `gxwf tool-versions <id> --json` outputs
for a fixed corpus of ~30–50 queries against the live shed *once*,
commit as JSON. Add a `--fixture-dir` flag (or `GXWF_FIXTURE_DIR` env)
that the CLI honors instead of HTTP. Eval = "given fixture for query Q,
the skill picks expected `trsToolId` X". Captures pick-logic regressions
without flakiness. **Limit:** doesn't catch "does the skill pick the
right *query* to search for" — the input is the query, not the prose
intent.

**B. Golden intent → pick dataset.** Hand-curate ~30 (user prose,
expected tool family) tuples drawn from: nf-core module names (good "I
want tool X" cases), `tools-iuc` README descriptions (capability
phrasing), workflow-reports examples that name tools, and 5–10
deliberately bad/ambiguous prompts. Source: cheap, you already have
CAPHEINE (15 tools) as a starter set per `SKILLS_NF.md:262`. Score =
exact match for unambiguous, set-membership for capability, "ambiguity
surfaced" boolean for collisions.

**C. Agent-loop eval (medium cost, highest signal).** Run the skill
end-to-end via Claude Code subagent against fixture (A) backend +
intent corpus (B). Subagent runs the skill, transcript captured, grader
(separate model call or human) scores per the rubric in §2. This is what
catches "skill picks wrong query term" because the skill drives the
queries. Cap at ~50 cases initially; runs in ~10–20 min; one
cost-bounded button.

**D. Live shed runs, env-gated.** `EVAL_LIVE=1 npm run eval:skill` —
same intent corpus but hitting `toolshed.g2.bx.psu.edu`. Run nightly or
weekly; flake budget tolerated. Catches search-backend drift, dead
`approved` boost regressions, etc. Don't gate CI on it.

**E. Adversarial battery.** Add to (B): typos ("fastqcc"), generic
terms ("aligner", "qc"), case variants ("FastQC" vs "fastqc" exercising
the case asymmetry per research §6), single-letter queries (wildcard
pathology), tool_id collisions (`bwa`), known-renamed tools. Grade on
graceful degradation, not on picking "the right" answer.

**F. Skill-vs-skill A/B harness.** Once you have (C), running two skill
prompts (or two model versions) against the same fixture is free.
Useful for prompt iteration on `SKILL.md`.

## 4. What to instrument in CLI/skill to make eval cheap

- **Fixture-replay seam** in the CLI: a `--fixture-dir <dir>` flag (or env var) that maps `q → <hash>.json`. The search package already accepts an injected `fetcher` (`PLAN_SEARCH_CLI.md:240-242`) — surface that to the binary. This is the single highest-leverage piece.
- **Deterministic JSON envelope** with `query`, `hits`, and (later) `truncated` — already locked in plan. Good.
- **Structured skill log**: have the skill write a JSONL trace of `{step, command, args, exit, picked}` to a configurable path. Graders read this rather than parsing freeform prose. Cheap and reusable across eval modes (A/C/D).
- **Stable hit ordering**: if the search backend ties on score, secondary-sort by `owner/repo/tool_id` deterministically in the CLI before emitting JSON. Otherwise fixture replays will be flaky on score-ties. (The package's `(owner, repo, toolId)` dedupe per `PLAN_SEARCH_CLI.md:18` is first-source-wins, which is fine for single-source CLI but check that within-source ordering is stable.)
- **Pinned default page size and max results** in fixtures so re-recording is reproducible.
- **Version-stamp fixtures**: include the search-backend git rev / date in the fixture file header, so fixture-replay results carry provenance.

## 5. Concrete recommendations — build first vs. defer

**Build first (in this order):**

1. **Fixture-replay seam in CLI** (one flag, ~half-day). Unlocks A and C.
2. **Static fixture corpus + golden picks** for 20 cases drawn from CAPHEINE + 5 ambiguous + 5 zero-hit. Markdown table of (query, expected pick or expected behavior) committed alongside the skill. Sub-day to author.
3. **Agent-loop harness** — minimal: a script that invokes the skill via Claude Code on each intent, captures transcript+log, runs a grader prompt, prints pass/fail. ~1–2 days.

**Defer:**

- Live-shed nightly runs (D) until A+B+C exist; otherwise you're chasing flakes without a baseline.
- Adversarial battery (E) until graceful-degradation contract is written into the skill.
- A/B harness (F) — emerges naturally once C exists.
- Embedding-reranker eval — only after STRETCH B3 is real code.

The pattern matches `workflow-reports` (walked examples) but adds the
fixture+harness layer. Don't over-build: 20 golden cases + replay +
simple grader beats 200 cases with no harness.

## 6. Open questions

- Owner allowlist location: skill prose, CLI flag default, or skill memory (STRETCH B5)?
- Query-extraction recipe: lowercase always? strip stopwords? retry shorter on zero-hit?
- Zero-hit fallback: ask user, fall back to repo search, or terminate?
- Fixture corpus: hand-curate, or scrape `tools-iuc` README? Rebaselining cadence when search backend changes?
- Grader: separate model call (cost), regex/JSON match (rigid), or human-in-loop (slow)?
- Acceptance for capability queries: who decides the "acceptable tool set" — skill author at corpus time, or live tooling expert per case?
- Budget: max CLI calls and max tokens per skill invocation — what numbers fail the build?
- Skill-vs-CLI test boundary: does the eval also assert on cache state (`galaxy-tool-cache info` returns the picked tool), or stop at "skill picked X"?
- Fixture flag naming: `--fixture-dir` on every command, or one env var honored by all `gxwf`/`galaxy-tool-cache` subcommands?
- Do live runs need a snapshotting tool (record-replay proxy) or is on-demand re-recording sufficient?
