Follow-up to 🔀 #18722 - Markdown tool help, and RST help of tools not installed from the Tool Shed, can show images shipped with the tool.

| Help image reference | `dev` | This PR |
| --- | --- | --- |
| Markdown help, any tool: `![Plot](static/images/plot.png)` | ❌ broken image | ✅ shown |
| RST help, tool loaded from a checkout: `.. image:: static/images/plot.png` | ❌ broken image | ✅ shown |
| RST help, tool loaded from a checkout: `.. image:: $PATH_TO_IMAGES/plot.png` | ❌ broken image | ✅ shown |
| RST help, installed Tool Shed tool | ✅ via `shed_tool_static` | ✅ via the same endpoint as every other tool |
| RST `.. figure::` target, installed Tool Shed tool | ❌ broken image | ✅ shown |
| SVG help image of an installed Tool Shed tool | ⚠️ served with no CSP | ✅ served under a sandboxing CSP |

![Markdown tool help showing four images shipped with the tool: relative to the tool, a bare name found in static/images, beside the tool, and an SVG](screenshots/selenium_tool_form_help_markdown_relative_images.png)

#18722 added `<help format="markdown">`, but Galaxy only ever rewrote image paths for RST help of installed Tool Shed tools. galaxy-iuc/standards#95 now makes Markdown the preferred help format and has to tell tool authors that ***"a tool that ships images in `static/images/` should stay on RST until that's fixed."*** Tool developers also see none of their help images when they load a tool from a checkout, even in RST.

***A tool author writes one plain relative path, which also renders on GitHub and in editors, and it works in either help format for every tool, shed-installed or local.*** The client points relative `img` srcs at a new `GET /api/tools/{tool_id}/help_image?path=&tool_version=`, which serves the file from the tool's directory with the Tool Shed's existing lookup rules. ***`path` reaches only image files inside the tool's own directory, or its installed shed repository; anything else is a 404.***

***Existing Tool Shed tools need no changes and render the same images in Galaxy, plus `.. figure::` targets that were broken before.*** Their RST help, including the legacy `$PATH_TO_IMAGES/` prefix, moves from `shed_tool_static` onto `help_image`, so there's one mechanism instead of two. The `shed_tool_static` route stays for existing links, and the Tool Shed app's own rendering is untouched.

***SVG gets stricter, not looser:*** tool help used to link shed tools' SVG images through `shed_tool_static`, which serves them with no CSP. Help now links to `help_image`, which serves every image with `Content-Security-Policy: ... sandbox` and `nosniff`, so an SVG opened directly can't run script. The legacy route itself is left as is.

***Images in Markdown help, or in help of local tools, show only on Galaxy 27.0 and later.*** The XSD help docs say so, so tool authors targeting older servers know to keep shed-style RST.

<details><summary>Tool icon fixes that come first</summary>

The new endpoint shares its file lookup and conditional-GET response with the tool icon endpoint, so the icon route is moved onto those helpers first. That turned up three `dev` bugs, each fixed in its own commit with a test:

- `If-None-Match` never produced a 304: the quoted ETag was compared to the client's unquoted value (`1bfb47160cb`).
- Symlinked tool dirs failed to resolve, and an icon outside the tool dir was a 500 instead of a 404 (`532dc070873`).
- Logged-in users got a 401 for icons of `require_login` tools, and admins for Data Manager tool icons, because the lookup didn't pass the user (`5879cabce8a`).

They can be split into their own PR if preferred; see the split points under Risk Review Advice.

</details>

<details><summary>How it works</summary>

