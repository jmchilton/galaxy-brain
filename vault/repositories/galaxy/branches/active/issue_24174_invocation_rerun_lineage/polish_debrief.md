Run via claude-opus-5-5 at high effort (coordinator).

**Polished after rebasing onto dev and closing the hardening gaps. The code changed: a batched, SQL-filtered lineage resolution, a leading refactor commit, typing fixes and two new tests. Head is `9df72d8d97a`, eleven commits.** The description, titles, tags and checklist are ready for John's final review. Nothing was posted to GitHub.

## What happened

1. **Rebase.** Rebased from `fd978a7980b` onto dev `7e16f446410`, which was 2182 commits ahead. The one conflict was in `services/workflows.py`'s `invoke_workflow`: dev's scheduler, tool and on-complete checks were kept ahead of the rerun-source resolution. The Alembic chain stayed linear, since `64d49ad328d4` is still dev's only head, so the migration needed no re-parenting.
2. **Hardening gaps.** On 2026-11-04 John chose to run the hardening steps this branch was missing:
   - **Performance challenge** ([debrief](performance_challenges_debrief.md)): found a real N+1 and fixed it. Lineage is now two queries per serialization batch, with the history access rule in SQL; showing an invocation with 200 foreign reruns dropped from 611 statements to 10.
   - **Codex review** ([debrief](codex_review.md)): found no defects. Codex's bwrap sandbox can't start on this host, so it reviewed only the diff and files passed in on stdin. An unsandboxed run in a scratch clone was blocked by the auto-mode classifier and was not retried.
   - **Baseline refactor** ([debrief](baseline_refactor.md)): split out a leading no-behavior-change commit, `9bf74e3ee40`, for the batch serialization path. The tree was unchanged.
   - **Check branch:** `make format` was clean. mypy, run as CI does (`cd lib && mypy …`), found 9 typing errors in the new unit test and the lineage code; `830d058c5be` fixes them. The one remaining error, in `managers/notification.py`, is environmental and in a file the branch doesn't touch. Running mypy from the repository root gives over 2000 spurious errors, because the `galaxy_test.*` and `unit.*` exemptions don't match from there.
   - **Screenshots** ([index](screenshot_debrief.md)): regenerated on this machine, since the earlier PNGs existed only on the Mac. The E2E test passed and all six captures were inspected. `galaxy_e2e.sh` needs `/bin/zsh`, which isn't installed here, so its steps were run by hand.
3. **Checklist** ([checklist](pr_checklist.md)): GENERAL plus WORKFLOW_RELATED, all passing. It was re-run after the strengthening commit.
4. **Description** ([description](pr_description.md)): opens with the "J" page screenshot and the cards and grid pair. Five bold-italic lines answer the predicted misreadings:
   - why the foreign key and not the issue's meta parameter;
   - direct links only, no grouping;
   - invoke, replay and import are unchanged or independent;
   - access and privacy, and the query cost;
   - a rerun must use the same workflow (any version); this line said "any accessible source" until the revision below.
5. **Strengthening** (one round). Acted on:
   - **Code:** `9df72d8d97a` adds a differential unit test of `_accessible_invocation_clause` against `check_security` over a viewer × history matrix. A mutation that drops the share condition makes it fail. It also splits invalid-source API checks into 400 for malformed and 404 for a missing invocation; previously both were accepted by `in (400, 404)`.
   - **Description:** "reloads each page" became "reloads each rerun page"; the reasoning for the foreign key was split into a reverse lookup and per-row markers; and the privacy, cost and source highlights were added.
6. **Titles and tags** ([titles](pr_titles.md), [tags](pr_tags.md)): `kind/feature`, `area/workflows`, `area/database`, `area/API`, `area/UI-UX`.

## Left for John

- **Evidence for need.** No user has reported losing track of reruns. The case rests on #24174's analysis and the demand implied by #20032, #18696 and #10039, and the checklist says so.
- **Unchanged since earlier review:**
  - `is_rerun` stays `true` when the source becomes inaccessible, so the marker shows without a banner.
  - The index is built without `CONCURRENTLY`.
  - A "newer rerun" link doesn't appear on an invocation page that is already open and finished.

