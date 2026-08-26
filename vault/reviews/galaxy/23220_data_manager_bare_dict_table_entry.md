# PR 23220 — Consume a data-manager bundle whose table entry is a bare dict

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23220 |
| **Author** | mvdbeek (Marius van den Beek) |
| **Base branch** | `dev` |
| **Head reviewed** | `89ebbea0fe61b669101a3248879d64fb3a156ba9` (merge-base `3708c133b8`) |
| **Size** | 2 files, +17 / -10 |
| **State** | OPEN, 0 reviews, 0 comments at time of writing; opened 2026-07-30 |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23220` |
| **Verdict** | **Approve with comments.** The fix is correct and I reproduced the bug and the fix by execution. The test fixture change is *legitimate realism, not a weakened test* — see P2-3 for the reasoning. The substantive comment is reuse: the canonical decoder for exactly this union of shapes already exists in the codebase (`_iter_bundle_rows`), written by the same author three weeks earlier, and this is the third hand-rolled instance. Reusing it would also close the `add`/`remove` shape, which this patch leaves broken and — new here — leaves broken *silently*. |

---

## What it does

One commit, `89ebbea0fe`. In `DynamicOptions.hda_to_table_entries`
(`lib/galaxy/tools/parameters/dynamic_options.py:895-917`), normalize a bare dict to a
one-element list before iterating:

```python
entries = hda._metadata["data_tables"][table_name]
if isinstance(entries, dict):
    entries = [entries]
for value in entries:
```

Plus a docstring extension and a fixture change in
`test/unit/app/tools/test_dynamic_options.py:64-90`.

Follow-up to #23210 (merged `d2c2d8c2cd`, 2026-07-30T12:39Z — about three hours before this
PR opened). #23210 added the `dbkey → value` keying fallback so dbkey-less tables produce
entries at all; it did not touch the shape assumption, so mOTUs still failed.

**The bug is real and I reproduced it.** Reverse-applying the lib hunk and calling the
function with the mOTUs-shaped metadata:

```
AttributeError: 'str' object has no attribute 'get'
  dynamic_options.py:905  if entry_key := (value.get("dbkey") or value.get("value")):
```

`get_fields` catches that (`dynamic_options.py:866-872`), logs
`Failed to read data table bundle entries`, and yields no options — hence the
`requires a value, but no legal values defined` the PR body describes. With the hunk
applied, the same call returns `{'db1': {...}}`. Red-to-green confirmed.

---

## P2 findings

### P2-1 — The decoder for this exact union already exists, in a function the same author added three weeks ago

`lib/galaxy/tool_util/data/__init__.py:1387-1400`:

```python
def _iter_bundle_rows(data_table_values: Any) -> Iterator[dict[str, Any]]:
    """Yield row dicts from a data-table value (list, single dict, or add/remove wrapper)."""
    if isinstance(data_table_values, dict):
        if "add" in data_table_values or "remove" in data_table_values:
            ...
        yield data_table_values
    elif isinstance(data_table_values, list):
        yield from (row for row in data_table_values if isinstance(row, dict))
