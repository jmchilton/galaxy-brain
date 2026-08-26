# 23358 — P1 follow-up: verdicts on 2a and 2b, and how the filter actually works

Companion to `23358_p1_followup_handoff.md` and the full review
`23358_serialize_job_required_file_sources.md`.

| | |
|---|---|
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23358`, HEAD `349ad23084`, left clean |
| **Diff base** | `65c86d4d9241946db6eb7c51211b53e954c5febb` (the `dev` tip) |
| **Interpreter** | borrowed from `pr/22781/.venv`, `PYTHONPATH=lib` pointed at *this* worktree |
| **Nothing posted to GitHub. Nothing in the Galaxy tree modified.** | |

**Short version:** 2a is **confirmed**, and confirmed harder than the brief stated — an empty
derivation drops every plugin, *and* a non-empty one drops every plugin that is not the single
best match. 2b is **confirmed** as to premise (the file can be missing, and three different
exceptions can escape) but the severity lands at **P2, not P1**, because on the paths where it
bites the job has usually already been committed to `ERROR` — what is lost is post-failure
bookkeeping and the real error message, not the job's terminal state. One exception to that,
in `finish()`, is genuinely worse and is called out.

Also confirmed in passing: the `test_job_io.py` −56 / `test_job_wrapper.py` +64 swap is a pure
relocation.

---

## 1. Verdicts

### 2a — the subtractive filter. **CONFIRMED**, and it is sharper than stated.

**The reading of the code is right.** `lib/galaxy/files/__init__.py:298-302` builds
`referenced_file_sources` only when `referenced_uris is not None`; `:313-314` then drops any
source not in that list. `None` and `set()` are distinguishable, and `set()` means *drop
everything*.

**Probe.** Real `ConfiguredFileSources` with stock plugins plus one admin-configured posix
source, then a `from_dict` round-trip through the same path `JobIO` / Pulsar uses:

```
referenced_uris=None      -> ['stock_http', 'stock_base64', 'stock_drs', 'stock_remoteZip', 'stock_gximport', 'admin_shared']
referenced_uris=set()     -> []
referenced_uris={gxfiles} -> ['admin_shared']
referenced_uris={https}   -> ['stock_http']

job-side resolve gxfiles://admin_shared/x.txt -> RequestParameterInvalidException Could not find handler for URI
job-side resolve https://example.org/a.tgz    -> RequestParameterInvalidException Could not find handler for URI
job-side resolve gximport://to_import.tgz     -> RequestParameterInvalidException Could not find handler for URI
```

The script is reproduced in §4 so you can re-run it.

**The part the brief did not say.** Look at row three. A job that references exactly one
`gxfiles://` URI ships *only* `admin_shared`. `stock_http` is gone. So the hazard is not confined
to "a tool action forgot to declare anything" — it also covers "a tool action declared *some* of
what it needs." A tool that, say, resolves a `gxfiles://` staging directory from a parameter and
*also* fetches an `https://` URL discovered at runtime gets a job that can do the first and not the
second. That failure is even quieter than the empty case: the plugin list is non-empty, so
nothing looks obviously wrong on inspection.

`_best_configured_match` (`files/__init__.py:219-221`) returns exactly one winner per URI —
`_best_score` takes the `max` and requires `score > 0`. There is no "keep everything that could
plausibly handle this" fallback.

**Would an additive variant satisfy the PR's goal? Yes — and the evidence is unusually clean.**

The stated security goal is "resolving those configurations can read vault secrets and mint OAuth
access tokens." Both of those live in exactly one function:

- `UserDefinedFileSourcesImpl._file_source_properties`
  (`lib/galaxy/managers/file_source_instances.py:649-671`) calls `recover_secrets`
  (`lib/galaxy/managers/_config_templates.py:156-175`, the user-vault read) and
  `implicit_parameters_for_instance`, which reaches `_inject_oauth2_access_token`
  (`_config_templates.py:515-528`, the token mint).
- Its only callers are `_file_source_properties_from_uri` (`:641-647`) and
  `_all_user_file_source_properties` (`:695-724`) — the **user-defined** half.

`_all_user_file_source_properties:711-712` already filters by referenced UUID *before* calling it,
with the comment "Filter before resolving properties because resolution can access the vault or
mint an OAuth access token." That is the whole security win, and it is complete: the prior review
established that user-defined sources are only ever addressable as `gxuserfiles://<uuid>/...`, so
matching on parsed UUIDs is exhaustive for that half.

The configured-source filter at `files/__init__.py:313` buys none of that. It buys "don't ship
admin-configured source config to remote runners" — a real but secondary benefit — and it is the
half whose derivation is *not* exhaustive.

Concretely, an additive variant would be one clause:

