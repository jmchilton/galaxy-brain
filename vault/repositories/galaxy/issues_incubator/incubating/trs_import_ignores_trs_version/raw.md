# TRS launch links (`/workflows/trs_import?...&run_form=true`) no longer auto-import since 26.1

Found in the 26.2 GTN FAQ loop (`faqs/galaxy/workflows_run_ds.md`, `workflows_run_trs.md`, `workflows_run_wfh.md`),
on `release_26.2` + `galaxy_ui_driver`. Fixes + tests on `jmchilton/galaxy_ui_driver`: commits "Accept trs_version
in TRS import links again" and "Import TRS URL launch links again".

GTN's "Launch" buttons (used by dozens of tutorials) build two kinds of link; both stop at the import wizard in 26.1
and 26.2 instead of importing and opening the run form.

## Repro
1. Logged in, open either of:
   - `/workflows/trs_import?trs_server=dockstore.org&run_form=true&trs_id=%23workflow/github.com/iwc-workflows/kmer-profiling-hifi-VGP1/main&trs_version=v0.1.3`
     (`workflows_run_ds.md`, `workflows_run_wfh.md` with `trs_server=workflowhub.eu`)
   - `/workflows/trs_import?run_form=true&trs_url=https://training.galaxyproject.org/training-material/api/ga4gh/trs/v2/tools/assembly-largegenome/versions/galaxy-workflow-data-qc`
     (`workflows_run_trs.md`)
2. 25.x: imports the workflow (that version) and opens its run form.
3. 26.1/26.2:
   - `trs_version` link: stops at Import Workflow > TRS ID with the id filled in, the newest version preselected and
     nothing imported; clicking Import gets the wrong version and no run form. The same URL with `trs_version_id`
     works.
   - `trs_url` link: stops at Import Workflow > TRS URL with the URL filled in; nothing imported until the user
     clicks Import, and then no run form.

## Cause
- 25.x `client/src/entry/analysis/router.js` mapped `queryTrsVersionId: route.query.trs_version`, and
  `TrsUrlImport.vue` emitted `onImport` on load when given `queryTrsUrl`.
- dd2d14056fb "Integrate TRS search logic into new workflow import UI" (in release_26.1) moved query parsing into
  `WorkflowImport.vue`, reading `route.query.trs_version_id`. `TrsIdImport` only auto-imports when
  `queryTrsVersionId` is set, so `trs_version` links fall through to the manual form.
- 4d58724c524 "Remove redundant mode prop" (in release_26.1) dropped `TrsUrlImport`'s import-on-load (it had been
  limited to the old modal mode "to avoid auto-import in wizard").
- `test/integration_selenium/test_trs_import.py`'s `test_auto_import_by_trs_url_*` and
  `test_import_workflow_by_url_*` click the wizard's Import button, so they kept passing.

## Fix (on the branch)
- `client/src/components/Workflow/Import/trsImportQuery.ts`: parse the TRS import query, version from
  `trs_version ?? trs_version_id` (keep accepting the 26.1 spelling). `WorkflowImport.vue` uses it.
- `TrsUrlImport.vue`: import on load when the query carries a TRS URL.
- vitest `trsImportQuery.test.ts` and `TrsUrlImport.test.ts`, each red on the old code.
- The integration tests above now wait for the import without clicking Import (pass with the fix, against live
  Dockstore and WorkflowHub).

Target: release_26.1.
