Run via Opus at default effort.

# Scope evaluation

**Recommendation: expand scope to fix the fetch-created LDDA bug, which this test's Download button hits.** The fix has three parts:
- In `lib/galaxy/model/store/discover.py`, pass `library_dataset=ld` so new fetch-created LDDAs get their back-reference.
- In `library_datasets.py` `download()`, build the zip path from the loop's `ld.folder` instead of `ldda.library_dataset.folder`, so libraries already populated through fetch also download.
- Add an API test that fetches into a library folder and then downloads `libraries/datasets/download/zip`. It should fail before the fix and pass after. Commit it ahead of the fix; it is a regression test, not a "Baseline tests" commit.

Keep the E2E test and helper as they are. Leave these as follow-ups on `dev`: a data migration to backfill `library_dataset_id` on existing rows, moving the helper into the driver layer, converting other download tests, and the `data-description` hook.

Rationale, briefly:
- The 500 is not hypothetical. Any library dataset created through `/api/tools/fetch` has `ldda.library_dataset is None`.
- The folder UI's own add paths don't use fetch: "from History" goes through `POST /api/folders/{id}/contents` with `from_hda_id`, and userdir, importdir and path go through `POST /api/libraries/datasets` → `upload1`/`upload_common`, which sets `library_dataset=ld`. So UI-populated libraries are fine.
- API-populated libraries do hit it. These are created with `fetch_to_folder` or `destination: {type: library|library_folder}`, which is how scripted library population works (I believe current ephemeris `setup-data-libraries` defaults to fetch). Their Download button returns 500 today.
- The download crash is one line in the endpoint this branch exists to cover. The guidance here is to fix related bugs in touched code together, and that applies directly.

The branch is about 66 lines of non-generated code (<100), so no decomposition section.

## Scopes considered

### 1. As implemented
Fixes the `download--btn` id typo and adds `download_file_from(trigger, expected_filename)` to `framework.py`. It also turns `download_dataset_from_library` into a real, API-seeded test that checks the zip contents byte for byte. The seed uses the legacy upload path, so it avoids the fetch bug.

| Pros | Cons |
| --- | --- |
| Small, test-only, safe for `release_26.2` | The test passes only because its setup avoids the dataset type that breaks the button |
| Covers the issue fully (button wiring, zip name, real download) | Leaves a known 500 in the exact endpoint under test, discovered by this branch |
| Reviewed, passes on both backends | Reviewers will likely ask "why not fix it while you're there?" |

### 2. Expand: fix fetch-created LDDA download (recommended)
Do scope 1, then:
- set `library_dataset=ld` in `discover.py` (or assign `ldda.library_dataset = ld` after construction if the flush order objects),
- change `download()` to use `ld.folder`,
- add an API test fetching into a folder followed by a zip download.

Optionally, add an E2E variant seeded with `fetch_to_folder`, or switch the existing test's seed to fetch once the fix is in.

| Pros | Cons |
| --- | --- |
| Fixes a real user-facing 500 for API-populated libraries, bug present since 2019 (`fc68cb84494`, commented line kept in `623a5e165ad7`) | Touches model-store discovery, which is shared with sessionless model-store export (`SessionlessModelPersistenceContext`); needs a check that export/import still serializes correctly |
| The `ld.folder` change alone fixes download for rows already in production DBs, with no migration | `ldda` ↔ `ld` is a cycle (`LibraryDataset.library_dataset_dataset_association` is `post_update=True`); `upload_common` already does it this way, so risk is low but needs a test |
| Small: ~2 lines of server code plus one API test | Still release-branch server code, not test-only |
| Fixes the other `ldda.library_dataset` consumers below for new data | Existing rows stay broken for those other consumers until a backfill |

<details><summary>Other consumers of <code>ldda.library_dataset</code> affected by the missing back-reference</summary>