```python
# never drop credential-free stock plugins; filter only sources whose config can carry secrets
if (
    referenced_file_sources is not None
    and file_source.plugin_kind != PluginKind.stock
    and file_source not in referenced_file_sources
):
    continue
```

`PluginKind` is at `lib/galaxy/files/sources/__init__.py:52-82`. `PluginKind.stock` is exactly
`http`, `base64`, `remoteZip` (`sources/http.py:41`, `sources/base64.py:19`,
`sources/remotezip.py:54`) and `gxftp` / `gximport` / `gxuserimport` (`sources/galaxy.py:12,37,58`).
I read all six: their config surface is URL regexes and filesystem path templates
(`root="${user.ftp_dir}"`, `root="${config.library_import_dir}"`). No vault, no tokens, nothing an
admin would mind a job seeing.

**What would be lost:**

1. Every job again ships six or so tiny stock plugin dicts. No credential exposure, no vault
   traffic, no OAuth calls — measurably nothing beyond a few hundred bytes of JSON.
2. `PluginKind.drs` is deliberately *not* in the exemption above. `DRSFileSourceConfiguration`
   carries `http_headers` (`sources/drs.py:25-28`), which an admin can populate with a bearer
   token. Leaving DRS filtered keeps that narrow. It does mean a tool that resolves a `drs://`
   URI must still declare it — but `drs` is a scheme, so the derivation gap for it is much less
   likely than for a bare `https://`.
3. Nothing else. Admin-configured `rfs` sources (`sources/__init__.py:261` — the default kind, so
   s3fs/posix/sftp entries in `file_sources_conf.yml`) stay filtered, so the "don't send admin
   credentials to a remote runner" benefit survives intact.

**The precedent is not just analogous, it is line-for-line the opposite decision.**
`serialize_static_object_store_config` (`lib/galaxy/objectstore/__init__.py:1863-1878`) opens with:

```python
if len(object_store_uris) == 0:
    return object_store.to_dict()
```

Empty set explicitly means *don't filter*. `files/__init__.py:299` treats the same empty set as
*filter everything out*. Same problem, same codebase, opposite convention — worth naming in the
comment, because it is the kind of thing an author will accept instantly once seen.

**Review comment or code suggestion? Review comment, with the diff inline as illustration.**

A GitHub suggestion block would be wrong here. It implies "apply this," and the choice between
(a) exempt `PluginKind.stock`, (b) treat `set()` as `None`, and (c) keep it subtractive and accept
the whole-codebase invariant is mvdbeek's to make — he may well have a reason to want stock
plugins filtered that isn't in the PR body. The comment should carry: the two probe outputs above
(the empty case *and* the single-`gxfiles` case, which is the new information), the
`objectstore/__init__.py:1871-1872` contrast, and the observation that the security goal is
already fully served by the user-source filter. Then let him pick.

### 2b — unguarded file I/O in the lazily-evaluated hook. **CONFIRMED as to premise; severity P2, not P1.**

Three sub-questions. Taking them in order.

**(i) Can the hook raise? Yes, three different ways.** All three verified by execution:

```
calling the hook       -> generator (no exception yet)
iterating the hook    -> FileNotFoundError [Errno 2] No such file or directory: '/tmp/definitely-not-here/upload_params_xyz.json'
_referenced_file_...  -> FileNotFoundError [Errno 2] No such file or directory: '/tmp/definitely-not-here/upload_params_xyz.json'
truncated paramfile   -> JSONDecodeError Unterminated string starting at: line 1 column 18 (char 17)
dict paramfile        -> AttributeError 'str' object has no attribute 'get'
```

Note line 1. `UploadToolAction.iter_referenced_file_source_uris`
(`lib/galaxy/tools/actions/upload.py:91-101`) mixes `return` and `yield`, so it is a *generator
function*: calling it is free and the `open()` does not run until something iterates. It is
therefore not obvious from the call site that this is where the exception comes from.
`MinimalJobWrapper._referenced_file_source_uris` iterates it inside
`uris.update(...)` (`lib/galaxy/jobs/__init__.py:1093`), so it does propagate — line 3 confirms
that against the real unbound method.

The third mode (`AttributeError` on a non-list payload) is the one nobody would predict: the code
guards `isinstance(paramfile, str)` and `isinstance(path, str)`, but not the shape of the loaded
JSON.

**(ii) Is `job_io` ever evaluated before `__prepare_upload_paramfile` runs? Yes. Traced, not inferred.**

The happy path is fine: `BaseJobRunner.prepare_job` (`lib/galaxy/jobs/runners/__init__.py:299-310`)
calls `job_wrapper.prepare()` first, and `prepare()` special-cases `upload1` at
`jobs/__init__.py:1296-1297` before anything touches `job_io` (the first touch is
`default_compute_environment` → `SharedComputeEnvironment(self.job_io, job)` at `:1414`).

