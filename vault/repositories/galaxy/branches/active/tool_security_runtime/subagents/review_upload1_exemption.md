Run via Claude Opus 5.5 at high effort.

**Coordinator:** acted on findings 1 to 6: the lookalike warning, the patched upload1 being reviewed on branch 4, deciding once per tool on branch 3, the docs, and both nits. Final heads: branch 3 `e3d98e549b7`, branch 4 `60e85e935d2`. Not acted on: finding 7. The cached-toolbox integration class stays, because it is the only end-to-end proof under the cached toolbox. The `lib/galaxy` rule's patch gap is listed for John in branch 4's debrief.

# Review: upload1 exemption (branch 3 `69080fb376c`, branch 4 `6e28b7debd8`)

This file is the same on both branches. It covers `tool_security_runtime` `69080fb376c` (job-preparation review) and `tool_patches_static_findings` `6e28b7debd8` (static findings refusals).

**What to act on.** I found no security bypass, so there is no private report. Both commits are correct for John's decision. The red-then-green claims hold: with `is_galaxy_upload_tool` patched to `False`, the exemption tests fail (2 on branch 3, 1 on branch 4) and every other test passes. The two helpers are byte-identical. I recommend acting on four things:

1. **Medium, branch 3.** Warn when upload1 does not match. A deployment whose `upload1` resolves to a path other than Galaxy's bundled file now has every legacy upload refused at the default `enforce_code` + `strict`. That includes library uploads, BioBlend `upload_file` and `/api/tools` `upload1`. The only sign is `uncheckable-template-code`. When a tool with id `upload1` and `UploadToolAction` is reviewed from another path, log a WARNING that names the bundled file. A copy can stay reviewed, as John decided.
2. **Low to medium, branch 4 now and branch 3 after convergence.** The exemption ignores tool patches. A `_local/upload1/1.1.7` patch rewrites the template, and the patched source is still exempt because the check is only on the path. Exempt upload1 only when no patch applied, or at least correct the docs, which say the exemption is for "the file Galaxy ships".
3. **Low, branch 3.** Decide the exemption once per tool. Today it is worked out again on every job: `review()` does not keep a `None` result, so each upload1 job calls `realpath` twice. Every job of another tool with no reviewed source (`__DATA_FETCH__` and other local tools) calls it once. Check `tool in self._exempt` first, or keep a sentinel.
4. **Low, docs, both branches.**
   - The docstring overclaims: "A Tool Shed or user-defined tool never loads from this file".
   - Branch 3's "not reviewed" sentence sits only under `tool_security_review_when_unsure`, but the exemption applies at every `tool_security_review` level.
   - "it would refuse every upload" holds only at the default settings.

Not worth acting on:

- **A Tool Shed or local symlink to Galaxy's `upload.xml` claims the exemption.** This is not a bypass. Its content is Galaxy's own `upload.xml`, which has no macros, and the review only judges the template. With a guid id, `__prepare_upload_paramfile` does not run either. A swap to a symlink after load would need write access as the Galaxy user, which already allows far worse.
- **`stored_source_path` paths.** It is set at the single chokepoint for cached tools, `_create_tool_from_stored_source`, and the eager fallback passes `config_file`. It is the `abspath` the local populator discovered, so it does not identify whoever wrote the store. A store from another Galaxy root only fails closed.
- **Thread safety of the `WeakSet`.** The unlocked check-then-add can log twice in a race, which does no harm. A reload gives a new `Tool` object, which logs once more. That is fine.
- **Branch 4 freshness and `INDEX_SCHEMA_HASH`.** The debrief's claims hold. Materialization re-derives the exemption from the stored path and ignores `kept`, so a stale stored review cannot refuse upload1.
- **Test tidying.** The unit seam test and the `[lookalike]` parameter of the stored-path test overlap with the cached-toolbox integration class. They were red before the seam. Keep them or trim them. Either is fine.

## Details

### Verification run

- Branch 3: `test_security_review.py -k upload` passed 6 of 6, and `test_cached_tool.py::test_materialized_tool_keeps_its_stored_source_path` passed.
- Branch 4: `test_static_findings_refusal.py` passed 13 of 13.
- Red check, with a pytest plugin in the scratchpad that monkeypatches `security_review.is_galaxy_upload_tool` to return False:
  - Branch 3 failed `test_galaxy_upload_tool_is_exempt_at_every_level` and `test_upload_tool_from_a_tool_source_store_is_judged_by_its_stored_path[galaxy]`.
  - Branch 4 failed `test_galaxy_upload_tool_is_exempt`.
  - The lookalike tests pass either way. They pin the choice of a path over an id or action, which is their purpose.
- Integration tests were not re-run. I relied on the debriefs for those.

### 1. Claiming the exemption, and failing to match (concern 1)

