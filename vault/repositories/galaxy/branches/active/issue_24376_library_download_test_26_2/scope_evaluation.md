Run via Opus at default effort.

# Scope evaluation (second, after re-scope)

**Recommendation: as implemented.** Keep the E2E test fix and the server fix together on `release_26.2`. Queue a `dev` follow-up for a data migration that backfills `library_dataset_id` on rows created before the fix. Put the admin backfill SQL and the known limitation in the PR text.

Rationale:
- The re-scope already did the modest expansion the first evaluation asked for. The branch fixes new rows on both creation paths (`discover.py` and the model-store import) and makes `download()`, the endpoint this branch is about, work for old rows too.
- What remains is old rows in `LDDA.to_dict`, `can_access_library_item`, `check_folder_contents` and `update_parent_folder_update_times`. The right fix for those is the backfill. Per-call-site fallbacks would mean a reverse `LibraryDataset` lookup in each place, one of them access-control code. That is more release-branch risk than a one-statement migration, and the migration has to go to `dev`.
- All the old-row failures are fail-closed (errors or omitted rows, no access bypass), and admins can fix their data now with the SQL from `subagents/normal_review_2_rescope.md`.
- This is the second evaluation, so any further change parks the branch. Nothing left over justifies that.

## Possible Decompositions

The branch is about 120 changed non-generated lines (+104/-16 over 11 files). The two halves are already preserved separately: `_alt_original_scope` (`63267ab1311`) holds the test-only fix.

**A. One PR (as implemented).** Button id fix, `download_file_from`, the E2E test (now seeded with `fetch_to_folder`), the three server one-liners, the API, unit and integration pins, and `download_library_datasets_raw`.

**B. Test fix first, server fix second.**
1. The E2E PR is the alt's content: id fix, helper, and the E2E test seeded through the legacy upload path. That setup is needed because the fetch seed in `f552bcc3656` depends on the server fix.
2. The server PR holds `b8a71a90c34`, `25224faf2ba`, `9593bbfbd8d`, `7771e277294`, and the E2E seed switch to `fetch_to_folder` from `f552bcc3656`. The switch rebases cleanly only after PR 1.

**C. Server fix first, test fix second.**
1. The server PR holds the API regression tests, the three fixes, the unit and integration pins, and the populator helper. It doesn't depend on the E2E work.
2. The E2E PR follows with the id fix, helper, and E2E test, seeded with `fetch_to_folder` from the start.

Under B or C, the server PR could target an older release than 26.2: the commented-out `# library_dataset=ld,` is on `release_25.1`, `26.0` and `26.1` too. See scope 5.

## Scopes considered

### 1. As implemented (recommended)
Fixes the `download--btn` id typo, adds `download_file_from`, and makes the folder-download E2E test real. It also sets the LDDA→LD back-reference in `discover.py` and in the model-store import, and walks `ld.folder` in `download()`, with API, unit and integration tests pinning each fix site.

| Pros | Cons |
| --- | --- |
| Closes #24376 and the real 500 it uncovered, in the endpoint under test | Old rows stay broken outside `download()` (fail-closed) |
| Each fix site pinned by a test that fails without it (per test-challenge debrief) | Mixes a test-only issue fix with server code on a release branch |
| Three one-line server changes matching the existing `upload_common` / `to_library_dataset_dataset_association` pattern; no new SQL on the discovery path (perf debrief) | `discover.py` fix pinned only by an API test, not a unit test (documented) |

### 2. Expand: defensive fallbacks for old rows in other consumers
Have `LDDA.to_dict`, `can_access_library_item` (LDDA branch) and similar code look up the `LibraryDataset` whose `library_dataset_dataset_association_id` points at the LDDA when `ldda.library_dataset` is None.

| Pros | Cons |
| --- | --- |
| Old rows work everywhere without a migration | Adds a reverse query in several places, one of them access-control code on a release branch |
| | Only finds the LD whose current version is that LDDA. Older versions still have no link, so the fallback is partial |
| | Workaround code that a backfill makes dead; would need removing later |
| | Second evaluation, so recommending it parks the branch |

<details><summary>Why not a narrower fallback in <code>to_dict</code> only</summary>

`to_dict` is the one consumer that isn't security code. Patching only it still leaves `can_access_library_item` raising and `check_folder_contents` omitting rows, so users would see a dataset whose access check errors. A partial fallback gives inconsistent behavior. The backfill fixes all consumers at once, without touching the read paths.

</details>

### 3. Expand: backfill migration (dev follow-up, not this branch)
Add an Alembic data migration that sets `library_dataset_id` from `library_dataset.library_dataset_dataset_association_id` where it is NULL.

| Pros | Cons |
| --- | --- |
| Fixes every consumer for every existing row, in one place | Migrations don't go on `release_26.2`. It would force retargeting to `dev` or splitting the branch |
| Small and mechanical | Must handle large `library_dataset_dataset_association` tables, so it needs batched or set-based SQL and review |

Queue it as a `dev` follow-up issue or branch, and reference it from the PR text.

### 4. Contract: split into test-fix and server-fix PRs
Ship the alt (`_alt_original_scope`) as the #24376 PR and the server fix as its own PR.

| Pros | Cons |
| --- | --- |
| Each PR reads as one thing. The server fix gets its own title and changelog entry ("fetched library datasets fail to download / show") | Two PRs to shepherd. The E2E seed would use the legacy path in the first and switch in the second |
| Lets the server fix target an older release independently (scope 5) | The first evaluation recommended combining because the bug is in the endpoint the test covers. That still holds |

John's call; see Possible Decompositions. Not a scope change I'd recommend parking for.

### 5. Retarget the server fix to an older release
The bug is on `release_25.1`, `26.0` and `26.1` (`# library_dataset=ld,` is commented out on each).

| Pros | Cons |
| --- | --- |
| Galaxy policy prefers the oldest supported branch with the bug, and it is a simple, clean fix | Requires the split in scope 4. The E2E/test-infra half belongs on 26.2 (it fixes 26.2 release testing) |
| User-facing 500 for API-populated libraries since 2019 | Test helpers (`download_library_datasets_raw`, `fetch_to_folder` usage) need checking on the older branch |

Worth raising with John at PR time. It is a targeting decision, not a change to this branch's content.

### 6. Expand: smaller reviewer suggestions (all declined, still declined)
- **Move `download_file_from` into the driver layer** (normal review 1, thermo-nuclear review): there is no second consumer, it would add layers, and it suits `dev`.
- **`data-description` instead of the id fix:** the id fix is a one-character release-branch change.
- **Convert other download tests to the helper:** they don't do browser downloads today (first evaluation, scope 5), so this would be new test behavior.
- **`download()` N+1 lazy loads and the O(n²) `seen` list** (performance debrief): these predate the branch and only matter for very large zips. Treat them as a `dev` follow-up.
- **`allow_edit` import guard** (normal review 2): no flow combines `allow_edit` with library import, and the code mirrors the forward assignment.
- **Remove the `_setup_fetch_to_folder` identity wrapper:** it predates the branch and other tests still use it.

| Pros | Cons |
| --- | --- |
| Small cleanups | None changes behavior. They all add churn to a release branch |

### 7. Contract: drop the E2E test
| Pros | Cons |
| --- | --- |
| Smaller | The issue is the untested button. Dropping the test drops the issue fix |

Not recommended.
