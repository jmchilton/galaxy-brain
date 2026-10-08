# galaxy#22136 — Replace explicit client route registration with SPA catch-all fallback

- PR: https://github.com/galaxyproject/galaxy/pull/22136 (dannon, base `dev`, not draft, milestone 26.2)
- Head reviewed: `1b8e21cfd81` (4 commits, 6 files, +129/-198)
- Worktree: `~/projects/worktrees/galaxy/pr/22136` (detached at head)
- Status: reviewed locally, review **unposted**.

## Verdict

**Request changes.** The idea is right and the code is small, but it regresses every `/datasets/...` client route. On a direct load, a refresh, or the Window Manager, those pages now get the plain-text "This link may not be followed from within Galaxy." CI is red on that: Selenium, Playwright and Integration Selenium fail. The fix is one deletion plus a better test.

## Summary

- Drops the 142 `add_client_route()` calls and the separate `clientside_routes` mapper.
- New `WebApplication.client_match` class attribute (`base.py:99`, set on `GalaxyWebApplication` at `buildapp.py:38`). For non-API requests, when the mapper matches nothing (`base.py:223-226`) or the match can't resolve to an exposed controller method (`base.py:250-256`), the request is re-dispatched to `root.client`.
- Removes `RootController.default` (the old 404 placeholder) and the `use_default` flag on `_resolve_map_match`.
- Tool Shed and other `WebApplication`s keep `client_match = None`, so they still 404.
- The X-Frame-Options embed exemption is **not** in this diff. It landed on dev in #22107 (`b1fa123b742`). This PR only adds a non-embed assertion (`test_framework.py:14`).

## Findings (ranked)

1. **Regression: `/datasets/{id}/{edit,details,preview,raw,report,show_params,visualize,error}`, `/datasets/{id}`, `/datasets/list`, `/datasets/copy` now hit `DatasetController.default`.**
   - These paths match the explicit route `/datasets/{dataset_id}/{action}/{filename}` (`buildapp.py:125`, `filename=None` plus minimization). That resolves to `controller=dataset` with a non-existent action.
   - `_resolve_map_match` then falls back to `dataset.default` (`base.py:203`, `controllers/dataset.py:86`), which returns the string "This link may not be followed from within Galaxy." with a 200.
   - Before this PR, the `use_default=False` flag was the thing that stopped controller `default`s from swallowing client routes. The PR removed the flag but only deleted `root.default`.
   - Verified two ways:
     - A `routes` probe with the real route table maps `/datasets/abc/edit` → `{'controller': 'dataset', 'action': 'edit', ...}`.
     - A scratch red test built on the PR's own harness plus that route and a `default` stub fails for all 5 sampled paths.
   - CI confirms it:
     - `test_dataset_display_extra_files` and `test_window_manager` fail in both Selenium and Playwright.
     - `test_allowlist_sanitization` x2 fails in Integration Selenium.
     - All of them navigate to `datasets/{id}/preview`.
   - Fix: delete `DatasetController.default`. It is the same placeholder as `root.default`. Of the other `default`s, `tool_runner.default` is real behavior and `async.default` is real, and no client route starts with either controller. Then add `/datasets/<id>/preview` (and ideally `/user`, `/login/start`, `/published/page`) to `test_client_paths_serve_the_client_app`.
2. **Tests model a fake route table, which is how (1) got through.**
   - `_client_fallback_webapp` (`test_framework_base.py:67-81`) wires its own four generic routes, not the real `buildapp` table. Its parametrization even enshrines `/dataset/display → dataset.default`, which is the exact mechanism behind the regression.
   - The stub classes (`StubRequest`/`StubResponse`/`StubTransaction`) are a lot of scaffolding for what is really a routing question.
   - Suggest leaning on the API test instead and widening it to a representative sample of the old list, with at least one path per first segment (`/datasets`, `/user`, `/admin`, `/histories`, `/workflows`, `/published`, `/login`, `/libraries`, `/storage`).
   - Even better, extract the dispatch rules into a function that can be unit-tested against the real mapper built by `buildapp` (as `test/unit/webapps/test_routes.py` already does for `test_galaxy_routes`). Then the test catches collisions with real routes.
   - Removing `test_auth_client_routes` is fine (the function is gone), but nothing replaces its `/login/start`, `/login/reset_password`, `/register/start` coverage.
