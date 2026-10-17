# Implementation debrief

**STATUS: BLOCKED** — on a scope decision only. The main branch is a complete, hardened fix for #24219 and could go up as is; the scope evaluation's expansion sits on alt `_alt_foreign_carry`, held back pending John's review.

Branch `issue_24219_pin_offpage_collections_26.1`, base `release_26.1` (`dbe4f2f7e41`), head `00cf6f95004`:
1. `406e85c34ab` Share one HDCA page listing across data and collection params — behavior-preserving: per-param `_hdca_entries` classifier, `_hdca_listing_visible_only` class attribute, one base listing method.
2. `00cf6f95004` Pin selected collections outside the tool form option page — `_page_and_pin_hdcas` pins a live, listing-eligible selected HDCA that missed the page, as the exact entries the page would emit (direct and/or map-over); returns the rest for carry. `DataToolParameter` pages+pins before carry. Two API tests.

## Choices
- Base 26.1 (oldest with the bug); server-only (client already merges non-`keep` pinned entries).
- No `keep` on pinned HDCAs (avoids client keep-cache collapsing direct + map-over by `id_src`).
- Listing visibility as a class attribute so page and pin can't drift; forward-merge recipe in `index.md`.

## Hardening
- Normal review 1: acted (class attr, comment, merge notes). Test challenges: added hidden-on-data-input carry guard; tests red without fix, at assertion. Codex: no findings. Thermo-nuclear: merged page + pin into one method. Baseline refactor: split refactor commit; tests confirmed red on refactor commit alone. Scope evaluation: expand (see `implementation_rescope_debrief.md`). Screenshots: skipped, no client change. No E2E tests (server payload only; client pinned merge covered by `FormData.test.ts`).
- Final: `test_tools.py::TestToolsApi -k build_` 20 passed, `-k pinned` 3 passed, `test_jobs.py -k rerun` 6 passed, `test_data_parameters.py` 20 passed, ruff/black clean, mypy no new errors. `TestDataManagerToolsApi::test_build_does_not_leak_hda_from_user_bundle` fails identically on base (unrelated).

## Decision for John
- Ship main branch as is (READY-quality), and decide separately on `_alt_foreign_carry` (scope-eval expansion; 26.2/dev already behave that way).
- Prior reviews/tests for the main branch all still apply; the alt got one normal review only and no hardening.
