# TRS launch links (`/workflows/trs_import?...&trs_version=...&run_form=true`) no longer auto-import since 26.1

Found in the 26.2 GTN FAQ loop (`faqs/galaxy/workflows_run_ds.md`), on `release_26.2` + `galaxy_ui_driver`. Fix +
test on `jmchilton/galaxy_ui_driver`: commit "Accept trs_version in TRS import links again" (57169998d11 at time of writing).

## Repro
1. Logged in, open
   `/workflows/trs_import?trs_server=dockstore.org&run_form=true&trs_id=%23workflow/github.com/iwc-workflows/kmer-profiling-hifi-VGP1/main&trs_version=v0.1.3`
   (the URL GTN's `workflows_run_ds.md` "Launch" buttons build, used by e.g. VGP tutorials).
2. 25.x: imports v0.1.3 and opens its run form.
3. 26.1/26.2: stops at Import Workflow > TRS ID with the id filled in, the newest version (v0.11) preselected and
   nothing imported; the user has to click Import, gets the wrong version and no run form.
4. Same URL with `trs_version_id=v0.1.3` instead works (imports v0.1.3, lands on `/workflows/run?id=...`).

## Cause
- 25.x `client/src/entry/analysis/router.js` mapped `queryTrsVersionId: route.query.trs_version`.
- dd2d14056fb "Integrate TRS search logic into new workflow import UI" (in release_26.1) moved query parsing into
  `WorkflowImport.vue`, reading `route.query.trs_version_id`. `TrsIdImport` only auto-imports when
  `queryTrsVersionId` is set, so `trs_version` links fall through to the manual form.
- No in-tree code builds `trs_import` links; the external ones (GTN, maybe Dockstore "Launch with Galaxy") use
  `trs_version`.

## Fix (on the branch)
- New `client/src/components/Workflow/Import/trsImportQuery.ts`: parse the TRS import query, version from
  `trs_version ?? trs_version_id` (keep accepting the 26.1 spelling). `WorkflowImport.vue` uses it.
- vitest `trsImportQuery.test.ts`: `trs_version` case red on the old mapping.
- No E2E: auto-import needs a live TRS server (Dockstore).

Target: release_26.1.
