# Foundry domain review

Things to catch when reviewing Foundry changes, agent-written ones above all. Mined from John's review comments on agent-opened `galaxyproject/foundry` PRs. Each item names what to flag and what to ask for, with the PR comment that motivated it.

Also enforce, without restating:

- [Guiding Principles](https://galaxyproject.github.io/foundry/meta/guiding-principles/) (`content/meta/guiding-principles.md`). Checks derived from them are at the end.
- `content/meta/eval-philosophy.md` and `content/meta/mold-spec.md` (eval/scenario contracts).
- `.agents/skills/foundry-documentation/SKILL.md` (prose rules, banned words, "earns", no archaeology).
- `AGENTS.md` authoring rules (frontmatter contract, generated files, fixture-is-a-claim).

## 1. Fix upstream, don't work around it

Foundry is not a collection of dated workarounds. Galaxy, planemo, gxformat2, galaxy-tool-util-ts (`gxwf`) and the Tool Shed absorb fixes that belong there.

- Flag any sentence documenting a bug, quirk, gap or limitation of an upstream project: "X never checks...", "Y omits...", "Z can't resolve...", "so do W instead". Ask: is this a bug? If yes, where's the upstream issue or PR? ([#712](https://github.com/galaxyproject/foundry/pull/712#discussion_r4381408053) "Galaxy bugs should not be documented they should be fixed", [#713](https://github.com/galaxyproject/foundry/pull/713#discussion_r4381762950) "agents just keep trying to paper over upstream issues", [#556](https://github.com/galaxyproject/foundry/pull/556#discussion_r4030368676) "fix upstream rather than tracking it forever")
- Flag workaround recipes for an upstream gap: marker steps, derived datasets, alternate endpoints, extra flags. Even "untested workaround" text counts. Ask whether the upstream should just do it ([#558](https://github.com/galaxyproject/foundry/pull/558#discussion_r4030420153) "fixable upstream in the toolshed?").
- A PR whose only purpose is a workaround should become an upstream issue/PR, and the Foundry PR closes. Precedent: [#477](https://github.com/galaxyproject/foundry/pull/477#issuecomment-5546935953) closed in favor of publishing packages, and #558/#559 closed once the upstream fixes landed.
- If the Foundry change depends on an upstream fix, it stays draft until the fix is merged, released, and Foundry's pin is bumped. No "legacy" text in the meantime ([#710](https://github.com/galaxyproject/foundry/pull/710#discussion_r4381381347) "I really don't want this legacy in here. Sit in draft", [#695](https://github.com/galaxyproject/foundry/pull/695#issuecomment-6328444125) "Needs a foundry release").
- On a pin bump, check that the text it obsoletes gets deleted. Issue #585 dropping the gxwf workarounds after galaxy-tool-util-ts#185 shipped is the model.
- If upstream is being fixed, don't document current upstream behavior as guidance. Condition it at most: "a converted export uses `tool_state`; don't take that to mean you should" ([#615](https://github.com/galaxyproject/foundry/pull/615#discussion_r4085182538)).
- If the agent suspects an upstream bug, it should verify it and produce issue text, not prose ([#616](https://github.com/galaxyproject/foundry/pull/616#discussion_r4086375092) "respond with potential issue text").

## 2. `scenarios.md` is test cases, `eval.md` is the oracle

`scenarios.md` holds concrete `(input, expected)` pairs. `eval.md` holds fixture-independent properties. An abstract description of an abstract workflow is not a test case.

- Every `## Case:` names a specific fixture: a repo-relative path, a pinned pipeline in `workflow-fixtures/fixtures.yaml`, a committed `examples/` file, or an IWC workflow ID. Reject these phrasings outright: "a Nextflow summary with a skip-style branch control", "a pipeline (or synthetic tree) that drives the resolver into...", "a complete gxformat2 workflow expected to pass" ([#379](https://github.com/galaxyproject/foundry/pull/379#discussion_r3647057710) "Fixtures must be concrete", [#509](https://github.com/galaxyproject/foundry/pull/509#discussion_r3997803154) "SCENARIOS MUST BE SPECIFIC!", [#528](https://github.com/galaxyproject/foundry/pull/528#discussion_r4019502681)).
- If the touched file has other abstract cases, they get fixed too: in this PR, in a preceding cleanup PR to rebase on, or in a new `agent/implement` issue ([#509](https://github.com/galaxyproject/foundry/pull/509#discussion_r3997803154), [#528](https://github.com/galaxyproject/foundry/pull/528#discussion_r4019502681)).
- Each case is a fixture plus an expectation. No preamble, no maturity notes, no "blocks on" punch lists, no "what a first walk needs" sections ([#379](https://github.com/galaxyproject/foundry/pull/379#discussion_r3647051129) "focus on describing the test case and then the expectation").
- No file preamble explaining what a scenarios file is or how pipeline scenarios relate to Mold oracles. The filename says that ([#508](https://github.com/galaxyproject/foundry/pull/508#discussion_r3999883377), PR #519).
- Check expectations for factual correctness against the target. "Unlike gxformat2, CWL has native `when:`" is wrong, since Galaxy has `when` ([#379](https://github.com/galaxyproject/foundry/pull/379#discussion_r3647051129)).
- Purely synthetic cases are a start, not an end. Ask for real artifacts (papers, interviews, IWC workflows) to augment them ([#567](https://github.com/galaxyproject/foundry/pull/567#discussion_r4057501878)).
- Pipeline scenarios shouldn't heavily duplicate Mold scenarios ([#508](https://github.com/galaxyproject/foundry/pull/508#discussion_r3999888223)).
- `eval.md` names no fixture paths, counts or pinned outputs. Pipeline `eval.md` doesn't restate Mold `eval.md` or explain what it doesn't own ([#508](https://github.com/galaxyproject/foundry/pull/508#discussion_r3997832111) "Why would this be restated here?").
- `eval.md` has no preamble about the tier being nascent or properties being "targets" ([#379](https://github.com/galaxyproject/foundry/pull/379#discussion_r3647033661)).
- Every eval property needs an imaginable failing output (eval-philosophy). A property that restates `index.md` comes out.

## 3. Mold and Pipeline bodies are runtime instructions

A Mold or Pipeline body is cast into an agent's context. Every sentence costs context in every run.

- Flag anything that isn't an instruction the runtime agent acts on: naming rationale ("the slug cannot be..."), taxonomy defense ("lifecycle, not translation"), "why four phases", "what it deliberately does not do", provenance ("Lifted from `harness-pipelines.md`"). Move it to a research note or delete it ([#508](https://github.com/galaxyproject/foundry/pull/508#discussion_r3998174201) "It isn't a runtime instruction at all", [#600](https://github.com/galaxyproject/foundry/pull/600#discussion_r4077694844) "Detailed documentation belongs in research notes not Molds").
- Pipeline prose shouldn't retell the phases. "The phases describe the pipeline" ([#600](https://github.com/galaxyproject/foundry/pull/600#discussion_r4077694844)).
- Flag trust/security/policy sections that duplicate the harness's job ([#509](https://github.com/galaxyproject/foundry/pull/509#discussion_r3997789246)).
- Flag clauses where the instruction defends itself: "...so a fresh call would only repeat work this run already paid for" ([#555](https://github.com/galaxyproject/foundry/pull/555#discussion_r4030278115)).
- Flag text routing around a problem already fixed on `main`. Ask for a rebase and re-check ([#508](https://github.com/galaxyproject/foundry/pull/508#discussion_r3998176483)).
- Upstream prompt sources: sync against the merged upstream artifact, don't describe its old split ("the Claude command... the Copilot instructions") ([#498](https://github.com/galaxyproject/foundry/pull/498#discussion_r3982670854)).
- Steps that create companion files (README, tests) must allow them to already exist ([#498](https://github.com/galaxyproject/foundry/pull/498#discussion_r3982678946)).

## 4. Cut the agent tells

Applies to all content, research notes and code comments included.

- **Archaeology.** Past designs, what used to exist, why an old thing was removed, issue-history sentences, "this is not a JSON Schema" contrasts, code comments explaining what a pass does *not* check ([#383](https://github.com/galaxyproject/foundry/pull/383#discussion_r3653416001), [#434](https://github.com/galaxyproject/foundry/pull/434#discussion_r3700927685), [#567](https://github.com/galaxyproject/foundry/pull/567#discussion_r4064512471), [#567](https://github.com/galaxyproject/foundry/pull/567#discussion_r4057487313) even when unrelated to the PR).
- **Relitigating.** Rejected alternatives, settled decisions re-argued ([#497](https://github.com/galaxyproject/foundry/pull/497#discussion_r3981177046) "we made the decision we don't need to relitigate").
- **Comparisons nobody asked for**, e.g. "unlike `workflow-fixtures/`, which is gitignored" ([#508](https://github.com/galaxyproject/foundry/pull/508#discussion_r3999884457)).
- **Negative examples alongside a positive one.** If the right example is shown, drop "X fails validation" or "flattening the conditional is wrong" ([#522](https://github.com/galaxyproject/foundry/pull/522#discussion_r4008428544), [#527](https://github.com/galaxyproject/foundry/pull/527#discussion_r4028545000)).
- **Comparison tables where a rule would do.** "Use 1.0.4 even if 1.0.1 is available", then document around it ([#527](https://github.com/galaxyproject/foundry/pull/527#discussion_r4028559313)).
- **Survey mechanics in place of the pattern.** "The pinned 115-file survey found..." belongs in evidence links. Pattern and anti-pattern pages state the practice ([#612](https://github.com/galaxyproject/foundry/pull/612#discussion_r4083982844)).
- **Best-practice claims derived from counts.** What counts as an anti-pattern is an expert opinion. Flag counts used as justification and ask John ([#612](https://github.com/galaxyproject/foundry/pull/612#discussion_r4083982844)).
- **Text that will go stale**: current status, "today", pinned numbers in prose, speculative open-work bullets ([#565](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040492173), [#567](https://github.com/galaxyproject/foundry/pull/567#discussion_r4064522675)).
- **Draft disclaimers** like "this is an agent-written rough draft". Remove them even in draft PRs so they can't stick around ([#565](https://github.com/galaxyproject/foundry/pull/565#discussion_r4039404244)).
- **Answered open questions.** Delete each one once it's answered in review. Keep only the live ones ([#565](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040499447)).
- **Paragraphs a reader can't parse.** If a reviewer can't say what it means, drop it ([#508](https://github.com/galaxyproject/foundry/pull/508#discussion_r3998173065), [#565](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040473534)).
- **Verbose openers.** The last sentence of an intro paragraph is usually cuttable ([#498](https://github.com/galaxyproject/foundry/pull/498#discussion_r3982465831), [#509](https://github.com/galaxyproject/foundry/pull/509#discussion_r3997785326)).
- **YAML flow-style dicts** (`{ __class__: ConnectedValue }`) where block YAML reads better. Also ask whether boilerplate entries are needed at all ([#613](https://github.com/galaxyproject/foundry/pull/613#discussion_r4084312114), [#524](https://github.com/galaxyproject/foundry/pull/524#discussion_r4009678109)).
- **"Too much detail"** in reference and research notes: a full schema enumeration where a recommendation table would do ([#616](https://github.com/galaxyproject/foundry/pull/616#discussion_r4086157614)).
- When a new idiom gets flagged, add it to `foundry-documentation` rather than to this list (as with "earns", [#614](https://github.com/galaxyproject/foundry/pull/614#discussion_r4084688476)).

## 5. Design calls agents get wrong

- **Future-facing over corpus-majority legacy.** Corpus counts show a pattern exists. They don't make a legacy spelling the recommendation. Recommend the Galaxy builtin `pick_value` over the Tool Shed tool IWC uses ([#524](https://github.com/galaxyproject/foundry/pull/524#discussion_r4009664969)), `state` over `tool_state` ([#615](https://github.com/galaxyproject/foundry/pull/615#discussion_r4085182538)), and `data` over `File` ([#616](https://github.com/galaxyproject/foundry/pull/616#discussion_r4086358513)). The schema allows bad practices ("File", "integer"), so don't present everything it accepts as equal. Verify "dominant spelling" claims and name the upstream examples ([#616](https://github.com/galaxyproject/foundry/pull/616#discussion_r4086367234)).
- **No new runtime dependencies** (e.g. `nf-test`) without asking. Foundry avoids them ([#528](https://github.com/galaxyproject/foundry/pull/528#discussion_r4019514887)).
- **Get it right in this PR.** Don't keep a known-wrong singular shape for a later Mold to fix. Do the maximally useful version now ([#528](https://github.com/galaxyproject/foundry/pull/528#discussion_r4020846415)).
- **Rules the CLI can check get CLI checks.** When a contract says "blocker" or "must", ask for a static check in `foundry` and not prose alone ([#565](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040467644)).
- **Use "must not", not "need not"**, when an agent must not do something ([#565](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040462613)).
- **Agents don't make Galaxy design choices upstream of design phases.** In briefs and other pre-design artifacts, the agent records intent and doesn't choose datatypes, collection structures, tools, step graphs, tool state or test declarations. A human expert may add these ([#565](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040454756)).
- **Inputs are read-only.** Implementation and design steps don't edit the brief. Progress, learnings and recommended brief changes go to the ledger ([#565](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040487034)).
- **Required vs optional.** Agents over-require sections. Default to optional unless absence blocks the work. Blockers get their own section and block ([#565](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040388752)).
- **Keep test detail high-level outside test Molds.** Test development has its own Molds ([#565](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040434803)).
- **Missing version check.** Runs fail on stale local tool versions. Flag Molds/Pipelines that assume current `gxwf`/`foundry`/`planemo` without checking ([#554](https://github.com/galaxyproject/foundry/pull/554#issuecomment-5713822276)).

## 6. Guiding principles as review checks

1. **Source authority beats local copies.** Flag mirrored upstream content: copied IWC workflows, transcribed Tool Shed metadata, CLI behavior restated as fact instead of invoked, schemas hand-copied instead of vendored from their package. Cite IWC by URL or abstract ID. Upstream quirks are upstream's to fix (§1).
2. **Reproducibility at every layer.** Changed Molds, references or schemas get recast, and `_provenance.json`/drift gates stay green. Generated files (`casts/`, `Index.md`, `Dashboard.md`, pipeline harnesses) are regenerated, never hand-edited. Pins are explicit.
3. **Deterministic tools do deterministic work.** Flag prose caveats where a schema, validator or CLI check could reject the bad output. Flag evals that pass a deterministic property by inspection. Flag hand-maintained indexes or lists a script could generate.
4. **Progressive disclosure over context flooding.** Flag Mold bodies that inline research-note depth, `load: upfront` on material only needed in edge cases, and references with no trigger. Deep "why" goes in research notes (§3).
5. **Portable artifacts over platform fashion.** Flag runtime-specific instructions (Claude Code, Codex, Copilot names, harness mechanics) in Mold source. Those belong in casts, manifests or harness notes.
6. **Actionable knowledge, not passive notes.** A new research note or pattern should be reachable from a Mold reference or Pipeline. Flag orphan prose and Molds that compress away the evidence link.
7. **Corpus-first, not invention-first.** Runtime-reference notes start as stubs and grow one paragraph per observed failure. Flag pre-written comprehensive notes, invented taxonomy, uncited patterns and synthetic-only evidence. Corpus grounds whether a pattern exists, not which spelling to recommend (§5).
