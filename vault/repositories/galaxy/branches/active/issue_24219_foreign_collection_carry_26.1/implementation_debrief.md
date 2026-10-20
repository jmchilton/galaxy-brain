# Implementation debrief

STATUS: BLOCKED - John's decisions needed (scope add-on, cross-user carry, force-push).

Branch `issue_24219_foreign_collection_carry_26.1`, base `release_26.1` (`dbe4f2f7e41`), local head `13c7352f165`. Remote `jmchilton` still at `3147227b128` (= alt `_alt_original_scope`); force-push of the rebuilt branch was blocked by the permission classifier.

## Final implementation

Re-scoped to the full #23865 backport ([rescope debrief](implementation_rescope_debrief.md)):

- `3311cf2dd1f`, `62058ed38ed`: `-x` cherry-picks of `ee476eb5a3b`, `a48832e3b04`. Collection select lists visible HDCAs only (#22734 on 26.1); hidden, deleted or other-history selection carried as a `keep` entry.
- `7bee3166e32`: other-history carry tests (build + rerun).
- `fd4963c2021`: carried HDCA classified via `_classify_hdca`, so map-over selections keep `map_over_type` (26.2 gap).
- `c5f2b4503bd`, `13c7352f165`: test follow-ups (server-derived `map_over_type`; shared `_carried_hdca_option` assert helper).

## Hardening (fresh, after re-scope)

- Normal review: only the known cross-user item (private note) - no review debrief per policy; acted on test tweak.
- Test challenge: own tests red on base, map-over tests red before `fd4963c2021`; helper refactor.
- Codex: no findings. Thermo-nuclear: no changes; dev follow-up = shared classifying carried-HDCA helper.
- Baseline refactor: nothing to split. No UI change, no screenshots.
- Scope evaluation: **recommends a modest expansion** - same `map_over_type` bug in `DataToolParameter._carry_unresolved_inputs` (multiple data param carrying a hidden/other-history non-`list` HDCA); ~6 lines + one build test. Per process, parked for John.

## Decisions for John

1. Add the data-param carry classification here, as a sibling PR, or defer to dev.
2. Accept the 26.1 behavior change (hidden collections leave collection selects) or fall back to the alt.
3. Cross-user carry exposure (private reports) - fix access check first or ship matching 26.1 data / 26.2 behavior.
4. Approve force-push of the rebuilt branch (old head preserved on the alt).

## If the add-on is taken

- Change: classify the HDCA in `_carry_unresolved_inputs` like `hdca_filter` (`multiple`, non-`list`, `can_map_over`) + one red-to-green `/build` test.
- Still applies: test challenge, Codex, thermo, baseline results and test runs for commits through `13c7352f165`.
- Remaining validation: normal review of that commit; rerun `test_tools.py -k build_`, `test_jobs.py -k rerun`.

## Tests run

`test_tools.py -k build_` 20 passed + known pre-existing `test_build_does_not_leak_hda_from_user_bundle` failure; `test_jobs.py -k rerun` 8 passed; parameter unit tests 212 passed; mypy no new errors; pre-commit clean.
