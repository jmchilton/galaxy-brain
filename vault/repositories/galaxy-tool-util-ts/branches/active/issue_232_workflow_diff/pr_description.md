Implement 🎯 #232 - `diffWorkflows` and `gxwf diff BEFORE AFTER` report what changed structurally between two Format2 workflows, drafts included, in the result shape of galaxyproject/gxformat2#296.

A draft taken before the test loop, diffed against the final workflow (the synced `format2/diff/synthetic-diff-draft-before` and `-after` fixtures):

```console
$ gxwf diff synthetic-diff-draft-before.gxwf.yml synthetic-diff-draft-after.gxwf.yml
Output changed: fastq source: to_fastq/TODO_fastq -> to_fastq/output
Step removed: chr_filter (keep only requested chromosomes) [TODO TODO]
    upstream: chr, reads
    downstream: to_fastq
    has _plan_state
    has _plan_context
Step changed: to_fastq (convert BAM to FASTQ)
    tool_id: TODO -> toolshed.g2.bx.psu.edu/repos/iuc/samtools_fastx/samtools_fastx/1.15.1+galaxy2
    tool_version: TODO -> 1.15.1+galaxy2
    state output_fmt: added fastqsanger
    - chr_filter/TODO_filtered -> to_fastq/TODO_input
    + reads -> to_fastq/input
AFTER inputs feeding no step: chr
```

That is byte for byte what gxformat2#296's `gxwf-diff` prints for the same pair.

***Foundry's test-phase check needs this as a `gxwf` command.*** galaxyproject/foundry#796 found a run that removed steps to make `planemo test` pass, one of them with no ledger entry. Its plan is to snapshot the draft before the test phase, diff it against the final workflow with "a new `gxwf` command", and fail the green result for any removed step that has no `kind: dropped` ledger entry naming that `step`. `gxwf diff --json` is meant to be that command. The keys of `steps.removed` are step keys, the same keys the ledger's `step:` field uses. galaxyproject/foundry#784 will report the same diff at the end of a run. Nothing in Foundry calls it yet.

***It is the Python contract, pinned by the same cases.*** The 23 `expectations/diff.yml` cases over 21 `format2/diff/` fixtures run here through the declarative harness, which gains `fixture_after` for two-workflow operations. They are synced from #296's unmerged branch at `729027d`, its current head. #296 merges first, and this branch re-syncs from gxformat2 `main` once it does.

***It agrees with Python on a real Foundry run.*** On the nf-core/bamtofastq run in galaxyproject/iwc-lab#8, both `galaxy-workflow-draft` → final and `galaxy-workflow.before-revision` → final give identical text and deep-equal JSON from `gxwf diff` and `gxwf-diff`. Both list `no_read_QC, no_stats, samtools_collate_fast, reads_in_memory, multiqc_config` as AFTER inputs that feed no step. That run's draft already had the final 4 steps, so this shows agreement, not a caught removal. The check was run by hand while writing this description; the branch's tests are the synced cases.

***The known TS/Python differences don't change which steps are reported removed or which inputs are reported unwired.*** They are listed below. A few can flip `has_changes` (and so `--exit-code`) on edge or invalid input: `1` against `1.0`, extra keys on an `out` entry, nested input models on input types that don't declare them, and malformed input that Python rejects and TS still diffs.

***The exit status is 0 unless `--exit-code` is given***, in which case differences exit 1, like `git diff --exit-code`. A read failure, a native workflow or a `$graph` document exits 2, like the `draft-*` commands. `--json` prints the `WorkflowDiff` object; `has_changes` is part of it.

<details><summary>Accepted differences from the Python contract</summary>

- **Integer-like keys.** JS objects put integer-like keys first, in numeric order. All-unlabeled list-form steps keep workflow order because index ids rise with position. Mixed labeled and unlabeled list-form steps `[a, <2>, c]` come out `2, a, c` (Python: `a, 2, c`) in the JSON and the text. Membership is unchanged, JSON key order isn't meaningful, and those steps already produce a warning.
- **Explicit `type:` with a user-tool `run`.** TS reports `type: tool` for a `GalaxyUserTool` run even when the step sets `type:`; Python honors `type:`. Only invalid input does this, and the shared `inferredStepType` keeps the precedence `mermaid` and `cytoscape` already had.
- **Extra keys on an `out` entry.** TS compares only the declared output actions. Python dumps its `extra="allow"` model, so an extra key such as `_plan_note` counts as an action change there. That goes against the contract's action list and its "`_plan_*` fields never count" rule, so Python is the side to change.
- **Lenient normalization.** Python's pydantic models reject some malformed input, such as a list-form input with a string `format`. TS diffs it instead.
- **Nested input models** (`validators`, `restrictions`, `suggestions`, `fields`, `column_definitions`). Python compares pydantic dumps, which fill unset keys with `null`. TS drops `null` keys and fills the three pydantic `type` defaults the TS schemas lack (validator `regex`, record field `File`, column `string`), so membership matches. Reported values are the raw objects, without the filled nulls. On input types that don't declare the field (invalid Format2), Python counts an explicit `null` or an omitted default `type` as a change and TS doesn't.
- **Numbers.** Python tells `1` from `1.0`; JS can't.
- **Text output.** Values use Python's `json.dumps` separators, but non-ASCII isn't `\u`-escaped. The text format isn't part of the contract.

</details>

<details><summary>Two incidental fixes</summary>

