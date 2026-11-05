# #735 Test-data Molds stage data tables in a form planemo doesn't auto-discover

[Issue](https://github.com/galaxyproject/foundry/issues/735), currently only `needs-triage`. No comments; no PR or branch addresses it (`gh pr list --search 735` hits only the unrelated #397).

## Proposed labels

- `roadmap/off`: a Mold guidance gap, not backbone work. No `roadmap/main` fits; the closest is #531 (prove the IWC maturation pipeline with runnable fixtures), but that is about IWC entry cases, not data-table staging. Sibling #730 is also `roadmap/off`.
- `priority/mvp`: the funcscan golden-brief build produced a test that runs on one machine only and needs a hand-passed flag. Wrapper families that take references only from data tables (MMseqs2 taxonomy, AMRFinderPlus, InterProScan, DeepARG) hit this on every build. Matches #730's `priority/mvp`.
- `agent/implement`: the recipe is known and small (file name, `${__HERE__}` paths, note text, one eval property).
- No blocker. galaxyproject/planemo#1764 (docs and logging for the same discovery, filed by John 2026-10-27) would help but isn't required: discovery already works in released planemo.

## Derived status

`queued` (rule 4).

## Findings

Verified:

- Planemo discovery: `_find_tool_data_table` exists in released 0.75.47 (`planemo/galaxy/config.py:1443`) and on master (~L1516-1519 now, issue cites 1492-1512). It searches for `tool_data_table_conf.xml.test`, then `.sample`. An unsuffixed `tool_data_table_conf.xml` is not on the list, so it's ignored. No planemo release or upgrade needed.
- No Foundry guidance exists: on `origin/main`, `find-test-data`, `nextflow-to-test-data`, `cwl-to-test-data`, `paper-to-test-data`, `run-workflow-test` and `content/research/planemo-workflow-test-architecture/index.md` never mention data tables, `.loc` or `tool_data_table`.
- Data tables come up only in `iwc-test-data-conventions/index.md:123-130` (the test-YAML side: a scalar value, CVMFS on IWC CI) and as a "don't introduce data tables" rule in `nextflow-params-to-galaxy-inputs/index.md:212` and `nextflow-to-galaxy-reference-data-mapping/index.md:51`. This issue covers existing wrappers that require a table, so it doesn't conflict with that rule, but the new text should say so explicitly.

Not verified:

- That Galaxy expands `${__HERE__}` in `.loc` lines as well as in the conf's `<file path>`, and the tools-iuc amrfinderplus `.test` example.
- The funcscan run-dir evidence (`workflow-brief-galaxy-data-flow.md`, `galaxy-test-plan.yml`).

## Overlap

#730 (`priority/mvp`, `agent/implement`, `roadmap/off`) asks `run-workflow-test` and the same planemo architecture note to detect an empty data table before running. This issue is the staging side; #730 is the detect-and-defer side. Both edit `planemo-workflow-test-architecture`. One PR could cover both, or land this one first and have #730 reference its recipe.

## Next

1. Confirm `${__HERE__}` in `.loc` lines from Galaxy source (`lib/galaxy/tool_util/data/__init__.py`).
2. Add a data-table staging recipe to `planemo-workflow-test-architecture`: `test-data/tool_data_table_conf.xml.test` plus `.loc` files with `${__HERE__}` paths, and no `--tool_data_table` flag.
3. Point `find-test-data` (and the source-specific test-data Molds where they stage references) at the recipe, and add the eval property "a staged table is discoverable by name, and its `.loc` paths are relative".

## Questions for John

- Bundle with #730 or land it separately?

Moved to `needs_decision` 2026-11-03: staged labels in `issue_tags.md` await John.

Staged labels applied 2026-11-05: +roadmap/off, +priority/mvp, +work/ready-implement.

Moved to `queued` 2026-11-05: labels applied, `work/ready-implement`.

Moved to `wip` 2026-11-05: branch `issue-735-data-table-staging` ([record](../../../branches/active/issue-735-data-table-staging/index.md)).