```

Added by `06191ee134` (mvdbeek, 2026-07-10, "Store data-manager bundle paths relative to the
extra-files dir") for `_relativize_bundle_data_table_paths` — the *write* side of the same
bundle. Its docstring is a one-line statement of the problem this PR is solving on the *read*
side, and it handles a strict superset of shapes.

So the DM-emitted `data_tables[name]` union is now decoded in three separate hand-rolled
places:

| site | shapes handled |
|---|---|
| `_process_bundle` (`tool_util/data/__init__.py:1466-1499`) | list, bare dict, `add`/`remove` wrapper |
| `_iter_bundle_rows` (`:1387`) | list, bare dict, `add`/`remove` wrapper, non-dict rows filtered |
| `hda_to_table_entries` (this PR) | list, bare dict |

That is the reuse comment: **this PR writes the third and weakest copy.** The durable move is
to promote `_iter_bundle_rows` to a public `iter_bundle_rows` and call it from
`hda_to_table_entries`:

```python
for value in iter_bundle_rows(hda._metadata["data_tables"][table_name]):
```

Two practical notes for whoever does it:

- **Placement.** `dynamic_options.py:31` already imports `get_path_headers` from
  `galaxy.tool_util.data.bundles.models` — a light module — so putting the helper there
  beside `get_path_headers` costs no new import edge at all. Importing from
  `galaxy.tool_util.data.__init__` would work (layering is fine, `tool_util` is below
  `galaxy.tools`) but pulls in a much heavier module.
- **One real behavioural difference:** `_iter_bundle_rows` yields the `remove` rows as well
  as the `add` rows, which is right for path relativization and wrong for building an option
  list. Reuse needs a `sections=("add",)` argument or equivalent. Worth saying out loud so
  the reuse suggestion isn't taken as a blind swap.

Not a blocker for a targeted bugfix. But this is the second bug in three weeks caused by a
consumer of this metadata guessing the shape, so the "just patch this site" strategy has now
been empirically costed.

### P2-2 — The `add`/`remove` wrapper shape stays broken, and this change makes it fail *silently*

The wrapper is a first-class DM output shape — `_process_bundle` handles it explicitly
(`tool_util/data/__init__.py:1470-1476`) and there are functional test tools emitting it:

```
test/functional/tools/data_manager_add.xml:3
  {"data_tables": {"testbeta": {"add": [{"value": "newvalue", "path": "newvalue.txt"}]}}}
test/functional/tools/data_manager_add_remove.xml:3
  {"data_tables": {"testbeta": {"add": [...], "remove": [...]}}}
```

`testbeta` has no dbkey column, so this is the same family as the mOTUs case. Measured
against the patched code (I ran this):

```
add-wrapper: {}
```

`isinstance(entries, dict)` is true, so the wrapper itself becomes the single "row";
`value.get("dbkey") or value.get("value")` is `None`; the entry is dropped and the function
returns empty. **No exception, so no `log.warning` either.** Before this PR the same input
raised `AttributeError` on the string `"add"` and at least produced the
`Failed to read data table bundle entries` warning in the log.

Same user-visible symptom either way (`no legal values defined`), so this is not a
regression in behaviour — but it is a regression in diagnosability, and it is the kind of
thing that makes the *next* report of this bug harder to trace than this one was. Fixing it
is what P2-1 buys you for free. If the wrapper is deliberately out of scope, the cheap
alternative is to keep it loud:

```python
if isinstance(entries, dict):
    if "add" in entries or "remove" in entries:
        log.warning("Data table %s uses the add/remove bundle shape, which is not consumable here", table_name)
    entries = [entries]
