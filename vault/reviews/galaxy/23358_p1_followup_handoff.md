# 23358 — P1 re-check after the force-push, and what's left

Handoff brief for an agent. Two jobs: **verify the two open items below** (they are stated as
suspicions, not findings — do not take them on faith), and **explain the mechanism** to the
user as you go.

**Scope, set by the user — respect it.** There was a third item here, about `prepare()` mutating
`job.parameters["paramfile"]`; it has been cut deliberately. Do not chase it. Do not propose new
tests as a deliverable — the missing coverage is known and accepted. Stay close to the two items
below; if you find something genuinely alarming outside them, name it in one sentence and stop
rather than pulling the thread. The teaching half is not optional; the point of this document is that the
reader ends up able to reason about this code without it.

Worktree: `~/projects/worktrees/galaxy/pr/23358`, checked out at `349ad23084`.
Prior review (against the earlier head `97bc0d646a`): `23358_serialize_job_required_file_sources.md`.

---

## 1. Verdict on the original P1s: both closed

mvdbeek force-pushed `97bc0d646a` → `349ad23084` (amended, not a new commit; +523/-31 across
18 files, was +441/-23 across 15). The two P1s were addressed directly.

**P1-1 (`__IMPORT_HISTORY__` got an empty `file_sources.json`) — fixed.**
`ImportHistoryToolAction` now overrides the hook at
`lib/galaxy/tools/actions/history_imp_exp.py:45-50`, yielding `__ARCHIVE_SOURCE__` when
`__ARCHIVE_TYPE__ == "url"`.

Two things I checked that could have quietly defeated this, and did not:

- `archive_type` originates as a `HistoryImportArchiveSourceType` **enum**
  (`lib/galaxy/schema/schema.py:581`), and the override compares it against the plain string
  `"url"`. **Correction (verified in the debrief):** an earlier draft of this brief called the
  `(str, Enum)` declaration load-bearing, claiming a bare `Enum` would make the comparison
  silently `False`. That is wrong. The hook only ever sees DB-restored params —
  `get_param_dict` (`jobs/__init__.py:1242-1249`) runs `params_from_strings`, which JSON-decodes
  — so it compares plain strings and never meets the enum. A bare `Enum` would raise at job
  creation: loud, not silent. The fix is safer than first stated.
- The integration tests that would have caught the original bug
  (`test/integration/test_remote_files_histories.py:11,22`) pass `archive_type="url"` with
  `gxfiles://` URIs, so they exercise the new branch. The schema default is also
  `HistoryImportArchiveSourceType.url` (`schema.py:1784`), so the common path is covered.

**P1-2 (`upload1` URL uploads) — fixed.**
`UploadToolAction` now overrides the hook at `lib/galaxy/tools/actions/upload.py:91-101`,
reading the paramfile JSON and yielding `path` for every entry with `type == "url"`.

**Coverage of the derivation as a whole.** The full set of URIs a job is deemed to need is
built in `MinimalJobWrapper._referenced_file_source_uris` (`lib/galaxy/jobs/__init__.py:1087-1098`)
from exactly three sources:

1. `collect_directory_uris(self.tool.inputs, param_dict)` — which matches **only**
   `DirectoryUriToolParameter` (`lib/galaxy/tools/parameters/__init__.py:290-302`).
2. `self.tool.tool_action.iter_referenced_file_source_uris(param_dict)` — the new hook.
3. `dataset.dataset.source_uris` for input datasets with `has_deferred_data`.

I enumerated every `ToolAction` subclass and checked the ones that can carry a URI.
`ExportHistoryToolAction` has no override and does not need one: the export-to-remote tool
`__EXPORT_HISTORY_TO_URI__` declares `<param name="directory_uri" type="directory_uri"/>`
(`lib/galaxy/tools/imp_exp/exp_history_to_uri.xml`), and `directory_uri` maps to
`DirectoryUriToolParameter` (`lib/galaxy/tools/parameters/basic.py:3298`), so branch 1 catches
it. `FetchUploadToolAction` was already covered. That accounts for the known tools.

Tests: the additions are unit-level, purely additive, and test both the positive and negative
branch for each action (`test/unit/app/tools/test_upload_actions.py`,
`test/unit/app/tools/test_history_imp_exp.py:33-47`). **19 passed** — run with the venv
borrowed from `pr/22781` (`PYTHONPATH=lib`), since this worktree has none. No assertions were
weakened; `test/unit/job_execution/test_job_io.py` lost 56 lines, which appears to be tests
relocating to `test/unit/app/jobs/test_job_wrapper.py` (+64) — **confirm that, don't assume it.**

---

## 2. What is still open

### 2a. The sharp edge that produced both P1s is still there — this is the real finding

`lib/galaxy/files/__init__.py` is **unchanged** by the force-push. The filter still reads:

```python
referenced_file_sources = None
if referenced_uris is not None:                       # :299
    referenced_file_sources = [ ... ]
...
if referenced_file_sources is not None and file_source not in referenced_file_sources:
    continue                                          # :313
```

