Run via claude-opus-5-5 at default effort.

# Performance challenges debrief (round 2, after re-scope)

I fixed one problem: the re-scope brought back an install-DB `SELECT` for every installed shed tool whose RST help has no images, each time that tool is parsed after startup. The fix is `72cfeb134af`. Moving shed tools' RST help onto `help_image` makes things better otherwise: the legacy `shed_tool_static` route it replaces sent no `Cache-Control`, no ETag and no 304s. Round 1's [debrief](earlier_drafts/1/performance_challenges_debrief.md) was reference only. Everything here was evaluated fresh.

## Commits (on top, "Baseline tests" still first)

- `72cfeb134af` Skip shed repository lookup for imageless RST help:
  - `Tool.__get_help_with_images` now checks for `.. image:: ` or `.. figure:: ` in the text before it evaluates `self.tool_shed_repository`.
  - New query-count test: `test_cached_tool.py::test_materializing_shed_tool_without_help_images_skips_install_database`.

## Findings

1. **One install-DB query per imageless shed tool parse (data, fixed).**
   - The cause:
     - `dev` evaluated `help_text.find(".. image:: ") >= 0 and (self.tool_shed_repository or ...)`. That short-circuits, so the repository property was only touched for help that contained an image.
     - The re-scope changed the check to `elif self.tool_shed_repository:`, which runs for every shed RST help.
     - That property calls `get_installed_repository(..., from_cache=True)`. `UniverseApplication` sets `tool_shed_repository_cache = None` once startup finishes (`app/__init__.py:1254`), so after startup the call falls back to `install_model.context.query(ToolShedRepository)...first()`.
   - It fires on:
     - every cached-toolbox LRU miss for a shed tool;
     - every toolbox reload with the eager toolbox, including the post-fork reload and the reload after an install;
     - that is one query per shed tool with RST help, which is most of them.
   - Red: the new test counted `['SELECT tool...T ? OFFSET ?']` for an imageless shed tool materialized after startup. Green: zero queries.
   - Image-bearing help keeps its lookup, as on `dev`. The text check also preserves `dev`'s behaviour that `$PATH_TO_IMAGES` is stripped only when the help has an image directive.
2. **Opening a shed tool form makes the same requests as before, and they are now cacheable (code read).**
   - Before: one `shed_tool_static` request per image. Each ran a WSGI trans, `get_tool(guid)`, `materialize_tool(reason="packaging")` and `find_tool_asset`, then returned `open(path)` with no validators.
   - After: one `help_image` request per image. Each runs trans, `_get_tool` (the same access check, including the per-request session and user resolution the old route had), `materialize_tool(reason="detail")` and `find_help_image`.
   - The responses now carry `private, max-age=3600`, a content ETag and `Last-Modified`, and the route answers with 304s. Repeat opens within an hour make no requests.
   - `reason` is only a label. Both reasons go through the same single-flight LRU, keyed on `(id, version, source_hash)` with size 500, and opening the form has already materialized that key.
3. **Cost of `make_image_paths_relative` (measured).** Scratch benchmark:

   | help text | rewrite | `in` check |
   |---|---|---|
   | 1.8 KB, no images | 1.7 µs | 1.6 µs |
   | 1.9 KB, with images | 3.5 µs | – |
   | 182 KB, no images | 145 µs | 145 µs |
   | 250 KB, adversarial | 354 µs | – |

   - On the adversarial input the cost grows linearly. The regex has no nested quantifiers.
   - So the regex itself was never the cost. Skipping the property in finding 1 is what the text check buys.
4. **Disk lookup (measured).**
   - `find_help_image` over `(tool_dir, _repository_dir)` takes 39–43 µs on a hit and 137 µs on a miss.
   - A miss tries 4 candidates, each with a `realpath`, `abspath`, `safe_contains` and `isfile`.
   - `cached_file_response` adds a `stat` and an md5 per 200 or 304. Help images are small, and the icon endpoint does the same.
5. **Endpoint latency (measured in API tests).** `test_tool_help_image` makes 8 requests (4 returning 200, 4 returning 404) in 0.08 s of call time. That is consistent with an LRU hit plus a few syscalls.
6. **Client (code read).**
   - One DOM pass inside a `computed`. `ToolHelpRst`'s `tool` changes only with `toolId` or `toolVersion`, so re-renders produce the same `src`, which the browser dedupes.
   - `ToolsListCard` renders help only after a click.
   - No polling.
7. **Checklist patterns that don't apply.**
   - No new list queries or ORM loops.
   - `get_help_image` is a sync `def`, so the md5 and file I/O run in the threadpool.

## Tests

- Unit (`test_help_images.py`, `test_shed_util_common.py`, `test_cached_tool.py`): 112 passed. The new test went red to green.
- API, one invocation, `-k "test_tool_help_image or test_tool_icon or test_build_tool_help"`: 7 passed.
- black, ruff and isort are clean. `cd lib && mypy galaxy/tools/__init__.py` reports no errors in that file.

## Open for John

- A 404 for a help image that is referenced but not shipped carries no `Cache-Control`. Every form open re-requests it, at the cost of one materialize from the LRU plus 4 failed stat chains. The old route's 400 wasn't cached either, so this is parity. Add a short `max-age` to 404s?
- After the 1 h `max-age`, each revalidation re-runs the tool lookup and the md5. Keep 1 h?
- The md5 ETag hashes the whole file on every request, as round 1 noted. Starlette's mtime+size ETag would be cheaper. Kept for parity with the icon endpoint.
