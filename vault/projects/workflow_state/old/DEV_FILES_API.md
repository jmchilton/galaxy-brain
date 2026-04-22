# DEV_FILES_API

Plan for a file CRUD API alongside `/workflows/*` in `galaxy-workflow-development-webapp`, enabling a browser-based text editor for workflows and adjacent files. API shape mirrors the Jupyter Contents API so existing frontend components (JupyterLab filebrowser, or any editor that speaks the shape) work with minimal glue.

## Status

**Phase 1 implemented** in commit `9736882` (2026-04-04). 27 tests passing, mypy clean.

- `/api/contents` GET/PUT/DELETE/PATCH live
- Path safety (containment + symlink escape + ignore list)
- Auto-refresh of `/workflows` cache on workflow-file mutations
- Mounted at `/api/contents` for JupyterLab filebrowser drop-in
- Text + base64 (binary) formats; `?content=0` lightweight listing
- Directory creation via PUT with `type: directory`

**Phase 2 implemented** in commit `071ed29` (2026-04-04). 43 tests passing, mypy clean.

- `POST /api/contents` + `POST /api/contents/{path}` — untitled create (`untitled`/`untitled1`… for files, `Untitled Folder`/`Untitled Folder 1`… for directories). Optional `ext` (dot auto-prepended).
- `?format=text|base64` GET override — `text` on non-utf8 → 400, `base64` on anything → encoded, unknown → 400.
- Conflict detection via `If-Unmodified-Since` header (RFC 7232 HTTP-date) — **deviation from plan**: body-echoed `last_modified` was rejected because phase 1 tests ship stale `last_modified` values on freshly-created files (would spuriously 409). Header is truly opt-in, and Jupyter itself does not enforce conflict detection, so an opt-in header is closer to Jupyter behavior than a mandatory body check. 1s mtime tolerance for fs precision.
- `.gitignore` honoring deferred — Jupyter doesn't do it either; hardcoded `IGNORE_NAMES` remains authoritative.
- Max file size cap deferred.

**Phase 3 implemented** in commit `071ed29` (2026-04-04). 57 tests passing, mypy clean.

