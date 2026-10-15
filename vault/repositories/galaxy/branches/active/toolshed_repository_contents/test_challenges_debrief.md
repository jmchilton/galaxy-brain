# toolshed_repository_contents — test challenges debrief

Net: dropped 5 manager unit tests, 1 vitest file and 11 vitest cases. Rewrote 1 manager test without a monkeypatch. Added 1 Playwright test and tightened 2. Commits `9bca5164632`, `638e53c13e2`, `a18e3c45fbd` (not pushed). Not blocked.

The two overlaps the implementation debrief flagged are resolved:
- **Manager unit tests vs functional:** everything the API can set up was dropped. Kept only states the API can't reach: a real changeset with no metadata row, a deleted repo (api2 has no delete route), and DB/hg disagreement.
- **`fileTree.test.ts` vs `RepositoryFileTree.test.ts`:** the component test is kept as the behavioral spec. `fileTree.test.ts` keeps one ordering-spec test.

## Results

- `pytest test/unit/tool_shed`: 122 passed, 12 skipped.
- Shed vitest: 216 passed (was 231). Typecheck clean, lint 0 errors, prettier clean.
  - Needs node 22.20.0 via `npm_config_use_node_version`; node 25 fails on unmodified HEAD.
- Playwright `TestFrontendRepositoryContents`: 4 passed, including the new test (frontend dist rebuilt first).
- Red check: the rewritten missing-from-hg test fails if the `InconsistentApplicationState` branch is turned into a 404.

## Python unit: `test/unit/tool_shed/test_repositories_manager.py`

- `lists_unchanged_files`: **dropped**. Same scenario as the functional `test_repository_files_lists_unchanged_files`.
- `file_contents_rejects_missing_path`: **dropped**. Covered by functional `rejects_bad_paths` (dir, `.hg/hgrc`, missing).
- `rejects_malicious_revision`: **dropped**. Covered by functional `unavailable_revisions` via `set_malicious`.
- `rejects_unavailable_repository[deprecated]`: **dropped** (covered functionally).
- `rejects_unavailable_repository[deleted]`: **kept**, as `rejects_deleted_repository`. api2 has no delete route.
- `rejects_revision_without_metadata`: **kept**. The API can't get the hash of a changeset without metadata.
  - The functional "unbounded revisions" cases (`tip`, `0`, `deadbeefdead`, …) never hit a real non-metadata changeset.
- `reports_revision_missing_from_hg`: **rewritten**.
  - Before: monkeypatched `changectx_for_revision`.
  - Now: points a real downloadable metadata row at a hash that is not in hg.
- `file_validators_do_not_build`: **dropped**. It monkeypatched the manager's imported `list_manifest`/`read_file` to assert a lambda is not called, which tests the implementation.
  - The property that matters, cheap validators, is pinned by `test_validators_do_not_read_files`.

## Python unit: `test/unit/tool_shed/test_repository_files.py` (all kept)

- Uses a real hg repo. The only patch is the `no_file_reads` revlog guard, which pins the size-from-index property a review found broken.
- Binary, non-UTF-8, symlink, executable, size cap, copy metadata and NUL-terminated paths can't be set up through shed test data repos.
- `changectx_for_revision_requires_exact_short_hash` looks like it overlaps functional `rejects_unbounded_revisions`, but it doesn't.
  - In the functional test, `tip`/`0`/prefix/full-hash are rejected by the metadata query before `changectx_for_revision` runs.
  - So this unit test is the only coverage of the helper's contract.

## Functional (API/CORS/showcase): all kept

`test_shed_repositories.py` additions, `test_shed_cors.py` and the showcase screenshots are at the right layer. No changes.

## Vitest

- `RepositoryContentsBrowser.test.ts`: **dropped (whole file)**.
  - The emit contract and the withdrawn notice are covered by `RepositoryContentsPage.test.ts`, which mounts the real browser.
- `fileTree.test.ts`: kept the "folders first then alphabetical" nesting spec.
  - Dropped "full path/entry shape" (data-structure internals) and "empty".
  - Dropped `ancestorsOf`: covered by the tree's "opens folders around selected file" tests.
  - Dropped `basename`: trivial.
- `RepositoryFileTree.test.ts`, `RepositoryFileViewer.test.ts`: kept. They are the behavior specs, and viewer states (binary/truncated/symlink/empty) can't be reached in E2E.
- `api/index.test.ts`:
  - Dropped "lists the files" (a thin wrapper, covered by E2E).
  - Dropped "keeps slashes" (covered by E2E `expect_response` and by the escaping test). The escaping test was renamed to say it covers slashes.
  - Kept the 404-throws test and the `newestRevision` tests.
- `RepositoryContentsPage.test.ts`: dropped 4 cases, each now covered by Playwright.
  - "one h1": `to_have_text` on `h1` is strict.
  - "Files landmark": the E2E now scopes the tree to the landmark.
  - "revision+file from URL": E2E deep link, which now also checks `aria-current`.
  - "slashes in URL": E2E browse.
  - Kept: revision filtering, push vs replace, loading/race/error/missing/withdrawn states.
- `RepositoryMenus.test.ts`:
  - Dropped "install icon is not `download`", which is a negative assertion on a glyph name (silly).
  - Dropped anonymous "links contents of browsable revision" (E2E plus the logged-in test cover it).
  - Kept changelog-gating, dense-mode and deprecated/deleted cases.
- `RepositoryPage.test.ts` (`findComponent(RepositoryExplore).props("browsableRevision")`): **kept**.
  - The page test stubs its children, so the prop is the contract.
  - Asserting the rendered href instead would need real `RepositoryExplore`, router and auth in this file, which is not worth it.

## E2E (`test_frontend_repositories.py`, Tool Shed Playwright)

- **Added** `test_contents_switch_revision_keeps_file`.
  - Deep-links the newest `column_maker.xml` and picks the oldest revision in `RevisionSelect`.
  - Asserts the content switches to 1.1.0, the URL keeps `file=`, and "Newer revision(s) available" shows.
  - Revision switching was the main untested user flow.
- Browse and deep-link tests now find the tree via `get_by_role("navigation", name="Files")`. The deep link also asserts `aria-current`.
- Galaxy's `navigation.yml` and smart components don't apply here. Role-based locators follow the existing shed tests.
