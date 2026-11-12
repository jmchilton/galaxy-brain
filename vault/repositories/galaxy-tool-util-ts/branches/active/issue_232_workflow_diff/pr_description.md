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

That is byte for byte what gxformat2#296's `gxwf-diff` prints for the same pair, and `workflow-diff.test.ts` pins this exact text.

***Foundry's test-phase check needs this as a `gxwf` command.*** galaxyproject/foundry#796 found a run that removed steps to make `planemo test` pass, one of them with no ledger entry. The issue asks for a list of every removed step and every unwired input, measured against a snapshot of the draft. Its scoping comment asks for "a new `gxwf` command" to make that diff, and for `run-workflow-test`'s green result to fail for any removed step without a `kind: dropped` ledger entry naming that `step`. The planned Foundry change for #796 will call `gxwf diff --json`; nothing in Foundry calls it yet. The keys of `steps.removed` are step keys, the same keys the ledger's `step:` field uses. A step removed inside an inline subworkflow is listed there too, under a path key such as `nested/first` (inner input, output and edge ids get the same prefix), and list-form steps pair by `id` first, so a relabel is a `label` change rather than a removal. galaxyproject/foundry#784 will report the same diff at the end of a run.

***It is the Python contract, pinned by the same cases.*** The 29 `expectations/diff.yml` cases run here through the declarative harness, which gains `fixture_after` for two-workflow operations. They use the 28 synced `format2/diff/` fixtures and two fixtures the repository already had. They are synced from #296's unmerged branch at `397819a`, its current head. #296 merges first, and this branch re-syncs from gxformat2 `main` once it does.

***It matches Python's whole output, not just the asserted fields.*** The synced cases assert selected fields. A scratch run at `433db8de` against gxformat2 `729027d` compared the full text byte for byte, the JSON with its key order, and the `--exit-code` status. It covered all 23 pairs at the time and two real pairs from the nf-core/bamtofastq run in galaxyproject/iwc-lab#8 (`galaxy-workflow-draft` → final and `galaxy-workflow.before-revision` → final). Everything matched. Both real pairs report no removed steps, three changed steps, and `no_read_QC, no_stats, samtools_collate_fast, reads_in_memory, multiqc_config` as AFTER inputs that feed no step. Neither BEFORE file adds or removes a step relative to the final workflow. The run overwrote its draft with the final 4-tool-step graph, as #796 notes, so this shows agreement, not a caught removal. The scratch run is not one of the branch's tests. A second scratch run at `a5c6cd57` against gxformat2 `397819a` matched text, ordered JSON and exit status on all 29 cases, and the JSON on 34 IWC workflows with inline subworkflows, each with one inner step deleted.

***The known TS/Python differences don't change which steps are reported removed or which inputs are reported unwired.*** They are listed below. Three can flip `has_changes`, and so `--exit-code`, on edge or invalid input. In each, Python reports a change and TS doesn't: `1` against `1.0`, an explicit `type:` change on a step whose `run` is a user tool, and nested input models on input types that don't declare them. Python rejects some malformed input that TS still diffs.

***The exit status is 0 unless `--exit-code` is given***, in which case differences exit 1, like `git diff --exit-code`. A read failure, a native workflow or a `$graph` document exits 2, like the `draft-*` commands.

***`has_changes`, and so `--exit-code`, ignores `unwired_inputs` and `warnings`, as in Python.*** A workflow whose only finding is an unwired input exits 0. A check for unwired inputs, such as #796's, reads them from `--json`, which prints the whole `WorkflowDiff` object.

<details><summary>Accepted differences from the Python contract</summary>

