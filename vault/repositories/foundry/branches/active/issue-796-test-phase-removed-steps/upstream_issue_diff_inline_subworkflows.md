Draft, not filed. Target: galaxyproject/gxformat2 (owns the `gxwf-diff` contract and `expectations/diff.yml`), before #296 merges; mirror in jmchilton/galaxy-tool-util-ts #233.

---

**Title:** `gxwf-diff`: steps removed inside an inline subworkflow report no change

## Problem

`gxwf-diff` compares only the top level. An inline subworkflow `run` is reported as `run: null` on both sides, so any edit inside it, a removed step included, gives `has_changes: false`.

Repro (gxformat2 `issue_295_workflow_diff` at `570de0f`, and gtu-ts `issue_232_workflow_diff` at `3fd23149` with `gxwf diff --json`):

```yaml
# before.gxwf.yml
class: GalaxyWorkflow
inputs:
  reads: data
outputs:
  out:
    outputSource: nested/out
steps:
  nested:
    in:
      inner_reads: reads
    run:
      class: GalaxyWorkflow
      inputs:
        inner_reads: data
      outputs:
        out:
          outputSource: second/out_file1
      steps:
        first:
          tool_id: cat1
          in:
            input1: inner_reads
        second:
          tool_id: cat1
          in:
            input1: first/out_file1
```

`after.gxwf.yml` is the same with `first` deleted and `second` wired to `inner_reads`. Both implementations print `No differences.`

## Why it matters

galaxyproject/foundry#796 fails a green test run when a step removed since extraction has no `kind: dropped` ledger entry. It reads `steps.removed`, so a step removed inside an inline subworkflow passes unchecked.

## Proposal

Recurse into inline `run` workflows and report nested steps under a path key (e.g. `nested/first`), as the native roundtrip diff already does for inline subworkflows (gtu-ts `docs/guide/workflow-operations.md`, "Inline subworkflows *are* recursed ... parent-prefixed step ids"). At minimum, report a changed inline `run` on the parent step so `has_changes` is true. Linked `run` references keep today's string or `@import` comparison. Add `diff.yml` cases for a removed nested step and an unchanged inline subworkflow.
