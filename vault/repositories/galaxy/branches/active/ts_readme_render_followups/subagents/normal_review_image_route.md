Second normal review, covering the old-revision image route, the README-load-on-permalink frontend fix and the Playwright test (`174a43bd37a..ddc7cdbef90`).

## What I acted on (a53b7f6a6bf)

- **Unknown revision served the newest image, and the history walk matched by name.** `get_file_data_from_manifest` now resolves the revision with the existing `get_changectx_for_changeset` and returns None (404) when it is unknown. It reads that revision's own manifest: exact path first, file name second. This removes the wrong-same-name-file and deleted-sibling false 404 cases and the per-request changelog walk. The README lookup uses the same helper, so it gets the fix too.
- New unit test `test_get_file_data_from_manifest` (`test/unit/tool_shed/test_hg_util.py`): red before, green after.
- API test now also checks an unknown revision returns 404.
- `get_file_data_from_manifest` added to `__all__`.
- `set_image_paths` docstring: the revision option is honoured by the Tool Shed only.
- vitest: also asserts the newest revision's READMEs are *not* fetched.

## Not acted on

- **Cache headers on revision-pinned responses.** It's an optimisation and the README pages for old revisions are low traffic; follow-up if wanted.
- **Logging hg errors in the image route.** Uncaught exceptions are already logged by the app as 500s; wrapping them in a typed 404 would hide them.
- **Two `?` if a README image path already has a query string.** Not a realistic relative repository path.
- **On-disk lookup (latest revision) is still basename-only via `os.walk`.** Pre-existing and shared with tool help images. Making it exact-path-first would change current-revision behaviour; left as a follow-up.
- **The `copy_file_from_manifest` / `get_file_context_from_ctx` lookup has different semantics again.** Pre-existing, and outside this branch's scope.

<details>
<summary>Full review</summary>

1. Medium: an unknown or garbage `changeset_revision` returned the tip image with a 200, not a 404. `reversed_upper_bounded_changelog` never hits the bound, so the whole history is walked. The readmes endpoint validates the revision; the image route didn't. Suggested: resolve the revision first via `get_changectx_for_changeset` or RepositoryMetadata.
2. Medium: matching basenames against `ctx.files()` while walking back picks the wrong file. A same-named `docs/logo.png` added later is returned for `images/logo.png`. Deleting `docs/logo.png` gives a false 404 for `images/logo.png`. It also diverges from the on-disk `os.walk` lookup. Suggested: exact path in the revision manifest, then a basename fallback. This is a third flavour of "find file X as of revision R"; a manifest-based helper is the reusable abstraction.
3. Low/Medium: every image request walks the changelog (quadratic `insert(0, …)` plus `files()` per changeset). No cache headers on the pinned-revision response.
4. Low: hg errors in the route become bare 500s; log before raising.
5. Nit: the new helper is missing from `__all__`.
6. Nit: the `changeset_revision` kwarg in shared Galaxy code is meaningful only for the Tool Shed. A path that already has a query string would get a second `?`.
7. Nit: the vitest doesn't prove the newest revision was skipped. Add a negative call assertion.

Checked and fine:
- the frontend `immediate` fix (genuinely red to green);
- the media-type check runs before the hg lookup;
- the on-disk path and its symlink protection are unchanged;
- imports are at module top;
- `image_changeset_revision` is None for the latest revision;
- RST image options and trailing whitespace in URIs are handled;
- the test data distinguishes the revisions;
- the API test compares bytes and the Playwright test uses `decode()` plus `naturalWidth`;
- mypy is clean.

</details>
