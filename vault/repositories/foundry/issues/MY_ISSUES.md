# Foundry issue triage

Triage index for `galaxyproject/foundry` issues, per [`MY_ISSUES_INDEX.md`](../../../agents/_shared/MY_ISSUES_INDEX.md); detail lives in `vault/repositories/foundry/issues/`. Statuses are seeded from GitHub labels; see the label mapping in `AGENTS.md`.

GitHub state last refreshed: 2026-11-05. Issues here are unassigned by default and `priority/v2` by default; `(mvp)` marks `priority/mvp`, `(large)` marks `roadmap/main`.

## Labels staged for John (`needs_decision_labels`)

Review `issue_tags.md` in the record, then use 👀 Diff / 🔖 Apply staged labels.

- (mvp) [#591](https://github.com/galaxyproject/foundry/issues/591) — `download?style=ga` emits unversioned tool_ids; saves but 400s on invoke; decide: apply the proposed labels (agent files the Galaxy issue). [notes](needs_decision/591/index.md)
- [#574](https://github.com/galaxyproject/foundry/issues/574) — Tool Shed tool search ignores `repo_name`/`id`, so slug queries miss; decide: apply staged labels, then repo-search retry in discover-shed-tool. [notes](needs_decision/574/index.md)
- (mvp) [#580](https://github.com/galaxyproject/foundry/issues/580) — frame comments without position/size rejected by real Galaxy import; decide: apply staged labels, then require geometry in 4 template Molds + evals. [notes](needs_decision/580/index.md)
- (mvp) [#673](https://github.com/galaxyproject/foundry/issues/673) — Runtime Note reads as a blanket source-read ban; phases disagree on reading pinned source; decide: apply staged labels, then generator line + per-Mold fixes. [notes](needs_decision/673/index.md)

## Waiting on John (`needs_decision`)

- (mvp) [#670](https://github.com/galaxyproject/foundry/issues/670) — topology repair forbade interface edits; #753 merged; decide: close it, or keep it open for what's left. [notes](needs_decision/670/index.md)
- (mvp) (large) [#59](https://github.com/galaxyproject/foundry/issues/59) — Research Nextflow process to Galaxy tool wrapper mapping; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/59/index.md)
- (mvp) (large) [#66](https://github.com/galaxyproject/foundry/issues/66) — Research Nextflow test fixtures to Galaxy job inputs; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/66/index.md)
- (mvp) (large) [#90](https://github.com/galaxyproject/foundry/issues/90) — Survey: Galaxy reporting and publishing patterns; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/90/index.md)
- [#231](https://github.com/galaxyproject/foundry/issues/231) — summarize-cwl: tighten cast skill's deterministic/LLM split; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/231/index.md)
- (mvp) (large) [#267](https://github.com/galaxyproject/foundry/issues/267) — Source-agnostic Galaxy input collection-shape selection note (+ IWC survey to ground it); decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/267/index.md)
- [#284](https://github.com/galaxyproject/foundry/issues/284) — Data Flow Examples on Multi-Step Patterns; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/284/index.md)
- (mvp) (large) [#306](https://github.com/galaxyproject/foundry/issues/306) — Pipeline construction for Loom/Orbit: a `loom` cast target that lowers pipelines into Loom plans; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/306/index.md)
- (mvp) (large) [#318](https://github.com/galaxyproject/foundry/issues/318) — Revise how skills working on draft coordinate - more direct, more deterministic, more YAML; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/318/index.md)
- (mvp) (large) [#332](https://github.com/galaxyproject/foundry/issues/332) — Introduce a finalize-workflow step.; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/332/index.md)
- (mvp) (large) [#365](https://github.com/galaxyproject/foundry/issues/365) — Foundry should use (or know about) job cache; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/365/index.md)
- (mvp) [#368](https://github.com/galaxyproject/foundry/issues/368) — Include upstream advice/prompts/docs for tool development. ; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/368/index.md)
- (mvp) [#377](https://github.com/galaxyproject/foundry/issues/377) — interview-to-freeform-summary is reviewed + pipelined but declares zero references; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/377/index.md)
- [#378](https://github.com/galaxyproject/foundry/issues/378) — First walk: cwl-to-galaxy end-to-end via ga4gh_challenge (earn the CWL-source tier out of draft); decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/378/index.md)
- [#448](https://github.com/galaxyproject/foundry/issues/448) — paper-to-cwl: a missing cwl-test-plan producer, and find-test-data used off its target axis; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/448/index.md)
- (mvp) (large) [#476](https://github.com/galaxyproject/foundry/issues/476) — Build a Pi-backed black-box Pipeline evaluation harness; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/476/index.md)
- (large) [#499](https://github.com/galaxyproject/foundry/issues/499) — First Class CWL Support; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/499/index.md)
- (mvp) (large) [#500](https://github.com/galaxyproject/foundry/issues/500) — Implement actual interviews.; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/500/index.md)
- (mvp) (large) [#501](https://github.com/galaxyproject/foundry/issues/501) — Improved Support for Tool Development; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/501/index.md)
- (mvp) (large) [#504](https://github.com/galaxyproject/foundry/issues/504) — Improve Pattern Pages; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/504/index.md)
- (mvp) [#505](https://github.com/galaxyproject/foundry/issues/505) — Ensure every pattern page has a test workflow.; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/505/index.md)
- (large) [#507](https://github.com/galaxyproject/foundry/issues/507) — Improved Structure and Schemas for Mold Artifacts; decide: work state (work/ready-implement, work/ready-research or work/human). [notes](needs_decision/507/index.md)
- [#176](https://github.com/galaxyproject/foundry/issues/176) — Set legacy DSL1 support posture for Nextflow file and set pipelines; decide: work state (no `work/*` label), or close. [notes](needs_decision/176/index.md)
- (mvp) [#219](https://github.com/galaxyproject/foundry/issues/219) — research: flesh out nextflow-to-galaxy-reference-data-mapping; decide: work state (no `work/*` label), or close. [notes](needs_decision/219/index.md)
- [#282](https://github.com/galaxyproject/foundry/issues/282) — Galaxy pipeline Molds write fixed filenames to cwd — namespace per-source run; decide: work state (no `work/*` label), or close. [notes](needs_decision/282/index.md)
- [#415](https://github.com/galaxyproject/foundry/issues/415) — The Foundry Diagram Makes it look like Molds are not part of the KB; decide: work state (no `work/*` label), or close. [notes](needs_decision/415/index.md)

## Research to review (`needs_decision_review`)

None yet.

## John drives (`needs_decision_human`)

None yet.

## In motion (`wip`)

- (mvp) [#678](https://github.com/galaxyproject/foundry/issues/678) — discovery `status` has no `unsuitable`; capability miss routes to authoring an existing wrapper; contributor draft PR [#773](https://github.com/galaxyproject/foundry/pull/773). [notes](wip/678/index.md)
- (mvp) [#723](https://github.com/galaxyproject/foundry/issues/723) — weak-hit and capability-gap fallbacks let runs author UDTs for tools that already exist; contributor draft PR [#773](https://github.com/galaxyproject/foundry/pull/773). [notes](wip/723/index.md)
- (mvp) [#674](https://github.com/galaxyproject/foundry/issues/674) — interface notes lack a shape-changing param rule; PR [#759](https://github.com/galaxyproject/foundry/pull/759), part of the issue. [notes](wip/674/index.md)
- [#534](https://github.com/galaxyproject/foundry/issues/534) — Replace abstract summarize-nextflow scenarios with concrete pinned fixtures; branch `issue-534-concrete-nextflow-scenarios`. [notes](wip/534/index.md)
- [#548](https://github.com/galaxyproject/foundry/issues/548) — `gxwf draft-validate --concrete`: the other half of #166 — a ParsedTool decode failure's `Error.message` is…; draft PR [#554](https://github.com/galaxyproject/foundry/pull/554). [notes](wip/548/index.md)
- [#694](https://github.com/galaxyproject/foundry/issues/694) — (large) Build PAPER/INTERVIEW → GALAXY on the Workflow Brief Molds, retire the freeform Galaxy Molds; PR [#696](https://github.com/galaxyproject/foundry/pull/696). [notes](wip/694/index.md)
- (mvp) [#672](https://github.com/galaxyproject/foundry/issues/672) — UDT authoring note: collection example vs stale gxwf schema, no vendoring recipes, `inputs.x` shape undocumented; draft PR [#710](https://github.com/galaxyproject/foundry/pull/710) (`issue-672-udt-authoring-note`), needs gxwf release with gtu-ts [#198](https://github.com/jmchilton/galaxy-tool-util-ts/pull/198). [notes](wip/672/index.md)
- [#725](https://github.com/galaxyproject/foundry/issues/725) — Brief Mold has no rule for clear scope that conflicts with source behavior; PR [#728](https://github.com/galaxyproject/foundry/pull/728). [notes](wip/725/index.md)
- (mvp) [#730](https://github.com/galaxyproject/foundry/issues/730) — run-workflow-test: no guidance for UDT-embedding workflows (external_galaxy recipe) or empty data tables; PR [#733](https://github.com/galaxyproject/foundry/pull/733). [notes](wip/730/index.md)
- (mvp) [#731](https://github.com/galaxyproject/foundry/issues/731) — implement-galaxy-workflow-test cross-check overclaims shape/datatype; output cardinality not traced; PR [#734](https://github.com/galaxyproject/foundry/pull/734). [notes](wip/731/index.md)
- (mvp) (assigned) [#570](https://github.com/galaxyproject/foundry/issues/570) — Pattern MOCs are cast without the leaf pattern pages they link; draft [#738](https://github.com/galaxyproject/foundry/pull/738) + foundry-lib#139. [notes](wip/570/index.md)
- (mvp) [#735](https://github.com/galaxyproject/foundry/issues/735) — test-data Molds stage data tables planemo ignores (unsuffixed conf, absolute `.loc`); draft PR [#749](https://github.com/galaxyproject/foundry/pull/749). [notes](wip/735/index.md)
- (mvp) [#568](https://github.com/galaxyproject/foundry/issues/568) — Review the prompt-to-pipeline agent benchmark preprint for comparisons and lessons; draft PR [#750](https://github.com/galaxyproject/foundry/pull/750). [notes](wip/568/index.md)

## Queued to implement (`queued_implement`)

- (mvp) [#757](https://github.com/galaxyproject/foundry/issues/757) — channel-shape note has no route for per-element parameters; next: implement and open a PR. [notes](queued/757/index.md)
- (mvp) [#758](https://github.com/galaxyproject/foundry/issues/758) — pages say `when` can't act per element; next: implement after #755 and open a PR. [notes](queued/758/index.md)
- [#3](https://github.com/galaxyproject/foundry/issues/3) — Hero pipeline-fan widget (replace pipeline matrix / new /pipelines/ landing); next: implement and open a PR. [notes](queued/3/index.md)
- (large) [#40](https://github.com/galaxyproject/foundry/issues/40) — Write IWC exemplar match schema; next: implement and open a PR. [notes](queued/40/index.md)
- [#211](https://github.com/galaxyproject/foundry/issues/211) — summarize-nextflow: resolve from_param through one-hop Groovy bindings; next: implement and open a PR. [notes](queued/211/index.md)
- [#215](https://github.com/galaxyproject/foundry/issues/215) — summarize-nextflow: derived subworkflow-level edge view; next: implement and open a PR. [notes](queued/215/index.md)
- [#216](https://github.com/galaxyproject/foundry/issues/216) — summarize-nextflow: parsed predicate sibling on conditionals[].guard (_derived_pattern); next: implement and open a PR. [notes](queued/216/index.md)
- [#243](https://github.com/galaxyproject/foundry/issues/243) — summarize-cwl: emit a skinny packed CWL (docs + schema.org stripped) alongside the full pack; next: implement and open a PR. [notes](queued/243/index.md)
- [#246](https://github.com/galaxyproject/foundry/issues/246) — Add docs/README.md — human reading order / docs index; next: implement and open a PR. [notes](queued/246/index.md)
- [#252](https://github.com/galaxyproject/foundry/issues/252) — Surface the _provenance.json schema v2 as a renderable schema reference; next: implement and open a PR. [notes](queued/252/index.md)
- [#254](https://github.com/galaxyproject/foundry/issues/254) — Generated STATUS page — what exists, last-touched (fun, not urgent); next: implement and open a PR. [notes](queued/254/index.md)
- (mvp) [#468](https://github.com/galaxyproject/foundry/issues/468) — author-galaxy-tool-wrapper: no validation step, no GalaxyUserTool schema, and the bundled prompt contradict…; next: implement and open a PR. [notes](queued/468/index.md)
- (mvp) (large) [#531](https://github.com/galaxyproject/foundry/issues/531) — Prove the IWC maturation pipeline with runnable fixtures and a .ga entry case; next: implement and open a PR. [notes](queued/531/index.md)
- (mvp) [#666](https://github.com/galaxyproject/foundry/issues/666) — nextflow resolver silently mis-extracts: wrapper as primary, `meta.yml` ports, provenance, fixtures; next: implement in batches per notes, smallest first. [notes](queued/666/index.md)
- (mvp) [#668](https://github.com/galaxyproject/foundry/issues/668) — `draft-validate --json` hides errors; work items omit port edges; loop never uses `--connections`; next: Foundry docs + step 6 PR; gxwf#215, gxwf#216 cover the CLI. [notes](queued/668/index.md)
- [#751](https://github.com/galaxyproject/foundry/issues/751) — Abstract find-test-data and implement-galaxy-workflow-test scenarios name no real fixture; next: implement and open a PR. [notes](queued/751/index.md)

## Queued to research (`queued_research`)

- [#48](https://github.com/galaxyproject/foundry/issues/48) — Write target test plan schema; next: research and add a first comment. [notes](queued/48/index.md)
- [#49](https://github.com/galaxyproject/foundry/issues/49) — Write workflow test run report schema; next: research and add a first comment. [notes](queued/49/index.md)
- [#50](https://github.com/galaxyproject/foundry/issues/50) — Write workflow debug recommendation schema; next: research and add a first comment. [notes](queued/50/index.md)
- [#175](https://github.com/galaxyproject/foundry/issues/175) — Evaluate Galaxy pattern for Nextflow workflow output index files; next: research and add a first comment. [notes](queued/175/index.md)
- [#221](https://github.com/galaxyproject/foundry/issues/221) — research: ref-data complexity bridge fixtures for nextflow-to-galaxy mapping; next: research and add a first comment. [notes](queued/221/index.md)
- (large) [#308](https://github.com/galaxyproject/foundry/issues/308) — Design a Claude dynamic-workflow projection for Foundry Pipelines; next: research and add a first comment. [notes](queued/308/index.md)
- [#621](https://github.com/galaxyproject/foundry/issues/621) — Apply Rules Tutorial Patterns; next: research and add a first comment. [notes](queued/621/index.md)

## Queued, blocked (`queued_blocked`)

- [#271](https://github.com/galaxyproject/foundry/issues/271) — Decide gops_* vs bedtools interval-tool redundancy (interval MOC); blocked on: an IWC workflow using the operation. [notes](queued/271/index.md)
- [#624](https://github.com/galaxyproject/foundry/issues/624) — API Docs Maybe Should Have Corresponding MCP entrypoints; blocked on: a Galaxy change. [notes](queued/624/index.md)
- [#191](https://github.com/galaxyproject/foundry/issues/191) — Galaxy sample-sheet column-value charset gate rejects nf-core canonical values; blocked on: a Galaxy change. [notes](queued/191/index.md)
- (large) [#225](https://github.com/galaxyproject/foundry/issues/225) — Document Galaxy list-of-record collections for reference data; blocked on: a Galaxy change. [notes](queued/225/index.md)

## Untriaged (`untriaged`)

- [#552](https://github.com/galaxyproject/foundry/issues/552) — advance-galaxy-draft-step's built-in/stock version branch is circular
- [#553](https://github.com/galaxyproject/foundry/issues/553) — No reachable route serves a Tool Shed wrapper's raw XML at a pinned changeset
- [#562](https://github.com/galaxyproject/foundry/issues/562) — Sandbox Support - agent-safehouse
- [#566](https://github.com/galaxyproject/foundry/issues/566) — Needs better guidance for importing to a real galaxy instance
- [#572](https://github.com/galaxyproject/foundry/issues/572) — ToolShed-fetch decoder rejects a real IUC wrapper's filtered list-collection output
- [#575](https://github.com/galaxyproject/foundry/issues/575) — `paper-to-test-data` has no scoping or upstream-fixture guidance, and is the weaker half of its own fallback chain
- [#576](https://github.com/galaxyproject/foundry/issues/576) — Test-plan schema requires a file-shaped `fixture` for plain scalar workflow parameters
- [#577](https://github.com/galaxyproject/foundry/issues/577) — `freeform-summary-to-galaxy-test-plan` is silent on being handed a concrete draft and resolved test-data refs
- [#578](https://github.com/galaxyproject/foundry/issues/578) — tests-format has no way to put a value on an intermediate step's input port
- [#579](https://github.com/galaxyproject/foundry/issues/579) — No packaged note documents the `sample_sheet` + `rows:` job-input shape
- [#584](https://github.com/galaxyproject/foundry/issues/584) — Invocation-failure reference has no tell for a stale toolbox read vs. a real install failure
- [#586](https://github.com/galaxyproject/foundry/issues/586) — Galaxy's unprivileged-tool lint fails opaquely on an integer input with `value: 0`
- [#588](https://github.com/galaxyproject/foundry/issues/588) — A `sample_sheet` column was wired onto a plain scalar tool port, a binding that can never work
- [#589](https://github.com/galaxyproject/foundry/issues/589) — `PUT /api/workflows/{id}` defaults `exact_tools` to true and discards the per-step detail it already computed
- [#590](https://github.com/galaxyproject/foundry/issues/590) — Authoring never checks a wrapped script's own declared input-ordering assumption against the tool it will consume from
- [#592](https://github.com/galaxyproject/foundry/issues/592) — Augment freeform-to-Workflow Brief scenarios with real source artifacts