- **Lookup** (`lib/galaxy/tools/help_images.py`): `find_tool_file` resolves a path under a base dir, symlinks included, and rejects anything outside it. `find_tool_asset` tries `static/images/<path>` first for a path outside `static/images/`, then the path itself (the rule `shed_tool_static` already used). `help_image` searches the tool's directory, then an installed shed tool's repository root. Only `image/*` media types are served.
- **Endpoint** (`api/tools.py`, `services/tools.py`): `GET /api/tools/{tool_id:path}/help_image` loads the tool with the user's access check (anonymous users of `require_login` tools get 401), then serves the file through `cached_file_response`, now shared with the icon route in `webapps.base.api`: `private, max-age=3600`, ETag, `Last-Modified` and 304s.
- **Client** (`composables/formattedToolHelp.js`): `useFormattedToolHelp` takes an optional tool. With one, it rewrites any src that has no scheme and doesn't start with `/`, `#` or `?` to the endpoint. `ToolHelpMarkdown`, `ToolHelpRst`, `ToolCard` and `ToolsListCard` pass the tool through, so both the tool form and the tools list show the images.
- **Server-side RST** (`Tool.__get_help_with_images`): installed shed tools get plain relative paths from `make_image_paths_relative` instead of `shed_tool_static` URLs. Local tools have `$PATH_TO_IMAGES/` stripped from `.. image::` and `.. figure::` targets. The install-DB lookup runs only when the help has a local image directive, as on `dev`. The Tool Shed app (`repository_id`) keeps `set_image_paths`.

</details>

## Risks

This adds a public API route and sets the convention tool authors will write help images against, so both are hard to take back once tools depend on them.

<details><summary>Risk Details</summary>

- New public route `GET /api/tools/{tool_id}/help_image` with `path` and `tool_version` query params.
- Tool authors will rely on the lookup order: the tool dir, `static/images/` first for paths outside it, then a shed tool's repository root. It matches what shed RST help already relied on.
- Installed shed tools' RST help now searches the tool dir before the repository root (the old route searched only the repository root). That only matters if the same image exists at both levels. In tools-iuc, tools-devteam and bgruening/galaxytools, one help image target sits in a tool dir below its repository root, and it exists at only one level.
- SVG help images are served, under `sandbox` CSP and `nosniff`. Refusing SVG instead would regress shed tools that show SVG today.
- Help images are cached `private, max-age=3600`, so a changed image can take up to an hour to show in a browser that already has it.
- `/api/tools/{id}/build` help of installed shed tools now carries tool-relative srcs instead of `shed_tool_static/...` paths that resolved against Galaxy's root. Only Galaxy's client points them at `help_image`; other consumers rendering that HTML must do the same.
- Legacy `${static_path}/images/X` and `/static/...` targets stay broken, as on `dev`. The tools-iuc tools still using them are being fixed in the tools (galaxyproject/tools-iuc#9030 to #9033).

</details>

<details><summary>Risk Review Advice</summary>

The parts worth a human's attention are the route's shape (`{tool_id:path}/help_image` with query params, mirroring `/icon`) and `find_tool_file`'s containment check, which is what stops `path` from escaping the tool's directory. The CSP string in `HELP_IMAGE_HEADERS` is the other security-relevant line.

The history is ordered to split cleanly: baseline tests (`a585a1a6563`), then the icon fixes and the refactors under them (`1bfb47160cb` .. `5879cabce8a`), then the endpoint and client (`f7436e73ddd` .. `af11f4f5af4`), then the Tool Shed unification, SVG and `$PATH_TO_IMAGES/` (`6f2e2b82c2d` .. `d355bf5a070`).

</details>

## Context

Builds on 🔀 #18722, which added Markdown tool help. Motivated by galaxy-iuc/standards#95, which marks help images as RST-only "until that's fixed". Alternative kept on 🌿[`tool_help_relative_images_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/tool_help_relative_images_alt_original_scope) - adds the endpoint for Markdown help and local tools only, refusing SVG and leaving Tool Shed RST on `shed_tool_static`. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented, after one re-scope and two expansions.</summary>

The first evaluation found Tool Shed RST still on its own image route, so the branch was re-scoped to put every tool on `help_image`, and later gained the `$PATH_TO_IMAGES/` strip for local tools and the icon user fix. Resolving all 97 `$PATH_TO_IMAGES` and 34 plain relative image targets in tools-iuc the way the branch does, 96 and 33 resolve from the tool dir alone; the misses don't exist anywhere. None depend on the shed-only repository-root fallback. Follow-ups: legacy `${static_path}` targets, a `planemo lint` check, the legacy route's future.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/tool_help_relative_images/scope_evaluation/). Run via Opus at low effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Baseline tests first, then icon fixes and the refactors they need, then the feature.</summary>

