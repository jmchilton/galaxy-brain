# toolshed_repository_contents — scope evaluation

**Recommendation: keep the scope as implemented. Ship one PR with the bounded files API, the contents browser, and the 4-line core `allow_cors` preflight fix.** Don't split out the core fix: the new routes are its only consumer and its only test. Don't split frontend from backend either, because the backend alone doesn't change what anonymous users see, and that is what #22598 asks for. The one optional trim is the install-count icon swap (`c313aa047c0`), a 2-line change unrelated to the issue. Keep the reviewer follow-ups as separate work: `tool_source` reuse, the `readme_util` old-revision bug, an anonymous Changelog, `private`, non-UTF-8 names, CORS `ETag`, the 12-prop browser, the manager module, and `PaginatedRepositoriesGrid`. In the PR description, say that the core fix commit (`aea2dd7a745`) can be split out if a core reviewer asks.

Context: issue #22598 ("Toolshed does not allow viewing of repo tip/contents") was caused by nginx gating hgweb `/repos/` views behind login. natefoo suggested that "the stuff we want to actually make visible anonymously could just gain routes through the TS application", and the branch does exactly that. The branch diff is +2708/−99 over 44 files:
- backend implementation: ~330 lines;
- shed frontend: ~1.75k lines, of which ~180 are a generated schema and ~600 are vitest;
- Python tests: ~630 lines.

It merges cleanly with current `origin/dev`.

## Scope: as implemented

There are two anonymous, bounded, cacheable api2 routes, `revisions/{rev}/files` and `.../files/{path}`. They serve only exact stored hashes of downloadable revisions, and file contents come back in a JSON envelope. On the frontend, a `/repositories/:id/contents` page has a tree, a viewer and a revision select. Explore → Contents now links to that page, and Changelog is shown only when logged in. The branch also includes:
- a prop-driven `RepositoryContentsBrowser` with showcase entries;
- a `useLatestLoad` composable;
- the core `allow_cors` preflight fix;
- the `RepositoryPage` immediate-watcher fix;
- the icon swap.

| Pros | Cons |
|---|---|
| <ul><li>Fully closes the user-visible problem in #22598, Contents for anon users, without reopening hgweb's unbounded URL space</li><li>Implements the maintainer-suggested direction (natefoo)</li><li>Each piece is used in the branch. No speculative abstractions.</li><li>Reviews have already trimmed the tests and helpers (thermo-nuclear net −7 lines)</li></ul> | <ul><li>A ~2.7k-line PR, though most of it is tests, the generated schema and showcase examples</li><li>Touches core Galaxy `FrameworkRouter`, so it needs a core reviewer's eye</li><li>Anonymous Changelog is still unavailable (martenson noted both links are disabled)</li><li>Literal `tip` is not served. The UI uses the newest browsable revision.</li></ul> |

<details>
<summary>Detail</summary>

- **Bounded URL space is the scope boundary.** mvdbeek's point was that rate limiting doesn't help against large bot networks. The design answers it by bounding the URL space to the exact metadata revisions, adding 24h public caching with an ETag, and never cloning. Anything that relaxes that boundary would reopen the original problem: serving `tip`, branch names, or raw file bytes. So these are correctly out of scope.
- **The title says "tip".** The UI shows the newest downloadable revision by default, which is what users mean in practice. A repo whose tip has no metadata row shows its newest *browsable* revision instead. That's consistent with what Galaxy can actually install.
- **Ride-alongs, all small:**
  - The `RepositoryPage` `immediate` watchers (`e52392b4c12`) fix a regression the branch would otherwise introduce when navigating back from Contents. They also close a READMEs-on-mount gap already on dev. They're needed.
  - The install-info `CacheableResult` fold (`893e9e8669a`) reshapes an existing endpoint's caching helper. It's needed to avoid having two parallel 304 paths. The ETags are byte-identical.
  - `metadata_util.get_metadata_by_changeset` gains type hints only.
  - The icon swap (`faDownload` → `faChartLine`) is the only unrelated change. It's harmless, and the plan inherited it from #23925 review chatter.

</details>

## Scope: split out the core `allow_cors` preflight fix

The 4-line strip of `response_model` from preflight routes in `lib/galaxy/webapps/galaxy/api/__init__.py` would go up as its own PR, and this branch would stack on it.