## Revision after hand-off: same-workflow rule

John decided that a rerun's source must be an invocation of the same workflow. `9a8bf84c5ab` makes `invoke_workflow` reject a source whose stored workflow differs from the target's with a 400, "A rerun must run the same workflow as the invocation it reruns." Any version of the same stored workflow is accepted. UI reruns invoke the source's exact version through the `/request` export, so they are unaffected. `test_workflow_invocation_rerun_access` now reruns the published original workflow instead of the other user's copy, and the new `test_workflow_invocation_rerun_same_workflow` checks that an identical copy is rejected and a newer version accepted. Without the check, that test fails. All 4 lineage API tests pass. The payload field's description (pydantic and `schema.ts`) states the rule. The checklist was re-run, and the description was revised to state the rule and drop its hedges.

```text
created …/differential-review/snapshots/20261104T160645Z-revision-9a8bf84c5abd.json
  revision @ 9a8bf84c5abd vs origin/dev (merge-base 7e16f446410c)
  since 20261104T154418Z-polishing-9df72d8d97ac:
    commits: 11 same, 0 rebased, 0 changed, 1 new, 0 dropped
    hunks:   48 carried, 4 changed, 1 new, 0 dropped
    new     9a8bf84c5abd Require a rerun source to be an invocation of the same workflow
```

## Revision after hand-off: grid icon column

John found the "Run type" header too heavy. `cfe3e41cbd2` replaces the text column with an unlabeled column right after the expand caret. It shows a muted rerun icon (`faRedo`, the icon of Galaxy's Rerun buttons) on reruns only, with the card badge's tooltip ("This invocation is a rerun of an earlier invocation") and screen-reader text. The column comes from a new generic `icon` grid cell type, which `GridList.test.ts` covers: no header, and an icon only when the converter returns text. Grid vitest (16), prettier, eslint and `vue-tsc` pass. The lineage E2E passes after a one-line fix, `a6e2ed29d04`: under Playwright, `get_attribute("textContent")` returns `None`, so the test now reads the marker's `title`. The grid screenshot was recaptured. Squashing the fix into `cfe3e41cbd2` was blocked by the auto-mode classifier, which refused a reset plus force-push, so the history has both commits.

```text
created …/differential-review/snapshots/20261104T164402Z-revision-a6e2ed29d04b.json
  revision @ a6e2ed29d04b vs origin/dev (merge-base 7e16f446410c)
  since 20261104T160645Z-revision-9a8bf84c5abd:
    commits: 12 same, 0 rebased, 0 changed, 2 new, 0 dropped
    hunks:   50 carried, 3 changed, 4 new, 0 dropped
```

## Validation at `9df72d8d97a`

- API: `test_workflow_invocation_rerun_lineage`, `test_workflow_invocation_rerun_access` and `test_workflow_invocation_rerun_invalid_source` (3 passed).
- Unit: `test_invocations_lineage.py` (4 passed), plus the migration round trip and the model-store lineage test.
- Client: 143 related vitest tests at the rebase (no client changes since).
- E2E: `test_workflow_rerun_lineage` at `830d058c5be` (passed). Later commits are backend tests only.
- ruff, black and isort are clean, and mypy (CI-style) is clean for the branch.
- Fork CI: queued on `9df72d8d97a` with nothing failed; on `830d058c5be`, Python linting, OpenAPI linting, Database indexes and Unit w/postgres passed.

## Snapshot

```text
created …/differential-review/snapshots/20261104T154418Z-polishing-9df72d8d97ac.json
  polishing @ 9df72d8d97ac vs origin/dev (merge-base 7e16f446410c)
  first snapshot: 11 commits, 23 files, 52 hunks
```

This is the first snapshot recorded on this machine. Earlier phases ran on another machine, and their snapshots are gitignored and weren't carried over, so there is no "since" summary. Treat the whole diff as changed since John's last look.
