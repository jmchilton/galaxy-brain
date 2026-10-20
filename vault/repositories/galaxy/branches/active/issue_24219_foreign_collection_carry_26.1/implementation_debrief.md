# Implementation debrief

STATUS: BLOCKED - two John decisions left: cross-user carry, force-push. Scope add-on and the 26.1 hidden-listing change approved by John 2026-10-19.

Branch `issue_24219_foreign_collection_carry_26.1`, base `release_26.1` (`dbe4f2f7e41`), local head `f54b3a9b9af`. Remote `jmchilton` still at `3147227b128` (= alt `_alt_original_scope`); force-push blocked by the permission classifier.

## Final implementation

- `3311cf2dd1f`, `62058ed38ed`: `-x` cherry-picks of #23865. Collection select lists visible HDCAs only (#22734); hidden, deleted or other-history selection carried as a `keep` entry.
- `7bee3166e32`, `c5f2b4503bd`, `13c7352f165`: carry tests (build, rerun), shared `_carried_hdca_option` helper.
- `fd4963c2021`: collection param carry classified via `_classify_hdca` - map-over selection keeps `map_over_type`.
- `7dee5bf49b7`, `f54b3a9b9af` (scope add-on): `DataToolParameter._hdca_fit` - one fit/subcollection classification shared by the HDCA listing and `_carry_unresolved_inputs`, so a `multiple` data input carrying a hidden/other-history nested collection keeps `map_over_type`; plain list carried without one.

## Add-on review

Normal review: only an addendum to the known cross-user item (private note) - no review debrief per policy. Acted on: single classification helper (was a repeated check), plain-list assert. Not acted on: data-param carry still carries HDCAs the param can't use and skips the format matcher (pre-existing); `_history_query` rebuilt per row (pre-existing).

Earlier hardening (test challenge, Codex, thermo, baseline, scope eval) applies to commits through `13c7352f165`; the add-on added 1 test, so no new test challenge.

## Decisions for John

1. Cross-user carry exposure (private reports) - access check first, or ship matching 26.1 data / 26.2 behavior.
2. Approve force-push of the rebuilt branch.

## Tests run

Add-on test red before `7dee5bf49b7` (no `map_over_type`). `test_tools.py -k "build_ or carries or reduce or multi_data"` 34 passed + known pre-existing `test_build_does_not_leak_hda_from_user_bundle`; `test_jobs.py -k rerun` 8 passed; parameter unit tests 212 passed; mypy clean for `basic.py`; ruff, black clean.