The failure paths are not. `job_io` is reached from `fail()` via `_fix_output_permissions()`:

- `jobs/__init__.py:1439-1440` — `_fix_output_permissions` opens with
  `self.job_io.get_mutable_output_fnames()`.
- `jobs/__init__.py:1552-1553` — `fail()` calls it, **unguarded**, whenever
  `working_directory_exists`.

And `fail()` is called before `prepare()` from at least these places:

| Call site | When |
|---|---|
| `runners/__init__.py:207-213` | `job_wrapper.enqueue()` raised inside `BaseJobRunner.put()` — the object-store-incompatibility case the comment there names |
| `runners/__init__.py:311-318` | `prepare()` itself raised (including from `__prepare_upload_paramfile`) |
| `runners/__init__.py:321` | `finish("", "")` when the built command line is empty |
| `handler.py:1248` | `get_job_runner` KeyError — invalid runner name in the destination |
| `handler.py:748, 759` | tool removed from the tool config, or destination resolution failed |
| `handler.py:818, 824, 827` | an input dataset was deleted / in error / failed metadata |

The working directory does exist at those points: `enqueue()` → `_set_object_store_ids` →
`_setup_working_directory` (`jobs/__init__.py:1815`, `:1870`), and for a job that already has an
`object_store_id` the wrapper's own constructor does it (`:1027-1028`). So the
`working_directory_exists` guard on `:1552` does not save us.

**(iii) Can the file actually be gone at that moment? Yes — three independent reasons.**

1. **Galaxy's own config documentation says so.** `upload_common.create_paramfile` writes the file
   with `tempfile.NamedTemporaryFile(prefix="upload_params_", delete=False)`
   (`lib/galaxy/tools/actions/upload_common.py:390-393`), and Galaxy sets
   `tempfile.tempdir = self.new_file_path` (`lib/galaxy/config/__init__.py:799`). The config schema
   then tells admins, at `lib/galaxy/config/schemas/config_schema.yml:582-584`: *"Galaxy may use the
   new_file_path parameter as a general temporary directory and that directory should be monitored
   by a tool such as tmpwatch in production environments."* Galaxy is officially advising admins to
   reap the directory this file lives in. Nothing deletes it earlier — I checked `tools/data_source/upload.py`,
   which removes `dataset.path` entries (`:59`, `:166`) but never the paramfile.

2. **The codebase already knows.** `__prepare_upload_paramfile` (`jobs/__init__.py:1263-1275`)
   carries an explicit ENOENT tolerance with the comment *"It won't exist at the old path if setup
   was interrupted and tried again later."*

3. **The two combine into a closed loop.** When `__prepare_upload_paramfile` hits ENOENT *and* the
   working-directory copy is also absent, it re-raises (`:1273-1274`). `prepare_job` catches
   (`runners/__init__.py:315-317`) and calls `job_wrapper.fail(..., exception=True)`. `fail()`
   reaches `_fix_output_permissions()` → `job_io` → `_referenced_file_source_uris` →
   `open(<the path we have just proved does not exist>)`. The guard's own trigger condition is the
   new code's crash condition.

**Severity: P2.** This is where I part company with the brief's framing. Trace what actually
survives:

In `fail()`, `job.set_final_state(job.states.ERROR)` and `sa_session.commit()` happen at
`jobs/__init__.py:1530-1541` — *before* `_fix_output_permissions()` at `:1553`. So the job does
reach `ERROR` and the user does see a failed job. What the escape costs is everything after
`:1553`: `_report_error()`, the `EmailAction` post-job actions (`:1555-1559`),
`tool.job_failed()` (`:1561-1566`), and `self.cleanup(delete_files=...)` (`:1567-1569`) — so the
working directory leaks. The user also gets the *wrong* message: `job.info` was set from the
original failure, but the traceback in the log is the `FileNotFoundError`, which buries the real
cause.

The exception then unwinds into `BaseJobRunner.run_next`, which catches it
(`runners/__init__.py:180-189`), logs `"Unhandled exception calling queue_job"`, and re-queues
`self.fail_job`. `fail_job` (`:600-623`) calls `job_wrapper.fail(...)` again → raises again → and
this time `run_next` does **not** re-queue, because `method == self.fail_job`. So it terminates,
but noisily and having done none of the tail work.

**The one place this is worse than P2.** `finish()` also calls `_fix_output_permissions()`, at
`jobs/__init__.py:2356` — and there `job.set_final_state(final_job_state)` comes *after*, around
`:2370`. An exception at `:2356` leaves a successfully-completed job without a final state. I did
not find a concrete way to reach that for `upload1` on the normal path (post-`prepare()` the
paramfile parameter points into the working directory, which `finish()` has not cleaned yet), so
I am recording this as a structural observation rather than a live bug.

