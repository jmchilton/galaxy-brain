# Normal review (re-scope) — debrief

Reviewed `aacc3ea3198` (re-scope commit on #24178 @ `8f358dbb341`). No blockers. I acted on the "should" and four of the five nits in `19f85ce4741` (now `b4bb27e259a` after rebasing onto the parent's `b53a5d9fe8b`):

- **Guards coverage (should):** strengthened the existing `test_import_export_invocation` (`test_model_store.py`) with a stale step-parameter row. It asserts that export succeeds and the imported invocation has no step rows. Mutation checks: removing the `_serialize` guard gives `TypeError` on export; disabling the import drop makes the import fail. No new test function.
- **Import loop (nit 2):** now one branch on `type == STEP`: drop when there's no `order_index`, re-key otherwise.
- **Wording (nit 3):** the comment and log now cover rows the exporter couldn't resolve, not just older archives.
- **Test helpers (nit 5):** `_is_invocations_attrs(member)` is shared by both tar helpers.
- **Stale test comment (nit 6):** reworded so it says import drops the row.

Not acted on:
- **Nit 4 (`_serialize` swallows `ValueError` silently):** the import-side warning already names the step id. A log at export time would fire on every export of a malformed row. The malformed case is DB corruption, and `/request` already logs it at error level.
- **`/request` skip has no test:** the API can no longer create stale rows, and a service-level test would need heavy fixtures. It's covered by reasoning, and the PR description should say so.

<details>
<summary>Full review</summary>

See [normal_review_raw.md](normal_review_raw.md).

</details>
