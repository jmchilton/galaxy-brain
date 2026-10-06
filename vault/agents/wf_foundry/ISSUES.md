# Foundry issue triage

Triage index for `galaxyproject/foundry` issues, per [`ISSUES_INDEX.md`](../_shared/ISSUES_INDEX.md); detail lives in `vault/repositories/foundry/issues/`. Statuses are seeded from GitHub labels; see the label mapping in `AGENTS.md`.

GitHub state last refreshed: 2026-10-06. Issues here are unassigned by default and `priority/v2` by default; `(mvp)` marks `priority/mvp`, `(large)` marks `roadmap/main`.

## Waiting on John (`needs_decision`)

- (mvp) (large) [#59](https://github.com/galaxyproject/foundry/issues/59) — Research Nextflow process to Galaxy tool wrapper mapping; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/59/index.md)
- (mvp) (large) [#66](https://github.com/galaxyproject/foundry/issues/66) — Research Nextflow test fixtures to Galaxy job inputs; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/66/index.md)
- (mvp) (large) [#90](https://github.com/galaxyproject/foundry/issues/90) — Survey: Galaxy reporting and publishing patterns; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/90/index.md)
- [#231](https://github.com/galaxyproject/foundry/issues/231) — summarize-cwl: tighten cast skill's deterministic/LLM split; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/231/index.md)
- (mvp) (large) [#267](https://github.com/galaxyproject/foundry/issues/267) — Source-agnostic Galaxy input collection-shape selection note (+ IWC survey to ground it); decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/267/index.md)
- [#284](https://github.com/galaxyproject/foundry/issues/284) — Data Flow Examples on Multi-Step Patterns; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/284/index.md)
- (mvp) (large) [#306](https://github.com/galaxyproject/foundry/issues/306) — Pipeline construction for Loom/Orbit: a `loom` cast target that lowers pipelines into Loom plans; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/306/index.md)
- (mvp) (large) [#318](https://github.com/galaxyproject/foundry/issues/318) — Revise how skills working on draft coordinate - more direct, more deterministic, more YAML; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/318/index.md)
- (mvp) (large) [#332](https://github.com/galaxyproject/foundry/issues/332) — Introduce a finalize-workflow step.; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/332/index.md)
- (mvp) (large) [#365](https://github.com/galaxyproject/foundry/issues/365) — Foundry should use (or know about) job cache; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/365/index.md)
- (mvp) [#368](https://github.com/galaxyproject/foundry/issues/368) — Include upstream advice/prompts/docs for tool development. ; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/368/index.md)
- (mvp) [#377](https://github.com/galaxyproject/foundry/issues/377) — interview-to-freeform-summary is reviewed + pipelined but declares zero references; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/377/index.md)
- [#378](https://github.com/galaxyproject/foundry/issues/378) — First walk: cwl-to-galaxy end-to-end via ga4gh_challenge (earn the CWL-source tier out of draft); decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/378/index.md)
- [#448](https://github.com/galaxyproject/foundry/issues/448) — paper-to-cwl: a missing cwl-test-plan producer, and find-test-data used off its target axis; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/448/index.md)
- (mvp) (large) [#476](https://github.com/galaxyproject/foundry/issues/476) — Build a Pi-backed black-box Pipeline evaluation harness; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/476/index.md)
- (large) [#499](https://github.com/galaxyproject/foundry/issues/499) — First Class CWL Support; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/499/index.md)
- (mvp) (large) [#500](https://github.com/galaxyproject/foundry/issues/500) — Implement actual interviews.; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/500/index.md)
- (mvp) (large) [#501](https://github.com/galaxyproject/foundry/issues/501) — Improved Support for Tool Development; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/501/index.md)
- (mvp) (large) [#504](https://github.com/galaxyproject/foundry/issues/504) — Improve Pattern Pages; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/504/index.md)
- (mvp) [#505](https://github.com/galaxyproject/foundry/issues/505) — Ensure every pattern page has a test workflow.; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/505/index.md)
- (large) [#507](https://github.com/galaxyproject/foundry/issues/507) — Improved Structure and Schemas for Mold Artifacts; decide: who drives (agent/implement, agent/research or agent/human). [notes](../../repositories/foundry/issues/needs_decision/507/index.md)
- [#564](https://github.com/galaxyproject/foundry/issues/564) — advance-galaxy-draft-step/repair-galaxy-draft-topology can produce step doc: text long enough to crash work…; decide: close? galaxy#23579 dropped the annotation index; no lint check yet. [notes](../../repositories/foundry/issues/needs_decision/564/index.md)

## In motion (`wip`)

- [#534](https://github.com/galaxyproject/foundry/issues/534) — Replace abstract summarize-nextflow scenarios with concrete pinned fixtures; branch `issue-534-concrete-nextflow-scenarios` on `jmchilton` (1 commit, 116 behind main). [notes](../../repositories/foundry/issues/wip/534/index.md)
- [#548](https://github.com/galaxyproject/foundry/issues/548) — `gxwf draft-validate --concrete`: the other half of #166 — a ParsedTool decode failure's `Error.message` is…; draft PR [#554](https://github.com/galaxyproject/foundry/pull/554). [notes](../../repositories/foundry/issues/wip/548/index.md)
- [#573](https://github.com/galaxyproject/foundry/issues/573) — `implement-galaxy-tool-step` documents no binding convention for an authored UDT; draft PR [#617](https://github.com/galaxyproject/foundry/pull/617). [notes](../../repositories/foundry/issues/wip/573/index.md)

## Queued (`queued`)

- [#3](https://github.com/galaxyproject/foundry/issues/3) — Hero pipeline-fan widget (replace pipeline matrix / new /pipelines/ landing); next: implement and open a PR. [notes](../../repositories/foundry/issues/queued/3/index.md)
- (large) [#40](https://github.com/galaxyproject/foundry/issues/40) — Write IWC exemplar match schema; next: implement and open a PR. [notes](../../repositories/foundry/issues/queued/40/index.md)
- [#48](https://github.com/galaxyproject/foundry/issues/48) — Write target test plan schema; next: research and add a first comment. [notes](../../repositories/foundry/issues/queued/48/index.md)
- [#49](https://github.com/galaxyproject/foundry/issues/49) — Write workflow test run report schema; next: research and add a first comment. [notes](../../repositories/foundry/issues/queued/49/index.md)
- [#50](https://github.com/galaxyproject/foundry/issues/50) — Write workflow debug recommendation schema; next: research and add a first comment. [notes](../../repositories/foundry/issues/queued/50/index.md)
- [#175](https://github.com/galaxyproject/foundry/issues/175) — Evaluate Galaxy pattern for Nextflow workflow output index files; next: research and add a first comment. [notes](../../repositories/foundry/issues/queued/175/index.md)
- [#176](https://github.com/galaxyproject/foundry/issues/176) — Set legacy DSL1 support posture for Nextflow file and set pipelines; next: none planned (off the roadmap). [notes](../../repositories/foundry/issues/queued/176/index.md)
- [#211](https://github.com/galaxyproject/foundry/issues/211) — summarize-nextflow: resolve from_param through one-hop Groovy bindings; next: implement and open a PR. [notes](../../repositories/foundry/issues/queued/211/index.md)
- [#215](https://github.com/galaxyproject/foundry/issues/215) — summarize-nextflow: derived subworkflow-level edge view; next: implement and open a PR. [notes](../../repositories/foundry/issues/queued/215/index.md)
- [#216](https://github.com/galaxyproject/foundry/issues/216) — summarize-nextflow: parsed predicate sibling on conditionals[].guard (_derived_pattern); next: implement and open a PR. [notes](../../repositories/foundry/issues/queued/216/index.md)
- (mvp) [#219](https://github.com/galaxyproject/foundry/issues/219) — research: flesh out nextflow-to-galaxy-reference-data-mapping; next: none planned (off the roadmap). [notes](../../repositories/foundry/issues/queued/219/index.md)
- [#221](https://github.com/galaxyproject/foundry/issues/221) — research: ref-data complexity bridge fixtures for nextflow-to-galaxy mapping; next: research and add a first comment. [notes](../../repositories/foundry/issues/queued/221/index.md)
- [#243](https://github.com/galaxyproject/foundry/issues/243) — summarize-cwl: emit a skinny packed CWL (docs + schema.org stripped) alongside the full pack; next: implement and open a PR. [notes](../../repositories/foundry/issues/queued/243/index.md)
- [#246](https://github.com/galaxyproject/foundry/issues/246) — Add docs/README.md — human reading order / docs index; next: implement and open a PR. [notes](../../repositories/foundry/issues/queued/246/index.md)
- [#252](https://github.com/galaxyproject/foundry/issues/252) — Surface the _provenance.json schema v2 as a renderable schema reference; next: implement and open a PR. [notes](../../repositories/foundry/issues/queued/252/index.md)
- [#254](https://github.com/galaxyproject/foundry/issues/254) — Generated STATUS page — what exists, last-touched (fun, not urgent); next: implement and open a PR. [notes](../../repositories/foundry/issues/queued/254/index.md)
- [#282](https://github.com/galaxyproject/foundry/issues/282) — Galaxy pipeline Molds write fixed filenames to cwd — namespace per-source run; next: none planned (off the roadmap). [notes](../../repositories/foundry/issues/queued/282/index.md)
- (large) [#308](https://github.com/galaxyproject/foundry/issues/308) — Design a Claude dynamic-workflow projection for Foundry Pipelines; next: research and add a first comment. [notes](../../repositories/foundry/issues/queued/308/index.md)
- [#415](https://github.com/galaxyproject/foundry/issues/415) — The Foundry Diagram Makes it look like Molds are not part of the KB; next: none planned (off the roadmap). [notes](../../repositories/foundry/issues/queued/415/index.md)
- (mvp) [#468](https://github.com/galaxyproject/foundry/issues/468) — author-galaxy-tool-wrapper: no validation step, no GalaxyUserTool schema, and the bundled prompt contradict…; next: implement and open a PR. [notes](../../repositories/foundry/issues/queued/468/index.md)
- (mvp) (large) [#531](https://github.com/galaxyproject/foundry/issues/531) — Prove the IWC maturation pipeline with runnable fixtures and a .ga entry case; next: implement and open a PR. [notes](../../repositories/foundry/issues/queued/531/index.md)
- (mvp) (large) [#535](https://github.com/galaxyproject/foundry/issues/535) — Prove the IWC review pipeline on a real PR and accept its policy pin; next: implement and open a PR. [notes](../../repositories/foundry/issues/queued/535/index.md)
- (mvp) [#568](https://github.com/galaxyproject/foundry/issues/568) — Review New Paper; next: implement and open a PR. [notes](../../repositories/foundry/issues/queued/568/index.md)
- [#621](https://github.com/galaxyproject/foundry/issues/621) — Apply Rules Tutorial Patterns; next: research and add a first comment. [notes](../../repositories/foundry/issues/queued/621/index.md)

## Blocked on others (`blocked`)

- [#191](https://github.com/galaxyproject/foundry/issues/191) — Galaxy sample-sheet column-value charset gate rejects nf-core canonical values; blocked on: a Galaxy change. [notes](../../repositories/foundry/issues/blocked/191/index.md)
- (large) [#225](https://github.com/galaxyproject/foundry/issues/225) — Document Galaxy list-of-record collections for reference data; blocked on: a Galaxy change. [notes](../../repositories/foundry/issues/blocked/225/index.md)
- [#271](https://github.com/galaxyproject/foundry/issues/271) — Decide gops_* vs bedtools interval-tool redundancy (interval MOC); blocked on: an IWC workflow using the operation. [notes](../../repositories/foundry/issues/blocked/271/index.md)
- [#624](https://github.com/galaxyproject/foundry/issues/624) — API Docs Maybe Should Have Corresponding MCP entrypoints; blocked on: a Galaxy change. [notes](../../repositories/foundry/issues/blocked/624/index.md)

## Untriaged (`untriaged`)

- [#547](https://github.com/galaxyproject/foundry/issues/547) — Profiling the per-step draft loop: it is model-bound, not network-bound
- [#552](https://github.com/galaxyproject/foundry/issues/552) — advance-galaxy-draft-step's built-in/stock version branch is circular
- [#553](https://github.com/galaxyproject/foundry/issues/553) — No reachable route serves a Tool Shed wrapper's raw XML at a pinned changeset
- [#562](https://github.com/galaxyproject/foundry/issues/562) — Sandbox Support - agent-safehouse
- [#563](https://github.com/galaxyproject/foundry/issues/563) — Workflow Plan
- [#566](https://github.com/galaxyproject/foundry/issues/566) — Needs better guidance for importing to a real galaxy instance
- [#570](https://github.com/galaxyproject/foundry/issues/570) — Pattern MOCs are cast without the pattern pages they point at
- [#571](https://github.com/galaxyproject/foundry/issues/571) — `gxformat2-schema` documents nested `state` but not nested `in:` key addressing
- [#572](https://github.com/galaxyproject/foundry/issues/572) — ToolShed-fetch decoder rejects a real IUC wrapper's filtered list-collection output
- [#574](https://github.com/galaxyproject/foundry/issues/574) — `gxwf tool-search` returns zero hits for a literal Tool Shed repo slug
- [#575](https://github.com/galaxyproject/foundry/issues/575) — `paper-to-test-data` has no scoping or upstream-fixture guidance, and is the weaker half of its own fallback chain
- [#576](https://github.com/galaxyproject/foundry/issues/576) — Test-plan schema requires a file-shaped `fixture` for plain scalar workflow parameters
- [#577](https://github.com/galaxyproject/foundry/issues/577) — `freeform-summary-to-galaxy-test-plan` is silent on being handed a concrete draft and resolved test-data refs
- [#578](https://github.com/galaxyproject/foundry/issues/578) — tests-format has no way to put a value on an intermediate step's input port
- [#579](https://github.com/galaxyproject/foundry/issues/579) — No packaged note documents the `sample_sheet` + `rows:` job-input shape
- [#580](https://github.com/galaxyproject/foundry/issues/580) — `comments: type: frame` authored without `position`/`size` is rejected by real Galaxy import
- [#581](https://github.com/galaxyproject/foundry/issues/581) — `gxwf validate --connections` crashes on an ordinary format2 dict-shaped `step.in`
- [#582](https://github.com/galaxyproject/foundry/issues/582) — No documented path for an authored `GalaxyUserTool` to reach a Planemo-managed toolbox
- [#583](https://github.com/galaxyproject/foundry/issues/583) — `replacement_collection` indexes `rows` unconditionally, crashing Planemo staging for a `sample_sheet` input without `rows`
- [#584](https://github.com/galaxyproject/foundry/issues/584) — Invocation-failure reference has no tell for a stale toolbox read vs. a real install failure
- [#585](https://github.com/galaxyproject/foundry/issues/585) — The real UDT registration endpoint is `/api/unprivileged_tools`, not the admin-only `/api/dynamic_tools`
- [#586](https://github.com/galaxyproject/foundry/issues/586) — Galaxy's unprivileged-tool lint fails opaquely on an integer input with `value: 0`
- [#587](https://github.com/galaxyproject/foundry/issues/587) — gxformat2 has no `tool_uuid`, so a step bound to a registered UDT imports unresolved
- [#588](https://github.com/galaxyproject/foundry/issues/588) — A `sample_sheet` column was wired onto a plain scalar tool port, a binding that can never work
- [#589](https://github.com/galaxyproject/foundry/issues/589) — `PUT /api/workflows/{id}` defaults `exact_tools` to true and discards the per-step detail it already computed
- [#590](https://github.com/galaxyproject/foundry/issues/590) — Authoring never checks a wrapped script's own declared input-ordering assumption against the tool it will consume from
- [#591](https://github.com/galaxyproject/foundry/issues/591) — `download?style=ga` emits unversioned `tool_id`s, producing workflows that save but cannot be invoked
- [#592](https://github.com/galaxyproject/foundry/issues/592) — Augment freeform-to-Workflow Brief scenarios with real source artifacts