**The guard to propose.** Two lines, and it inherits the tolerance the neighbouring code already
has:

```python
def iter_referenced_file_source_uris(self, param_dict: ToolStateJobInstancePopulatedT) -> Iterable[str]:
    paramfile = param_dict.get("paramfile")
    if not isinstance(paramfile, str):
        return
    try:
        with open(paramfile) as f:
            upload_params = json.load(f)
    except (OSError, ValueError):
        # Paramfile may be absent (interrupted setup, reaped tmp dir) or partially written;
        # an unreadable paramfile must not take down job_io, which is on the fail() path.
        log.warning("Could not read upload paramfile %s to derive referenced file sources", paramfile)
        return
    if not isinstance(upload_params, list):
        return
    ...
```

Failing open here is right *and* it is the same failure direction the additive fix in 2a argues
for: when the derivation cannot be completed, ship more rather than less. Note that under the
current subtractive filter, "return nothing" still means "drop every plugin" — so this guard alone
converts a crash into a broken job. It is only fully correct in combination with 2a. Worth saying
that explicitly in the comment, because the two findings are usually presented as independent and
they are not.

*(Not pursued, per scope, but it bears on (iii) and I said I would name it in one sentence: the
amended `__prepare_upload_paramfile` rewrites `paramfile_parameter.value` to the working-directory
path and then short-circuits on `param_file_path != new`, while the resubmit handler
(`lib/galaxy/jobs/runners/state_handlers/resubmit.py:107`) calls `clear_working_directory()`, which
`shutil.move`s the entire working directory aside and creates a fresh empty one
(`jobs/__init__.py:1392-1409`) — so a resubmitted `upload1` job's paramfile parameter points at a
file that no longer exists and will not be re-copied. That belongs to the third item the user cut;
I am not chasing it.)*

### Bonus: the test relocation. **CONFIRMED as a pure move.**

`git diff 97bc0d646a..349ad2308 -- test/unit/job_execution/test_job_io.py test/unit/app/jobs/test_job_wrapper.py`
shows four tests removed verbatim from `test_job_io.py` and re-added verbatim to
`test_job_wrapper.py`. The only changes are helper renames (`_wrapper` → `_minimal_wrapper`,
`_job` → `_job_with_file_source_inputs`, to avoid colliding with the existing module) plus three
attributes added to `MockTool` (`inputs`, `tool_action`, `params_from_strings`) so the shared mock
supports the new call. **No assertion was weakened or removed.** The +64/−56 delta is those
renames and the import block.

Test runs (one target at a time, as asked):

- `test/unit/app/tools/test_upload_actions.py test/unit/app/tools/test_history_imp_exp.py` →
  **19 passed**, 26.12s.
- `test/unit/app/jobs/test_job_wrapper.py` → **10 passed**, 4.77s.

### A correction to the brief's P1-1 note

The brief flags that `ImportHistoryToolAction`'s override compares an enum against the plain
string `"url"`, and calls the `class HistoryImportArchiveSourceType(str, Enum)` declaration
(`lib/galaxy/schema/schema.py:581-585`) "load-bearing," because a bare `Enum` would make the
comparison silently `False`.

Half right, and worth correcting because the correction is reassuring. The hook never sees the
enum. Its single call site is `jobs/__init__.py:1093`, which passes `self.get_param_dict(job)` —
a dict rebuilt from `job.parameters` through `params_from_strings` (`:1242-1249`), i.e. a JSON
round-trip out of the database. By then `__ARCHIVE_TYPE__` is a plain `str`. The `str, Enum`
declaration *is* load-bearing, but one step earlier, at persistence:

```
json.dumps(enum) -> "url"
loads            -> 'url' == "url": True
bare Enum        -> TypeError: Object of type Bare is not JSON serializable
```

A bare `Enum` would not produce a silent `False` — it would raise `TypeError` at job creation, for
every history import, loudly, in CI. The comparison itself is safe.

---

## 2. What `file_sources.json` is, and why this PR is hard

*(This section is the point of the document. It is written for whoever maintains this next.)*

### 2.1 What the file is for

Galaxy has an abstraction called a **file source**: a named, configured handler that knows how to
read or write bytes somewhere that is not the Galaxy object store. Each one owns a URI scheme and
an id, and the pair addresses it:

- `gxfiles://<plugin_id>/<path>` — an admin-configured source from `file_sources_conf.yml`
  (an S3 bucket, an SFTP host, a shared posix directory).
- `gxuserfiles://<uuid>/<path>` — a source a *user* created from a template, backed by their own
  credentials. Only ever addressable this way, which is why the UUID-matching filter for this
  half is exhaustive.
