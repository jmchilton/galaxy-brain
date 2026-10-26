# Initial implementation

Extracted the latest FAQ batch from galaxy_ui_driver (source commits 57169998d11, 98da06986fb and 904094dc011; reported tip c48fe3d7d5a) onto release_26.2 at 7a7c1576f94c. John explicitly chose to keep the TRS fixes with the browser-test extraction on release_26.2. gxui CLI changes, GTN findings and earlier batches are outside this branch.

The first commit db1a2cc10fa contains passing baseline public-workflow preview -> Run -> Import coverage and navigation selectors. Both tests in test_published_workflows.py pass under both Selenium and Playwright. Running the file together exposed the source test's instance-only shared fixture fields; these now live on the test class with declarations. The baseline records preview/run screenshots and verifies that the second user gains exactly one distinct copy.

Commit 6fec41cbad2 adds the reusable workflow_preview_open helper with a tab argument and uses it in both public-workflow and existing own-workflow coverage. It preserves release_26.2's newer workflow-card lookup. The TRS import page accepts trs_version with trs_version_id fallback, and query TRS URLs import on component load. The parser remains inline rather than extracting a wrapper only to unit-test it; the browser integration tests cover the visible import, exact requested version and redirect. No source unit tests were copied because they duplicate this integration coverage.

The existing four launch-link integration tests no longer click Import. Four additional cases cover run_form=true for both registry URLs and both version query spellings. These assert provenance and that the run-form ID matches the imported workflow. Normal review is recorded in subagents/normal_review.md; its version/identity coverage recommendations were addressed. Final browser validation and hardening are ongoing.

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/selenium_workflow_preview_import_26.2/differential-review/snapshots/20261026T175638Z-implementation-6fec41cbad24.json
  implementation @ 6fec41cbad24 vs origin/release_26.2 (merge-base 7a7c1576f94c)
  first snapshot: 2 commits, 7 files, 10 hunks
```