**Who can match.** The check is `realpath(path) == realpath(lib/galaxy/tools/bundled/data_source/upload.xml)`.

- A source checkout matches: `bundled` links to `../../../tools`, and the default `tool_path` is `<root>/tools`.
- A packaged install matches: `tool_path` defaults to the `galaxy.tools/bundled` resource (`config/__init__.py:943-950`), and `MANIFEST.in:148` ships `upload.xml`.
- `packages/app/src/galaxy/tools` is a directory symlink into `lib`, so `__file__` resolves the same way.
- `.k8s_ci.Dockerfile` uses `COPY .`, which keeps the symlinks.
- A Tool Shed tool, a local admin copy and a dynamic tool all load from other paths. User-defined and expression tools are skipped earlier anyway.

A Tool Shed repository can match only by holding a symlink to Galaxy's absolute path. Galaxy then reads Galaxy's own text through the link, eagerly and in the populator, so the exempted template is upload1's.

**Failing to match.** Each of these cases fails closed, so upload1 is reviewed:

- a `tool_conf` whose `tool_path` points at a copied `tools/` directory or at another checkout
- a site-customised `upload.xml` kept outside Galaxy
- `tool_path: /srv/galaxy/tools` combined with a Galaxy installed from a package
- a read-only store built at another root, if anyone put upload1's conf there

On branch 3 this is the default configuration. Every `upload1` job then fails with `uncheckable-template-code`. Most UI uploads use `__DATA_FETCH__`, but library uploads, `new_dataset(fetch_data=False)` and BioBlend `ToolClient.upload_file` use `upload1`.

The suggested fix keeps John's decision and only improves the diagnosis. When `reviewed_tool_source` keeps a source with `tool.id == "upload1"` and an `UploadToolAction`, log a WARNING: "upload1 loaded from X, not Galaxy's Y; it is reviewed and its jobs will be refused at this setting". Branch 4 should get the same warning, but there it matters less, because refusals are off by default.

**Sibling paths.**
- `jobs/__init__.py:1485` decides "is the upload tool" by `job.tool_id == "upload1" and dynamic_tool is None`. The new helper is stricter: it decides by path.
- A local admin tool with id `upload1` therefore still gets its paramfile prepared but is reviewed. That is the intended outcome.
- Say so in the helper's docstring, so the next reader doesn't "fix" the two to agree.

### 2. Patches (branch 4, and branch 3 after convergence)

`patch_and_review_tool_source` (`lib/galaxy/tools/security_review.py:98-106` on branch 4) applies patches and then calls `with_static_review(..., config_file)`. The exemption looks only at `config_file`. Patch keys for local tools are `(_local, id, version)` (`tool_util/patches/keys.py:80-84`), so a collection entry for `upload1/1.1.7` rewrites the command, and the result is never reviewed.

This is not a bypass. Patch collections are chosen by the admin, and a hostile patch could add any command, which would pass the review anyway. It does break two promises:

- the docs say the exemption is for "the file Galaxy ships"
- the review exists to judge the *patched* source

Branch 3 would inherit this when the branches converge, because its reviewer reads `tool.tool_source`, which is patched.

The fix is to exempt only when `tool_source.patch_state` is None or has no applied state. For the populator's freshness check, `static_review_is_current` would also need the entry's `patch`. The existing `lib/galaxy` rule has the same property, so whatever is chosen should be applied to both rules.

### 3. `stored_source_path` (concern 2)

- It is set at `cached_toolbox.py:1633`, at the end of `_create_tool_from_stored_source`. That is the documented single chokepoint, and its only caller is `_load_tool_on_demand` (`:1576`).
- `create_tool` either returns a `CachedTool` stub, which the reviewer never sees, or falls back to `super().create_tool(config_file)`, where `config_file` is set.
- The value is `StoredToolSource.source_path`. The populator stores it as `str(path)` from discovery (`populator.py:894`), and discovery builds it with `abspath(join(tool_path, file))` (`discover.py:368`).
- It is therefore the path of the file on the host that populated the store, not an identity of whoever wrote it. A store from another Galaxy root yields a path that realpaths to something other than the local bundled file, so it fails closed.
- A store whose stored text for the right path differs from the file on disk is within the admin's trust, and the same holds for branch 4.
- `Tool.stored_source_path: str | None = None` at `tools/__init__.py:1302` is fine as a class default. Typing nit: `_tool_file` annotates a local `str | None`, but `config_file` may be a `StrPath`. Returning `StrPath | None` is more honest.

### 4. Branch 4 stored review and freshness (concern 3)

