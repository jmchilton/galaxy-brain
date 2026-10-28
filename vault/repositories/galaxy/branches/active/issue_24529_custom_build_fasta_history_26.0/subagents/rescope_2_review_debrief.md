# Rescope 2 review debrief

Verdict: 202 change is correct and minimal. Acted: dropped the unreachable `ConverterDependencyException` → 400 mapping, simplified the `None` check, and strengthened the tabix test. It now asserts the queued `bgzip` dep lands in the dataset's history and not in a newer one. Amended `15db38b3e40` → `1ba51ea6acc`, force-pushed. Red check: the test 500s with the pre-commit service.

Not acted on:
- Flag 2 (failing `bgzip` + polling queues a hidden job per poll, forever 202): same root cause as flag 1. The model's dependency lookup skips errored deps and re-queues them, so it never surfaces the error. Not a regression: each poll already queued a job and 500'd before. A fix means a model change (look up deps including errored ones) that diverges from 26.2's semantics. Follow-up for John, not this branch. There are no first-party pollers of `converted/{ext}`.
- Flag 3 (bam→bai metadata 500): pre-existing and out of scope. The fake metadata HDA isn't `None`, so it skips the 202 branch, and `get_converted_files_by_type("bai")` returns `None`, which fails in `serialize_to_view`. Unchanged from base.
- `retry_after` uses the default 60s. Fine, and it matches DRS.

Merge-forward (26.2), adds to the existing notes:
- 261d166f2ab queues tabix behind a pending `bgzip`, so the first call returns 200 and the `None` → 202 branch in `_get_or_create_converted` is dead.
- New test there: status 200, and extensions `{"bed", "bgzip", "tabix"}`. Or drop the dead branch and this test's 202 expectation.

Results: API `test_datasets.py -k "converted or search_features or raw_data_no_converter"` 6 passed; `test_users.py -k custom_build` 4 passed; unit `test_actions.py` + `test_HistoryManager.py` 41 passed. ruff/black/isort clean, mypy clean on the changed lib files.

<details>
<summary>Full review</summary>

### Scope
- Mostly `15db38b3e40`: `_get_or_create_converted` raises `AcceptedRetryLater` when the model returns `None`, and maps `ConverterDependencyException` → 400. Adds a new API test.
- Sanity pass over the whole branch vs `origin/release_26.0`: HistoryManager helper, the three routed callers, the a3cb32cd95d backport, and `encode_id=False`.

### Bugs
None blocking.

### Findings
1. **`ConverterDependencyException` → 400 is unreachable (removed).**
   - In `DatasetInstance.get_converted_dataset`, the dependency recursion calls itself without `include_errored`. `get_converted_files_by_type` therefore filters on `valid_input_states`, which excludes ERROR.
   - An errored `bgzip` is skipped and re-converted, and the fresh pending dep → `None`. The `dep_dataset.state == ERROR` branch can't fire for a returned dep. The bai metadata hack returns an OK fake.
   - 26.2 passes `include_errored` through, but this endpoint calls with `False`, so the branch is dead there too.
   - Review focus says to prefer not keeping never-working paths, and the branch is untested. Also `str(e)` would have quoted the message: `__str__` returns `repr(value)`. The model's own caller uses `e.value`.
2. **Redundant `and converted is None` (simplified).** A `None` from the model means no target association existed (it would have been returned earlier). So `is None` alone suffices, and `get_converted_files_by_type` only runs on the success path.
3. **Test strength (strengthened).**
   - The test only asserted 202/header/message.
   - It now also checks that the request persisted a hidden `bgzip` HDA in the dataset's history, which proves the job commit survives the 202 exception. It also checks that nothing lands in a newer history, which pins the backported history passthrough in the recursion.
   - It doesn't wait with `assert_ok`, because `bgzip` needs htslib and may error locally.
4. **Flags 1/2 share a root cause.** Errored deps are re-queued, not surfaced. Under a persistently failing converter, a Retry-After-honoring client loops and spawns jobs. Not a regression. Real fix is model-side and diverges from 26.2, so it's a follow-up.
5. **202 on `-> AnyHDA` route.** It's unusual, but there's precedent in the same service (DRS). The `Retry-After` header is set by `webapps/base/api.py`.

### Whole-branch sanity
- `HistoryManager.get_converted_dataset` checks for an existing conversion before resolving a history, and an unknown ext falls through to the model's `NoConverterException`. Correct.
- `_history_for_conversion` uses an owner `user_id` check (no admin bypass) and active-only filters. Correct.
- users.py `trans: ProvidesHistoryContext` matches the helper signature; imports are at top level.
- Populator helpers are reused across the tests, and no tests were weakened.
- No security-sensitive findings.
</details>