Found by reading the code; none of these were exercised.
- `api/library_datasets.py:681` `download()`: `AttributeError`, a 500. This one was observed.
- `model/__init__.py:7189` `LibraryDatasetDatasetAssociation.to_dict()`: `ldda.library_dataset.folder.parent_library.id` would raise for fetch-created LDDAs wherever an LDDA (not an LD) is serialized this way.
- `model/security.py:617` `can_access_library_item` for an LDDA item: raises instead of answering. Callers include `managers/base.py:122`, `managers/collections.py:989`, `actions/library.py:408` and `api/extended_metadata.py:74`. This fails closed (an error, not an access bypass), so I don't consider it security-sensitive.
- `model/security.py:1647` `check_folder_contents`: inner-joins `LDDA.library_dataset`, so fetch-created datasets are invisible to it. If a non-admin user can't add items to a folder whose only accessible datasets were fetched, the folder may be treated as inaccessible or hidden. This is also fail-closed.
- `model/__init__.py:6083` `source_library_dataset`: provenance for HDAs imported from fetch-created library datasets resolves to nothing.

The `ld.folder` change fixes download for both new and existing data. The `discover.py` fix covers every consumer, but only for new data. A backfill (`UPDATE library_dataset_dataset_association SET library_dataset_id = ld.id FROM library_dataset ld WHERE ld.library_dataset_dataset_association_id = ldda.id AND ldda.library_dataset_id IS NULL`) would fix existing rows, but it is a migration and belongs on `dev`.

</details>

### 3. Expand further: scope 2 plus a backfill migration
Add an Alembic data migration so existing fetch-created LDDAs get `library_dataset_id`.

| Pros | Cons |
| --- | --- |
| Fixes every consumer for existing data | Migrations don't belong on `release_26.2`; this forces retargeting to `dev` or splitting the branch |
| | Much more review weight than a test-fix branch should carry |

Better as a `dev` follow-up after scope 2 lands.

### 4. Expand: move `download_file_from` into the driver layer
Put it on `HasDriverProtocol` with Selenium and Playwright implementations (normal review 1, item 3).

| Pros | Cons |
| --- | --- |
| Matches how other backend-specific behavior is split | No second caller yet; reshuffles release-branch test infrastructure for no behavior change |
| | Easy to do later on `dev` when a second consumer appears |

### 5. Expand: convert other download tests to the helper
Candidates are the invocation export tests in `test_workflow_run.py` and `test_workflow_extraction`.

| Pros | Cons |
| --- | --- |
| Gives the new helper a second consumer (per "Unused infrastructure" guidance) | The workflow-run tests only assert that the link exists, and extraction downloads through the API. Neither does a browser download today, so this would be new test behavior, not a cleanup |
| | Widens a 26.2 test-fix into unrelated workflow tests |

Sites checked: neither currently triggers a browser file download, so the helper wouldn't simplify them. It would only extend what they test. Leave this for `dev`.

### 6. Swap the id fix for a `data-description` hook
| Pros | Cons |
| --- | --- |
| Follows the current selector convention | The id typo fix is the smallest correct change. It also fixes a real typo, since `download--btn` has no other consumers |
| | Churns `navigation.yml` on a release branch for no behavioral gain |

### 7. Add an API test asserting `Content-Disposition` / zip name
| Pros | Cons |
| --- | --- |
| Pins `selected_library_files.zip` cheaply, the name whose drift caused part of the issue | `test_libraries.py::test_download_uses_download_extension` already hits the zip endpoint. The E2E test now asserts the filename via `expected_filename` |
| Fits naturally into scope 2's new API test (fetch → zip download), so it adds almost nothing | |

Fold it into scope 2's API test rather than treating it as separate scope.

### 8. Contract: drop the E2E test, rely on the API test
| Pros | Cons |
| --- | --- |
| Cheaper, less flaky | Leaves the button wiring untested, and the broken button wiring is what the issue is about |
| | The work is already done and passing |

Not recommended.
