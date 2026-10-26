# Debrief: trs_import ignores trs_version

## Research
- Verified on origin: release_25.1 `router.js` mapped `trs_version`; release_26.1 + dev `client/src/components/Workflow/WorkflowImport.vue:69` read only `trs_version_id` (draft had wrong path `Workflow/Import/`).
- dd2d14056fb is from #21516; in release_26.1, not release_26.0.
- `TrsIdImport` auto-imports only with version+server+id set.
- Prior history: #12017, #12021. No duplicate (#16797 is unrelated feature request).

## Rewrite
- Opener + before/after table; cause in details; Context cites #21516 and galaxy_ui_driver; Proposed Approach (accept both spellings, vitest, target release_26.1) + alternatives.
- Review subagent: premise confirmed, relabeled versions "26.0 and earlier | 26.1 / dev".

## Leftovers
- GTN `workflows_run_ds.md` building `trs_version` taken from source notes, not re-checked.
- 26.2 behaviour observed in original FAQ loop (source notes), not re-run.
- Fix commit 57169998d11 exists locally; not re-reviewed.
