# Normal review

Verdict: mergeable; merge resolution and refactor correct, removed code confirmed dead. Acted on finding 1 (old revisions missing READMEs → `7b45e071d4e`, red-to-green test) and nit 3 (log message). Not acted on:

- **Old-revision images served from latest files** — image route reads the on-disk (latest) repo, so a changed/removed image shows the newer file or 404. Still better than the broken relative paths before; needs a changeset-aware image route, out of scope. Also raised by Codex.
- **`set_image_paths` strips `${static_path}` before `render_readme`** — pre-existing on the latest-revision path; harmless.

<details>
<summary>Details</summary>

1. **should (pre-existing)** `readme_util.py:84-86` — `get_file_context_from_ctx` only checks `ctx.files()` (files changed in that changeset), so an old downloadable revision that didn't touch the README returns `{}`. Reproduced with three uploads (column_maker 1/2/3, same README): middle revision empty. Fix: reuse `hg_util.get_ctx_file_path_from_manifest` (already used by `tool_validator.py:184`).
2. **nit** `readme_util.py:98-103` — old-revision images point at `/repository/static/images/{id}/...`, which serves latest on-disk files (`api2/repository.py:197-232`).
3. **nit** `readme_util.py:103` — log message still names `build_readme_files_dict`.
4. **nit** `readme_util.py:35-37` — `set_image_paths` removes `${static_path}` before render for READMEs with images; pre-existing.

Merge `ae4e1c4a442`: keeps dev typing (`TYPE_CHECKING` imports, typed signature, `fctx is not None` check) and 26.1 fix (`render_readme`, `sanitize_html`, Mako removal); nothing lost. Refactor `ec2c345a5aa`: latest-revision behavior preserved (encode_id now unconditional; early return without readme_files); old revision looks up changeset once; empty READMEs omitted; render outside try is fine (`halt_level` above severe). Dead code confirmed: sole caller `managers/repositories.py:536` passes no `tool_path`; nothing in `lib/galaxy` or client imports `readme_util`; `rst_to_html` returns `str`. `data: bytes` annotation required for mypy. Tests: 8 passed.
</details>