```

I'd rather have P2-1. `data_manager_add.xml` is a ready-made fixture either way.

### P2-3 — The changed test: realism, not weakening — but it deletes the only dbkey-less *list* case, and it should be two cases

This is the point worth being careful about, so here is the full before/after.

`test_hda_to_table_entries_without_dbkey` was added by #23210 three hours before this PR,
with the mOTUs row wrapped in a one-element list. This PR unwraps it to a bare dict. Nothing
else changed:

- **No assertion was removed or weakened.** All three survive verbatim —
  `list(entries) == ["db_from_2026-04-27T094930Z"]`, the `path` relocation under
  `extra_files_path`, and `entry["__hda__"] is hda`.
- **The fixture became more realistic, not less demanding.** The PR body quotes the actual
  mOTUs DM output; the bare dict is what that data manager emits. The list wrapper in
  #23210's version was the *invented* shape. The test's own docstring promise — "a bundle
  whose table has no dbkey column must still yield a table entry" — is unchanged, and the
  fixture now matches the data manager the test is named after.
- **It is a strictly harder test than before:** mutation-verified above. The pre-PR fixture
  passes with or without the lib hunk; the new one only passes with it.

That is the anti-pattern test, and it comes out clean: the implementation was fixed and the
fixture was made real, rather than the fixture being bent to whatever the new code happens to
accept.

The one genuine cost: **the dbkey-less-*list* combination is no longer covered anywhere.**
Post-PR the matrix is diagonal —

| | list | bare dict |
|---|---|---|
| has dbkey | `..._prefers_dbkey` | — |
| no dbkey | **gone** | `..._without_dbkey` |

Every *branch* is still covered (the list path by `_prefers_dbkey`, the value-fallback by
`_without_dbkey`), and I confirmed by execution that the dbkey-less list still works with the
fix, so nothing is actually broken. But #23210's own scenario is now only tested through the
normalization added afterwards, which is a slightly awkward place to leave the regression
test for #23210. Fix is three lines:

```python
@pytest.mark.parametrize("entry_shape", [lambda row: row, lambda row: [row]], ids=["bare_dict", "list"])
def test_hda_to_table_entries_without_dbkey(entry_shape):
```

That pins the normalization in both directions, which is the property you want from a fix
whose whole content is "accept both shapes".

Small related nit: the docstring still opens "(e.g. motus, **dada2_species**)" while the
fixture is now specifically the mOTUs bare-dict shape. If dada2_species emits a list — I
could not confirm which, no sample to hand — the docstring is now naming an example the test
no longer exercises. Parametrizing makes the sentence true again.

**On the "is the list shape pinned too?" question: yes, in both layers.**
`test_hda_to_table_entries_prefers_dbkey` covers list at unit level, and
`lib/galaxy_test/api/test_tools.py:4092-4124`
(`test_build_does_not_leak_hda_from_user_bundle`, the #22674 regression) drives
`data_manager_select.xml` → `data_manager_mode=bundle` → `/api/tools/{id}/build` end to end
with a list-shaped table. So the list direction has real API-level coverage; the bare-dict
direction has unit coverage only. Adding `data_manager_mode=bundle` coverage for a bare-dict
table would be the strongest version, but that needs a new functional DM tool and is more
than this fix warrants.

---

## P3 findings

### P3-1 — Read-side normalization is the right call here; write-side is the durable direction

Worth stating since it's the obvious "why not fix it at the source" objection.
`DataManagerJson.set_meta` (`lib/galaxy/datatypes/text.py:151-154`) stores the DM's JSON
verbatim:

```python
data_tables = json.load(fh)["data_tables"]
dataset.metadata.data_tables = data_tables
```

Canonicalizing there — always a list of row dicts — would fix every reader at once. But it
only applies to datasets whose metadata is set after the change; every bundle already in a
user's history keeps the raw shape, and the mOTUs bundle in the reporter's history is exactly
such a dataset. So read-side handling is required regardless and this PR is landing it in the
right place. Normalizing at `set_meta` as well would be a fine follow-up, not a replacement.

### P3-2 — Second consumer with the identical blind spot, untouched: the admin Data Manager job view

The lead question was whether this fix covers one of several call sites. On the Python side
it does cover all of them — `grep -rn "metadata\.data_tables\|_metadata\[.data_tables"` over
`lib` and `test` returns exactly two hits: the write at `text.py:154` and the read at
`dynamic_options.py:901` that this PR fixes. `get_option_from_dataset`
(`dynamic_options.py:919-923`) goes through `hda_to_table_entries` and so benefits too.

But the same union reaches the client raw and gets the same list assumption there.
`lib/galaxy/webapps/galaxy/controllers/data_manager.py:147-149` passes the value through
untouched, and `client/src/components/admin/DataManager/DataManagerJob.vue:61-67` does:

```
:fields="outputFields(output[1][0])"
:items="output[1]"
```

`outputFields` is `Object.keys(output).reduce(...)` (`:86-88`). For a bare-dict table
`output[1][0]` is `undefined` → `Object.keys(undefined)` throws, and `:items` gets an object
where GTable wants an array. So an admin looking at the mOTUs DM job in
`/admin/data_manager` sees a broken or empty table for the same reason.

Out of scope for this PR and I would not hold it — but it is the same bug at a different
call site, and it's the concrete argument for P3-3.

### P3-3 — The shape union is nowhere typed or documented

`DataTableBundle.data_tables` is bare `dict`
(`lib/galaxy/tool_util/data/bundles/models.py:187-192`), and `_data_manager_dict` returns
`dict[str, Any]`. There is no type, no docstring, and no schema anywhere saying that a data
table value may be a list of rows, a single row, or an `{"add": [...], "remove": [...]}`
wrapper. Every consumer has had to rediscover that by crashing on a real bundle — twice in
three weeks, in the same function.

The durable abstraction is a named alias plus the shared decoder from P2-1:

```python
DataTableRow = dict[str, Any]
DataTableValue = DataTableRow | list[DataTableRow] | AddRemoveRows
```

`data_tables: dict[str, DataTableValue]` on `DataTableBundle` would then make mypy point at
every site that indexes it as a list, including finding P3-2's client-side equivalent by
making the API response shape explicit. Follow-up sized, not this PR's job — but it is the
answer to "does this change leave behind a reusable abstraction": as written, no, it
accretes a third copy.

### P3-4 — Style

Clean. No new imports at all, so nothing function-local to flag. The comment explains *why*
(names the emitting DM and what iterating the dict would yield) rather than restating the
`isinstance` check, which is the right register. The commit message is a proper explanation
with the causal chain and the mutation-verification claim, and the claim holds.

---

## Verification

Ran, in the worktree at `89ebbea0fe`:

- `pytest test/unit/app/tools/test_dynamic_options.py` → **5 passed** (93s).
- **Red-to-green confirmed.** Reverse-applied the `dynamic_options.py` hunk
  (`git show 89ebbea0fe -- lib/... | git apply -R`) and re-ran a direct call: the bare-dict
  fixture raises `AttributeError: 'str' object has no attribute 'get'` at
  `dynamic_options.py:905`. Restored; `git status --porcelain` clean afterwards.
- Direct calls against the patched function for all three shapes:
  `list` (no dbkey) → `{'db1': ...}`, bare `dict` → `{'db1': ...}`,
  `{"add": [...]}` → `{}` (the P2-2 silent-empty).
- Confirmed the dbkey-less *list* shape still works post-fix, i.e. #23210's fix is not
  regressed by the normalization — only its direct test coverage moved (P2-3).
- `git log -L` on `_iter_bundle_rows` to date it (`06191ee134`, 2026-07-10) and confirm it
  predates this PR.
- `gh pr checks 23220` — one failure, `Test (3.10, 2)` in the **Integration** workflow,
  failing at the `Setup Minikube` step. That is the unrelated repo-wide CI breakage that
  PR #23316 fixes; nothing to do with this change. Everything else green.

There is no `.venv` in this worktree. Rather than bootstrap a full Galaxy environment for a
pure-function unit test, I borrowed
`~/projects/worktrees/galaxy/branch/htcondor_pulsar/.venv` and set `PYTHONPATH` to *this*
worktree's `lib`. The first venv I tried (`branch/uv_lock_2`) was too stale
(`pydantic_extra_types` missing) and was not modified. No venv was written to.

## Not verified

- Did not run a real mOTUs data manager, or any DM at all. The bug and fix are reproduced at
  the `hda_to_table_entries` level, not end-to-end through
  `test_data_manager_workflow_bundle.py` (needs Docker + toolshed installs).
- Did not confirm what shape `dada2_species` actually emits — relevant only to the docstring
  nit in P2-3.
- The pre-fix behaviour for the `add`/`remove` wrapper (P2-2) is by inspection, not
  execution: my probe script aborted on the bare-dict case first. It is the same code path —
  iterating the wrapper dict yields the string `"add"` — so the `AttributeError` is not in
  doubt; the *post*-fix silent `{}` is the part I measured.
- Did not run the client test suite or check the `DataManagerJob.vue` rendering (P3-2) in a
  browser; that finding is from reading the template and the controller.
- Did not run mypy over the touched packages.