An empty set is not `None`. So "this job referenced no URIs" and "do not filter" are
distinguishable, and the former means **drop every file source, stock plugins included**. That
is why a missing hook override degrades into a broken job rather than a harmless
over-inclusion.

Both P1s were instances of one bug: *a tool action that references a file source through a
parameter the derivation doesn't understand*. Two were found and patched. The third is
whatever nobody has thought of yet — and the failure mode is a runtime job failure in a
configuration CI does not exercise, not a red test.

Contrast the precedent this codebase already set for the same problem, in
`serialize_static_object_store_config` (`lib/galaxy/objectstore/__init__.py:1863`): it is
**additive** — serialize the whole static config, then append only the credential-bearing
per-user stores the job actually references. Under that shape, a missed reference produces a
job that ships slightly more config than it needed. Under this PR's subtractive shape, a
missed reference produces a job that cannot resolve its inputs.

Worth noting the stated security goal — don't hand every job every user's OAuth tokens — is
satisfied by the user-source filter alone. The subtractive treatment of *stock, credential-free*
plugins is what buys the risk, and it is not clear what it buys in return.

**Tasks:**
- Confirm the empty-set-vs-`None` reading above by actually exercising `plugins_to_dict` with
  `referenced_uris=set()` against a real `ConfiguredFileSources`. Report what comes back.
- Work out whether an additive variant would satisfy the PR's goal. Concretely: filter only
  `PluginKind.rfs`/user-defined sources by reference, pass stock plugins through unfiltered.
  Would anything be lost?
- Decide whether this is a review comment or a code suggestion, and say which you'd send.

### 2b. The upload hook does unguarded file I/O in a lazily-evaluated property

`UploadToolAction.iter_referenced_file_source_uris` (`actions/upload.py:91`) does a bare
`open(paramfile)` / `json.load` with no error handling. It is reached from the `job_io`
property (`lib/galaxy/jobs/__init__.py:1101`, calling `_referenced_file_source_uris` at `:1107`).

The suspicion — **verify before repeating it** — is that the paramfile is not guaranteed to
exist at that path at that moment:

- `job_io` is a lazy property and can be evaluated at a different time than `prepare()`.
- `__prepare_upload_paramfile` (`jobs/__init__.py:1263`) copies the paramfile into the working
  directory and is called from `prepare()` at `:1298`.
- That method already carries an explicit ENOENT tolerance with the comment *"It won't exist at
  the old path if setup was interrupted and tried again later"* — i.e. the codebase already
  knows this file can be missing. The new hook does not share that tolerance.

**Tasks:**
- Establish the actual ordering: is `job_io` ever evaluated before `__prepare_upload_paramfile`
  runs? Trace the real call graph rather than reading line numbers — they're in different
  methods and line order proves nothing.
- If the file can be missing, a `FileNotFoundError` escaping `job_io` is a job failure. Decide
  severity and propose the guard.
- No test covers a missing or malformed paramfile — note it in passing, but the user has said
  they are fine without one. Do not write it, and do not make it a recommendation.

---

## 3. What to teach the user

Aim for understanding, not a summary. Cover:

1. **What `file_sources.json` is for.** Why a job — especially a remote Pulsar job — needs a
   serialized description of file sources at all, what `gxfiles://` / `gxuserfiles://` URIs are,
   and who reads the file on the job side (`get_file_source_path`, the `--file-sources`
   argument visible in the tool XML above).
2. **Why "send less" is desirable here.** What is actually sensitive in that blob: per-user
   file sources carry OAuth tokens, and today every job gets every one of them. Make the
   security argument concrete.
3. **Why "send less" is dangerous here.** Walk through the derivation in
   `_referenced_file_source_uris` and show that its completeness is a *whole-codebase* property
   — every present and future `ToolAction` must remember to declare its URIs — while its
   failure is silent and local. This is the transferable lesson.
4. **The additive-vs-subtractive contrast** with the object store precedent. This is the
   reusable idea worth carrying to other reviews: when a filter's input is a derivation that
   can be incomplete, prefer the shape whose failure mode is over-inclusion.
5. **How the review actually found the bugs.** Not by reading the diff — by enumerating
   `ToolAction` subclasses and asking, for each, "how could this one name a file source?" Show
   the grep. Method transfers; findings don't.

Use real `file:line` citations throughout and have the reader run at least one probe
themselves rather than only reading conclusions.

---

## 4. Ground rules

- Every claim gets a `file:line`. Anything you cannot substantiate is an open question, labelled
  as one — this document already distinguishes the two and that distinction must survive.
- This worktree has no `.venv`. Borrowing `pr/22781`'s with `PYTHONPATH=lib` works for unit
  tests. Do not sink time into a full bootstrap; if you don't run something, say so plainly.
- Run one test target at a time — shared dev machine.
- Do **not** post anything to GitHub. Deliverable is a written update beside this file; the
  user decides what gets sent.
