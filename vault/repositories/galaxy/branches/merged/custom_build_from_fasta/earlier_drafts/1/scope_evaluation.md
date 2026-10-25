# Scope evaluation — custom_build_from_fasta

**Recommendation: modest expansion (scope B). Keep the branch as implemented and add one owner happy-path API test in `lib/galaxy_test/api/test_users.py`: PUT a FASTA custom build, wait for the history, GET, and expect `count == 2`. Do not fold in either product bug. The conversion-error fix is already implemented elsewhere (`custom_build_no_converter_400_26.0`, plus the related access check in PR #24310 on 25.1), and both reach 26.2 by merge-forward. #24309 (not listed until reload) is a filed, assigned issue with its own proposal, and its schema, state mapping and polling design need their own review. Its planned red API test also needs the `fasta -> len -> linecount` datatypes, which this branch supplies, so this branch should land first. The API test is the cheap part of that chain. It closes a gap that #24310's debrief names (no owner happy-path API test, because the test datatypes couldn't convert FASTA), and it is the baseline that #24309's pending-state test will extend.**

Reviewed `origin/release_26.2...364768249c4` (2 commits, 3 files, +70/−60) in `/Users/jxc755/projects/worktrees/galaxy/branch/galaxy_ui_driver`. Sources: index, initial implementation, normal review 1, test challenges, polish, Codex, thermo and baseline-refactor debriefs; `gx_issues/internally_managed/*custom_build_conversion_error_swallowed.md`; `issues/queued/24309/`; sibling records `custom_build_no_converter_400_26.0`, `better_custom_build_error_handling_25.1`, `workflow_editor_second_subworkflow` and `workflow_open_exact_title`. Earlier debriefs cite pre-rewrite hashes. `baseline_refactor.md` maps them to the current `f4efcfbec35` (refactor) and `364768249c4` (feature).

The brief's view of the related issues is out of date, and so is `index.md`, which this pass did not edit. The not-listed draft was filed as **#24309** and is queued. The conversion-error draft moved to `internally_managed` and is implemented as `custom_build_no_converter_400_26.0` (release_26.0, no PR). A third related branch, `better_custom_build_error_handling_25.1` (**PR #24310**, open), adds `HDAManager.get_accessible` to the same FASTA path.

## Possible Decompositions

130 changed lines, all hand-maintained (navigation.yml, test file, datatypes conf). These are options only. No split is recommended.

1. **One PR, both commits.** Refactor `f4efcfbec35` (existing helpers onto `custom_builds` components, no sleeps, per-test names, split listed/not-listed asserts) followed by feature `364768249c4`. With scope B, the API test would be a third commit or would sit in the feature commit.
2. **Two PRs: refactor, then FASTA test.** `f4efcfbec35` applies cleanly on 26.2 by itself and touches only the existing 2 tests. `364768249c4` only adds lines and depends on its components (`name`, `key`, `definition`, `save`).
3. **Datatypes first.** The `sample_datatypes_conf.xml` hunk (5 lines) goes alone, or together with the scope-B API test, so #24309's red test and any further API coverage can build on it. The refactor and the E2E follow. This makes the most PRs, for a 5-line enabler.

## A. As implemented

Refactor of the existing custom-build E2E helpers onto navigation.yml components. Then `test_build_add_from_fasta` (GTN FAQ `analysis_add_custom_build`), the `fasta_file`/`success_alert`/`row_count` components, and the framework datatypes `fasta -> len` plus `len`/`linecount` copied from `datatypes_conf.xml.sample`. The test waits for the history and re-navigates, which works around #24309.

| Pros | Cons |
|---|---|
| - Closes the FASTA-path E2E gap for 26.2. The test is red without the datatypes hunk.<br>- Fully hardened: normal review, Codex (no findings), thermo, and polish. Green 3/3 on both backends.<br>- The datatypes hunk mirrors production config exactly. Review 1 checked it against the converter-enumerating tests. | - Still no API coverage of the custom-build happy path on 26.2. `#24310` relies on this Selenium test as its only owner-path coverage.<br>- The Selenium test is the only check that API tests actually load these converters (#24309's debrief lists that as unconfirmed). |

## B. A + owner happy-path API test (recommended)

Add `test_custom_build_from_fasta` to `TestUsersApi`. It uploads a 2-sequence FASTA, PUTs `/api/users/current/custom_builds/{key}` with `len|type=fasta`, waits for the history (the hidden converter HDAs count toward its state), GETs, and asserts the key is listed with `count == 2`. That is roughly 15 lines, made possible by this branch's datatypes hunk.

| Pros | Cons |
|---|---|
| - Fills the gap #24310's debrief names: no owner happy-path API test, because the test datatypes couldn't convert FASTA.<br>- Fast backend coverage of PUT -> convert -> GET's lazy `count` fill, independent of the UI.<br>- Pins the datatypes hunk at the layer #24309 needs. #24309's red test becomes "GET without waiting -> expect pending" next to it.<br>- Settles #24309's open question of whether API tests load `sample_datatypes_conf.xml`. | - Partly overlaps the E2E. The test-challenges pass rejected it for that reason, before #24310's reliance on the E2E was visible.<br>- Merge-forward: `custom_build_no_converter_400_26.0` and #24310 also append custom-build tests to `test_users.py`, so the conflicts are trivial adjacent appends.<br>- Needs a fresh red check (revert the datatypes hunk -> 400/500 on PUT) and one more API-suite run. |

<details><summary>Details</summary>

- `test_users.py` on 26.2 has no custom-build tests (`grep custom_build lib/galaxy_test/api/` is empty). The 26.0 branch adds `test_custom_build_from_unconvertible_dataset` and #24310 adds `test_custom_build_from_inaccessible_dataset`, so the error paths will be covered after merge-forward. The happy path would still be missing.
- Without the datatypes hunk, the PUT fails today with a 500, and after the 26.0 fix merges forward it fails with a 400. Either way the test is red.
- This doesn't lock in buggy behavior. It asserts the eventual listed state, which #24309's fix keeps. #24309 only adds a pending state before it.

</details>

## C. Fold in the conversion-error fix (`NoConverterException` -> 400)

Map `NoConverterException` in `add_custom_builds` to `RequestParameterInvalidException` and stop wrapping other exceptions.

| Pros | Cons |
|---|---|
| - Same code path the E2E exercises. The red-without-datatypes failure would become a clear 400. | - Already implemented, with a red-to-green API test, on `custom_build_no_converter_400_26.0` (older base). It reaches 26.2 by merge-forward.<br>- Folding it in would duplicate code and guarantee a conflict in `users.py`, where #24310 already expects one. |

## D. Fold in #24309 (list pending/failed FASTA builds, client polling)

Add `state` to `CustomBuildModel`, stop dropping builds without a `count` in GET, regenerate client types, add a status column and polling to `CustomBuilds.vue`, and change the E2E to wait for the row with no reload.

| Pros | Cons |
|---|---|
| - Fixes the user-facing bug the FAQ walkthrough hit. Learners land on an empty table.<br>- Lets the E2E drop its `wait_for_history()` + re-navigate workaround. | - #24309 is separately filed and assigned, with its own proposal, alternatives and red-first test plan. Its design (state mapping incl. `paused`, write-back of pending builds, poll interval, alert wording) needs its own review.<br>- Spans schema, API, generated client types and a Vue component, which turns a test PR into a feature PR.<br>- Its red API test needs this branch's datatypes, so landing this first unblocks it. |

## E. Contract: feature commit only (drop the refactor)

Ship `364768249c4` without `f4efcfbec35`.

| Pros | Cons |
|---|---|
| - Smallest diff. | - The feature commit needs the refactor's components (`name`, `key`, `definition`, `save`). Dropping the refactor means re-adding them or going back to raw selectors.<br>- Brings back the `UX_RENDER` sleep and retry loop that the reviews removed.<br>- Decomposition 2 already gives reviewers the separation without losing the cleanup. |

## F. Expand E2E: assert the build in a dbkey picker, delete the FASTA build

Extend `test_build_add_from_fasta` to check `Name (key) [Custom]` in a Database/Build picker, and to delete the build afterwards.

| Pros | Cons |
|---|---|
| - Covers the end the FAQ is for: using the build. | - The picker path is the same for text and FASTA builds (`managers/dbkeys.py` lists every key in preferences), so it isn't FASTA-specific.<br>- Delete is already covered by `test_build_delete`.<br>- Adds E2E runtime for little new signal. Better left to the GTN-driven suite on `galaxy_ui_driver`. |

## Follow-ups (not scope changes)

- When #24309 lands (likely dev), switch `test_build_add_from_fasta` to wait for the row instead of reloading, and extend the scope-B API test with a pending-state check.
- Update `index.md`: the related issues are now #24309 and the 26.0 / #24310 branches, not `to_file` drafts.
- `galaxy_ui_driver`: drop its copy of the FASTA test once this merges (already noted in `index.md`).