- `gxftp://`, `gximport://`, `gxuserimport://` — stock posix sources for the user's FTP drop
  directory and the library import directories.
- `https://`, `base64://`, `drs://`, `zip://` — stock protocol handlers.

Resolution goes through `ConfiguredFileSources.find_best_match` (`files/__init__.py:225-233`):
every plugin scores its ability to handle the URI, the highest positive score wins.
`get_file_source_path(uri)` (`:239`) turns a URI into `(file_source, relative_path)`, and that is
the entry point everything else uses.

Now the part that makes this a *job* problem. Most Galaxy tools never touch a file source — Galaxy
stages inputs into the job's working directory and the tool reads local paths. But a handful of
tools resolve URIs *themselves, at job runtime, on the compute node*, which may be a Pulsar host on
another continent with no database, no vault, and no Galaxy config. Those tools declare a
`<file_sources>` configfile:

```xml
<configfiles>
  <file_sources filename="file_sources.json"/>
</configfiles>
```

`ToolEvaluator` materialises that into a real file at `evaluation.py:923-924` —
`json.dumps(self.file_sources_dict)`, where `file_sources_dict` came from the compute environment
(`:177`) and ultimately from `JobIO.file_sources_dict`. The tool then gets the path on its command
line and reconstructs a `ConfiguredFileSources` on the far side via `ConfiguredFileSources.from_dict`
(`files/__init__.py:344-356`).

Exactly five tools in the tree declare it (`grep -rl "<file_sources" tools/ lib/galaxy/tools/`):

| Tool | XML | ToolAction | How its URIs are derived |
|---|---|---|---|
| `upload1` | `tools/data_source/upload.xml:9` | `UploadToolAction` | **the new hook** (paramfile walk) |
| `__DATA_FETCH__` | `lib/galaxy/tools/data_fetch.xml` | `FetchUploadToolAction` | the hook (`request_json` walk) |
| `__IMPORT_HISTORY__` | `lib/galaxy/tools/imp_exp/imp_history_from_archive.xml:19` | `ImportHistoryToolAction` | **the new hook** (`__ARCHIVE_SOURCE__`) |
| `__EXPORT_HISTORY_TO_URI__` | `lib/galaxy/tools/imp_exp/exp_history_to_uri.xml` | `ExportHistoryToolAction` | `directory_uri` parameter |
| `export_remote` | `tools/data_export/export_remote.xml:19` | *(default)* | `directory_uri` parameter (`:63`) |

Note the last two. They need no hook not because anyone remembered them, but because they happen
to spell their destination as `<param type="directory_uri"/>`, and `collect_directory_uris`
(`tools/parameters/__init__.py:290-302`) walks the tool's inputs looking for exactly that
parameter class (`parameters/basic.py:3298`). That is branch 1 of the derivation, and it is the
only *structural* branch — the only one that works because of what a parameter *is* rather than
because someone wrote code for that tool.

### 2.2 Why "send less" is worth wanting

Before this PR, `job_io` serialised every file source the user could see, for every job. Two costs.

The small one: bytes. Irrelevant.

The real one: **materialising a user-defined file source is a side-effecting operation.**
`_file_source_properties` (`managers/file_source_instances.py:649-671`) does four things before it
can produce a serialisable dict:

- `recover_secrets` (`_config_templates.py:156-175`) — reads that user's secrets out of the
  **vault**, one `read_secret` per declared secret name.
- `prepare_environment` (`:283-317`) — more vault reads, and it raises `InternalServerError` if any
  of them come back empty.
- `implicit_parameters_for_instance` → `_inject_oauth2_access_token` (`:515-528`) — reads the
  user's OAuth2 **refresh** token from the vault, exchanges it with the provider for a fresh access
  token, and writes the rotated refresh token back.

Read that last one again. Running an unrelated tool caused Galaxy to make an outbound OAuth token
exchange against *every* provider that user had ever connected a file source to, and then ship the
resulting access tokens into a job working directory — which, for a Pulsar destination, means over
the wire to a third-party compute site. A user with five connected sources paid five token
exchanges per job.

And it explains the issue this PR cites, #17811: *"All jobs fail if vault encryption keys are
replaced."* If any one of those vault reads fails, `job_io` raises, and `job_io` is on the
`fail()` path — so the job cannot even fail cleanly. Every job, regardless of whether it had
anything to do with file sources.

So "only serialise what the job needs" is the right instinct, and the user-source half of this PR
implements it exactly right, filtering by UUID *before* the expensive call rather than after
(`file_source_instances.py:709-712`).

### 2.3 Why "send less" is dangerous here

Here is the transferable part.

The filter's input is `MinimalJobWrapper._referenced_file_source_uris` (`jobs/__init__.py:1087-1097`),
a set built from three branches:

