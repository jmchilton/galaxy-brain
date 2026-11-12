Implement 🎯 #295 - `diff_workflows` and a `gxwf-diff` console script report what changed structurally between two Format2 workflows, drafts included.

A draft taken before the test loop against the final workflow, from the branch's `format2/diff/synthetic-diff-draft-before` and `-after` fixtures:

```console
$ gxwf-diff synthetic-diff-draft-before.gxwf.yml synthetic-diff-draft-after.gxwf.yml
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

***Foundry runs remove steps during the test loop, and nothing notices.*** In galaxyproject/foundry#796, an nf-core/bamtofastq run went from a full-scope design to 4 tool steps across 18 `planemo test` attempts. One removal (the chr filter) had no ledger entry, and the test still passed. Today, comparing the workflow before and after a phase means reading two YAML files by hand. The fixture pair above is modeled on that chr filter removal: the removed step, what fed it, what it fed, and the rewire all come out in one report.

***It is a structural diff, not a text diff.*** Steps are reported under their step key, the same key that source refs, `detect_draft` and Foundry's ledger `step:` field use. A draft step keyed `multiqc` and labelled "aggregate QC with MultiQC" that is relabelled `multiqc` in the final workflow shows as a `label` change, not as one step removed and one added. That happens on the real bamtofastq draft and final. List-form steps, whose key is their label, pair by `id` first, so adding or changing their label is a `label` change too. `TODO_*` port renames don't hide a removed step either: `upstream` and `downstream` list neighbouring steps and inputs, while `connections_in` and `connections_out` keep the port-level edges.

***Unwired inputs flag removals without a pre-test snapshot.*** They are read from AFTER alone. On bamtofastq's shipped final workflow (run folder in galaxyproject/iwc-lab#8), `gxwf-diff` lists `no_read_QC, no_stats, samtools_collate_fast, reads_in_memory, multiqc_config` as AFTER inputs that feed no step. Four of them are toggles for steps the run removed: pre-conversion FastQC, samtools stats/flagstat/idxstats, and collate. That run kept no pre-test snapshot (its draft file already has the final 4 steps), so the removed steps themselves can't be shown from it.

***On a real snapshot pair, it reports the parameter changes the run's change-set recorded, and nothing else.*** The same run did keep a snapshot before its revision phase. Diffing `galaxy-workflow.before-revision.gxwf.yml` against the final workflow gives six state leaves on `post_fastqc`, `multiqc` and `fastx_single`. Those are the change-set's parameter rows 1-4, 8 and 9 (`revision/galaxy-workflow-changeset.md`; rows 5-7 and 10 leave keys absent, rows 11-12 remove frames, which aren't compared), and the diff shows no step, edge or output change, which matches the change-set's "step set, wiring, tool versions, outputs: unchanged". That is agreement on a revision, not a caught removal. No pre-test snapshot exists yet to show one.

***State is compared as written, with no tool metadata.*** An absent parameter and one set to `null`, `""` or `[]` differ, because Galaxy substitutes the tool default for the absent one. The six leaves above are that kind of change: the revision spelled out, on purpose, parameters the workflow had left implicit. The diff can't tell a filled-in default from a new value.

***This is the library half; Foundry still has to take the snapshot and call it.*** galaxyproject/foundry#796 and galaxyproject/foundry#784 will build on it; nothing in Foundry calls it yet.

***`_plan_*` fields never count as changes.*** They are shown on added, removed and changed steps so a step can be traced back to its source. A draft whose only edits are plan text has no changes.

***Inline subworkflows are diffed into the same maps, with path keys.*** A step removed inside inline subworkflow step `nested` is `steps.removed["nested/first"]`; inner input and output ids and edge nodes get the same `nested/` prefix. A consumer reading `steps.removed` sees nested removals without walking a tree. An added or removed subworkflow step lists only itself. Linked runs (URL, path, `@import`) compare by reference.

***Only Format2.*** Native `.ga` and `$graph` documents are rejected with `ValueError`.

***The exit status is 0 unless `--exit-code` is given***, in which case differences exit 1, like `git diff --exit-code`. `--json` prints the `WorkflowDiff` pydantic model; `has_changes` is part of it.

<details><summary>What is compared</summary>

- **Steps:** `label`, `type`, `tool_id`, `tool_version`, `when` and a linked `run` (a URL or path string, or `{"@import": path}`; inline runs compare as `null` and are diffed recursively instead). Also `state` (falling back to `tool_state`) as `|`-joined leaf paths, the `default` of each step `in` entry (`in_defaults`), output actions on declared `out` ports (`out_actions`: `rename`, `hide`, `change_datatype`, tags, `delete_intermediate_datasets`, `set_columns`), and edges.
- **Inputs:** `type`, `collection_type`, `optional`, `format`, `default`, `min`, `max`, `restrictions`, `suggestions`, `restrictOnConnections`, `validators`, `fields`, `column_definitions`. A missing `optional` or `restrictOnConnections` equals `false`, and a string `format` equals a one-item list.
- **Outputs:** `outputSource`.
- **Not compared:** workflow metadata (label, doc, tags, creator, license, comments, report), step `doc`, position and `tool_shed_repository`, bare `out` declarations with no actions, input `label`/`doc`/`position`, and linked subworkflow contents. A repeat in state shows as a change to the whole list.
- Explicit `false` or empty output actions equal absent ones, so `hide: false` against no `hide` is not a change. State is the exception: an absent leaf against `null`, `""` or `[]` is `kind: added`.
- Sources resolve with the existing `resolve_source_reference` (longest label first) over step keys, ids, labels and input ids. `<input>/output` collapses to `<input>`, because the converter treats them as one connection.
- A dict-form step is matched by its key, not its inner `id`, so changing the inner `id` is not a change.
- List-form steps with the same `id` on both sides (unique on each side) match first and report under the AFTER key; a pair whose AFTER key is another unpaired BEFORE step's key falls back to key matching. Added and removed steps carry their raw `id`. Nested keys under a paired step use its AFTER key.
- Unlabeled list-form steps with no `id` are matched by position, with a warning naming them.
- `unwired_inputs` lists top-level inputs only. A prefixed step key, input or output id that another level also uses raises `ValueError`, changed or not.

</details>

<details><summary>What else changed</summary>

- `gxformat2.testing.TestCase` gains an optional `fixture_after`. When it is set, the operation gets `(load(fixture), load(fixture_after))`. Existing cases are unaffected.
- `gxformat2/examples/expectations/diff.yml` adds 32 declarative cases over 32 new `format2/diff/` fixtures, all in the catalog. They include a step whose only change is an `in` default, one whose only change is an output action, an undeclared `out` key that isn't one, omitted nested input types (validator, record field, sample-sheet column) that equal their defaults, a step removed inside an inline subworkflow, inner interface changes, a list-form relabel, its two key-matching fallbacks (an `id` not unique on one side, a pair onto an unpaired BEFORE key), and a relabeled parent prefixing two inline levels. Key order in the JSON isn't part of the contract. `normalized_format2.yml` now pins the list-form input `File` → `data` alias. `tests/test_diff.py` covers the CLI: text output, `--json` matching the model dump, `--exit-code`, native input being rejected, and nested keys or input ids colliding with slash-keyed ones being rejected, changed or not.
- `draft._iterate_steps` and `draft._present_plan_fields` become public (`iterate_steps`, `present_plan_fields`) so the diff can reuse draft step iteration.
- `docs/cli_diff.rst` documents the script, and `gxformat2.diff` is in the API docs.

</details>

## Risks

Mostly a two-way door: the module, script and harness field are additive and touch no existing behavior. The part that is hard to walk back is the `WorkflowDiff` shape and the `diff.yml` cases, which the TypeScript port and Foundry will mirror.

<details><summary>Risk Details</summary>

- `WorkflowDiff`'s field names, edge-string format (`"<step>/<port> -> <step>/<port>"`) and ordering become a shared contract once the TypeScript port syncs `diff.yml`. Changing them later means changing both.
- `gxwf-diff` is a new public console script name, and `iterate_steps`/`present_plan_fields` are new public `draft` names.
- Edge strings, and the `parent/child` keys of inline subworkflow steps, are ambiguous for step keys that contain `/`. They're meant to be compared, not parsed; an actual key collision raises `ValueError`.
- Things left out (bare `out` declarations, `tool_shed_repository`, comments, linked subworkflow contents, repeat items) show no difference when they change. A consumer that relies on `has_changes` alone won't see them. In the bamtofastq revision, change-set rows 11-12 removed two frame comments, and the diff doesn't show them.

</details>

<details><summary>Risk Review Advice</summary>

The decisions worth a human check are step-key matching (rather than labels), the "not compared" list, and treating explicit `false` or empty values as absent. These shape what Foundry will treat as a change. The `diff.yml` header comment documents the result shape and is the quickest place to review the contract.

</details>

## Context

Motivated by galaxyproject/foundry#796, which needs to diff a pre-test draft snapshot against the final workflow to catch test-phase step removals, and galaxyproject/foundry#784, which asks for an end-of-run divergence report. A parallel TypeScript `gxwf diff` in jmchilton/galaxy-tool-util-ts will mirror this contract and sync `expectations/diff.yml` and the `format2/diff/` fixtures, so this merges first.

TypeScript port: jmchilton/galaxy-tool-util-ts#233 (draft).

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Merged four copies of one keyed-value comparison and two edge projections; output byte-identical.</summary>

Three rounds of fixes had left four hand-rolled versions of one comparison (step fields, input fields, state, and step port values) and two copies of the edge projection. Each step is now projected once into a view, and one ordered-union rule compares them. JSON and text output matched byte for byte before and after on 568 fixture pairs and 30 hand-written cases. Not acted on: delegating to `NormalizedFormat2.resolve_source`, which keys on label rather than step key, and splitting the 605-line module.

[Full report](https://galaxy-brain.jmchilton.net/repositories/gxformat2/branches/issue_295_workflow_diff/thermo_nuclear_review/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Three confirmed false negatives fixed, one in part: bare <code>out</code> declarations are still not compared.</summary>

Fixed, each with a declarative case: a step keyed `a/output` was read as input `a`, input restrictions and bounds weren't compared, and output action changes weren't reported (now `out_actions`). A follow-up commit makes explicit `false` and empty values equal absent ones, which the new comparisons would otherwise have reported. A bare `out: [a]` → `[b]` still reports nothing: bare declarations only document a port, and comparing them would flood draft diffs with `TODO_*` port churn.

[Full report](https://galaxy-brain.jmchilton.net/repositories/gxformat2/branches/issue_295_workflow_diff/codex_review/). Run via gpt-6-sol at medium effort.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
