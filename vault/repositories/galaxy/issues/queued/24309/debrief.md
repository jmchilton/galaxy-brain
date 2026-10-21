# Debrief: custom_build_fasta_not_listed_until_reload

Source: `custom_build_fasta_not_listed_until_reload.md`. Proposal: `proposed_custom_build_fasta_not_listed_until_reload.md`.

## Research (dev 2cca8565861)

- All draft claims hold. `users.py`: PUT FASTA branch 573-586, GET filter 599-614, write-back 615-616. `CustomBuilds.vue`: `save()` 281-306, `loadCustomBuilds()` 247-256, `dismissSecs: 5` 200. No polling anywhere.
- Found while checking the draft:
  - The duplicate-key check (`users.py` 527-530) rejects a second Save of a pending build. The page still shows "No data available", so the user has nothing to delete. This is the likely learner path, and the proposal uses it in the repro table (code-derived).
  - `managers/dbkeys.py` 102-105 already lists the pending build as `[Custom]` in dbkey pickers. Only the Manage page hides it.
  - A failed conversion means the build is never listed and can't be deleted from the UI.
  - The filter dates to 6f7e8881f54 (mvdbeek, 2020, "Don't propagate missing dbkeys"). It was meant for deleted linecount datasets and hides pending builds as a side effect.
  - `CreatedCustomBuild.count` is already `str | None`. Adding `state` is a small schema change plus regenerated client types.
  - Side note, not in the issue: PUT returns 204, so `build_dict["message"]` (HTML chrom names skipped) never reaches the client's `response.data.message` warning branch.
- The draft's E2E reference is stale (`bf041856612`, `test/integration_selenium/test_custom_builds_fasta.py`). It's now `test_build_add_from_fasta` in `lib/galaxy_test/selenium/test_custom_builds.py` on `galaxy_ui_driver`, plus converters in `sample_datatypes_conf.xml`.

## Duplicates

None. Searches for custom build, fasta, linecount and Manage Custom Builds found only related items:
- #1034: list UX enhancements.
- #6146: fasta in the Edit Attributes list.
- #9326: an old listing exception, closed.
- No related PRs.

## Rewrite

- Led with a step → what-the-user-sees table. Every row is labeled as either from the real 26.2 run or derived from code.
- Moved the code walk into details.
- Context covers the GTN FAQ impact (`ecology/ref-based-rad-seq`), the E2E on the branch and #1034.
- Proposed approach: the API returns pending/failed builds with a `state`, and the client shows status and polls. Alternatives: client-only polling, and counting in PUT.
- Review round (one fresh subagent) verified the line numbers, commit, schema and #1034 and found no egregious issues. It polished the text:
  - `state` became `pending/ok/error`, with an explicit HDA state mapping.
  - A failed `len` job pauses `linecount`.
  - Reworded the 6f7e8881f54 sentence.
  - Added the E2E path and a converter note to the tests bullet.

## Unresolved

- The double-Save and picker symptoms weren't reproduced in the UI (code-derived; the issue says so).
- Whether the GET's write-back is ever committed is untraced. The proposal hedges.
- Not confirmed that API tests load `sample_datatypes_conf.xml`.
- Sibling draft `custom_build_conversion_error_swallowed.md` (PUT turns converter errors into a bare 500) is separate and unfiled. Consider filing it alongside.
