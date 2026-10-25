# Implementation debrief — custom_build_from_fasta

**STATUS: READY.** Base `release_26.2` (`e2649e52818`), head `364768249c4`. Green 3/3 in `test_custom_builds.py` under Playwright and Selenium. Red without the datatypes hunk.

## Final shape

1. `f4efcfbec35` Use custom_builds components in custom build test helpers. This is the refactor-first commit. The existing add/delete tests use the `custom_builds` navigation.yml targets, the table walk and `UX_RENDER` sleep are gone, each test gets its own names, and there are split listed/not-listed asserts.
2. `364768249c4` Test adding a custom build from a history FASTA dataset. It adds `test_build_add_from_fasta`, the `fasta_file`/`success_alert`/`row_count` targets, and `fasta_to_len`/`len_to_linecount` + `len`/`linecount` in `test/functional/tools/sample_datatypes_conf.xml`.

## Choices

- Waits for the page's own success alert after Save. Without it, the reload can race the PUT (normal review). The global `_.messages.done` (`.alert-success`) matched an ok history item, so the alert target is page-scoped.
- Keeps `wait_for_history()` + re-navigate, working around #24309.
- The datatypes hunk only affects driver-launched selenium/framework servers. `api/test_datatypes.py` still passes 10/10.

## Hardening

- Normal review: acted on all 3 findings.
- Test challenges: no change.
- E2E polish: helpers moved onto components.
- Codex: no findings.
- Thermo: simplified helpers.
- Baseline refactor: split refactor first; tree identical.
- Screenshots: obtained.

## Scope

The first scope eval recommended adding an owner happy-path API test (`earlier_drafts/1/`). I wrote and ran it; it 500s with or without this branch. API servers use the stock datatypes (which already have the converters). The real cause is `users.py` converting without `history=`, which hits `assert history` for API-key requests. I reverted the test, and no alt branch was kept. The second scope eval keeps scope A here. I queued the bug, with the red test, as `gx_issues/to_file/custom_build_fasta_api_no_current_history.md`.
