# Foundry domain review research

Evidence behind [DOMAIN_REVIEW.md](DOMAIN_REVIEW.md). Update the checklist there. Add evidence and method notes here.

## Method (2026-10-27)

- Source: every issue comment and inline review comment on `galaxyproject/foundry` via `gh api` (`issues/comments`, `pulls/comments`). Of 400 PRs, 378 are authored by `jmchilton`, i.e. opened by agents.
- Kept John's own comments: 104 issue/PR-thread and 89 inline, minus agent replies posted under his account ("Posted by Claude", "Addressed in", "Dropped in", "Done in", ...). About 60 inline and 10 thread comments remained.
- No PR carries a top-level review body (GraphQL query plus spot checks on #565 and #509).
- Also read: the guiding-principles and comparisons pages, `content/meta/eval-philosophy.md`, `content/meta/mold-spec.md`, `AGENTS.md`, `.agents/skills/foundry-documentation/SKILL.md`, and `WORK_HORSE.md` (which already says "We don't paper over upstream issues here").
- To refresh: re-run the two `gh api` pulls, filter to comments newer than this date, and map each to a section below.

## Evidence by section

### §1 Fix upstream

- [#712](https://github.com/galaxyproject/foundry/pull/712#discussion_r4381408053): "Galaxy bugs should not be documented they should be fixed." (on `element_count: 0` passing on any collection)
- [#713](https://github.com/galaxyproject/foundry/pull/713#discussion_r4381762950): "Foundry agents just keep trying to paper over upstream issues with workarounds" (marker-step recipe for skipped outputs; fixed in planemo#1761)
- [#556](https://github.com/galaxyproject/foundry/pull/556#discussion_r4030368676): "fix upstream ... rather than tracking it forever in this document" (Tool Shed search)
- [#558](https://github.com/galaxyproject/foundry/pull/558#discussion_r4030420153): "I wonder if that is fixable upstream in the toolshed" (TRS version resolution)
- [#710](https://github.com/galaxyproject/foundry/pull/710#discussion_r4381381347): "I really don't want this legacy in here. Sit in draft I guess until upstream merged and deployed."
- [#695](https://github.com/galaxyproject/foundry/pull/695#issuecomment-6328444125): "Needs a foundry release before it is really fixed though."
- [#615](https://github.com/galaxyproject/foundry/pull/615#discussion_r4085182538): `tool_state` export being fixed, so condition the guidance
- [#616](https://github.com/galaxyproject/foundry/pull/616#discussion_r4086375092): "Is that a bug? ... respond with an potential issue text." The agent confirmed a gxformat2 conversion bug.
- Workaround PRs closed: [#477](https://github.com/galaxyproject/foundry/pull/477#issuecomment-5546935953) ("This was a workaround - closing it out and publishing those packages instead"), [#558](https://github.com/galaxyproject/foundry/pull/558#issuecomment-5780741255) and [#559](https://github.com/galaxyproject/foundry/pull/559#issuecomment-5780728373) ("upstream fixes negate the need for this").
- Pin-bump cleanup model: Foundry issue #585 dropped its gxwf workarounds after galaxy-tool-util-ts#185 shipped.

### §2 Scenarios and evals

- [#379](https://github.com/galaxyproject/foundry/pull/379#discussion_r3647057710): "Fixtures must be concrete - this is decidedly not." [Also](https://github.com/galaxyproject/foundry/pull/379#discussion_r3647051129): "galaxy has whens ... focus on describing the test case and then the expectation." Preambles cut in both [eval.md](https://github.com/galaxyproject/foundry/pull/379#discussion_r3647033661) and [scenarios.md](https://github.com/galaxyproject/foundry/pull/379#discussion_r3647041615).
- [#509](https://github.com/galaxyproject/foundry/pull/509#discussion_r3997803154): "SCENARIOS MUST BE SPECIFIC! ... open a new PR that clears them out and rebase on top of that." [Also](https://github.com/galaxyproject/foundry/pull/509#discussion_r3997806296) on `validate-galaxy-workflow`.
- [#528](https://github.com/galaxyproject/foundry/pull/528#discussion_r4019502681): "There shouldn't be just descriptions of abstract workflows ... create an issue ... assign it `agent/implement`."
- [#567](https://github.com/galaxyproject/foundry/pull/567#discussion_r4057501878): synthetic-only cases, which led to issue #592 for real artifacts.
- [#508](https://github.com/galaxyproject/foundry/pull/508#discussion_r3999883377): self-describing preamble, plus "review existing scenarios.md". Follow-up PR #519 merged and #520 closed. [Overlap](https://github.com/galaxyproject/foundry/pull/508#discussion_r3999888223) with Mold scenarios. Pipeline eval [restating](https://github.com/galaxyproject/foundry/pull/508#discussion_r3997832111) Mold eval.

### §3 Runtime instructions

- [#508](https://github.com/galaxyproject/foundry/pull/508#discussion_r3998174201): "It isn't a runtime instruction at all." Also [#508](https://github.com/galaxyproject/foundry/pull/508#discussion_r3998174564), the ["Lifted from"](https://github.com/galaxyproject/foundry/pull/508#discussion_r3998173065) sentence, and [already-fixed text](https://github.com/galaxyproject/foundry/pull/508#discussion_r3998176483).
- [#600](https://github.com/galaxyproject/foundry/pull/600#discussion_r4077694844): "Detailed documentation belongs in research notes not Molds. In some real ways - the phases describe the pipeline."
- [#509](https://github.com/galaxyproject/foundry/pull/509#discussion_r3997789246): "Eliminate this whole section" (the "explicit trust" section). Reading it as "duplicates the harness's job" is an interpretation.
- [#555](https://github.com/galaxyproject/foundry/pull/555#discussion_r4030278115), [#555](https://github.com/galaxyproject/foundry/pull/555#discussion_r4030287228): self-defending language.
- [#498](https://github.com/galaxyproject/foundry/pull/498#discussion_r3982670854): merged Claude/Copilot upstream prompt. [#498](https://github.com/galaxyproject/foundry/pull/498#discussion_r3982678946): "allow for this already existing."

### §4 Agent tells

- Archaeology: [#383](https://github.com/galaxyproject/foundry/pull/383#discussion_r3653416001) (code comment), [#434](https://github.com/galaxyproject/foundry/pull/434#discussion_r3700927685), [#567](https://github.com/galaxyproject/foundry/pull/567#discussion_r4057487313) ("even though unrelated to this PR"), [#567](https://github.com/galaxyproject/foundry/pull/567#discussion_r4064512471) ("Not a JSON schema"), [#612](https://github.com/galaxyproject/foundry/pull/612#discussion_r4083950451).
- Relitigating: [#497](https://github.com/galaxyproject/foundry/pull/497#discussion_r3981177046).
- Unrequested comparison: [#508](https://github.com/galaxyproject/foundry/pull/508#discussion_r3999884457).
- Negative beside positive example: [#522](https://github.com/galaxyproject/foundry/pull/522#discussion_r4008428544), [#527](https://github.com/galaxyproject/foundry/pull/527#discussion_r4028545000).
- Table over rule: [#527](https://github.com/galaxyproject/foundry/pull/527#discussion_r4028559313).
- Survey mechanics and count-derived best practice: [#612](https://github.com/galaxyproject/foundry/pull/612#discussion_r4083982844).
- Staleness: [#565](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040492173), [#567](https://github.com/galaxyproject/foundry/pull/567#discussion_r4064522675).
- Draft disclaimer: [#565](https://github.com/galaxyproject/foundry/pull/565#discussion_r4039404244). Answered questions: [#565](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040499447). Unparseable: [#565](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040473534).
- Verbose openers: [#498](https://github.com/galaxyproject/foundry/pull/498#discussion_r3982465831), [#509](https://github.com/galaxyproject/foundry/pull/509#discussion_r3997785326).
- YAML style: [#613](https://github.com/galaxyproject/foundry/pull/613#discussion_r4084312114), [#524](https://github.com/galaxyproject/foundry/pull/524#discussion_r4009678109).
- Too much detail: [#616](https://github.com/galaxyproject/foundry/pull/616#discussion_r4086157614).
- "earns" idiom added to `foundry-documentation`: [#614](https://github.com/galaxyproject/foundry/pull/614#discussion_r4084688476).

### §5 Design calls

- Future-facing over legacy: [#524](https://github.com/galaxyproject/foundry/pull/524#discussion_r4009664969) (`pick_value`), [#615](https://github.com/galaxyproject/foundry/pull/615#discussion_r4085182538) (`state`), [#616](https://github.com/galaxyproject/foundry/pull/616#discussion_r4086358513) and [#616](https://github.com/galaxyproject/foundry/pull/616#discussion_r4086367234) (`data`).
- Runtime deps: [#528](https://github.com/galaxyproject/foundry/pull/528#discussion_r4019514887). Get it right now: [#528](https://github.com/galaxyproject/foundry/pull/528#discussion_r4020846415).
- Workflow brief (all #565): [CLI checks](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040467644), ["need not" too weak](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040462613), [no Galaxy design choices](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040454756), [brief read-only, ledger for learnings](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040487034), [optional sections](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040388752), [Workflow/Agent Environment split with Blockers](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040431482), [test detail](https://github.com/galaxyproject/foundry/pull/565#discussion_r4040434803).
- Version checks: [#554](https://github.com/galaxyproject/foundry/pull/554#issuecomment-5713822276) ("a sadly common problem in my runs"). Turning that into a review item is an interpretation.

### §6 Principles

Derived from the [guiding principles](https://galaxyproject.github.io/foundry/meta/guiding-principles/) (Rev 7, revised 2026-07-17). The [comparisons page](https://galaxyproject.github.io/foundry/meta/comparisons/) adds no review checks.

## Open threads

- Foundry's `mold-spec.md` Scenario Contract says "Cases describe inputs abstractly, then bind a fixture". That may invite the abstract cases flagged in §2. `content/molds/summarize-nextflow/scenarios.md` on `main` still has "a synthetic tree without a `workflow { ... }` block".
- Branch `issue-730-udt-run-recipe` documents an untested `--extra_tools` workaround for a planemo built-in-tool gap. It's a candidate for §1.
- The §5 legacy-spelling rule may belong upstream in Foundry's `content/meta/pattern-authorship.md`.
