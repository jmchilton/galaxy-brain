# Implementation debrief

**STATUS: READY** (CI not yet seen). John chose both scope expansions (X1, X2) and said to keep hardening; both are in, and the third scope evaluation recommends keeping scope as is.

```
exists .../differential-review/snapshots/20261115T014228Z-revision-349c6fd7abcc.json
  revision @ 349c6fd7abcc vs origin/dev (merge-base e7a3f2254c07)
  since 20261112T190037Z-hardening-d0798eda1668:
    commits: 0 same, 23 rebased, 4 changed, 4 new, 1 dropped
    hunks:   40 carried, 16 changed, 1 new, 0 dropped
```

## What the branch does

Base `dev`, head `349c6fd7abc` (31 commits, pushed to `jmchilton`). Tool help images referenced by relative paths work the same for every tool: Markdown or RST, Tool Shed installed or loaded locally.

- `GET /api/tools/{tool_id:path}/help_image?path=&tool_version=` serves images from the tool dir, then a shed tool's repository root; paths outside `static/images/` are tried there first (the Tool Shed rule). `private, max-age=3600`, ETag/304, sandboxing CSP + `nosniff`; SVG served.
- The client rewrites relative img srcs to that endpoint (`ToolCard`, `ToolsListCard`).
- Installed shed RST help gets plain relative paths instead of `shed_tool_static/...`; the Tool Shed app and READMEs keep `set_image_paths`; the legacy route stays.
- **New (X1):** non-shed RST help has `$PATH_TO_IMAGES/` stripped from `.. image::`/`.. figure::` targets (`strip_path_to_images`), so shed-style help (97 uses in tools-iuc) renders from a checkout. `${static_path}` and leading `/` left alone (Galaxy's `/static` for non-shed tools).
- **New (X2):** the icon lookup passes the user, so logged-in users get icons of `require_login` tools (and admins get Data Manager icons). Icon caching unchanged, per John.
- Commit order: baseline tests → icon fixes (now including X2, `5879cabce8a`) → refactors → feature ([baseline_refactor.md](baseline_refactor.md)). Splitting the icon fixes into their own PR needs the two refactor commits under them.

## This revision

- X1/X2 implemented red-first; [normal review 3](subagents/normal_review_3.md) found no bugs; nits applied.
- [Test challenge](test_challenges_debrief.md): folded the imageless-shed install-DB fix into the commit that introduced the regression (dropping its own commit), moved its test into the baseline commit, renamed the fixture to `help_images_require_login.xml`, added `test_tool_help_image_require_login`, and ran red checks for every new test.
- [E2E polish](polish_e2e_tests_debrief.md): **both Selenium tests now run and pass on Playwright and Selenium (Chrome)**; they take screenshots; the test SVG was made visible.
- [Baseline refactor](baseline_refactor.md): moved X2 into the icon-fix group; final tree unchanged. Old head kept as `tool_help_relative_images_r3_backup` on `jmchilton`.
- [Scope evaluation](scope_evaluation.md): keep.
- [Screenshots](screenshot_debrief.md): 4 images in the Markdown help, 3 in the RST help.
- Branch check: `make format` clean. mypy on the touched modules matches `dev` except one more missing return annotation (`get_help_image`, same as its sibling `get_icon`) and one fewer in `shed_tool_static.py`.
- Rebased onto current `origin/dev` along the way (only GitHub workflow pins upstream).
- Not rerun for this ~10-line delta: performance, Codex, thermo-nuclear. Their round-2 debriefs still apply.

## Validation

API tests pass: help_image, icon and `/build` (11). Unit tests pass (114); vitest Tool + ToolsList pass (211). Both E2E tests pass on both backends. The `test/unit/tool_shed` failures come from `hg` not being installed and happen on `dev` too. **CI not yet seen.**

## Follow-ups (not in scope)

From the [scope evaluation](scope_evaluation.md):
- Legacy `${static_path}/images/X` targets (look up `static/images/images/X`; broken on dev too) and `/static/...` targets: 11 uses in 7 tools-iuc tools. Fix with a lookup fallback or with tools-iuc PRs.
- A `planemo lint` check for help images.
- Documenting the convention once standards#95 merges ("until Galaxy 27.0").
- The legacy `shed_tool_static` route's headers or removal.

Carried from earlier rounds: `../` paths; a short `max-age` on 404s; md5 vs mtime ETag; the `help_images.py` rename; RST substitution images.
