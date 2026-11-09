# Initial review: #24706, Allow sorting the history list by size

- Profile: default (`_shared/reviewers/default.md`)
- Model: claude-opus-5-5
- Effort: medium
- Reviewed commit: `5006c8fbfe3a91c7f12f628fdd543c478f1854fa`, compared with `origin/dev...HEAD`
- Validation: static review only. The worktree has no `.venv` or `client/node_modules`, so I ran no tests. CI on this commit shows 49 passing and 5 skipped checks.

## Verdict

Sound and mergeable. No P1 or P2 findings. The findings below are all P3: one incorrect comment, three small reuse or simplification options, and three test gaps.

## Checked, no problem found

- **Tab switching cannot send `sort_by=size` to a rejecting listing.** `Analysis.vue` keys `<router-view>` on `route.fullPath`, so each tab remounts `HistoryList` and `ListHeader`. A size sort from My Histories does not carry over to Shared or Published.
- **The guard covers every non-own listing.** Published, shared, admin-all and anonymous requests are all rejected in `index_query` before the query is built. An anonymous request gets either the login error or the size error.
- **`SELECT DISTINCT` with the size column is valid.** `sort_column` is one hybrid attribute read, used in both the select list and `ORDER BY`. I did not run this on Postgres; the PR reports profiling it there and CI is green. `total_matches` is counted before `add_columns`, and `scalars()` reads the entity as the first column. The label's type is numeric, so `sort_expression` does not wrap it in `lower()`.
- **The sort matches the displayed size.** The sort and the serializer's `size` both use the `History.disk_size` hybrid. The storage dashboard sorts on the same expression (`managers/histories.py:651`).
- **"No other component passes `sortOptions`" is true.** `WorkflowList` and `CuratedWorkflowList` only pass `show-sort-options`.
- **The new page cap breaks no in-repo client.**
  - `HistoryList`, `HistoryDatasetPicker` and the store's variant listings send small explicit limits.
  - `getHistoryList` and `fetchAllHistoriesSizeSummary` use `q`/`qv` without `search`, so they stay on the legacy listing.
  - External clients are outside this check. The PR description calls the cap out explicitly.
- **Validation errors return the intended status.** `RequestValidationError` maps to a 400 through `validation_error_to_message_exception`, and `as_form` in `api/__init__.py` uses the same raise pattern.

## Findings

### P3 1: Client comment misstates what the server enforces

`client/src/components/History/HistoryList.vue:156` says: "The server sorts by size only when listing the user's own, non-archived histories."

The server guard does not check archived state, so `show_own=true&show_archived=true&sort_by=size` passes it. The Archived tab has no size sort for a different reason: it uses `/api/histories/archived`, whose route declares no `sort_by` parameter.

Suggested fix:

```ts
// The server sorts by size only for the user's own histories, and the archived endpoint takes no sort_by.
```

### P3 2: Size branch repeats what `apply_sort_column` exists to do

`managers/histories.py:258-259` calls `stmt.add_columns(sort_column)` and restates the Postgres `SELECT DISTINCT` rule. `apply_sort_column` (`managers/base.py:1333-1338`) already owns that rule and that `add_columns`, but only for expressions wrapped by `sort_expression`.

Suggested fix: have the helper also select anything that is not a plain mapped column. The size branch then needs only the assignment, and the next computed sort gets the behavior for free.

```python
# base.py
if expression is not column or not isinstance(column, InstrumentedAttribute):
    stmt = cast(SelectT, stmt.add_columns(expression))
```

Do not test for `Label` here. In a standalone SQLAlchemy 2.0.57 check (Galaxy pins 2.0.55), a class-level hybrid read returned a proxy: `isinstance(T.disk_size, Label)` was false, and so was `isinstance(T.disk_size, InstrumentedAttribute)`. A `Label` check would silently skip the column, and Postgres would then reject the query. A fix should re-run the size-sort API test on Postgres. It should also check the helper's other callers in `pages.py`, `visualizations.py` and `workflows.py`. A sort column there that isn't an `InstrumentedAttribute` would gain a redundant selected column, which is harmless to `scalars()`.

