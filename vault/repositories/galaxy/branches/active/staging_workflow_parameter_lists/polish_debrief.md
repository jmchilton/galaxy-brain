# Polish debrief

Coordinator: Claude Opus 5.5; subagents Claude Opus at high effort.

- Hardening was missing; John chose to harden first. Ran test challenges (trimmed tests, `1d9fe514`), Codex (no findings), thermo-nuclear (predicate collapse), baseline refactor (3 commits), scope evaluation.
- Scope eval recommended retargeting `dev` → `release_26.2`; John approved. Clean rebase, head `a812cad3`; unit (25), `multiple_text`, `multiple_integer_into_data_column`, boolean-param subworkflow API test green; check-branch clean ([retarget](retarget_release_26_2.md)).
- Checklist: 9/9 pass ([pr_checklist](pr_checklist.md)).
- Strengthening round: planemo adoption proven against this branch on a local unpushed scratch branch ([proof](planemo_adoption_proof.md)); description reworked (Follow-up opener, #1744 quote, idc#103 as real-world hit, version-check wording, invocation-time 400, Codex scope).
- Fork CI on `a812cad3`: all jobs still queued at handoff.

## Leftovers

- planemo pins galaxy packages `<26.2`; adopting needs a cap lift + version check (passing the kwarg to 26.1.2 raises TypeError).
- `scope_evaluation.md` still overstates #23802 widening the bug surface (int lists already invoke on 26.1).
- Misleading 400 hint at `run_request.py:443` ("parameter_value wrapper") — possible separate `dev` fix.
- `GX_DEVELOPMENT.md` quick-mypy tip misleads on 26.2 (root-run ignores per-module exemptions).
- Local scratch branches: planemo `scratch/parameter_input_keys_proof`; Galaxy backups `backup/staging_workflow_parameter_lists_pre_baseline_refactor`, `..._pre_retarget_26_2`.
- Open questions: planemo cap/version-check strategy; Galaxy issue for a "Fix 🎯" opener; adopt on `list-param-inputs-not-collections` now.

## Snapshot

```
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/staging_workflow_parameter_lists/differential-review/snapshots/20261028T170138Z-polishing-a812cad36b70.json
  polishing @ a812cad36b70 vs origin/release_26.2 (merge-base 0902830bfa67)
  since 20261027T014150Z-implementation-05af76568c3a:
    commits: 0 same, 0 rebased, 2 changed, 1 new, 2 dropped
    hunks:   10 carried, 1 changed, 2 new, 4 dropped
    new     8d8a842b6312 Collapse cwl_style scalar and scalar-list branches into one predicate
    changed 57c30924782f Let staging leave parameter input values unstaged (5 differing hunks)
    changed a812cad36b70 Use parameter_input_keys in WorkflowPopulator cwl_style staging (1 differing hunk)
```