The conditional-GET helper and the tool file lookup are extracted ahead of the feature, and the icon user fix was moved up into the icon group so it can ship separately. The final tree was unchanged by the reorder; each rewritten commit was checked for its tests and lint.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/tool_help_relative_images/baseline_refactor/). Run via claude-opus-5-5 at default effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Three rounds; each new test checked red without its change.</summary>

The imageless shed tool install-DB test moved into the baseline commit, since it passes on `dev`. A test was added pinning that `help_image` serves `require_login` tools to logged-in users and 401s for anonymous ones. The `$PATH_TO_IMAGES/` unit and API tests were kept separate, since the unit test covers prose mentions and `${static_path}` targets the API fixture can't.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/tool_help_relative_images/test_challenges_debrief/). Run via Opus at low effort.

</details>

### ✅ [N.O.T. M.A.R.I.U.S. Performance Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_PERFORMANCE.md)

<details><summary>One regression fixed: an install-DB query per imageless shed tool parse.</summary>

The re-scope made every shed tool with RST help touch `tool_shed_repository`, which queries the install database after startup. A text check now comes first, as on `dev`, with a query-count test. Shed help images are now cacheable (ETag, 304s, `max-age`), where `shed_tool_static` sent none. Run on the round-2 branch; the later `$PATH_TO_IMAGES/` strip adds one substring check.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/tool_help_relative_images/performance_challenges_debrief/). Run via claude-opus-5-5 at default effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Two findings, both acted on: <code>If-None-Match: *</code> and the lookup docs.</summary>

`If-None-Match: *` now gets a 304 for an existing file, with a test that was red first. Nested relative paths are tried under `static/images/` first, as the Tool Shed always did; the docs now say "a path outside `static/images/`" rather than "a bare file name". Run on the round-2 branch.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/tool_help_relative_images/codex_review/). Run via gpt-6-sol at medium effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regression; header handling and the directive check consolidated.</summary>

`cached_file_response` takes the full header mapping, so CSP and `nosniff` are no longer patched onto the response afterwards. The shed rewrite gate reuses `shed_util_common`'s own directive regex. Declined: renaming `help_images.py`, unifying two near-duplicate regexes (would change Tool Shed rendering), a shared client URL builder. Run on the round-2 branch.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/tool_help_relative_images/thermo_nuclear_review/). Run via claude-opus-5-5 at default effort.

</details>

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All 6 general items pass.</summary>

- [x] What does the user see when it fails? A broken image with its alt text: `help_image` 404s on a missing image, unknown tool, non-image file or path outside the tool dir, 401s for anonymous users of `require_login` tools.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. `test_help_images.py` uses real files and symlinks; vitest checks rendered `img` srcs; the shed tests check RST output and that no install DB queries run.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `a585a1a6563` is first and only adds tests and fixtures; tests that fail on `dev` come in later commits.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? They explain legacy compatibility: the `$PATH_TO_IMAGES` note and the XSD line that releases before 27.0 only support Tool Shed RST.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/tool_help_relative_images/pr_checklist/). Run via Claude Opus 5.5 (claude-opus-5-5) at medium effort.

</details>

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- Unit: `test/unit/app/tools/test_help_images.py` (lookup, symlinks, containment), `test_cached_tool.py` (shed RST rewrite, no install-DB query for imageless help), `test/unit/tool_shed/test_shed_util_common.py`.
- API (`lib/galaxy_test/api/test_tools.py`): `help_image` content, media types, 404s, caching headers, 304s and CSP; `require_login` tools; RST `/build` output; the icon fixes.
- Client: `ToolHelpMarkdown.test.ts`, `ToolHelpRst.test.js`, `ToolsListCard.test.ts`.
- E2E (`lib/galaxy_test/selenium/test_tool_form.py`): Markdown and RST help images load on the tool form; pass on Selenium and Playwright.
- Test tools: `test/functional/tools/help_images/`.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
