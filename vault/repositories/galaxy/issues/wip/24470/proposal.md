TRS "Launch" links using `trs_version=` (as built by the GTN) stopped auto-importing and opening the run form in 26.1.

Open, logged in:

```
/workflows/trs_import?trs_server=dockstore.org&run_form=true&trs_id=%23workflow/github.com/iwc-workflows/kmer-profiling-hifi-VGP1/main&trs_version=v0.1.3
```

| | 26.0 and earlier | 26.1 / dev |
|---|---|---|
| Version imported | v0.1.3 | nothing; newest (v0.11) preselected |
| Lands on | run form for v0.1.3 | Import Workflow > TRS ID form |
| User must | nothing | click Import, gets the wrong version, no run form |

The same URL with `trs_version_id=v0.1.3` works on 26.1. GTN tutorials (e.g. VGP, via `faqs/galaxy/workflows_run_ds.md`) generate the `trs_version` form, so every such "Launch" button now drops users on a manual form that defaults to the latest version instead of the one the tutorial was written against.

<details><summary>Cause</summary>

- Through 26.0, `client/src/entry/analysis/router.js` mapped `queryTrsVersionId: route.query.trs_version`.
- #21516 (dd2d14056fb "Integrate TRS search logic into new workflow import UI") moved query parsing into `client/src/components/Workflow/WorkflowImport.vue`, which reads `route.query.trs_version_id`.
- `TrsIdImport` only auto-imports when a version is set, so `trs_version` links fall through to the manual form.
- No in-tree code builds `trs_import` links; the callers are external.

</details>

## Context

Regression from 🔀 #21516. Found while walking 26.2 GTN FAQs on 🌿 [jmchilton/galaxy_ui_driver](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver). Earlier history of this parameter: 🎯 #12017, 🔀 #12021.

## Proposed Approach

Accept both spellings: read the version from `trs_version ?? trs_version_id`, so old external links work again and links written against 26.1 keep working. Pull the query parsing into a small `trsImportQuery.ts` helper with a vitest covering the `trs_version` case (red on the current mapping). Target `release_26.1`. A fix with test exists on 🌿 jmchilton/galaxy_ui_driver ("Accept trs_version in TRS import links again").

## Alternative Approaches

Reverting to `trs_version` only would break any links created against 26.1; asking GTN/Dockstore to switch to `trs_version_id` leaves every older Galaxy and every already-published link inconsistent. Accepting both is cheapest and safe.