- `reviews_tool` returns False for upload1, so `static_review_is_current(config, review, path)` requires `review is None`.
- An entry populated before this commit, with refusals on, holds a `StaticReview`. It is therefore not current, and its file is parsed again once.
- `with_static_review` at materialization (`cached_toolbox.py:1652`) uses `stored.source_path` and ignores `kept` whenever `reviews_tool` is False. So even a read-only bundle that holds an old review for upload1 materializes with `static_review = None`.
- Turning the toggle off makes `reviews_tool` False everywhere. Turning it on finds `kept` None and reviews the source. Both are stale-safe.
- `INDEX_SCHEMA_HASH` is rightly unchanged: no field or model changed. The debrief is accurate.

Nits:
- The `log.info` condition in `with_static_review` repeats `reviews_tool`'s logic. Splitting it as `if not refuse: None` / `elif upload: log; None` would read better.
- Every `reviews_tool` call now does a `realpath`, including once per tool file in each incremental populate when refusals are on. That cost is negligible.

### 5. Once-per-tool logging (concern 4)

- `self._exempt` is a `WeakSet[Tool]`, and `Tool` keeps identity hashing (no `__eq__`/`__hash__`). Each `Tool` object logs once per reviewer.
- A reload gives a new object, which logs again, as it should.
- `in` followed by `add` without `self._lock` can log twice when two threads race. That does no harm. Nothing iterates the set, so the `WeakSet` pending-removal machinery is never involved.
- The real cost is item 3 of the top line. Exempt tools never reach `_reviews`, so `reviewed_tool_source` and two `realpath` calls run on every upload1 job. One `realpath` also runs on every job of any other tool whose review source is None, such as `__DATA_FETCH__`.
- Checking `if tool in self._exempt: return None` before `reviewed_tool_source` fixes the upload1 case.
- Keeping a per-tool "not reviewed" sentinel fixes both cases. It also means a later filesystem change cannot flip the decision mid-life. Today a transient mismatch would cache a real review in `_reviews`, and that tool's uploads would stay refused until a reload.

### 6. Tests (concern 5)

The tests prove the behaviour.

- `test_galaxy_upload_tool_is_exempt_at_every_level` crosses 3 levels with 2 `when_unsure` values and checks the log count of 6. That pins both "never refused" and "once per reviewer and tool".
- The lookalike tests pass before and after. They are meaningful as pins against an exemption based on the id or the action, not as red-green tests.
- The `test/functional/tools/upload.xml` assertion covers the link case.
- The integration tests are the real end-to-end proof: eager and cached on branch 3, and both classes on branch 4. Each was red with the change reverted, per the debriefs.
- `TestToolSecurityReviewDefaultsCachedToolbox` reruns all three Defaults tests on an extra server boot. That is acceptable, but only the upload test needs the cached toolbox.
- No test covers `tool_path` pointing at `<root>/tools` directly, as opposed to through `bundled` or the functional symlink. Both resolve to the same real path, so this needs no new unit test.

### 7. Docs and config wording (concern 6)

- The docstring, identical on both branches, says "A Tool Shed or user-defined tool never loads from this file, whatever id or action it declares." A tool can load from a link to it, and the docs elsewhere say so. Suggested wording: "Only a tool file at Galaxy's bundled path, or a link to it, matches; a copy elsewhere with the same id or action does not."
- Branch 3:
  - The exemption sentence is only in `tool_security_review_when_unsure`'s description (`config_schema.yml:4131`), but upload1 is skipped at every `tool_security_review` level. Move or repeat it under `tool_security_review`.
  - `tool_security_review.md:95-101` is accurate, except that "it would refuse every upload" holds only at the default settings, not under `log`. "Galaxy logs once per tool" is also accurate per process and per tool load.
- Branch 4 (`tool_security_review.md:81`, config): accurate.
  - "Galaxy's own tools under `lib/galaxy` and Galaxy's own upload tool" is right, though in a packaged install upload.xml is already under `lib/galaxy`.
  - "Logs ... when it loads it" matches `with_static_review`, which logs on each load, materialization and populate parse.
- "The file Galaxy ships" also covers an admin's in-place edit of `tools/data_source/upload.xml`, which is exempt. That belongs to the admin's trust, but "the file at Galaxy's bundled path" is more exact.

### 8. Convergence (concern 7)

- `is_galaxy_upload_tool` and `_GALAXY_UPLOAD_TOOL` are byte-identical: a diff of the function and of the constant expression matches.
- The only difference is the comment line after the constant on branch 4, which belongs to `REVIEW_VERSION`.
- Both branches independently add `lib/galaxy/tools/security_review.py`, which already conflicts: each defines `ToolInputRejected`.
- A shared home: `lib/galaxy/tools/special_tools.py`. It is on dev, and it already holds the paths of Galaxy's internal tool files (`hidden_lib_tool_paths`).
- Best done on the common parent `tool_security_static_findings`, so both children import it rather than carrying copies. Branch 4's `GALAXY_PACKAGE_DIR` rule, which uses `abspath` while upload1 uses `realpath`, could move there too, so the "Galaxy's own tool" rules sit together.