- **Integer-like keys.** JS objects put integer-like keys first, in numeric order. All-unlabeled list-form steps keep workflow order because index ids rise with position. Mixed labeled and unlabeled list-form steps `[a, <2>, c]` come out `2, a, c` (Python: `a, 2, c`) in the JSON and the text. Membership is unchanged, JSON key order isn't meaningful, and those steps already produce a warning.
- **Explicit `type:` with a user-tool `run`.** TS reports `type: tool` for a `GalaxyUserTool` run even when the step sets `type:`; Python honors `type:`. Only invalid input does this, and the shared `inferredStepType` keeps the precedence `mermaid` and `cytoscape` already had.
- **Lenient normalization.** Python's pydantic models reject some malformed input, such as a list-form input with a string `format`. TS diffs it instead.
- **Nested input models** (`validators`, `restrictions`, `suggestions`, `fields`, `column_definitions`). Python compares pydantic dumps, which fill unset keys with `null`. TS drops `null` keys and fills the three pydantic `type` defaults the TS schemas lack (validator `regex`, record field `File`, column `string`), so membership matches. Reported values are the raw objects, without the filled nulls. On input types that don't declare the field (invalid Format2), Python counts an explicit `null` or an omitted default `type` as a change and TS doesn't.
- **Numbers.** Python tells `1` from `1.0`; JS can't.
- **Text output.** Values use Python's `json.dumps` separators, but non-ASCII isn't `\u`-escaped. The text format isn't part of the contract.

</details>

<details><summary>Two incidental fixes</summary>

- **`normalizedFormat2` resolves type aliases on list-form inputs.** A list-form `type: File` now normalizes to `data`, as dict-form inputs and Python already did. This affects every `normalizedFormat2` caller, not just the diff. It is pinned by a `workflow-diff.test.ts` case and by the synced `normalized_format2.yml` case. The changeset mentions it.
- **`readWorkflowFile` reports read failures.** Before, a missing or unreadable file rejected with an unhandled stack trace. Now it prints `Failed to read <path>: <reason>` and returns `null`, like a parse failure does. `diff` and the `draft-*` commands then exit 2, as their headers say. The other commands that call it (`lint`, `convert`, `clean`, `roundtrip`, `mermaid`, `cytoscapejs`, `validate-workflow`, `populate-workflow`) still exit 1, now with one line on stderr. That is the exit code they already gave a parse failure. For `lint`, 1 is also its warnings-only code. Tests cover `diff`, `draft-validate` (exit 2) and `lint` (exit 1, one line), and the changeset describes the change.

</details>

<details><summary>What else changed</summary>

- `diffWorkflows`, `renderWorkflowDiff` and the result types are exported from both `@galaxy-tool-util/schema` barrels. Field names follow Python's snake_case (and camelCase `restrictOnConnections`), so the JSON matches without a key-conversion wrapper.
- It reuses `normalizedFormat2`, `resolveSourceReference`, and `iterateSteps` from `draft-checks` (which already mirrored Python's `iterate_steps`). `presentPlanFields` is new in `draft-checks` and replaces two inline copies there.
- `inferredStepType` in `normalized/format2.ts` replaces identical copies in `mermaid.ts` and `cytoscape.ts`, and an untyped step with a `run` is reported as `subworkflow`, as Python reports it. `isPythonTruthy` in `coercions.ts` replaces `toNative`'s private copy.
- `schema/test/workflow-diff.test.ts` covers the text rendering (ported from `test_diff.py`, plus the full text of the example above), rejecting native, `$graph` and non-mapping input, and the Python-parity fixes: `@import` runs, untyped subworkflow steps, self-loop edges, undeclared `out` keys, the list-form alias, nested-model nulls and `type` defaults, `StateChange` key order, `__proto__` keys, a summary's missing `id` as `null`, nested step headings, and a nested key colliding with a slash-keyed step. `cli/test/diff.test.ts` covers text, `--json` equal to `diffWorkflows`, `--exit-code` 0/1, and exit 2 for native and unreadable input.
- `scripts/sync-manifest.json` gains the `format2/diff/` directory, `docs/guide/workflow-operations.md` gets a row, `docs/skills/gxwf-cli/SKILL.md` is regenerated, and a changeset bumps `schema` and `cli` minor.
- Linked subworkflow contents, native `.ga` and `$graph` are out of scope, as in Python.

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
