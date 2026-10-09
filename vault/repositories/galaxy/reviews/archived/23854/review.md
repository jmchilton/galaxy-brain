# galaxy#23854: [25.1] Fix 500 on reading pages with non-ASCII slugs

- Author: mvdbeek. Base: `release_25.1`. +36/-6, 4 files. Fixes #23848 (usegalaxy.eu, 26.1).
- Reviewed at `46c3298c3ee`. Worktree: `~/projects/worktrees/galaxy/pr/23854` (head is 2 commits behind `origin/release_25.1`, unrelated).
- Tests: CI only, nothing run locally (disk constraints).

## Summary

66a4933ac1a narrowed `PageSummaryBase.slug` to `^[a-z0-9-]+$`. The sharing paths still accept or generate Unicode slugs (`SlugBuilder.is_valid_slug` and `get_unique_slug` use `slugify(..., allow_unicode=True)`), so `PageDetails(**rval)` raised a pydantic error and returned a 500. The PR:

- puts the schema pattern back to `^[^/:?#]+$`
- validates new slugs in `PageManager.create_page` / `update_page` with `SlugBuilder.is_valid_slug` (an unchanged slug is skipped on update)
- adds validation to the legacy `set_slug_async`

## Verdict

Approve. Small and correct. It reuses the existing source of truth (`SlugBuilder.is_valid_slug`) and doesn't add a second regex. The write rule gets tighter only where it now matches the sharing endpoint. Two notes are non-blocking, and one is a forward-merge heads-up.

## Findings

1. **Response model still validates input (non-blocking).** `lib/galaxy/schema/schema.py:3856`: the pattern sits on `PageSummaryBase`. `CreatePagePayload` (:3928), `UpdatePagePayload` (:3944) and the response models `PageSummary`/`PageDetails` (:3994) all inherit it. Before this PR, `set_slug_async` stored any string unvalidated (`lib/galaxy/webapps/base/controller.py:1018`, exposed at `/{controller}/set_slug_async`). So any existing row with `/ : ? #` in its slug would still 500 on `GET /api/pages/{id}`. On input, the pattern is now a strict superset of `is_valid_slug`, because slugify output never contains those characters. It only does work on read, where it can only cause harm. Cleaner fix: move the pattern to the two payload classes, or drop it and rely on `_validate_slug`, and leave the response unconstrained. A side effect: `test_update` would no longer need two different error-message assertions (`test_pages.py:399-401`), one per layer.
2. **Third copy of "validate slug + uniqueness, raise" (non-blocking, dev-only).** The new `_validate_slug` (`lib/galaxy/managers/pages.py:694`) plus `page_exists` at :255-257 and :303-305 repeat `VisualizationsService.create` (`lib/galaxy/webapps/galaxy/services/visualizations.py:295-305`) and `SharableModelManager.set_slug` (`lib/galaxy/managers/sharable.py:290-300`). A helper on `SlugBuilder` / in `sharable.py` that takes `(session, model_class, user, slug)` would give one error message and one exception type. Visualizations currently raises `RequestParameterMissingException` with the message "lowercase letters, numbers, and the '-' character", which is inaccurate now that Unicode is allowed. Not for a 25.1 bugfix.
3. **Forward merge to 26.1/dev will conflict, so check placement (heads-up).** On `release_26.1`/`dev`, `slug` is `Optional[str]` and `create_page` has a history-attached branch where pages have no slug. Moved verbatim to the top of `create_page`, `_validate_slug(payload.slug)` (`if not slug ... raise`) would reject every history-notebook create. It belongs in the `else` (non-history) branch next to `page_exists`, and in update under `payload.slug is not None and payload.slug != page.slug`. #23848 was observed on 26.1, so this merge-forward is what actually fixes EU.
4. **`set_slug_async` fails silently (nit, pre-existing pattern).** `controller.py:1018`: an invalid slug is now ignored without telling the user, the same way a duplicate already is. Acceptable for a legacy endpoint with no client caller in `client/src`.
5. **Tests are good.** `test_show_page_with_non_ascii_slug_set_via_sharing` (`test_pages.py:422`) reproduces the bug: without the schema change, GET hits the response-model pattern and returns 500. `test_create_and_update_page_with_non_ascii_slug` (:412) would fail without the fix with a 400 on create from the old schema pattern. Both are API tests, not trivial unit tests. Reasoned, not run locally; both PASSED in CI. Behaviour change: create now rejects `a--b` / `-a`. The PR body flags it, and it matches the sharing endpoint.

No embedded imports and no obvious comments. The only other slug fields in `schema.py` (histories :1513, `SetSlugPayload` :3691) carry no pattern, and the history/workflow/visualization schemas aren't affected.

## CI status

API test shards pass, including `test_pages.py::TestPagesApi::test_update` and both new tests. The failures look unrelated:
- API `Test (3.10, 1)`: `test_workflows.py::test_export_invocation_bco` (JSONDecodeError)
- Integration `Test (3.10, 2)`: `test_workflow_tasks.py::test_export_bco_basic` (same BCO JSONDecodeError)
- Packages `Test (3.13)`: `tests/files/test_gcsfs.py` (OSError: Bad file descriptor)
- Release-script `Test` and `Test (3.10)`: infra, nothing page-related in the logs

## Draft PR comment (unposted)

> *This review was written by Claude (AI assistant) on behalf of jmchilton.*
>
> Thanks, this looks good to me. Reusing `SlugBuilder.is_valid_slug` on the create/update paths is the right single source of truth. Approving. A few non-blocking thoughts:
>
> 1. The pattern still lives on `PageSummaryBase`, so `PageSummary`/`PageDetails` validate it on read too. `set_slug_async` used to store anything, so an existing slug with `/`, `:`, `?` or `#` would still 500 on `GET /api/pages/{id}`. Since `_validate_slug` now handles input (and is stricter than `^[^/:?#]+$`), would you consider moving the pattern onto `CreatePagePayload`/`UpdatePagePayload` only, or dropping it, so the response model never rejects stored data?
> 2. Heads-up for the merge forward: on 26.1/dev, `slug` is `Optional` and `create_page` has a history-attached branch with no slug. `_validate_slug` needs to go in the non-history branch, and under `payload.slug is not None` in update. Otherwise history notebooks will fail to create.
> 3. Possible dev follow-up: `VisualizationsService.create`, `SharableModelManager.set_slug` and now `PageManager` each do "is_valid_slug + exists → raise" with different messages and exception types. A shared helper in `sharable.py` would unify them, and the visualization message ("lowercase letters, numbers, and the '-' character") is no longer accurate with Unicode slugs.
