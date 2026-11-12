# Implementation debrief

**STATUS: BLOCKED** for a scope decision from John. The second scope evaluation recommends a modest expansion; per the workhorse process the branch parks rather than re-scoping twice.

```
created .../differential-review/snapshots/20261112T190037Z-hardening-d0798eda1668.json
  hardening @ d0798eda1668 vs origin/dev (merge-base 9489852b1f64)
  since 20261112T174610Z-implementation-4f474306ab05:
    commits: 4 same, 9 rebased, 5 changed, 10 new, 0 dropped
```

## What the branch does

Base `dev`, head `d0798eda166` (28 commits, pushed to `jmchilton`). Tool help images referenced by relative paths work the same for every tool: Markdown or RST, Tool Shed installed or loaded locally.

- `GET /api/tools/{tool_id:path}/help_image?path=&tool_version=` serves images from the tool dir, then a shed tool's repository root. Any path outside `static/images/` is looked up there first (the Tool Shed rule). Responses are `private, max-age=3600`, with ETag/304 and `Content-Security-Policy: ... sandbox` + `nosniff`. SVG is served.
- The client (`formattedToolHelp.js`) rewrites relative img srcs to that endpoint for `ToolCard` and `ToolsListCard`.
- Installed shed tools' RST help gets plain relative paths (`make_image_paths_relative`) instead of `shed_tool_static/...` routes. The Tool Shed app and READMEs keep `set_image_paths`; the `shed_tool_static` route stays.
- Icon endpoint fixes come first as separate commits: ETag revalidation, symlinked tool dirs, 404 for icons outside the tool dir. The shared `cached_file_response` helper and `find_tool_file`/`find_tool_asset` lookups are reused by both routes.
- Commit order: baseline tests → icon fixes → refactors → feature ([baseline_refactor.md](baseline_refactor.md)).

## Decision needed ([scope_evaluation.md](scope_evaluation.md))

- **X1 (matters for the ask):** strip `$PATH_TO_IMAGES/` from `.. image::`/`.. figure::` targets in RST help of non-shed tools too. That's ~5 server lines plus a fixture line and a red-first `/build` API test. tools-iuc has 97 such uses in 71 files; they display when installed from the Shed but not from a checkout (`planemo serve`, git-loaded servers). `${static_path}` and a leading `/` stay untouched for non-shed tools (Galaxy's `/static`).
- **X2 (can be a follow-up):** `get_tool_icon_path` should pass `user=trans.user` to `_get_tool`. Logged-in users currently get 401 for icons of `require_login`/data manager tools (latent: no shipped tool combines an icon and a login requirement). Pair it with an icon `Cache-Control` change (discussed with John).
- Alternatives: ship as-is, or ship the alt `tool_help_relative_images_alt_original_scope` (`572770e4706`, refuses SVG, shed RST unchanged).

## Choices made along the way

- Client-side rewrite (Markdown renders client-side), plain relative paths, query params for path/version.
- Re-scope (round 1 evaluation): unified shed RST onto `help_image` and served SVG under CSP so shed tools showing SVG don't regress. Details in [implementation_rescope_debrief.md](implementation_rescope_debrief.md).
- Tool dir is searched before the repo root (matches GitHub rendering). That only matters if the same image exists at both levels.
- Round 2 test challenge removed the client's `shed_tool_static/` skip, reversing review 2's "leave it": the server no longer emits that prefix.

## Validation

- Still apply: [normal review 1](subagents/normal_review_1.md), [normal review 2](subagents/normal_review_2.md), round 2 [test challenges](test_challenges_debrief.md), [performance](performance_challenges_debrief.md), [Codex](codex_review.md), [thermo-nuclear](thermo_nuclear_review.md), [baseline refactor](baseline_refactor.md). Round 1 drafts are in [earlier_drafts/1/](earlier_drafts/1/).
- Pass locally: unit (113), API help_image/icon/build (7), client vitest Tool + ToolsList (211), `vue-tsc`, black/ruff/isort/prettier/eslint, `make format` (no changes), mypy (no errors in changed files).
- **Remaining:** the two Selenium tests in `test_tool_form.py` (help images load, including the SVG under CSP) have **never been run**, and screenshots weren't taken: hardening stopped at the scope evaluation. Run both after the scope decision, along with CI.
- X1 or X2 would need a normal review and an abbreviated re-harden (test challenge, scope check) on the new commits.

## Follow-ups (not in scope)

`../` paths bounded by the repo root; a short `max-age` on help image 404s; md5 vs mtime+size ETag; whether help images should stay `immutable`-free for 1 hour; the eventual fate of the legacy `shed_tool_static` route; whether `help_images.py` should be renamed now that it also holds the icon lookup.