- **`normalizedFormat2` resolves type aliases on list-form inputs.** A list-form `type: File` now normalizes to `data`, as dict-form inputs and Python already did. This affects every `normalizedFormat2` caller, not just the diff. It is pinned by a `workflow-diff.test.ts` case and by the synced `normalized_format2.yml` case. The changeset mentions it.
- **`readWorkflowFile` reports read failures.** Before, a missing or unreadable file rejected with an unhandled stack trace. Now it prints `Failed to read <path>: <reason>` and returns `null`, like a parse failure does. `diff` and the `draft-*` commands then exit 2, as their headers say. The other commands that call it (`lint`, `convert`, `clean`, `roundtrip`, `mermaid`, `cytoscapejs`, `validate-workflow`, `populate-workflow`) still exit 1, now with one line on stderr. Only the `gxwf diff` path has a test.

</details>

<details><summary>What else changed</summary>

- `diffWorkflows`, `renderWorkflowDiff` and the result types are exported from both `@galaxy-tool-util/schema` barrels. Field names follow Python's snake_case (and camelCase `restrictOnConnections`), so the JSON matches without a key-conversion wrapper.
- It reuses `normalizedFormat2`, `resolveSourceReference`, and `iterateSteps` from `draft-checks` (which already mirrored Python's `iterate_steps`). `presentPlanFields` is new in `draft-checks` and replaces two inline copies there.
- `inferredStepType` in `normalized/format2.ts` replaces identical copies in `mermaid.ts` and `cytoscape.ts`, and an untyped step with a `run` is reported as `subworkflow`, as Python reports it. `isPythonTruthy` in `coercions.ts` replaces `toNative`'s private copy.
- `schema/test/workflow-diff.test.ts` covers the text rendering (ported from `test_diff.py`), rejecting native, `$graph` and non-mapping input, and the Python-parity fixes: `@import` runs, untyped subworkflow steps, self-loop edges, undeclared `out` keys, the list-form alias, nested-model nulls and `type` defaults, `StateChange` key order, and `__proto__` keys. `cli/test/diff.test.ts` covers text, `--json` equal to `diffWorkflows`, `--exit-code` 0/1, and exit 2 for native and unreadable input.
- `scripts/sync-manifest.json` gains the `format2/diff/` directory, `docs/guide/workflow-operations.md` gets a row, `docs/skills/gxwf-cli/SKILL.md` is regenerated, and a changeset bumps `schema` and `cli` minor.
- Subworkflow contents, native `.ga` and `$graph` are out of scope, as in Python.

</details>

## Risks

Mostly a two-way door: the function, the command and the harness field are additive. The part that is hard to walk back is the `WorkflowDiff` shape, which is shared with gxformat2#296 through `diff.yml` and which Foundry will read.

<details><summary>Risk Details</summary>

- `WorkflowDiff` and its types become public `@galaxy-tool-util/schema` API, and `gxwf diff` a public command. Changing the shape later means changing gxformat2, this package and Foundry together.
- The fixtures come from an unmerged gxformat2 branch. If #296 changes before it merges, this branch has to re-sync.
- The list-form alias fix changes `normalizedFormat2` output for every caller that reads list-form inputs.
- The accepted differences above stay until someone fixes them on one side. None of them touches `steps.removed` membership or `unwired_inputs`.

</details>

<details><summary>Risk Review Advice</summary>

The contract decisions (step-key matching, what isn't compared, explicit `false` or empty treated as absent) are reviewed on gxformat2#296. Here, the things worth a human look are whether the accepted differences are acceptable, and the two changes outside the diff: the list-form alias fix and `readWorkflowFile`'s new behavior on read failure.

</details>

## Context

Closes #232. Port of galaxyproject/gxformat2#296 (galaxyproject/gxformat2#295), which merges first. Motivated by galaxyproject/foundry#796, which needs to diff a pre-test draft snapshot against the final workflow to catch removed steps, and galaxyproject/foundry#784, which asks for an end-of-run divergence report.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approved after fixing <code>StateChange</code> key order and typing the step views; kept the function-by-function mirror of <code>diff.py</code>.</summary>

A key-order sweep over all 23 `diff.yml` pairs found `StateChange` emitting `kind` first, where Python dumps `before, after, kind`. That is fixed, with a test. A refactor with no behavior change typed `StepView.fields`, paired each raw step with its normalized step once, typed the output actions, and shared one `isPythonTruthy`. Afterwards text, deep-equal JSON and key order all matched Python on the 23 pairs. Not acted on: gating the nested-model type defaults by input type, which only matters for invalid Format2, and splitting out the renderer (the file is under the size bar, and Python keeps them together).

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_232_workflow_diff/thermo_nuclear_review/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Three confirmed bugs fixed: a missing file crashed, nested-model <code>type</code> defaults differed from Python, and <code>__proto__</code> keys vanished.</summary>

A missing input file rejected with a stack trace (exit 1); it now exits 2 with a message. TS reported `{expression}` against `{type: regex, expression}` as a change because the TS schemas lack pydantic's validator, record-field and column `type` defaults; they are now filled in. A step, input, output or state path named `__proto__` set the prototype, so a step with that key dropped out of `steps.added` and `has_changes` came out false; every keyed record is now built with `Object.fromEntries`. Each fix has a red-to-green test. The fourth finding, an explicit `type:` losing to a user-tool `run`, is an accepted difference.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_232_workflow_diff/codex_review/). Run via gpt-6-sol at medium effort.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
