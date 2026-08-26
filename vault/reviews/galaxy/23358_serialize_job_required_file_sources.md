# PR 23358 — Serialize only file sources required by a job

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23358 |
| **Author** | mvdbeek |
| **Base branch** | `dev` |
| **Head reviewed** | `97bc0d646a3815f76ea29c36df54802507970ac6` (merge-base `65c86d4d9241946db6eb7c51211b53e954c5febb`, which *is* the current `dev` tip) |
| **Size** | 15 files, +441 / -23 (1 commit) |
| **State** | OPEN, 0 reviews, 0 comments |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23358` |
| **Addresses** | #17811 ("All jobs fail if vault encryption keys are replaced") |
| **CI** | Almost entirely **pending** at review time. Green so far: `Validate OpenAPI schema (3.10)`, `build-client`, two unit `Test (3.10)` shards, CircleCI `get_code_and_test`. No integration shard has reported. |
| **Verdict** | **Request changes.** The idea is right, the user-file-source half of the derivation is sound and well tested, and the security win is real. But the filter is applied to *all* file sources — admin-configured and stock plugins included — while the derivation only knows about three input shapes. Two shipped tools that read `file_sources.json` at job runtime are not in the derivation at all, and for those jobs the serialized plugin list comes out **empty**. `__IMPORT_HISTORY__` is the clear P1; `upload1` is the second. Both are fixable without giving up the security property, and the object store already shows the shape of the fix. |

---

## What it does

Every job currently writes *every* file source the user can see into `file_sources.json` /
`JobIO.file_sources_dict`. Materialising those configs reads vault secrets and mints OAuth access
tokens, so an unrelated job can cause Galaxy to contact every OAuth provider a user has connected.

This PR threads an optional `referenced_uris: set[str]` through
`ConfiguredFileSources.to_dict` → `plugins_to_dict` → `UserDefinedFileSources.user_file_sources_to_dicts`
and filters both halves:

- **Configured sources** (`lib/galaxy/files/__init__.py:298-314`): keep a source only if it is
  `_best_configured_match` (`:220-222`) for at least one referenced URI.
- **User sources** (`lib/galaxy/managers/file_source_instances.py:704-711`): keep a source only if
  its UUID appears in a `gxuserfiles://<uuid>` URI, checked **before** `_file_source_properties()`
  runs — which is the whole point, since that call is what touches the vault and mints tokens.

The derivation lives in `MinimalJobWrapper._referenced_file_source_uris`
(`lib/galaxy/jobs/__init__.py:1087-1098`) and has exactly three sources:

1. `collect_directory_uris(self.tool.inputs, param_dict)` — every `directory_uri` tool parameter
   (`lib/galaxy/tools/parameters/__init__.py:290-302`).
2. `self.tool.tool_action.iter_referenced_file_source_uris(param_dict)` — a new `ToolAction` hook
   (`lib/galaxy/tools/actions/__init__.py:103-106`, default `return ()`), overridden **only** by
   `FetchUploadToolAction` (`lib/galaxy/tools/actions/upload.py:117-119`), which walks the persisted
   `request_json` via `iter_fetch_request_urls` (`lib/galaxy/tools/data_fetch_utils.py:25-31`).
3. Deferred input datasets' origins — `job.input_datasets + job.input_library_datasets`, gated on
   `has_deferred_data`, pulling the new `Dataset.source_uris` (`lib/galaxy/model/__init__.py:4861-4865`).

`USER_FILE_SOURCES_SCHEME` moves from `galaxy.managers.file_source_instances` to `galaxy.files`
(`lib/galaxy/files/__init__.py:54`) to break the circular import that two comments in
`elabftw.py` complained about.

### What checks out

- **The user-source derivation is complete, and that is not obvious.** I checked
  `UserDefinedFileSourcesImpl._user_file_source` (`file_source_instances.py:627-639`): it bails
  unless the scheme is literally `gxuserfiles`. So *every* user-defined instance is only ever
  addressable as `gxuserfiles://<uuid>/...`, and matching on parsed UUIDs
  (`referenced_user_file_source_ids`, `:118-131`) really is exhaustive for that half. That is the
  half that mints tokens, and it is the half the PR gets exactly right.