```python
uris = set()
if self.tool is not None:
    param_dict = self.get_param_dict(job)
    uris.update(collect_directory_uris(self.tool.inputs, param_dict))          # 1. structural
    uris.update(self.tool.tool_action.iter_referenced_file_source_uris(param_dict))  # 2. per-action hook
for input_association in job.input_datasets + job.input_library_datasets:      # 3. deferred inputs
    ...
    uris.update(dataset.dataset.source_uris)
```

Branch 1 is structural and self-maintaining: declare a `directory_uri` parameter and you are
covered forever. Branch 3 is data-driven off the DB and likewise self-maintaining.

Branch 2 is neither. It is a hook on `ToolAction` (`tools/actions/__init__.py:103-106`) whose base
implementation is `return ()`. Which means:

> **the correctness of the filter is a property of the whole codebase, not of the filter.**

Every `ToolAction` that can name a file source through a parameter shape branch 1 doesn't
understand must override this hook. That obligation is invisible at the site where it matters —
`files/__init__.py:313` has no idea whether the set it was handed is complete or empty-because-nobody-wrote-the-override.
There is no registry, no abstract method, no test that enumerates actions and asserts coverage, no
tool XML attribute that says "this tool needs file sources, verify it declares them." A new
`ToolAction` next year inherits `return ()` silently and correctly-looking.

And the failure is *local and quiet*:

- It is not a red test. Both P1s in this PR were only caught by reading — CI stayed green on the
  unit shards throughout.
- It is not an exception at dispatch. The job is created, queued, dispatched, and *runs*.
- It surfaces as `RequestParameterInvalidException: Could not find handler for URI [...]` from
  inside the tool script on the compute node, in a configuration (remote file sources +
  Pulsar/remote metadata) that most CI does not exercise.

Global obligation, local silent failure. That combination is the smell.

### 2.4 Additive vs. subtractive — the reusable idea

Galaxy already solved this exact problem, for object stores, and solved it the other way round.

```python
# lib/galaxy/objectstore/__init__.py:1863-1878
def serialize_static_object_store_config(object_store, object_store_uris: set[str]) -> dict[str, Any]:
    if len(object_store_uris) == 0:
        return object_store.to_dict()          # <- empty derivation means DON'T FILTER
    ...
    return object_store.to_dict(object_store_uris=object_store_uris)
```

`DistributedObjectStore.to_dict(object_store_uris=...)` serialises the **whole** static backend
list, then *appends* the per-user credential-resolving stores the job actually references. The
derivation at its call site (`jobs/__init__.py:2632-2636`) is deliberately narrow — only outputs
whose `object_store_id` satisfies `is_user_object_store(...)`. It is allowed to be narrow, because
of what happens when it is wrong.

Contrast the two failure modes when the derivation misses something:

|  | derivation misses a reference |
|---|---|
| **Additive** (object store) | job ships slightly more static config than it needed. Nothing breaks. |
| **Subtractive** (this PR) | job ships an empty or partial plugin list. Job fails at runtime, on a remote host, with a message about URI handlers. |

The rule worth carrying to the next review:

> **When a filter's input is a derivation whose completeness cannot be checked at the filter, choose
> the shape whose failure mode is over-inclusion.**

The security argument does not contradict this, because "over-inclusion" is not one undifferentiated
thing. Split the population by what inclusion actually costs:

- **User-defined sources** — inclusion costs a vault read and an OAuth token mint. Expensive and
  sensitive. Filter subtractively; and here you *can*, because the derivation is provably
  exhaustive (`gxuserfiles://<uuid>` is the only spelling).
- **Admin-configured `rfs` sources** — inclusion costs shipping admin credentials to a remote
  runner. Worth filtering, derivation not exhaustive, so this is a judgement call.
- **Stock plugins** — inclusion costs a few hundred bytes of regex and path config. Filtering them
  buys nothing and is the sole reason a missed reference becomes a broken job.

The PR treats all three identically. Splitting them is the whole fix.

### 2.5 How the review actually found the bugs

Not by reading the diff. The diff is 18 files and every line of it is defensible in isolation.

The method was: **identify the invariant the change depends on, then enumerate everything that has
to satisfy it.** The invariant was "every `ToolAction` that can reference a file source declares
its URIs." So enumerate `ToolAction` subclasses and check each one. Run this in the worktree:

```python
import pkgutil, importlib, galaxy.tools.actions as A
from galaxy.tools.actions import ToolAction
for m in pkgutil.iter_modules(A.__path__):
    try: importlib.import_module('galaxy.tools.actions.' + m.name)
    except Exception: pass
def walk(c):
    for s in c.__subclasses__():
        yield s; yield from walk(s)
base = ToolAction.iter_referenced_file_source_uris
for c in sorted(set(walk(ToolAction)), key=lambda c: c.__name__):
    print(f'{c.__name__:28} overrides={c.iter_referenced_file_source_uris is not base}')
```