| Pros | Cons |
|---|---|
| <ul><li>Core framework change gets core-focused review in isolation</li><li>Backportable independently if ever needed</li><li>Shed PR then touches only `lib/tool_shed*`</li></ul> | <ul><li>No existing `allow_cors` route sets `response_model`, so the standalone PR fixes a bug nothing on dev hits</li><li>Its only test (`test_shed_cors.py::test_repository_files_allow_cross_origin_reads`) needs the new routes, so a split PR would need a synthetic test route or ship untested</li><li>Stacking adds sequencing overhead for a 4-line change</li></ul> |

<details>
<summary>Detail</summary>

The implementation debrief and tracking history both flagged this as "splittable", and the thermo-nuclear review judged it "a minimal, general fix with no special-casing". The fix is already its own commit (`aea2dd7a745`) at the base of the branch, so splitting later costs a cherry-pick. Recommendation: keep it in, and call it out in the PR description as a separable first commit.

</details>

## Scope: split backend API and frontend into separate PRs

PR 1 would carry the files API, models, populators, functional, unit and CORS tests, and the core fix. PR 2 would carry the schema regeneration, the contents page, tree, viewer and browser, the Explore link changes, the showcase entries and the Playwright tests.

| Pros | Cons |
|---|---|
| <ul><li>Each PR is about half the size, and backend security properties (bounding, the JSON envelope, caching) get focused review</li><li>The API is independently useful to cross-origin consumers (`allow_cors`)</li></ul> | <ul><li>PR 1 alone doesn't fix #22598. Users still hit the login-gated hgweb link.</li><li>The frontend PR can't be built or tested without the API and the regenerated schema, so it's a forced stack</li><li>The Playwright anon tests, the strongest end-to-end evidence, can only land with PR 2</li><li>The tool shed frontend has a small reviewer pool, so the split buys little reviewer parallelism</li></ul> |

<details>
<summary>Detail</summary>

This is a reasonable fallback if a reviewer balks at the PR size. The commit history is already ordered backend-first (`bc4f0b12198`…`2fbb906dc9a`, then frontend), so a split is mechanical. It isn't recommended by default because the feature is one user story and half of it ships nothing visible.

</details>

## Scope: split out the `ComponentsShowcase` / `RepositoryContentsBrowser` extraction

The page would keep its inline layout with no prop-driven browser. The ~180 lines of showcase examples, and the extraction itself, would go in a follow-up.

| Pros | Cons |
|---|---|
| <ul><li>Removes ~350 frontend lines from this PR</li></ul> | <ul><li>The shed frontend `CLAUDE.md` convention is that components get showcase entries. Skipping them is a convention violation, not a trim.</li><li>The showcase is the only place the binary, truncated, symlink and empty viewer states are rendered and screenshotted, because E2E can't reach them</li><li>The follow-up would re-touch the same files</li></ul> |

<details>
<summary>Detail</summary>

Not recommended. The thermo-nuclear review's deferred "12 flat props" item is about *how* the browser takes its inputs, not whether it should exist. Passing `LatestLoad` objects through would turn 6 props into 2, and it can be done later without changing scope.

</details>

## Scope: contract by dropping the unrelated ride-along

Same as as-implemented, minus `c313aa047c0` (the install-count icon `faDownload` → `faChartLine`).

| Pros | Cons |
|---|---|
| <ul><li>Keeps the PR strictly on the issue</li><li>Removes the only change a reviewer could call unrelated</li></ul> | <ul><li>Trivial gain: 2 lines</li><li>The download glyph next to an install count reads as an action, which is mildly misleading UI that would otherwise need its own PR</li></ul> |

<details>
<summary>Detail</summary>

This is optional, at John's discretion. Either way is fine. If the change is kept, mention it in one line of the PR description.

</details>

## Scope: expand with the anonymous Changelog

Rebuild a Changelog view for anonymous users from the metadata revisions, using the same bounded set. That would restore both of the links martenson noted as disabled.

| Pros | Cons |
|---|---|
| <ul><li>Fully restores the anonymous Explore menu</li><li>Can reuse the bounded revision set and the caching path</li></ul> | <ul><li>Undesigned: commit messages, authors and dates per metadata revision need a new model and route</li><li>The issue's headline is contents and tip. Changelog is a secondary mention.</li><li>Grows an already-large PR</li></ul> |

<details>
<summary>Detail</summary>

The implementation debrief's open question is "rebuild from metadata revisions, or drop?". That's a product decision, so it's better as a follow-up issue or PR than folded in here. The current behaviour hides Changelog for anonymous users instead of showing a link that dead-ends at a login gate, which is an honest interim.

</details>

## Scope: expand with the backend follow-ups (`tool_source`, `readme_util`, View XML)