- **Using persisted `request_json` rather than a private job parameter** (PR body: "avoids
  duplicating execution metadata in private job parameters") is the right call and it is accurate —
  `FetchUploadToolAction._setup_job` rewrites `incoming["request_json"]`
  (`actions/upload.py:126,166`) *before* the job is persisted, so the derivation reads the final
  request, not the submitted one.
- **`ftp_import` / `server_dir` fetch sources are correctly not a gap** — `_fetch_util.py:96-104`
  rewrites them to `src: "path"` with a real filesystem path server-side, so no file source is
  needed at runtime.
- **Collection inputs are covered.** I traced `_collect_input_datasets`
  (`tools/actions/__init__.py:334-344`): the `DataCollectionToolParameter` branch adds every
  `collection.dataset_instances` element to `input_datasets`, which `_record_input_datasets`
  (`:1086-1089`) turns into `JobToInputDatasetAssociation` rows. So a deferred element inside a
  collection input *is* reached by the `job.input_datasets` loop.
- **`find_best_match` refactor is behaviour-preserving.** `scores.sort(reverse=True)` + `next(...)`
  and `max(...)` both return the first maximal element, and the user-defined score is still appended
  last so it still loses ties. Net simplification, no semantic change.
- **Wire format is unchanged** — still `{"file_sources": [...], "config": {...}}`, just fewer
  entries. Nothing on the Pulsar / remote-metadata side needs a version marker or a compat shim,
  and `FileSourcePluginsConfig` (the `config` block) is still serialised whole.
- **All new imports are at module top level.** No function-local imports introduced.

---

## Findings

### P1-1 — `__IMPORT_HISTORY__` jobs get an empty `file_sources.json`; history import from any URI breaks

**Where:** `lib/galaxy/tools/imp_exp/imp_history_from_archive.xml:4-16`,
`lib/galaxy/tools/actions/history_imp_exp.py:39-110`, `lib/galaxy/jobs/__init__.py:1087-1098`.

The import-history tool declares `<file_sources name="file_sources"/>` and passes it to
`unpack_tar_gz_archive.py`, which resolves the archive with
`stream_url_to_file(archive_source, file_sources=get_file_sources(...))`
(`lib/galaxy/tools/imp_exp/unpack_tar_gz_archive.py:65-69`). The archive URI arrives as
`__ARCHIVE_SOURCE__`, a plain `type="text"` param
(`managers/histories.py:401` → `history_imp_exp.py:101`).

That param is not a `DirectoryUriToolParameter`, so `collect_directory_uris` misses it, and
`ImportHistoryToolAction` does not override the new hook. I verified the second half by import
rather than by reading:

```
ImportHistoryToolAction overrides: False
UploadToolAction        overrides: False
FetchUploadToolAction   overrides: True
```

(`cls.iter_referenced_file_source_uris is not ToolAction.iter_referenced_file_source_uris`.)

So `referenced_uris == set()` for every import-history job. And an empty set is *not* the same as
`None` — `plugins_to_dict` builds `referenced_file_sources = []` and drops everything, **stock
plugins included**. Verified against the real classes in the worktree:

```
all ids: ['stock_http', 'stock_base64', 'stock_drs', 'stock_remoteZip', 'stock_gximport']
filtered w/ empty referenced_uris: []
job-side resolve gximport://to_import.tgz     -> RequestParameterInvalidException Could not find handler for URI
job-side resolve https://example.org/arch.tgz -> RequestParameterInvalidException Could not find handler for URI
```

(`ConfiguredFileSources.from_dict` defaults to `load_stock_plugins=False`
(`files/__init__.py:345-357`), and `unpack_tar_gz_archive.get_file_sources` does not pass it — so
the job cannot recover the stock http plugin either.)

**Why it matters:** this is a total break of history import from a URI *or a plain URL*, not a
degradation. There is existing integration coverage that should go red:
`test/integration/test_remote_files_histories.py::TestRemoteFilesHistoryImportExportIntegration::test_history_import_from_library_dir`
(`gximport://`) and `::test_history_import_from_ftp_dir` (`gxftp://`). Those shards had not
reported when I looked; worth confirming before merge rather than assuming.

**Fix:** override the hook on `ImportHistoryToolAction`:

```python
def iter_referenced_file_source_uris(self, param_dict):
    archive_source = param_dict.get("__ARCHIVE_SOURCE__")
    if archive_source:
        yield archive_source
```

That is a two-line change and it is the pattern the PR already established.

### P1-2 — `upload1` URL uploads lose their file sources the same way

**Where:** `tools/data_source/upload.xml:9`, `tools/data_source/upload.py:37-51,127,199-208`,
`lib/galaxy/tools/parameters/grouping.py:456-475`.

`upload1` also declares `<file_sources filename="file_sources.json"/>` and resolves at job runtime:

- `tools/data_source/upload.py:127` — `dataset.path = sniff.stream_url_to_file(dataset.path, file_sources=get_file_sources())` for `dataset.type == "url"`.
- `:199-208` — `to_path()` in `add_composite_file`, which explicitly calls
  `file_sources.looks_like_uri(path_or_url)` for composite members.

`UploadDataset.get_uploaded_datasets` yields `Bunch(type="url", path=line, ...)` for any
`url_paste` line matching `URI_PREFIXES` (`grouping.py:446-475`). `UploadToolAction` does not
override the hook (verified above), and the `files` repeat contains no `directory_uri` param, so
`referenced_uris` is again `set()`.

This is narrower than P1-1 — the modern UI routes through `__DATA_FETCH__` — but `upload1` is still
live for library dataset uploads (`lib/galaxy/actions/library.py:125`,
`webapps/galaxy/api/library_datasets.py:531`) and for anyone POSTing `tool_id=upload1` directly.
I could not find *positive* integration coverage for a successful upload1-from-URL — the tests I
found (`test/integration/test_upload_configuration_options.py:139-161,378-394`) all assert the
upload is *blocked* — so CI will probably not catch this one.

**Fix:** either override the hook on `UploadToolAction` (walk the `files` repeat for `url_paste`
lines that `start_of_url`, plus composite `file_data` entries), or adopt the P2-1 fix below, which
covers it for free.

### P2-1 — The filter should follow the object store precedent: narrow the credential-bearing sources, not the static config

**Where:** `lib/galaxy/files/__init__.py:298-314` vs
`lib/galaxy/objectstore/__init__.py:1863-1879` and `lib/galaxy/jobs/__init__.py:2632-2639`.

Galaxy already solves this exact problem for object stores, and solves it *additively*:

```python
def serialize_static_object_store_config(object_store, object_store_uris: set[str]) -> dict[str, Any]:
    if len(object_store_uris) == 0:
        return object_store.to_dict()
    ...
    return object_store.to_dict(object_store_uris=object_store_uris)
```

`DistributedObjectStore.to_dict(object_store_uris=...)` (`:1564-1589`) serialises the **whole**
static backend list and then *appends* the per-user, credential-resolving stores the job actually
references. The derivation at the call site (`jobs/__init__.py:2632-2636`) is deliberately narrow —
outputs whose `object_store_id` `is_user_object_store(...)`.

This PR is shaped the opposite way: it makes the filter subtractive over everything, so an
incomplete derivation is a *breakage* rather than an over-inclusion. Both P1s above are downstream
of that single decision, and so is every future tool that declares `<file_sources>` — there is no
opt-out (no tool attribute, no config flag) and no release note describing the new contract.

The security goal named in the PR body — "resolving those configurations can read vault secrets and
mint OAuth access tokens" — is satisfied by the *user-source* filter alone, which is the exhaustive
one. Concretely I would suggest one of:

- **(a) Mirror the object store.** Always serialise configured/stock plugins; filter only
  user-defined sources by referenced UUID. Smallest diff, kills both P1s, keeps the whole security
  win. Loses the (real but secondary) benefit of not shipping admin source credentials to remote
  runners.
- **(b) Keep filtering configured sources but make "nothing derived" mean "don't filter."** i.e.
  treat `referenced_uris == set()` as `None` at the `plugins_to_dict` boundary. Cheap, but it is a
  fail-open heuristic that silently stops protecting jobs whose derivation is *legitimately* empty
  — most jobs, in fact — so it gives up most of the win.
- **(c) Filter configured sources but never drop plugins that carry no resolvable credentials**
  (stock http/base64/drs/remoteZip/gxftp/gximport/gxuserimport), and fix each derivation gap.
  Best end state, most work, and it still needs P1-1 and P1-2 fixed.

I would take (a) now and leave (c) as the follow-up, but the choice is yours — what matters is that
"empty derivation ⇒ empty plugin list" stops being the default.

### P2-2 — No integration-level coverage of the narrowing

The unit coverage is genuinely good and *does* exercise both directions (see "Verification"), but
every test is at the `plugins_to_dict` / helper level, and `test_job_io.py` fakes the whole wrapper
with `SimpleNamespace` and calls `MinimalJobWrapper._referenced_file_source_uris(wrapper, job)`
unbound. Nothing exercises "a real job that needs a real file source still gets it." Both P1s are
exactly the class of bug that a single integration test would have caught:

- an export-to-`gxfiles` job (already covered by `test_remote_files_histories.py::test_history_export_to_ftp_dir`, which should still pass — good),
- an import-from-`gximport` job (covered, and should now **fail**),
- a `__DATA_FETCH__` from `gxfiles://` (covered by `test/integration/test_remote_files.py`),
- an upload1-from-URL job (**not** covered anywhere I could find).

Worth adding at least the last one, since it is the gap CI cannot see.

### P3-1 — `Dataset.source_uris` sits beside an existing `DatasetInstance.deferred_source_uri`

`lib/galaxy/model/__init__.py:4861-4865` adds `Dataset.source_uris`. `DatasetInstance` already has
`deferred_source_uri` (`:5542-5547`), which does nearly the same thing with an "assume the first
source" comment. And `ToolEvaluator._deferred_objects` (`tools/evaluation.py:399-445`) is the
established walker for "which deferred inputs does this job need", including the
`_should_materialize_deferred_input` / `allow_uri_if_protocol` logic (`:447-458`) that is precisely
*why* a deferred URI needs to reach the job at all.

The new property is arguably better (all sources, not just `sources[0]`), and the DB-driven loop in
the job wrapper is simpler than reusing the evaluator. But the tree now has two spellings of the
same idea. Either express `deferred_source_uri` in terms of `source_uris`, or note in the docstring
why the plural form exists.

### P3-2 — `elabftw.py` comments deleted but the change they described was not made

`lib/galaxy/files/sources/elabftw.py:178-184` drops two comments saying `get_prefix` / `get_scheme`
"would make better sense" as `self.scheme == USER_FILE_SOURCES_SCHEME`, blocked by a circular
import. This PR removes that blocker (`USER_FILE_SOURCES_SCHEME` now lives in `galaxy.files`) and
removes the comments — but leaves the code as `self.scheme not in {"elabftw", DEFAULT_SCHEME}`,
which is *not* equivalent for a custom scheme. Either apply the change the comments asked for, or
keep the comments; deleting them loses the note without acting on it.

### P3-3 — Malformed `gxuserfiles://` in a param now fails the job at dispatch

`referenced_user_file_source_ids` raises `RequestParameterInvalidException` on a bad UUID
(`file_source_instances.py:126-129`). That call is reached from the `job_io` property, so a user who
types `gxuserfiles://oops/x` into a `directory_uri` text field now gets a job-dispatch failure
rather than a resolution-time error. Low impact; consider logging and skipping unparseable URIs
here, and leaving validation where it already lives.

### P3-4 — `_referenced_file_source_uris` now makes `job_io` depend on a full param-dict walk

`job_io` previously did not touch tool parameters; it now calls `get_param_dict(job)`
(`params_from_strings`, DB-hydrating) plus a mutating `visit_input_values` walk. Anything that
raises in there — a tool whose inputs shifted under an old job, a conditional whose case no longer
exists — now fails the job at dispatch. `visit_input_values` is defensive about missing keys
(`parameters/__init__.py:235-285`), so I do not think this is a live bug, but `job_io` is also on
the `fail()` path (`jobs/__init__.py` `_fix_output_permissions` → `job_io`, per the traceback in
#17811), and making the failure path depend on more machinery is worth a moment's thought.

### P3-5 — Nits

- `file_source not in referenced_file_sources` (`files/__init__.py:314`) is an O(n·m) identity scan
  over a list. `BaseFilesSource` has no `__eq__`, so a `set` works and reads the same.
- `collect_directory_uris` is a pure read implemented with `visit_input_values`, which mutates its
  `input_values` argument (inserts defaults, `__index__`, `__current_case__`). Harmless here (the
  dict is freshly built by `get_param_dict`), but worth a word in the docstring.

---

## Act before merge

1. **P1-1** — `ImportHistoryToolAction.iter_referenced_file_source_uris` yielding `__ARCHIVE_SOURCE__`.
   Confirm `test_remote_files_histories.py` goes green.
2. **P1-2** — same for `upload1`, or adopt P2-1(a) which subsumes it.
3. **P2-1** — decide the filter's shape. Subtractive-over-everything is the root of both P1s; the
   object store's additive precedent is right there.
4. Wait for the integration shards. CI was still pending across the board at review time; do not
   read the green unit shards as a signal.

## Follow-ups, not this PR

- P2-2 — an integration test for upload1-from-URL, which nothing covers today.
- P3-1 — reconcile `Dataset.source_uris` with `DatasetInstance.deferred_source_uri`.
- P3-2 — apply or restore the `elabftw.py` comments.
- P3-3 / P3-4 / P3-5 — small hardening.
- A release note / doc line describing the new `<file_sources>` contract for tool authors, plus an
  escape hatch (tool attribute or config flag) for tools that legitimately need the full set.

---

## Verified empirically vs. reasoned statically

**Ran** (no `.venv` in this worktree; borrowed the interpreter from
`/Users/jxc755/projects/worktrees/galaxy/pr/22781/.venv` with `PYTHONPATH` pointed at *this*
worktree's `lib`, so the code under test is 23358's):

- `pytest test/unit/app/tools/test_collect_directory_uris.py test/unit/app/tools/test_data_fetch_utils.py test/unit/job_execution/test_job_io.py test/unit/files/test_posix.py test/unit/files/test_http.py`
  → **60 passed**, 7 warnings, 2.28s. These cover the inclusion case
  (`test_plugins_to_dict_serializes_only_referenced_sources`,
  `test_serialization_mints_only_referenced_source`), the exclusion case
  (`test_plugins_to_dict_serializes_nothing_when_no_uris_referenced`,
  `test_serialization_mints_no_tokens_when_no_sources_referenced`) and the unfiltered case
  (`..._when_referenced_uris_none`). No weakened or removed assertions anywhere in the test diff —
  it is purely additive.
- `test/unit/app/managers/test_user_file_sources.py` was **not** run (heavier dependency surface;
  I did not want to chase it in a borrowed venv).
- The hook-override probe (`ImportHistoryToolAction` / `UploadToolAction` / `FetchUploadToolAction`)
  and the empty-`referenced_uris` round-trip through `ConfiguredFileSources.from_dict` +
  `get_file_source_path`, quoted verbatim under P1-1.

**Not run:** any integration or API test. In particular I did **not** execute
`test_remote_files_histories.py`; the P1-1 breakage is established from the code path plus the
round-trip probe above, not from a red test. That is the one claim worth confirming with a real run
before acting on it.

**Reasoned statically:** the completeness argument for the user-source derivation (read
`_user_file_source`), the collection-element coverage (read `_collect_input_datasets` /
`_record_input_datasets`), the `ftp_import` non-gap (read `_fetch_util.py`), the tie-break
equivalence of the `sort`→`max` refactor, and the object store comparison.

The worktree is left clean — no files added or modified, HEAD still at `97bc0d646a`.