3. **The PR body claims "the Vue router takes it from there (including its own 404 page)". There is no such page.**
   - `client/src/entry/analysis/router.js` has no global catch-all or NotFound route. The only `:pathMatch(.*)*` is scoped to `/storage` (`routes/storage-routes.ts:51`).
   - So `/asdfgh` (and any typo, or any removed legacy mako URL) now returns 200 with an empty page, where it used to return a server 404.
   - Either add a client NotFound route inside the `/` Analysis children in this PR, or fix the description. Monitoring and crawlers will also see 200s for dead links.
4. **The fallback ignores the HTTP method.**
   - POST/PUT/DELETE to any unresolvable non-API path now gets 200 + `js-app.mako`. A form or script POSTing to a removed legacy controller method (e.g. a gone `/user/...`/`/dataset/...` mako action) silently "succeeds" with HTML.
   - The old explicit routes also had no method conditions, so registered client paths already behaved this way. The PR makes it universal.
   - Suggest limiting the fallback to GET/HEAD and letting other methods 404 as before.
5. **Abstraction and duplication.**
   - `client_match: dict[str, str] | None` is a reasonable opt-in hook. But the "not API and client_match set" rule is spelled out twice (`base.py:224`, `base.py:253`), and the `map_match is None` branch is redundant.
   - Simpler: when the mapper returns `None`, use `{}`. `_resolve_map_match` then raises `HTTPNotFound` ("No controller") and the single except-branch handles both cases. Pull the guard into one `_client_fallback(environ)` helper (where finding 4's method check would live too).
   - Typing: a dict whose keys are always `controller`/`action` could be a small `NamedTuple`/`TypedDict`. Nit.
   - Reuse is good overall. It deletes a parallel mapper and keeps `_resolve_map_match` as the one resolution path. Session, transaction, auth and headers are unchanged for fallback requests: the transaction is built before resolution exactly as before, and the `require_login` allowed-path checks are path-based, not route-based.
6. **Behavior parity check for the previously-registered list.** Apart from (1), every old client path still reaches `root.client` with the same transaction setup:
   - `/`, `/root`, `/index`, `/histories*`, `/workflows*`, `/pages*`, `/visualizations*`, `/admin/*` without a matching method, `/login/start`, `/register/start`, `/published/*`, `/libraries*`, `/storage*`, `/upload*`.
   - Where a real controller method exists (e.g. `/user` → `user.index`, `/admin/<method>`), the server handler wins, same as before. The mapper always won when the method existed.
   - Route variables (`form_id`, `path_info`, …) are no longer passed to `root.client`. It ignores `**kwd`, so this doesn't matter.
   - API paths still 404, since `/api` is guarded.
   - Static files are unaffected: `URLMap` serves `/static` before the webapp, and a missing static file 404s inside `Static`.
   - Tool Shed unchanged.
7. Imports are at module top. The `"SAMEORIGIN" in header` assertion is deliberately loose because of the known double header, and the PR body says that will be handled separately. Acceptable.

## Tests run

- `test/unit/web_framework/framework/test_framework_base.py` + `test/unit/webapps/test_routes.py` (galaxy repo venv, `PYTHONPATH=<worktree>/lib`): **15 passed**.
- Scratch red probe (not committed, in session scratchpad): the PR's harness plus the real `/datasets/{dataset_id}/{action}/{filename}` route and a `dataset.default` stub → **5/5 fail** (`'This link may not be followed…' != 'client'`).
- Pure `routes` probe against the real UI route table: confirms `/datasets/*` client paths resolve to `controller=dataset`.
- API/Selenium not run locally. CI at head:
  - Selenium, Playwright and Integration Selenium fail on the dataset-preview tests above.
  - Packages fails on an unrelated `galaxy_test` import in `packages/selenium`.
  - The Unit tests job is red but its log shows no test failure (likely infra).

## Draft GitHub review (UNPOSTED)

> _Posted by Claude (AI assistant) on behalf of jmchilton. Not written by them personally._
>
> Still a nice QOL improvement. Deleting the parallel client mapper and the 142 registrations is the right direction, and the opt-in `client_match` hook keeps the Tool Shed untouched. One regression and a few smaller points:
>
> - **`/datasets/...` client routes now hit `DatasetController.default`.** `/datasets/{id}/preview` (and `/edit`, `/details`, `/raw`, `/report`, `/show_params`, `/visualize`, `/error`, `/datasets/{id}`, `/datasets/list`, `/datasets/copy`) all match the explicit `/datasets/{dataset_id}/{action}/{filename}` route (`buildapp.py:125`). `_resolve_map_match` then falls back to `dataset.default`, which returns "This link may not be followed from within Galaxy." The old `use_default=False` flag was what prevented this. That's the red `test_dataset_display_extra_files`, `test_window_manager` and `test_allowlist_sanitization` jobs. I think deleting `DatasetController.default` fixes it, since it's the same placeholder you removed from root. The other `default`s (`tool_runner`, `async`) are real handlers and don't collide with client paths.
> - **Tests.** The unit fixture builds its own route table, so it couldn't see that collision, and it actually asserts `/dataset/display → dataset.default`. Could the API test cover a path per top-level segment of the old list (`/datasets/<id>/preview`, `/user`, `/login/start`, `/register/start`, `/published/page`, `/libraries`, `/storage`, ...)? Or could the unit test run against the real mapper from `buildapp`, like `test_routes.py` does? Then a future explicit route that shadows a client path would fail there.
> - **No client 404 page exists yet.** The description says the Vue router shows its own 404 for unknown paths. As far as I can see, `router.js` has no global catch-all (the only `:pathMatch` is under `/storage`), so `/asdfgh` is now a 200 with an empty page. Could you add a NotFound child route under `/` here, or adjust the description?
> - **Non-GET methods.** The fallback serves HTML for POST/PUT/DELETE to any unresolvable path. Restricting it to GET/HEAD would keep a POST to a removed legacy endpoint failing loudly.
> - Small: the `environ["is_api_request"] or self.client_match is None` guard appears twice. If a `None` mapper match becomes `{}`, `_resolve_map_match` raises and one except-branch covers both cases. That would also be a natural place for the method check.

## Risks

Changing which URLs Galaxy answers is mostly reversible in code, but it loosens a contract: every unknown non-API URL becomes a 200 HTML page, and new client routes stop needing a server entry.

<details><summary>Risk Details</summary>

- Unknown and typo'd non-API URLs, and removed legacy mako endpoints, switch from 404 to 200 + SPA shell. With no client NotFound route, users see a blank page, and link checkers or monitoring see success.
- Once developers rely on "client routes need no server registration", reverting means rebuilding and maintaining the list again. Low cost, but it's a one-way habit.
- Any explicit server route whose controller has a `default` method silently shadows client paths under the same prefix. That is the `/datasets` bug today and could recur for future routes.
- Non-GET requests to unresolvable paths get 200 HTML instead of 404.
- Instance-level `GalaxyWebApplication` subclasses or plugins that relied on `add_client_route`/`clientside_routes` break (none found in-tree).

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should check the dispatch order in `handle_request`, particularly how explicit routes plus controller `default` methods interact with the fallback. Confirm that no other UI controller can swallow a client path. A test against the real `buildapp` mapper is the durable guard.

Decide whether a 200 for unknown URLs is acceptable. If it is, add the client-side 404 route before merging so users and crawlers get a meaningful page, and consider limiting the fallback to GET/HEAD.

</details>
