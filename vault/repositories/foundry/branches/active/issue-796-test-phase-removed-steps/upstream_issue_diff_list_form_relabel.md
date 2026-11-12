Superseded: fixed in gxformat2#296 (`397819a`) and galaxy-tool-util-ts#233 (`a5c6cd57`) instead of filed. See [subagents/upstream_fix_followup.md](subagents/upstream_fix_followup.md).

Draft, not filed. Target: galaxyproject/gxformat2, before #296 merges; mirror in jmchilton/galaxy-tool-util-ts #233.

---

**Title:** `gxwf-diff`: adding or changing a list-form step's label reads as remove + add

## Problem

Steps match on their step key, and a list-form step's key is its `label`, else its `id`. So a label change on a list-form step reports the step removed under its old key and added under its new one, with the same tool and connections. For a dict-form step the same edit is a `fields.label` change (`test_diff_changed_tool_version_state_label_when_and_input` in `expectations/diff.yml`).

Repro (gxformat2 `issue_295_workflow_diff` at `570de0f`, and gtu-ts `issue_232_workflow_diff` at `3fd23149`):

```yaml
# before.gxwf.yml
class: GalaxyWorkflow
inputs:
  - id: reads
    type: data
outputs:
  - id: out
    outputSource: first/out_file1
steps:
  - id: first
    tool_id: cat1
    in:
      input1: reads
```

`after.gxwf.yml` adds `label: first cat` to the step and points `out` at `first cat/out_file1`. Both print:

```
Output changed: out source: first/out_file1 -> first cat/out_file1
Step removed: first [cat1]
Step added: first cat [cat1]
```

A related gap: when a list-form step's `id` differs from its `label`, the removed-step summary carries only the label, so a consumer can't match the step by its `id`.

## Why it matters

galaxyproject/foundry#796 reads `steps.removed` and fails a green test run for any removed step with no `kind: dropped` ledger entry. A relabel false-fails that check, and Foundry's debug Mold has to tell a relabel from a removal by comparing `removed` and `added` by hand.

## Proposal

Pair a list-form step across BEFORE and AFTER by its `id` when both sides have the same one, and report a label difference as `fields.label`, as for dict form. Report the raw `id` on step summaries. Add `diff.yml` cases for an added label and a changed label on a list-form step.
