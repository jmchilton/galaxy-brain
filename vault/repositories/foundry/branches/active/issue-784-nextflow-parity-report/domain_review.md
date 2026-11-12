Run via Claude Opus 5.5.

# Domain review — `4ff48eda..c111bb97`

Reviewed against `wf_foundry/reviewers/DOMAIN_REVIEW.md`, `mold-spec.md` and `eval-philosophy.md`. Content-only fixes in `a9311739`. The package code needed no change. Two upstream issues are drafted below and not filed.

## Fixed

- **§4 stale status in cast text.** The `[[gxwf]]` reference's `purpose` said "`diff` needs a release newer than the pinned one", which the cast copies into `SKILL.md` and which goes stale on the pin bump. Dropped. `verification` already carries the release condition, now without "ships".
- **§3 / §5 Mold body.** The opener listed what the Mold doesn't do, and step 4 repeated it. Now one "must not" sentence: don't change the workflow, ledger or test result, and don't judge acceptability. "Never sends the run back into the test loop" is harness behaviour and stays in the pipeline harness note only. Cut the closing "Later review or maturation…" line, the self-defending clause on diffing the snapshot (the CLI's exit 3 enforces it), and the closure-flag justification.
- **§1 Tool versions.** The `+galaxy` version-string heuristic is a stand-in for an upstream gap (issue B below). Kept "mark unverified", condensed to one instruction.
- **§2 / §6.3 eval oracle.** The five deterministic properties now name `nextflow-galaxy-parity.json` as the oracle, and the Findings section is a `kind | subject | detail | section` table, so "every command finding is reported" is a mechanical match. Dropped the file preamble and "The run's next action never depends on the report" (no oracle on the Mold's output).
- **§2 scenarios.**
  - Case 1: cut the "Shaped like…" provenance. Rechecked every expect against a live run of `foundry nextflow-parity` on the fixture: seven findings, `view_map_map` joined to `arg-view-map-map-args` (`carried`), `to_fastq` `calls_from: records`, samtools 1.17 with `biocontainers/samtools:1.17--h00cdaf9_0`.
  - Case 2: replaced the flow-style dict and `<cited error>` with the test file's concrete `chr-filter-dropped` entry. Cut the comparison with `run-workflow-test`'s example.
  - Case 3 needs five inputs, but it gave only a ledger and a summary. It now binds a nextflow-to-galaxy run on pinned nf-core/sarek 3.8.1 whose interface phase writes the example ledger. Control names corrected to `params.step`/`params.aligner`/`params.tools`, as the ledger writes them. `check-scope-records` against the sarek summary exits 0 (`tests/scope-decisions.test.ts`, which ran here).
  - Case 4: cut the "needs a rerun" maturity note. The fixture is now the run itself: nf-core/bamtofastq 2.2.1 with DeepSeek V4.1 Flash, as in iwc-lab#8. `fixtures.yaml` pins 2.2.0, so this is open (implementation debrief question 7).
- **§3 pipeline provenance.** Cut "Lifted from `content/meta/harness-pipelines.md`" from `nextflow-to-galaxy`.

Casts regenerated (`make casts generated assemble-pipelines`).

## Checked, no change

- Mold-spec conformance: frontmatter, typed references (hypothesis refs carry `verification`, on-demand refs carry `trigger`), no body meta-content, eval/scenario split.
- Pipeline phase and handoffs: `galaxy-workflow-draft-snapshot` comes from `advance-galaxy-draft-step` (same id and filename), `workflow-test-result` from `run-workflow-test`, `summary-nextflow` from `summarize-nextflow`. The last phase consumes and emits nothing later phases need.
- Interface Mold rev 8 calls `check-scope-records`. That is a CLI check for a "must" rule (§5), and the deterministic eval property names it. It has the same unpublished-command dependency as #818's `check-step-removals`, already question 2.
- `[[open-requirements-ledger]]` stays `load: upfront`. The Unverified section reads gap, tie, surrender and `confidence` records that the JSON doesn't classify, so every run needs the note.
- Code comments: no archaeology or "does not check" notes.

## Not fixed (pre-existing)

- `nextflow-to-galaxy` body: "Replaces the prior-art hand-authored `nf-to-galaxy` skill…" is archaeology and repeats the first harness note.

## Drafted upstream issues (not filed)

### A. `jmchilton/galaxy-tool-util-ts`: export workflow step keying and `resolveSourceReference` from `@galaxy-tool-util/schema`

> **Export the step keying `diffWorkflows` uses, and `resolveSourceReference`, from the `@galaxy-tool-util/schema` root**
>
> Consumers that join `gxwf diff --json` output back to the raw workflows need the same step keys the diff uses. Foundry's `foundry nextflow-parity` reads each kept step's `_plan_state` from the snapshot, so it re-implements the keying: dict key, else label, else `id`, else index after the inputs, and `<parent>/<key>` only under a subworkflow that is inline on both sides. It can't re-implement `alignSteps`' pairing of list-form steps by `id` across a relabel, so it exits 3 on that input instead.
>
> At 1.15.0, `resolveSourceReference` is exported from `workflow/normalized/index.ts` but not from the package root (`import("@galaxy-tool-util/schema").resolveSourceReference` is `undefined`). `iterateSteps` in `draft-checks.ts` and `buildSide`/`alignSteps` in `workflow-diff.ts` (PR #233, `a5c6cd57`) are private.
>
> Either of these would remove the copy:
>
> 1. Export `resolveSourceReference` and a step iterator that yields `[key, rawStep]` exactly as `diffWorkflows` keys steps, including the relabel pairing.
> 2. Add the keys of steps present on both sides to `WorkflowDiff`, e.g. `steps.unchanged: string[]` plus a `steps.renamed` map for id-paired relabels, so a consumer needs no keying of its own.
>
> PR #233 is still open, so the export could land with `gxwf diff`.

### B. `jmchilton/galaxy-tool-util-ts`: `ParsedTool` drops `requirements`, `containers` and `stdio`

> **`ParsedTool` schema drops the `requirements`, `containers` and `stdio` Galaxy serves**
>
> Galaxy's `ParsedTool` (`lib/galaxy/tool_util_models/_models.py`) has `requirements`, `containers` and `stdio`. The Tool Shed serves them: `GET https://toolshed.g2.bx.psu.edu/api/tools/iuc~samtools_view~samtools_view/versions/1.15.1+galaxy2` returns `requirements: [{type: package, name: samtools, version: 1.15.1}, {type: package, name: gawk, version: 5.1.0}]`. The Effect schema in `packages/schema/src/schema/parsed-tool.ts` lacks the three fields, so `decodeParsedTool` (`packages/core/src/client/toolshed.ts`) strips them and `ToolCache.saveTool` stores the decoded ParsedTool without them.
>
> Add the three fields, optional so older servers still decode, to match Galaxy's model. Downstream, Foundry's source-parity report can then compare a wrapper's package requirement with the Nextflow process's container and conda pins. Today it can only read the `1.15.1+galaxy2` version string and mark the comparison unverified.

Once B lands and Foundry's pin includes it, the parity Mold's Tool versions paragraph should read the requirement from the tool cache, and its "No input carries a Tool Shed wrapper's requirement" sentence should be deleted.

## Gate

`npm run packages-build`, `make -k check`, `npm run typecheck`, `npm run packages-typecheck` at `a9311739`: red only on `validate-roadmap` (GitHub rate limit) and `check-vendored` (machine-only), as before. 503 root tests pass. `npm run validate`: 71 warnings, same as base.