At the current head:

```
BaseUploadToolAction         overrides=False
DataManagerToolAction        overrides=False
DataSourceToolAction         overrides=False
DefaultToolAction            overrides=False
ExportHistoryToolAction      overrides=False
FetchUploadToolAction        overrides=True
ImportHistoryToolAction      overrides=True
ModelOperationToolAction     overrides=False
SetMetadataToolAction        overrides=False
UploadToolAction             overrides=True
```

At `97bc0d646a` only `FetchUploadToolAction` was `True`. Two `False` rows that should have been
`True` — that is the entire P1 finding, and it took one probe rather than a careful read of 441
diff lines.

Then close the loop from the other direction, so the enumeration is provably complete rather than
merely suggestive:

```sh
grep -rl "<file_sources" tools/ lib/galaxy/tools/ test/
```

Five tools (plus one test tool). Cross-reference each against the table in §2.1: three covered by
the hook, two by `directory_uri`. Both directions agree, so the known set is closed *today*. What
remains is the future, which is §2.3's point and not something a probe can settle.

The transferable bit: **a probe that enumerates the population an invariant quantifies over is
worth more than any amount of diff reading**, because it answers the question the diff structurally
cannot — "what did this change forget?" The diff shows you what was written. The enumeration shows
you what wasn't.

---

## 3. Verified by execution vs. reasoned statically

Being explicit, because the handoff asked for the distinction to survive.

**Ran** (borrowed interpreter from `pr/22781/.venv`, `PYTHONPATH=lib` → this worktree's `lib`;
one target at a time):

- The 2a filter probe (§4 below) — the four `plugins_to_dict` calls and both `from_dict`
  round-trips. Output quoted verbatim in §1.
- The 2b exception probe (§4) — all five lines quoted verbatim, including the generator-laziness
  demonstration and the `AttributeError` on a non-list payload.
- The `ToolAction` enumeration in §2.5 — output verbatim.
- The `HistoryImportArchiveSourceType` JSON round-trip, including the bare-`Enum` `TypeError`.
- `pytest test/unit/app/tools/test_upload_actions.py test/unit/app/tools/test_history_imp_exp.py`
  → 19 passed.
- `pytest test/unit/app/jobs/test_job_wrapper.py` → 10 passed.
- `git diff 97bc0d646a..349ad2308` over the two test files, to confirm the relocation.

**Reasoned statically — read, not executed:**

- The entire 2b call-graph argument. I did **not** stand up a Galaxy instance, run an `upload1`
  job, delete its paramfile, and watch `fail()` blow up. Every link is a `file:line` citation and
  the chain is short, but it is a chain of reads. The weakest link is the claim that
  `working_directory_exists()` is `True` at each of the pre-`prepare()` `fail()` sites in the
  table — I established that from `enqueue()` → `_set_object_store_ids` → `_setup_working_directory`
  (`jobs/__init__.py:1815`, `:1870`) and from the constructor path at `:1027-1028`, but did not
  observe it.
- The severity call for 2b — that `job.set_final_state(ERROR)` at `:1530-1541` precedes
  `_fix_output_permissions()` at `:1553`, so the job still reaches `ERROR`. Read from source
  ordering. High confidence, unobserved.
- The `finish()` variant (`:2356` before `set_final_state` at `~:2370`) is a structural observation
  only. I could not construct a concrete `upload1` path that reaches it and am **not** claiming it
  as a live bug.
- The claim that stock plugins carry no secrets — read from the six plugin classes'
  configuration models, not probed for secret leakage.
- That the vault/OAuth cost is confined to the user-defined half — established by reading the call
  graph of `_file_source_properties` and confirming its only two callers. Not instrumented.
- The `tmpwatch` argument rests on Galaxy's config documentation
  (`config_schema.yml:582-584`) describing intended admin practice, not on an observed reaping.

**Not run at all:** any integration, API, or Selenium test. In particular
`test/integration/test_remote_files_histories.py` and `test/integration/test_remote_files.py` — the
suites that would actually exercise the fixed P1 paths end to end — were **not** executed. That
remains the single most valuable unrun check on this PR, and no claim in this document depends on
having run them.

---

## 4. Probe scripts

Both live in the session scratchpad; reproduced here so they outlive it. Run from the worktree
with `source /Users/jxc755/projects/worktrees/galaxy/pr/22781/.venv/bin/activate` and
`PYTHONPATH=lib`.