### P3 3: Route filters nine fields for `None` when only `limit` needs it

`api/histories.py:249-264` builds a `fields` dict and drops `None` values so that an omitted `limit` takes the payload default. Only `limit` needs this:

- `offset` defaults to 0 at the query level, so it is `None` only if a caller passes it explicitly, which HTTP cannot do.
- `show_archived` already defaults to `None` in the model.
- `search` is not `None` in this branch.

The cost of the current shape is that the dict and comprehension hide which field matters.

Suggested fix: pass the fields directly, and add `limit` only when it was supplied.

```python
limit_field = {} if limit is None else {"limit": limit}
payload = HistoryIndexQueryPayload(show_own=show_own, ..., search=search, **limit_field)
```

`HistoryIndexQueryPayload.limit` is still typed `int | None`, so an explicit `None` from an internal caller still means no limit. This route is its only constructor. Narrowing the field to `int` and removing the manager's `if payload.limit is not None` would make the cap impossible to bypass. The same applies to `offset`.

### P3 4: An additive prop could replace the `ListHeader` initial-sort change

To add one button, `HistoryList` restates `ListHeader`'s private default list (Name, Update time), uses `[]` to mean "defaults", and needs a new "prefer `update_time`" rule in the generic component.

Suggested fix: a prop such as `extraSortOptions`, appended to the defaults:

```vue
:extra-sort-options="myView ? [{ value: 'size', label: 'Storage used' }] : []"
```

This removes the duplicated list and `initialSortBy`, because `sortOptions` stays empty and the header still starts on `update_time`. The PR description explains the `initialSortBy` change, so this is a design alternative rather than a defect. Drop it if the author prefers the current shape.

### P3 5: The omitted-limit bug has no regression test

The PR describes the bug as "omitting `limit` returned every matching history". `test_index_query_limit_is_capped` only checks `limit=1000` (400) and `limit=999` (200). Reverting the route to pass `limit=None` through would still pass both.

Suggested fix: as a fresh user, create 101 histories, call without `limit`, then assert 100 results and `total_matches == "101"`.

### P3 6: Size-sort API test does not cover paging or the count

The PR claims the id tiebreaker gives stable paging, but `test_index_sort_by_size` never pages. It also never checks `total_matches` on the path that adds the extra column.

Suggested fix: extend the existing test, which already has the four histories it needs:

- Assert `total_matches == "4"`.
- Fetch `limit=2, offset=1` and assert `[empty_second, small]` ascending. That window starts between the two tied empty histories, so it exercises the tiebreaker.

### P3 7: No end-to-end check that the button works against the real server

The Vitest test mocks `getMyHistories`, and the API test passes its own flags. Nothing exercises the real button against the real guard, which is the failure the guard makes possible: a wrong flag from the client produces a 400 toast.

Suggested fix: add a test beside `test_sort_by_name` in `lib/galaxy_test/selenium/test_histories_list.py`, reusing `histories.sort_button(field="Storage used", direction=...)`. Use two histories of different sizes and check order in both directions.

## Observations (not findings)

- **Same bypass in a sibling route:** `api/visualizations.py:133` still uses `model_construct` with the common `LimitQueryParam` (default `None`), so its payload's `default=100, lt=1000` never applies. Workflows' index also uses `model_construct` with a `None` default limit, but I did not confirm its payload's bounds. `pages.py` avoids this by declaring `Query(default=100, ge=1, lt=1000)`. This is pre-existing and outside this PR, but a possible follow-up.
- **Size is still allowed in client types for listings that reject it:** `HistorySortByLiteral` now permits `"size"` for `getSharedHistories` and `getPublishedHistories`. No caller passes it, so narrowing the type has little value today.
- **Archived tab sort buttons:** these appear to do nothing, because the archived route takes no `sort_by`. I confirmed this from the route signature only, not at runtime. It is pre-existing.
