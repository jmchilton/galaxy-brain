# Foundry domain review

What to flag when reviewing Foundry changes, and what to ask for instead. Evidence and derivation: [DOMAIN_REVIEW_RESEARCH.md](DOMAIN_REVIEW_RESEARCH.md).

Also enforce, without restating:

- [Guiding Principles](https://galaxyproject.github.io/foundry/meta/guiding-principles/) (`content/meta/guiding-principles.md`). Review checks derived from them are in §6.
- `content/meta/eval-philosophy.md` and `content/meta/mold-spec.md` (eval/scenario contracts).
- `.agents/skills/foundry-documentation/SKILL.md` (prose rules, banned words, no archaeology).
- `AGENTS.md` authoring rules (frontmatter contract, generated files, fixture-is-a-claim).

## 1. Fix upstream, don't work around it

Foundry is not a collection of dated workarounds. Galaxy, planemo, gxformat2, galaxy-tool-util-ts (`gxwf`) and the Tool Shed absorb fixes that belong there.

- Flag any sentence documenting a bug, quirk, gap or limitation of an upstream project: "X never checks...", "Y omits...", "Z can't resolve...", "so do W instead". Ask whether it's a bug, and if so, for the upstream issue or PR.
- Flag workaround recipes for an upstream gap: marker steps, derived datasets, alternate endpoints, extra flags. "Untested workaround" text counts too. Ask whether upstream should just do it.
- A PR whose only purpose is a workaround becomes an upstream issue or PR, and the Foundry PR closes.
- A Foundry change that depends on an upstream fix stays draft until the fix is merged, released, and Foundry's pin is bumped. No legacy text in the meantime.
- On a pin bump, delete the text it obsoletes.
- While upstream behavior is being fixed, don't present it as guidance. At most condition it: "a converted export uses `tool_state`; don't take that to mean you should."
- A suspected upstream bug gets verified and written up as issue text, not documented as prose.

## 2. `scenarios.md` is test cases, `eval.md` is the oracle

`scenarios.md` holds concrete `(input, expected)` pairs. `eval.md` holds fixture-independent properties. An abstract description of an abstract workflow is not a test case.

- Every `## Case:` names a specific fixture: a repo-relative path, a pinned pipeline in `workflow-fixtures/fixtures.yaml`, a committed `examples/` file, or an IWC workflow ID. Reject phrasings like "a Nextflow summary with a skip-style branch control", "a pipeline (or synthetic tree) that drives the resolver into...", "a complete gxformat2 workflow expected to pass".
- If the touched file has other abstract cases, they get fixed too: in this PR, in a preceding cleanup PR to rebase on, or in a new `agent/implement` issue.
- Each case is a fixture plus an expectation. No preamble, maturity notes, "blocks on" punch lists or "what a first walk needs" sections.
- No file preamble explaining what a scenarios file is or how pipeline scenarios relate to Mold oracles.
- Check expectations against the target's real behavior. Example of a wrong one: "unlike gxformat2, CWL has native `when:`" (Galaxy has `when`).
- Purely synthetic cases are a start. Ask for real artifacts (papers, interviews, IWC workflows) to augment them.
- Pipeline scenarios shouldn't heavily duplicate Mold scenarios.
- `eval.md` names no fixture paths, counts or pinned outputs. A Pipeline `eval.md` doesn't restate Mold `eval.md` or explain what it doesn't own.
- No `eval.md` preamble about the tier being nascent or properties being "targets".
- Every eval property needs an imaginable failing output. A property that restates `index.md` comes out.

## 3. Mold and Pipeline bodies are runtime instructions

A Mold or Pipeline body is cast into an agent's context. Every sentence costs context in every run.

- Flag anything that isn't an instruction the runtime agent acts on: naming rationale ("the slug cannot be..."), taxonomy defense ("lifecycle, not translation"), "why four phases", "what it deliberately does not do", provenance ("Lifted from `harness-pipelines.md`"). Move it to a research note or delete it.
- Pipeline prose doesn't retell the phases. The phases describe the pipeline.
- Flag trust, security or policy sections that duplicate the harness's job.
- Flag clauses where an instruction defends itself: "...so a fresh call would only repeat work this run already paid for".
- Flag text routing around a problem already fixed on `main`. Ask for a rebase and a re-check.
- Sync against the merged upstream prompt source. Don't describe its old split ("the Claude command... the Copilot instructions").
- Steps that create companion files (README, tests) allow them to already exist.

## 4. Cut the agent tells

Applies to all content, research notes and code comments included.

- **Archaeology.** Past designs, what used to exist, why an old thing was removed, issue-history sentences, "this is not a JSON Schema" contrasts, code comments about what a pass does *not* check. Flag it even in lines the PR didn't touch.
- **Relitigating.** Rejected alternatives and settled decisions re-argued.
- **Unrequested comparisons**, e.g. "unlike `workflow-fixtures/`, which is gitignored".
- **Negative examples beside a positive one.** If the right example is shown, drop "X fails validation".
- **Comparison tables where a rule would do.** "Use 1.0.4 even if 1.0.1 is available", then document around it.
- **Survey mechanics in place of the pattern.** "The pinned 115-file survey found..." belongs in evidence links. Pattern and anti-pattern pages state the practice.
- **Best-practice claims derived from counts.** What counts as an anti-pattern is an expert opinion. Flag counts used as justification and route the call to John.
- **Text that will go stale**: current status, "today", pinned numbers in prose, speculative open-work bullets.
- **Draft disclaimers** such as "this is an agent-written rough draft". Remove them even in draft PRs.
- **Answered open questions.** Delete each once answered in review. Keep only live ones.
- **Unparseable paragraphs.** If a reviewer can't say what it means, drop it.
- **Verbose openers.** The last sentence of an intro paragraph is often cuttable.
- **YAML flow-style dicts** (`{ __class__: ConnectedValue }`) where block YAML reads better. Ask whether boilerplate entries are needed at all.
- **Too much detail** in reference and research notes, e.g. a full schema enumeration where a recommendation table would do.
- A newly flagged idiom goes into `foundry-documentation`, not this list.

## 5. Design calls agents get wrong

- **Future-facing over corpus-majority legacy.** Corpus counts show a pattern exists. They don't make a legacy spelling the recommendation. Prefer the Galaxy builtin `pick_value` over the Tool Shed tool, `state` over `tool_state`, `data` over `File`. The schema accepts bad practices ("File", "integer"), so don't present everything it accepts as equal. Verify "dominant spelling" claims and name the examples.
- **No new runtime dependencies** (e.g. `nf-test`) without asking.
- **Get it right in this PR.** Don't keep a known-wrong shape for a later Mold to fix. Do the most useful version now.
- **CLI-checkable rules get CLI checks.** When a contract says "blocker" or "must", ask for a static check in `foundry`, not prose alone.
- **"Must not", not "need not"**, when an agent must not do something.
- **No Galaxy design choices before design phases.** In briefs and other pre-design artifacts the agent records intent. It doesn't choose datatypes, collection structures, tools, step graphs, tool state or test declarations. A human expert may add these.
- **Inputs are read-only.** Implementation and design steps don't edit the brief. Progress, learnings and recommended brief changes go to the ledger.
- **Optional by default.** Agents over-require sections. Require a section only when its absence blocks the work. Blockers get their own section and block.
- **Keep test detail high-level outside test Molds.** Test development has its own Molds.
- **Check tool versions.** Flag Molds and Pipelines that assume current `gxwf`, `foundry` or `planemo` without checking.

## 6. Guiding principles as review checks

1. **Source authority beats local copies.** Flag mirrored upstream content: copied IWC workflows, transcribed Tool Shed metadata, CLI behavior restated instead of invoked, schemas hand-copied instead of vendored from their package. Cite IWC by URL or abstract ID. Upstream quirks are upstream's to fix (§1).
2. **Reproducibility at every layer.** Changed Molds, references or schemas get recast, and `_provenance.json` and drift gates stay green. Generated files (`casts/`, `Index.md`, `Dashboard.md`, pipeline harnesses) are regenerated, never hand-edited. Pins are explicit.
3. **Deterministic tools do deterministic work.** Flag prose caveats where a schema, validator or CLI check could reject the bad output. Flag evals that pass a deterministic property by inspection. Flag hand-maintained lists a script could generate.
4. **Progressive disclosure over context flooding.** Flag Mold bodies that inline research-note depth, `load: upfront` on edge-case material, and references with no trigger. Deep "why" goes in research notes (§3).
5. **Portable artifacts over platform fashion.** Flag runtime-specific instructions (Claude Code, Codex, Copilot, harness mechanics) in Mold source. Those belong in casts, manifests or harness notes.
6. **Actionable knowledge, not passive notes.** A new research note or pattern is reachable from a Mold reference or Pipeline. Flag orphan prose and Molds that drop the evidence link.
7. **Corpus-first, not invention-first.** Runtime-reference notes start as stubs and grow one paragraph per observed failure. Flag pre-written comprehensive notes, invented taxonomy, uncited patterns and synthetic-only evidence. Corpus grounds whether a pattern exists, not which spelling to recommend (§5).