**2a — the filter.** (Note: do not set `ftp_upload_dir` on the config. The `gxftp` stock plugin
templates `${user.ftp_dir}` and `to_dict` explodes with a Cheetah `NameMapper.NotFound` when there
is no user context. That is unrelated to this PR but it will eat ten minutes.)

```python
import tempfile
from galaxy.files import ConfiguredFileSources, ConfiguredFileSourcesConf
from galaxy.files.plugins import FileSourcePluginsConfig

cfg = FileSourcePluginsConfig(library_import_dir=tempfile.mkdtemp())
conf = ConfiguredFileSourcesConf(conf_dict=[
    {"type": "posix", "id": "admin_shared", "root": tempfile.mkdtemp(), "label": "Admin Shared"},
])
fs = ConfiguredFileSources(cfg, conf, load_stock_plugins=True)
ids = lambda d: [e["id"] for e in d]

full  = fs.plugins_to_dict(for_serialization=True, referenced_uris=None)
empty = fs.plugins_to_dict(for_serialization=True, referenced_uris=set())
one   = fs.plugins_to_dict(for_serialization=True, referenced_uris={"gxfiles://admin_shared/x.txt"})
url   = fs.plugins_to_dict(for_serialization=True, referenced_uris={"https://example.org/a.tgz"})
for label, d in [("None", full), ("set()", empty), ("{gxfiles}", one), ("{https}", url)]:
    print(f"referenced_uris={label:12} -> {ids(d)}")

for label, d in [("filtered", empty), ("unfiltered", full)]:
    job_side = ConfiguredFileSources.from_dict({"file_sources": d, "config": cfg.to_dict()})
    for uri in ("gxfiles://admin_shared/x.txt", "https://example.org/a.tgz", "gximport://to_import.tgz"):
        try:
            job_side.get_file_source_path(uri)
            print(f"{label} resolve {uri} -> OK")
        except Exception as e:
            print(f"{label} resolve {uri} -> {type(e).__name__} {str(e)[:60]}")
```

**2b — the hook.**

```python
import os, tempfile
from types import SimpleNamespace
from galaxy.jobs import MinimalJobWrapper
from galaxy.tools.actions.upload import UploadToolAction

action, missing = UploadToolAction(), "/tmp/definitely-not-here/upload_params_xyz.json"

gen = action.iter_referenced_file_source_uris({"paramfile": missing})
print("calling the hook   ->", type(gen).__name__, "(no exception yet)")
try: list(gen)
except Exception as e: print("iterating the hook ->", type(e).__name__, e)

wrapper = SimpleNamespace(tool=SimpleNamespace(inputs={}, tool_action=action),
                          get_param_dict=lambda job: {"paramfile": missing})
job = SimpleNamespace(id=1, input_datasets=[], input_library_datasets=[])
try: MinimalJobWrapper._referenced_file_source_uris(wrapper, job)
except Exception as e: print("_referenced_file.. ->", type(e).__name__, e)

for payload, label in [(b'[{"type": "url", "pa', "truncated"),
                       (b'{"type": "url", "path": "https://x/y"}', "dict")]:
    fd, p = tempfile.mkstemp(suffix=".json"); os.write(fd, payload); os.close(fd)
    try: print(f"{label} paramfile   ->", list(action.iter_referenced_file_source_uris({"paramfile": p})))
    except Exception as e: print(f"{label} paramfile   ->", type(e).__name__, e)
```

---

## 5. What I'd send, if asked

Two comments, not three. Both framed as questions, since the author is a core maintainer and both
findings are design calls rather than defects.

1. **On `files/__init__.py:313`** — lead with the single-`gxfiles` probe output (the new
   information; the empty case was already in the last review), pair it with
   `objectstore/__init__.py:1871-1872`, and note that the vault/OAuth goal is entirely served by
   `file_source_instances.py:709-712`. Offer the `PluginKind.stock` exemption as one illustrative
   clause, explicitly not as a suggestion block.
2. **On `actions/upload.py:91`** — the three exception modes, the `fail()` →
   `_fix_output_permissions()` → `job_io` chain with its line numbers, and the observation that
   `__prepare_upload_paramfile`'s own ENOENT guard describes the exact state in which the new code
   crashes. Propose the `try/except (OSError, ValueError)`, and say plainly that it is a P2 —
   the job still reaches `ERROR`; what is lost is `_report_error`, the email PJAs, and working
   directory cleanup.

Say in comment 2 that the guard is only fully correct alongside comment 1, since "derived nothing"
currently still means "ship nothing."

No test is proposed, per scope. The gap (no coverage for a missing or malformed paramfile, and no
integration coverage of `upload1`-from-URL) is real and is noted here rather than in the comments.

The worktree is left clean at `349ad23084`; nothing in the Galaxy tree was modified and nothing was
posted to GitHub.
