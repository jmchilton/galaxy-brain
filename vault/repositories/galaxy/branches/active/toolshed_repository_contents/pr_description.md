Fix 🎯 #22598 - anonymous users can browse Tool Shed repository files again, through bounded shed API routes instead of hgweb.

| Before: Explore → Contents, logged out | After: Explore → Contents, logged out |
| --- | --- |
| ![hgweb Forbidden page](https://github.com/user-attachments/assets/67ecd8a6-9437-4c6a-a971-4cb9a7de4c7a) | ![Contents page showing column_maker.xml](screenshots/repository_contents_file.png) |

The Contents button linked to hgweb's `/repos/<owner>/<name>/file/tip`. Bot traffic to hgweb's HTML views overwhelmed the shed, so those views now sit behind login and anonymous users get "Forbidden". Rate limiting can't fix that: bot networks are large enough that one request per address still overloads the shed. The fix suggested on the issue was to serve what should be public through the Tool Shed application itself. This PR does that.

***The new routes only answer for a bounded set of URLs, so crawlers can't make them do unbounded work.*** A request names a repository, one of its downloadable revisions, and optionally a file in that revision. ***Any other revision is a 404 from one database lookup, before the shed opens the repository.***

```text
GET /api/repositories/{id}/revisions/{changeset_revision}/files          → file listing
GET /api/repositories/{id}/revisions/{changeset_revision}/files/{path}   → one file, wrapped in JSON
```

| Request | Response |
| --- | --- |
| Exact 12-character hash of a downloadable, non-malicious revision | 200, `Cache-Control: public, max-age=86400` + strong `ETag`; 304 on revalidation |
| `tip`, branch names, revision numbers, hash prefixes, full 40-character hashes | 404 |
| Revision without metadata, malicious revision | 404 |
| Deprecated or deleted repository | 404 |
| Path not in the revision's manifest (`../x`, `.hg/hgrc`, directories) | 404 |

404s carry no `ETag` and no public `Cache-Control`. Files are read from the revlog in the shed process, without cloning. A file's size comes from the revlog index, so files over 1 MiB are reported as too large without being read. ***File contents always come back as a JSON envelope, never as raw bytes, so a user-uploaded HTML or SVG file can't run as a page on the shed's origin.*** ***Text files up to 1 MiB can be viewed, copied and saved; binary and larger files are listed but not served.***

<details><summary>Revision switching, the Explore menu and viewer states</summary>

Switching the revision keeps the open file:

![column_maker.xml at revision 0, "Newer revision(s) available"](screenshots/repository_contents_older_revision.png)

| Logged out | Logged in |
| --- | --- |
| ![Explore menu: Contents, Metadata](screenshots/repository_explore_menu_anonymous.png) | ![Explore menu: Changelog, Contents, Metadata](screenshots/repository_explore_menu_logged_in.png) |

Viewer states, from the component showcase:

![Text, long lines, binary, too large, symlink, empty, loading, error, nothing selected](screenshots/RepositoryFileViewer.png)

</details>

***hgweb's HTML views stay behind login, and this PR needs no nginx change. Existing `/repos/.../file/tip` links still get "Forbidden"; the Contents button now opens `/repositories/<id>/contents` instead.*** ***Changelog still uses hgweb, so it's shown only to logged-in users; an anonymous changelog is a follow-up.***

***Literal `tip` isn't served, by the UI or the API: clients name an exact 12-character hash of a downloadable revision.*** The page opens on the newest downloadable, non-malicious revision. That's usually the tip commit, since metadata moves forward to tip, and it's what Galaxy can install.

***Two small changes touch Galaxy core's `allow_cors` routes: preflights no longer inherit `response_model`, and CORS responses add `Vary: Origin`. Neither changes which origins are allowed.***

One unrelated two-line change rides along: the install-count pill uses a chart icon instead of a download glyph, which looked like a button.

<details><summary>What changed</summary>

- **Backend**
  - `tool_shed/util/repository_files.py` (new): lists a revision's manifest and reads one file, with binary, size-cap, symlink and executable handling. No database access.
  - `hg_util.changectx_for_revision` resolves only an exact 12-character hash. `hg_util.file_size` reads the size from the revlog index.
  - `managers/repositories.py`: `repository_files` / `repository_file_contents` resolve a browsable revision with a read-only query and return a `CacheableResult`, whose validator is built without reading file contents. That lets the route answer a 304 without building the listing or reading the file.
  - `api2/repositories.py`: the two routes, `public=True` and `allow_cors=True`. The existing install-info caching now goes through the same `CacheableResult` path; its ETags are byte-identical.
  - Models `RepositoryRevisionFiles`, `RepositoryFileEntry` and `RepositoryFileContents` in `tool_shed_client.schema`. The shed client schema is regenerated for the two routes only.
- **Frontend**
  - `/repositories/:id/contents?revision=&file=` page. `RepositoryContentsBrowser` holds the layout and takes props, so every page state is in the component showcase.
  - `RepositoryFileTree` is a `<nav>` landmark with `aria-expanded` and `aria-current`. `RepositoryFileViewer` reuses `ConfigFileContents` for copy and download.
  - `RevisionSelect` lists only downloadable, non-malicious revisions. Picking a file pushes a history entry; changing the revision replaces it.
  - `useLatestLoad` composable drops responses that arrive after the revision or file changed.
  - Explore → Contents is an in-app link, hidden for deprecated and deleted repositories.
  - An openapi-fetch middleware keeps `/` literal in the file path, scoped to the one schema path.
  - `RepositoryPage` now selects the newest revision when it mounts with metadata already cached. Without that, coming back from Contents showed no tools or READMEs.
- **Core Galaxy** (`lib/galaxy/webapps/galaxy/api/__init__.py`), two small changes:
  - `083d5cccff3`: `allow_cors` preflight routes no longer inherit the route's `response_model`. The new routes are the first `allow_cors` routes with one, and their preflight returned a 500. It's the first commit and can be split out if preferred.
  - `6521d02fde2`: `APICorsRoute` copies the request's `Origin` into `Access-Control-Allow-Origin`, so it now also sends `Vary: Origin`. The new routes are the first that are both CORS-enabled and publicly cacheable; without `Vary`, a shared cache could serve one origin's copy to another for a day. Galaxy's landing POST routes send the header too, which is harmless.

</details>

## Risks

The two new anonymous routes are public API: once clients use them, their URL shape (exact 12-character hashes only) and JSON envelope are hard to change.

<details><summary>Risk Details</summary>

- New public, CORS-enabled API: `GET /api/repositories/{id}/revisions/{changeset_revision}/files[/{path}]`.
- Revisions are exact 12-character hashes only. Clients that want `tip` must look up the newest downloadable revision first.
- Responses are cached publicly for a day, so a revision marked malicious or a repository deprecated can stay visible in shared caches for up to 24 hours. There's no `immutable`, so they do age out.
- Non-UTF-8 filenames are listed with replacement characters but return 404 when fetched. Such names are rare in shed repositories; fixing it needs a path encoding scheme.
- The `private` repository flag isn't enforced here, as nowhere else in api2.
- Core Galaxy: every `allow_cors` route now sends `Vary: Origin`. With `allowed_origin_hostnames` set, Starlette's CORS middleware already adds it, giving `Vary: Origin, Origin`, which caches treat the same.

</details>

<details><summary>Risk Review Advice</summary>

Check the bounding in `managers/repositories.py` and `hg_util.changectx_for_revision`: the routes should only reach hg for an exact hash of a downloadable revision and a path in its manifest. Then check the two core `allow_cors` changes in `lib/galaxy/webapps/galaxy/api/__init__.py`, which apply to every CORS route in Galaxy and the shed.

</details>

## Context

Builds on 🔀 #23925 (the galaxy-ui Tool Shed frontend). Follow-ups this enables: the `tool_source` endpoint, which clones per request, can read files with the same helpers; and a "View XML" link from a tool.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the scope as implemented: one PR with the files API, the contents browser and the core preflight fix.</summary>

- Splitting backend from frontend was rejected: the API alone doesn't change what anonymous users see.
- Splitting out the preflight fix was rejected by default: the new routes are its only trigger and its only test. It's a separate first commit if a reviewer wants it.
- An anonymous changelog, `tool_source` reuse, the `readme_util` old-revision bug, `private` enforcement, non-UTF-8 paths and CORS `ETag` exposure are follow-ups.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Four simplifications applied, net −7 lines, behaviour unchanged.</summary>

- api2 cache helpers collapsed from five to three; install-info now goes through `CacheableResult` with byte-identical ETags.
- Files API tests moved to their own `test_shed_repository_files.py`.
- `ToolShedPopulator.get_downloadable_revisions` replaced three copies.
- `useLatestLoad` replaced two copy-pasted request-counter watchers.
- Deferred: `RepositoryContentsBrowser`'s 12 props (could take `LatestLoad` objects), splitting the 1.28k-line manager module, porting `PaginatedRepositoriesGrid` to `useLatestLoad`.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Dropped tests that duplicated the API suite or tested internals, and added a revision-switching browser test.</summary>

- Manager unit tests keep only states the API can't set up: a changeset with no metadata, a deleted repository, and the database pointing at a hash hg doesn't have. The last one no longer monkeypatches.
- `test_repository_files.py` uses a real hg repository for binary, non-UTF-8, symlink, executable and size-cap cases that shed test repositories can't produce.
- Vitest cases covered by Playwright or testing data-structure internals were dropped.
- Added `test_contents_switch_revision_keeps_file`, the main untested user flow.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex found one regression, fixed with a red-first test; two other findings are known limits.</summary>

- Fixed: `RepositoryPage` showed no revision, tools or READMEs after returning from Contents. Both watchers are now `immediate`, which also fixes READMEs never loading when the page mounts with a revision prop.
- Known limits: non-UTF-8 filenames 404, and CORS doesn't expose `ETag` to scripts. Browser cache revalidation already works cross-origin.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A specific notice for each state: binary, too large, symlink, empty, file not in this revision, revision not installable, repository deprecated or deleted. API errors are 404s with a message and no cache headers; a revision missing from hg despite its metadata is a logged 500.
- [x] Is the diff free of unrelated or stale generated changes? Yes, apart from the two-line icon swap called out above. The regenerated shed schema matches a fresh regeneration byte for byte.
- [x] Are unit tests not just testing the literal implementation? Yes. They run against a real hg repository. The one monkeypatch fails the test if a listing, a size check or a validator reads a file's contents.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- API: `test_shed_repository_files.py` covers listings, contents, anonymous access, unchanged files at every revision, per-revision contents, rejected revisions and paths, deprecated repositories, and cache headers, 304s and 404s without cache headers. `test_shed_cors.py` covers the preflight and `Vary: Origin` on 200 and 304.
- Unit: `test_repository_files.py` against a real hg repository; `test_repositories_manager.py` for states the API can't reach, and for `tip`, prefixes, full hashes and unknown hashes being rejected without opening the repository.
- Playwright: anonymous browse, deep link, revision switching, and the Explore menu logged out and in.
- Vitest: the tree, viewer, page loading and race states, menus and API helpers. The component showcase screenshots every viewer and browser state.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