These would reuse the new manifest helpers:
- `managers/tools.py:_shed_tool_source_for` would materialize from `ctx.manifest()` instead of cloning per request. It currently 500s on main for clipkit.
- The `readme_util` old-revision branch would stop using `ctx.files()` with basename matching.
- `RepositoryTool` would get a "View XML" link.

| Pros | Cons |
|---|---|
| <ul><li>The new helpers have obvious second consumers, which validates the abstraction</li><li>`tool_source` is a live production 500 and a per-request clone cost</li></ul> | <ul><li>Each is a separate bug with its own test surface, and none is needed for #22598</li><li>`readme_util` changed on dev since the merge base (`9fb44fbd39c`, Mako removal and sanitizing), so it's best re-scoped against current dev</li><li>View XML needs a server-side relative `tool_config` path, which is new API surface</li></ul> |

<details>
<summary>Detail</summary>

Recommendation: do these as follow-ups, ideally right after this lands. `tool_source` first, because it's a real 500 and the cleanest second consumer of `repository_files`. Per John's "build the reusable abstraction" preference, the helpers already live in `tool_shed/util/repository_files.py` and `hg_util`, where those follow-ups can import them, so nothing in this PR needs to change to enable them.

</details>

## Scope: expand with the cross-cutting policy items (`private`, CORS `ETag`, non-UTF-8 names)

These would:
- enforce `Repository.private` in the new routes;
- widen Galaxy's shared CORS policy to expose `ETag` and allow `If-None-Match`;
- add a reversible path encoding so that non-UTF-8 filenames can be fetched.

| Pros | Cons |
|---|---|
| <ul><li>Closes the known edge-case gaps in the new API</li></ul> | <ul><li>`private` isn't enforced anywhere in the shed and nothing sets it, so per-route enforcement here would be inconsistent. It needs a shed-wide decision.</li><li>Changing the CORS policy changes core Galaxy behaviour for every `allow_cors` route. Browser HTTP-cache revalidation already works cross-origin.</li><li>Non-UTF-8 filenames are rare in shed repos, and a path encoding scheme is an API-contract design question</li></ul> |

<details>
<summary>Detail</summary>

All three were consciously deferred by the implementer, Codex and the thermo-nuclear reviewer, and each is either shed-wide or Galaxy-wide policy. None should block this PR. `private` is worth a tracking note. A grep of `lib/tool_shed` shows only the model default and one raw SQL filter, so the column is effectively dormant.

</details>

## Scope: expand with the deferred thermo-nuclear refactors

These would:
- have `RepositoryContentsBrowser` take `LatestLoad` objects, cutting 12 props to 8;
- move the revision-files functions plus `CacheableResult` out of `managers/repositories.py` (1.28k lines) into their own module;
- port `PaginatedRepositoriesGrid.vue` to `useLatestLoad`.

| Pros | Cons |
|---|---|
| <ul><li>Cleaner component API</li><li>A natural standalone manager module</li><li>A second `useLatestLoad` consumer validates the composable</li></ul> | <ul><li>The browser change ripples into ~9 showcase examples and the showcase Playwright test for a modest gain</li><li>The module split widens the diff into pre-existing code</li><li>`PaginatedRepositoriesGrid` predates this branch</li></ul> |

<details>
<summary>Detail</summary>

The `PaginatedRepositoriesGrid` port is the cheapest and most defensible of the three: it's a small follow-up PR that gives the new composable a second consumer. The module split only makes sense if someone is already splitting `managers/repositories.py`. The browser-props change is fine to do whenever the showcase is next touched.

</details>

## Follow-up queue (not in this PR)

1. `tool_source`: reuse the manifest helpers, which fixes the clipkit 500 and the per-request clone.
2. `readme_util` old-revision `ctx.files()`/basename bug, re-scoped against current dev.
3. Anonymous Changelog decision: rebuild from metadata, or drop.
4. "View XML" link from `RepositoryTool`, which needs a server-side relative path.
5. `PaginatedRepositoriesGrid` → `useLatestLoad`.
6. `RepositoryContentsBrowser` → `LatestLoad` props.
7. Shed-wide `private` enforcement decision.
8. Non-UTF-8 path encoding, and the CORS `ETag`/`If-None-Match` policy. Both are low priority and policy-level.
9. `repository.store.ts` newest-revision `[0]` vs. last-key inconsistency. It's pre-existing.
10. The stray `"e": "^0.2.2"` dependency in the shed frontend `package.json`. It's unrelated.
