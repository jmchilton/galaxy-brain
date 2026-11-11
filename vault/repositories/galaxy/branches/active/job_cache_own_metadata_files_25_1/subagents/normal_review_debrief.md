# Normal review debrief

Run via Claude (general-purpose subagent, session default model and effort) on `08db94182d0`.

The review found nothing serious. Acted on two findings in `654f397da8c`. `FileParameter.make_copy` now flushes each new `MetadataFile` before writing its file, so under `store_by: id` `get_file_name()` no longer commits the session to get an id, which released `Job.copy_from_job`'s row locks. That flush also gives copies of an HDA real ids to look up, so `copy_from`'s own flush and its inaccurate comment are gone. Added a `store_by: id` test class whose file-name check shows the setting applied.

Not acted on:

- **In-place deferred materialization** (`deferred.py`, `elif replacement_dataset:`) still shares the replacement HDA's rows. It's the same class of bug, but it's reached from workflow scheduling and has no test here. Left for the scope evaluation.
- **Test gaps:** cached collection elements, the `copies` loop under a late cache hit, deferred attached and detached, the expression-tool passthrough, and pgcleanup on the late path. Left for the test challenge.
- **Cost per cache hit:** one `exists()` plus a read and a write per metadata file, inside the API request at submission. If `exists()` on the shared dataset returns False, the cached output silently gets no index where it used to share one. Recorded in the debriefs. This matches `HDA.copy()` and the agreed approach.
- **Dead `except AssertionError` fallback in `make_copy`** and the dropped non-spec keys: both predate the branch and match `HDA.copy()`.
- The new `store_by: id` test passes with or without the flush, because the commit it avoids can't be observed from the test.

<details>
<summary>Full review</summary>

**Medium**

1. Under store_by id, the copy commits the session in the middle of the operation (`model/__init__.py` `copy_from`, `tools/actions/__init__.py:629`). `make_copy` → `update_from_file` → `get_file_name()` → `self.flush()`, which is `sa_session.commit()`. In `Job.copy_from_job` that commit releases the id-ordered `FOR UPDATE` locks on all outputs. At submission it writes half-built output HDAs before the job exists. This existing pattern is shared with `HDA.copy()` and `init_meta(copy_from=...)`. Suggested fix: flush the new MetadataFile in `make_copy`, and/or test with store_by id.
2. Sibling path: in-place deferred materialization still shares the replacement's rows (`deferred.py:232-235`), reached from `workflow/scheduling_manager.py:396`. Suggested fix: use the `metadata` setter after setting the dataset, or scope it out.
3. Changed lines without regression tests: the `copies` loop and its flush, cached collection elements (`replace_elements_with_copies`), deferred attached and detached, and the expression-tool passthrough (`tools/__init__.py:3320`, which now copies at job finish). pgcleanup is covered only on the submission path.

**Low**

4. The flush comment is inaccurate. `marshal` stores an unflushed MetadataFile as a uuid string; without the flush, wrap's uuid `select` misses and it commits.
5. Cost per cache hit: an `exists()` plus a read and write of each metadata file (HEAD, download and upload on S3), inside the API request at submission, once per mapped element. If `exists()` returns False, `make_copy` returns None and the index is silently lost.
6. `make_copy`'s `except AssertionError` fallback is dead (`session(...)` on a plain Session would raise). Non-spec `_metadata` keys are dropped, as in `HDA.copy()`. The attached deferred path with no replacement copies files and then regenerates them.

**Checked and OK:** the target is in a session for every `include_metadata=True` caller. Detached materialization keeps its old result. `copy_from` sets the extension and dataset before copying. `old_dataset.full_delete()` is unaffected. Under extended metadata the copy runs on the handler, not in the set_metadata script.

</details>
