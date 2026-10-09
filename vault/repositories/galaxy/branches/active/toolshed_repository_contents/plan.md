# toolshed_repository_contents — plan

Addresses galaxyproject/galaxy#22598 (anon users can't browse repo contents; nginx now gates hgweb `/repos/` HTML views behind login because bots crawled hgweb's unbounded URL space). Stacked on galaxyproject/galaxy#23925 (dannon, `toolshed-shed-migration`, galaxy-ui frontend). Branch base: `58f87d38527`.

Worktree: `~/projects/worktrees/galaxy/branch/toolshed_repository_contents`

## Design constraints

- Bounded URL space: only changesets that have a `RepositoryMetadata` row that is downloadable and not malicious; exact stored 12-char hash only. `tip`, branch names, full 40-char hashes, unknown hashes → 404.
- Read hg revlog in-process; never clone; never touch filesystem paths (manifest lookup only).
- File contents served as a JSON envelope, never raw (user-uploaded HTML/SVG on TS origin = stored XSS).
- Cacheable: `Cache-Control: public, max-age=86400` + strong ETag; 304 on If-None-Match; never cache 404. No `immutable` (takedowns/deprecations must age out).
- Deleted/deprecated repos → 404 (match `controllers/hg.py`).

## Phase 1 — backend

1. Models in `lib/tool_shed_client/schema/__init__.py` (next to `RepositoryRevisionReadmes`):
   - `RepositoryFileType = Literal["file", "symlink"]`
   - `RepositoryFileEntry(path, size, type, executable)`
   - `RepositoryRevisionFiles(changeset_revision, files)`
   - `RepositoryFileContents(path, size, type, binary, truncated, content: str | None)`
2. `lib/tool_shed/util/repository_files.py` — pure hg helpers, no DB:
   - ctx lookup via `tool_shed.util.hg_util.changeset2rev` + `repo[rev]` (NOT `get_changectx_for_changeset` — scans changelog; NOT `get_file_context_from_ctx` — walks `ctx.files()` = changed files only + basename match).
   - `list_manifest(ctx)`, `read_manifest_file(ctx, path, max_bytes=MAX_CONTENT_BYTES≈1MiB)` (size check before `data()`, `galaxy.util.is_binary`-style detection, utf-8 `errors="replace"`, symlinks: no content), etag helpers. Mercurial paths are bytes.
3. Manager fns in `lib/tool_shed/managers/repositories.py`: browsable-revision resolution (read-only query; don't use `repository_metadata_by_changeset_revision`, it deletes dup rows), `repository_files`, `repository_file_contents`; raise `ObjectNotFound`.
4. Routes in `lib/tool_shed/webapp/api2/repositories.py` (copy `repositories__readmes` style):
   - `GET /api/repositories/{encoded_repository_id}/revisions/{changeset_revision}/files` → `repositories__files`
   - `GET /api/repositories/{encoded_repository_id}/revisions/{changeset_revision}/files/{path:path}` → `repositories__file_contents`
   - generalize existing `_cacheable`/`_etag_for` helpers rather than duplicating.
5. Populator helpers in `lib/tool_shed/test/base/populators.py`.
6. Regenerate only the shed schema: `python scripts/dump_openapi_schema.py --app shed _shed_schema.yaml` + the `openapi-typescript` line from Makefile `update-client-api-schema`.

Tests (red first): functional in `lib/tool_shed/test/functional/test_shed_repositories.py` — listing, text contents, anonymous access, unchanged file listed at every revision (`column_maker_unchanged`), per-revision contents (`column_maker`), unbounded revision rejection, bad paths (`../x`, `.hg/hgrc`, missing), deprecated 404, cache headers/304/no-cache-on-404. Unit in `test/unit/tool_shed/test_repository_files.py` — binary, non-utf8, symlink, size cap, same basename in different dirs.

## Phase 2 — frontend (galaxy-ui conventions per `lib/tool_shed/webapp/frontend/CLAUDE.md`)

- Route `/repositories/:repositoryId/contents?revision=&file=` (`routes.ts`, function-props pattern), `contentsLocation()` in `router.ts`, API helpers in `src/api/index.ts` (client middleware throws on non-ok → try/catch; check `/` encoding in `{path}`).
- `fileTree.ts` pure helpers (`buildFileTree`, `ancestorsOf`, `basename`) + tests.
- `RepositoryFileTree.vue` (nested `<ul>` of buttons, `aria-expanded`, `aria-current`), `RepositoryFileViewer.vue` (JSON envelope: binary / truncated / symlink / empty states; text via `ConfigFileContents` copy+download), `pages/RepositoryContentsPage.vue` (PageHeader one h1, two-column shed-card layout, `RevisionSelect` filtered to downloadable revisions, default = last installable key as `RepositoryPage` does, `router.replace` on selection).
- `RepositoryExplore.vue`: Contents → in-app route via `:to` (menu + dense); Changelog → hgweb shortlog only when logged in (`useAuthStore().user`).
- `RepositoryHealth.vue`: install-count icon `faDownload` → non-action icon (typo already fixed in #23925).
- Showcase entries; update frontend `CLAUDE.md` table.
- Tests: vitest for helpers/tree/viewer/page/menus; Playwright anon tests in `lib/tool_shed/test/functional/test_frontend_repositories.py`.

## Deferred

- "View XML" link from `RepositoryTool` (needs relative tool_config path).
- `tool_source` endpoint clones per request + 500s on main; could reuse `repository_files` helpers.
- `readme_util` old-revision branch shares the `ctx.files()`/basename bug.
- `repository.store.ts` picks newest revision differently from `RepositoryPage`.
- `private` column unenforced by api2.
