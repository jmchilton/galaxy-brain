# Checklist evaluation

Fresh subagent, 2026-10-15, against `7fe3b228ee7` on `release_26.2`; GENERAL. Two small FAILs (an unrelated icon swap and one stale test-path comment), one NEEDS-JUDGEMENT on tests; the human-read item is left for John.

| Item | Verdict | Top line |
| --- | --- | --- |
| Human read every test/comment | — | Left for John. |
| What does the user see when it fails? | PASS | A specific alert or notice for every state (withdrawn repo, no installable revisions, bad revision, file missing, binary, too large, symlink, empty, load error). The API returns 404 `err_code` 404001 with a message; a hg/DB mismatch returns a logged 500. |
| Diff free of unrelated changes | FAIL | No: the `RepositoryHealth.vue` install-count icon swap (`b76c5dd690b`) is unrelated. Everything else, including the generated schema, is on topic. |
| Unit tests not literal implementation | NEEDS-JUDGEMENT | Mostly behavioural. `no_file_reads` monkeypatches Mercurial's private `revlog._revisiondata`, and two asserts pin internals. |
| Comments free of archeology | FAIL | No history narration, but `test_repositories_manager.py:62-63` points at the file the API tests moved out of. |
| Comments describing previous impl | PASS | N/A |

<details>
<summary>What does the user see when it fails?</summary>

UI (`lib/tool_shed/webapp/frontend/src/components/`):
- Repository fails to load: "Failed to load repository" banner (`pages/RepositoryContentsPage.vue:98`).
- Deprecated or deleted repository: warning "This repository has been {deprecated|deleted}, so its files can't be browsed." (`RepositoryContentsBrowser.vue:57`). The Explore menu leaves Contents out for these (`RepositoryExplore.vue:49-53`), and the API 404s them, matching the hg controller (`webapp/controllers/hg.py:41-42`).
- No downloadable, non-malicious revisions: "This repository has no installable revisions to browse." (`RepositoryContentsBrowser.vue:62`).
- `?revision=` not browsable: danger alert "Revision X is not an installable revision of this repository." No request is sent (`RepositoryContentsBrowser.vue:71`).
- Listing fails: "Failed to load the files in this revision." (`pages/RepositoryContentsPage.vue:68`, shown at `RepositoryContentsBrowser.vue:80`). The server message is dropped.
- Empty revision: "This revision has no files." (`RepositoryContentsBrowser.vue:88`).
- `?file=` not in the revision: warning "{file} is not in this revision." No contents request is sent (`RepositoryContentsBrowser.vue:96`).
- Contents fail: `ErrorBanner` with `errorMessageAsString`, e.g. "Request failed with status 404: No file x in revision y." (`RepositoryFileViewer.vue:49`, `schema/client.ts:18`).
- Viewer notices (`RepositoryFileViewer.vue:31-40`): symlink "…is a symbolic link, so it has no contents to show."; truncated "…is too large to show here (N.N MB)."; binary "…is a binary file and can't be shown here."; empty "…is empty.". Every viewer state has a showcase example and a screenshot test.
- Anonymous users get no Changelog link, instead of one that dead-ends at the hgweb login gate (`RepositoryExplore.vue:44-47`).

API (`lib/tool_shed/managers/repositories.py`):
- An unknown repository id raises `ObjectNotFound("Repository not found for id …")`, an existing helper.
- A deleted, deprecated or no-metadata repository, or a non-downloadable or malicious revision, or any non-exact hash (`tip`, a prefix, a full hash, `000000000000`) gets 404 "No browsable revision {rev} for repository." (`:562-569`). It's deliberately one message for all of these.
- A missing path, directory, `..`, `.hg/…` or NUL gets 404 "No file {path} in revision {rev}." (`:605`).
- Metadata says downloadable but hg can't find the revision: `log.error` plus a 500 `InconsistentApplicationState` "Revision {rev} is missing from the repository." (`:571-577`). The `log.error` keeps it visible, since a `MessageException` doesn't reach Sentry.
- 404s carry no `ETag` or public `Cache-Control` (`test_shed_repository_files.py:164-165`), so errors aren't cached for a day.

Minor inconsistency, not a fail: listing errors show a generic message, while contents errors show the raw "Request failed with status 404: …" text, prefix included.
</details>

<details>
<summary>Diff free of unrelated or stale generated changes?</summary>

- **Generated schema: clean.** I regenerated `schema.ts` from the branch with `scripts/dump_openapi_schema.py --app shed`, `openapi-typescript` and the shed `.prettierrc`, writing to a scratch directory. The result is byte-identical to the committed file, and its diff only adds the two `files` routes, their operations and the three models. `_shed_schema.yaml` is a temporary Makefile artifact (`remove-api-schema` deletes it), so it is correctly absent. `schema/client.ts` and `schema/index.ts` are hand-written: they add `FILE_CONTENTS_PATH` and the slash-restoring middleware.
- **`RepositoryHealth.vue:2,25` (`faDownload` → `faChartLine`): unrelated.** The scope evaluation called it the only unrelated change and it has nothing to do with #22598. This branch targets `release_26.2`, so an unrelated UI tweak needs justifying in its own PR. It costs nothing to drop. **Decision: not acceptable here.**
- Related and acceptable:
  - `ConfigFileContents.vue:45-46` adds `tabindex="0"` so the reused viewer's long lines scroll by keyboard. The showcase has a "long lines scroll" example.
  - `PaginatedRepositoriesGrid.test.ts` adds pinia and a `RouterLinkStub`. The grid renders `RepositoryExplore` (`PaginatedRepositoriesGrid.vue:170`), which now reads `useAuthStore` and uses `:to`.
  - `metadata_util.py` only adds type hints to `get_metadata_by_changeset`, which the new `_browsable_changectx` calls.
  - `fast_app.py:132` adds the `/repositories/{repository_id}/contents` front-end route that deep links need.
  - The `frontend/CLAUDE.md` edit follows that file's own convention: the structure tree gets the new `composables/` directory and the a11y table gets the new components.
  - The core `allow_cors` preflight fix and the `APICorsRoute` `Vary: Origin` header are needed by the new public, cacheable, CORS routes.