- `GET/POST /api/contents/{path}/checkpoints` — list and create checkpoints (Jupyter Contents API shape).
- `POST /api/contents/{path}/checkpoints/{id}` — restore. `DELETE` — remove checkpoint.
- `CheckpointModel = {id, last_modified}`.
- Storage: mirrored tree under `<root>/.checkpoints/<rel_path>/<id>`. `.checkpoints` added to `IGNORE_NAMES` so it's hidden from listings and rejected from user paths.
- Single checkpoint id `"checkpoint"` per file (matches Jupyter's `FileCheckpoints` default).
- Files only — checkpoint on directory → 404. Matches Jupyter.
- Explicit create only — no auto-checkpoint on PUT. Matches Jupyter.
- Cascade: `delete_contents` removes the checkpoint subtree (file- or directory-scoped); `rename_contents` moves the checkpoint subtree alongside the source.
- Route ordering: checkpoint routes declared before the generic `/api/contents/{path:path}` handlers so FastAPI matches the literal `/checkpoints` suffix first.

## Scope
- Mount at `/api/contents` — parallel namespace to `/workflows`.
- Browse, read, create, update, rename, delete files under the configured directory.
- Same directory already used by `/workflows` — one config, two views (semantic vs raw).
- Drop notebook-specific behavior from Jupyter's API (no `type: notebook`, no `.ipynb` handling).
- Checkpoints deferred to phase 3.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/contents/{path:path}` | Read file or list directory. `?content=0` skips the content body (lightweight listing). |
| `POST` | `/contents/{path:path}` | Create new untitled file or directory in `{path}` (path = parent dir). Body `{type, ext?}`. |
| `PUT` | `/contents/{path:path}` | Save file (create-or-replace). Body is a ContentsModel. |
| `PATCH` | `/contents/{path:path}` | Rename/move. Body `{path: new_relative_path}`. |
| `DELETE` | `/contents/{path:path}` | Delete file or directory. |

Empty `{path}` (`/contents/` or `/contents`) = directory root.

## ContentsModel (response + PUT body)

```python
class ContentsModel(BaseModel):
    name: str                 # basename
    path: str                 # relative path from configured directory
    type: Literal["file", "directory"]
    writable: bool
    created: datetime
    last_modified: datetime
    size: Optional[int]       # None for directories
    mimetype: Optional[str]   # None for directories
    format: Optional[Literal["text", "base64", "json"]]  # for files; None for directories
    content: Optional[Any]    # str (text), str (base64), list[ContentsModel] (directory), None if ?content=0
```

Differences from Jupyter:
- No `type: notebook` — everything non-directory is `type: file`.
- `format: json` retained (useful for .ga files — can serve parsed JSON directly if client requests).
- Directory listings are shallow (one level) — same as Jupyter.

## Query parameters
- `?content=0` — omit `content` field (fast listing).
- `?format=text|base64|json` — for file reads, force encoding. Default: auto (text if utf-8 decodable, else base64).
- `?type=file|directory` — hint for `GET` disambiguation (Jupyter supports this; mostly unneeded since server can stat).

## Path safety
Shared helper `_resolve_safe_path(rel_path) -> str`:
1. Normalize via `os.path.abspath(os.path.join(_directory, rel_path))`.
2. Reject if result is not under `_directory` (prefix check with `os.sep`).
3. `os.path.realpath()` check to catch symlink escape.
4. Reject components matching a hardcoded ignore list (`.git`, `__pycache__`, `.venv`).

Used by every `/contents/*` handler. Returns 403 on escape, 404 on missing (for reads), 400 on invalid shape.

## Create semantics (`POST`)
Jupyter's POST creates an *untitled* file/directory inside `{path}`. Body:
```json
{"type": "file", "ext": ".ga"}   // or {"type": "directory"}
```
Server picks a unique name (`untitled.ga`, `untitled1.ga`, …) and returns the full ContentsModel.

Useful for "New File" buttons. Save-as workflows use `PUT /contents/{exact_path}` instead.

## Rename (`PATCH`)
```json
{"path": "subdir/new_name.ga"}
```
Atomic `os.rename`, with destination path also passing `_resolve_safe_path`. Returns the new ContentsModel.

## Conflict detection
Phase 1: none.
Phase 2 (implemented): opt-in via `If-Unmodified-Since` request header on PUT (RFC 7232 HTTP-date). If the header is present and the on-disk mtime is newer than the supplied date (1s tolerance), respond 409 and leave the file untouched. Malformed header → 400. Absent header → no check (phase 1 behavior). Chosen over body-echoed `last_modified` because phase 1 tests ship stale body values on freshly-created files; a header is cleanly opt-in and closer to Jupyter (which doesn't enforce at all).

No ETag header — keeps the contract JSON-envelope-only, matching Jupyter.

## Post-write refresh of `/workflows`
When PUT/POST/DELETE/PATCH touches a `*.ga` or `*.gxwf.yml` file, inline-call `discover_workflows(_directory)` to refresh `_workflows`. Cheap. Eliminates the need for clients to call `/workflows/refresh` after an edit.

## Module layout
- New `contents.py` — path resolution, ContentsModel builders, directory listing, read/write/delete/rename primitives. Pure functions, no FastAPI dependency.
- `models.py` — add `ContentsModel`, `CreateRequest`, `RenameRequest`.
- `app.py` — thin endpoint handlers delegating to `contents.py`. Post-mutation hook that refreshes `_workflows` when workflow files change.
- `operations.py` — unchanged.

## Ignore list
Hardcoded defaults: `.git`, `__pycache__`, `*.pyc`, `.venv`, `.ruff_cache`, `.pytest_cache`, `.mypy_cache`. Override via CLI flag `--contents-ignore PATTERN` (repeatable, gitignore-style). Honor `.gitignore` at directory root — open question below.

## Tests
- `tmp_path` fixture with nested files → GET returns directory listing.
- GET file → returns text content, `format: text`, correct mimetype.
- GET binary file → `format: base64`.
- GET with `?content=0` → `content` is null, size still populated.
- PUT new file → file exists on disk, returns ContentsModel.
- PUT over existing → overwrites.
- PATCH rename → old path 404s, new path exists.
- POST untitled → picks unique name.
- DELETE → file gone, 404 on next GET.
- Path escape (`../outside`) → 403.
- Symlink escape → 403.
- PUT a `.ga` file → `/workflows` reflects it on next call (auto-refresh).
- DELETE a `.ga` file → `/workflows` no longer lists it.

## Phasing

- **Phase 1** ✅ (commit `9736882`): ContentsModel, GET (file + directory), PUT (save), DELETE, PATCH (rename), path safety, auto-refresh, binary/base64 reads+writes, tests.
- **Phase 2** ✅ (commit `071ed29`): POST (untitled create), `If-Unmodified-Since` conflict detection, `?format=` override. `.gitignore` honoring deferred (Jupyter doesn't do it either).
- **Phase 3** ✅ (commit `071ed29`): Checkpoints (`/api/contents/{path}/checkpoints` — list/create/restore/delete). Mirrored-tree storage under `.checkpoints/`. Single checkpoint id `"checkpoint"` per file. Cascades on rename/delete.

## Frontend compatibility
JupyterLab's `@jupyterlab/filebrowser` package is the obvious reusable frontend. It expects `/api/contents` prefix — either mount our API at `/api/contents` instead of `/contents`, or configure the frontend's base URL. Recommend **`/api/contents`** for drop-in compatibility.

Alternative: any CodeMirror/Monaco-based editor with a ~50-line wrapper around these endpoints.

## Unresolved questions

Resolved in phase 1:
- ~~Mount at `/contents` or `/api/contents`~~ → `/api/contents`
- ~~Directory creation via POST untitled only, or PUT with `type: directory`~~ → PUT
- ~~Include files surfaced by `/workflows` in listings (dedupe)~~ → list everything
- ~~Support `format: json` for `.ga` files~~ → always serve as text (`.ga` is JSON-shaped but text to client)

Resolved in phase 2:
- ~~mtime conflict detection — header-based or body-echoed?~~ → `If-Unmodified-Since` header, opt-in
- ~~Honor root `.gitignore`, or extend hardcoded ignore list only?~~ → deferred; Jupyter doesn't honor it either

Still open:
1. Max file size cap for reads/writes?
2. Any authentication layer, or assume trusted localhost deployment?