- There are no stray files among the 44.
</details>

<details>
<summary>Unit tests not just testing the literal implementation?</summary>

Behavioural (good):
- `test_repository_files.py` builds a real hg repo and checks what a caller sees: exact-hash resolution, listing, text, binary, non-UTF-8, symlink, the size cap, copy metadata excluded from size, and paths not in the manifest (including NUL).
- `test_repositories_manager.py` covers states the API can't set up (no-metadata revision, deleted repository, hg/DB mismatch) through the exception the route would raise.
- The vitest files assert rendered text, ARIA attributes and the URL on the wire (`api/index.test.ts`). `RepositoryContentsPage.test.ts` mocks only the boundaries (API, router, store, Quasar select) and asserts what renders.

Flags:
- `test_repository_files.py:136-145`: `no_file_reads` monkeypatches `revlog.revlog._revisiondata` and reads `self.target[0]`, both private Mercurial internals. It guards a real property (listing, truncation and validators must not read file blobs), but it will break or silently stop guarding on a Mercurial refactor. Keep it, as long as John accepts the upgrade risk.
- `test_repository_files.py:161`: `assert ctx.hex().decode() in listing_validator(ctx)` pins the validator's string format. The distinctness asserts on the following lines already cover the behaviour, so this line can go.
- `pages/RepositoryPage.test.ts:146` asserts the child prop `findComponent(RepositoryExplore).props("browsableRevision")` rather than the rendered Contents link. Asserting the menu's `href` would test what the user gets.
</details>

<details>
<summary>Comments free of excess archeology?</summary>

I scanned every added comment and docstring in the Python, TS, Vue, Markdown and test files. None narrate history ("previously", "used to", "this fixes"), mention reviews or plans, or say "as hgweb does" unverified (that claim at `RepositoryContentsPage.vue:50` matches `controllers/hg.py:41-42`). The comments explain non-obvious constraints: the NUL-terminated C manifest, the copy-metadata header in the index size, the `Vary: Origin` reason, `%2F` and proxies, and why the preflight drops `response_model`.

The one defect is `test/unit/tool_shed/test_repositories_manager.py:62-63`. It says the API coverage is "in lib/tool_shed/test/functional/test_shed_repositories.py", but `a575406e67f` moved those tests to `test_shed_repository_files.py`. `test_shed_repositories.py` has no file-API tests now, so the comment is a stale leftover of the move.
</details>

## Resolution (coordinator, 2026-10-15)

- **Icon swap:** John chose to keep it and call it out in the description as a deliberate two-line ride-along. The item now passes on that basis.
- **Stale comment:** fixed in `d8e684b8fe8` and pushed (fast-forward from `7fe3b228ee7`).
- **Tests item:** passes, with notes. `no_file_reads` pins the property that matters: the size comes from the index and file blobs are never read. Accepting the Mercurial-internals upgrade risk for that. The `in listing_validator` assert is a minor format pin next to the distinctness asserts. The `RepositoryPage` prop assert was deliberately kept by the test challenges: the page stubs its children, so the prop is the contract.

## Re-check after strengthening (`d8e684b8fe8..f4b0af72e73`)

A fresh subagent re-checked the two new commits and every item passes:
- **Unrelated changes:** the diff touches only the new test and one comment line.
- **Tests:** the test pins that unbounded revisions are rejected without opening hg. It doesn't pin call order.
- **Comments:** no archeology.
- **Edited comment:** accurate. The files API 404s deprecated and deleted repositories, while hgweb 404s deprecated ones only.

## Failures / fixes needed (as found)

1. **Unrelated icon swap.** Restore `lib/tool_shed/webapp/frontend/src/components/RepositoryHealth.vue` to `origin/release_26.2`: line 2 imports `faDownload` instead of `faChartLine`, and line 25 goes back to `:icon="faDownload"`. The cleanest way is to drop `b76c5dd690b` in a rebase. Its added `RepositoryMenus.test.ts` case was already removed by `26d95b5d5cd`, so that commit's hunk becomes empty; keep the base file's content. If John wants the icon change, ship it as its own PR against `dev`.
2. **Stale test-path comment.** In `test/unit/tool_shed/test_repositories_manager.py:63`, change `lib/tool_shed/test/functional/test_shed_repositories.py` to `lib/tool_shed/test/functional/test_shed_repository_files.py`.

## Gaps noted

- No CI has run on `7fe3b228ee7` yet, and this evaluation ran no tests.
- Listing and contents errors are worded inconsistently: one is generic, the other shows a raw status prefix. Optional polish, not a fail.
- One 404 message deliberately covers deprecated, deleted, malicious, no-metadata and non-exact revisions, so the URL space stays bounded. API consumers can't tell these cases apart.
