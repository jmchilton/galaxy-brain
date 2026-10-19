# Scope evaluation

**Recommendation: don't change scope.** Ship the branch as implemented: the merge of `ts_readme_render_fix_26.1` plus the four dev-side commits, as one PR against `dev`. It covers all three parts of John's request (merge, dead code, old READMEs) and does exactly what the 26.1 scope evaluation deferred to a dev follow-up. The changeset-aware image route that every reviewer raised should be its own follow-up PR, not added here. Open the 26.1 PR first and say in this PR's description that it depends on it. Because the 26.1 branch is merged in as real history, the two can land in either order.

## As implemented: merge + shared post-processing + old-revision lookup + dead code

`ae4e1c4a442` merges the rebased 26.1 fix. `ec2c345a5aa` gives disk and manifest READMEs one shared `size_string` → `set_image_paths` → `render_readme` step, so old revisions now get image rewriting, and deletes the dead Galaxy mode, the `tool_path` param, the stale docstring and the no-op `unicodify`. `7b45e071d4e` finds old-revision READMEs through the existing `get_ctx_file_path_from_manifest` walk-back. `9aa139b386f` and `174a43bd37a` strengthen the tests and drop unreachable error handling.

| Pros | Cons |
|---|---|
| <ul><li>Matches the request one-to-one: merge, dead code, old READMEs.</li><li>Does what the 26.1 scope eval said to put in the dev follow-up: restructure, dead code, the `unicodify` nit, and the `ctx.files()` gap.</li><li>Reuses existing helpers (`set_image_paths`, `get_ctx_file_path_from_manifest`) and adds no new abstraction.</li><li>Small: 3 files, +79/−68. `readme_util.py` shrinks from a five-level ladder to a flat loop.</li><li>Real-history merge keeps the `release_26.1` → `dev` forward merge clean (`merge-tree` shows no conflict).</li></ul> | <ul><li>Old-revision images now resolve, but to the latest on-disk files. A changed image shows the new version, and a removed one 404s. This is still better than the broken relative paths before.</li><li>The PR diff shows the 26.1 commits until 26.1 merges forward, so it looks larger to reviewers.</li><li>`render_readme` differs from the 26.1 patch by one line (the `unicodify` removal).</li></ul> |

## Contract: merge only (the old `ts_readme_render_fix_dev` shape)

Ship only `ae4e1c4a442`, which forward-ports the fix, and move the cleanup and old-revision fixes to later PRs.

| Pros | Cons |
|---|---|
| <ul><li>Smallest diff. It's just the security fix on dev.</li></ul> | <ul><li>Leaves out two of the three things John asked for.</li><li>Redundant: a normal `release_26.1` → `dev` forward merge does the same thing.</li></ul> |

## Contract: drop the old-revision lookup fix (`7b45e071d4e` + its test)

The 26.1 scope eval said to track the `ctx.files()` gap separately, with its own red test and probably its own issue.

| Pros | Cons |
|---|---|
| <ul><li>Keeps this PR to restructure plus dead code.</li><li>The fix touches `hg_util.py` (annotations only), which is shared with Galaxy.</li></ul> | <ul><li>"Fixing the old readmes" covers it directly. Old revisions that didn't touch the README showed none at all.</li><li>It already has a red-to-green test and a strengthened Old/Mid/Mid/New shape. Splitting it out would cost a second PR for about 15 lines.</li><li>The `hg_util` change is type annotations only, with no behavior change.</li></ul> |

## Contract: keep `render_readme` byte-identical to the 26.1 patch

Restore `unicodify(rst_to_html(text))`. The thermo-nuclear review applied this and the coordinator dropped it.

| Pros | Cons |
|---|---|
| <ul><li>`render_readme` would diff empty against the deployed patch.</li></ul> | <ul><li>John explicitly asked for the no-op removed.</li><li>With the real-history merge, the forward merge has no conflict on that line either way.</li></ul> |

## Expand: changeset-aware image route for old revisions

Add a changeset to the old-revision image URLs and make `/repository/static/images/...` serve the file from that changeset's manifest instead of the working tree. All three reviewers raised it as the remaining old-README gap.

| Pros | Cons |
|---|---|
| <ul><li>Finishes "old READMEs": text and images would come from the same revision.</li><li>Codex confirmed the mismatch with a reproduction.</li></ul> | <ul><li>It's a new API contract (route param or query), not cleanup. It changes `set_image_paths`, which Galaxy tool help shares, or adds a Tool Shed-only path beside it.</li><li>It needs a manifest image resolver. The current one (`get_absolute_path_to_file_in_repository`) walks the disk by basename, so a hg-side equivalent has to be designed and tested, including the path containment checks the current route does.</li><li>Roughly doubles the PR and adds route-level tests (functional or API), which makes review slower.</li></ul> |

**Verdict:** separate dev PR. Start it red-to-green with two uploads that use the same image path and different bytes, and assert the old revision's image route returns the old bytes.

<details>
<summary>Shape of the follow-up</summary>

The smallest version is an optional `changeset_revision` query param on the existing Tool Shed route. When it's set, the handler resolves the image through `get_ctx_file_path_from_manifest(basename, repo, changeset)`, the same walk-back the README lookup now uses, and returns `ctx[file].data()`. `_render_repository_readme` would only pass the changeset for old revisions. That keeps the disk path, the hot path for the latest revision, unchanged. To avoid touching Galaxy's tool-help callers, add a Tool Shed-only keyword to `set_image_paths`, or have `readme_util` append the query itself after the rewrite. Basename matching has the same weakness as the existing README lookup.

</details>

## Expand: assert rendered HTML in the functional `test_readmes` API test

`lib/tool_shed/test/functional/test_shed_repositories.py::test_readmes` checks only the dict key. Extend it to check the rendered and sanitized HTML through the real endpoint.

| Pros | Cons |
|---|---|
| <ul><li>Covers the endpoint the frontend calls (`RepositoryPage.vue` `v-html`).</li><li>Test-only.</li></ul> | <ul><li>The manager-level `readmes()` tests already cover both revision branches with real hg repos.</li><li>Functional shed tests are slow, and the gain is small.</li></ul> |

**Verdict:** optional. If anything, put it in the image-route follow-up, which needs route-level tests anyway.

## Expand: exact-path lookup or reading every revision from hg

These are thermo-nuclear items 3 and 4: replace the basename walk-back with `repo[changeset][in-repo path]`, or read the latest revision from hg too and drop the disk/manifest split.

| Pros | Cons |
|---|---|
| <ul><li>Removes basename matching, a pre-existing weakness with same-named READMEs in different dirs.</li><li>A single source would remove the disk/manifest branch.</li></ul> | <ul><li>The in-repo path would come from stripping `repo_path()` off metadata paths, and that prefix goes stale if storage moved.</li><li>Changes the hot latest-revision path.</li><li>The walk-back is the canonical helper that `tool_validator` already uses.</li></ul> |

**Verdict:** no. The thermo-nuclear review's reasoning holds.

## Expand: adjacent Galaxy-side README leftovers

`ToolShedRepository.has_readme_files` (`lib/galaxy/model/tool_shed_install/__init__.py:279`) and `Folder.readme_files` (`utility_container_manager.py:36`) have no callers in `lib/`, `templates/`, `test/` or `client/src`. They're leftovers from the Galaxy README display that 26.1 removed.

| Pros | Cons |
|---|---|
| <ul><li>Same theme as "fixes the dead code".</li><li>Two trivial deletions.</li></ul> | <ul><li>It's a different module (the Galaxy install model), not the Tool Shed README path this PR is about.</li><li>Only grep checked them. A model method could have external or plugin callers.</li></ul> |

**Verdict:** optional. Fold them in only if John reads "the dead code" broadly. Otherwise leave them for a separate tool-shed-install tidy.

## PR packaging and ordering

Recommended: open the 26.1 PR (release backport) first, then this dev PR. The dev PR's description links the 26.1 PR and says its diff includes those commits until 26.1 merges forward.

| Option | Pros | Cons |
|---|---|---|
| **26.1 PR, then dev PR (recommended)** | <ul><li>Either merge order works, since the merge is real history.</li><li>The release fix stays frozen and small.</li></ul> | <ul><li>The dev PR diff is noisy until the forward merge.</li></ul> |
| Hold the dev PR until 26.1 merges forward, then rebase the four commits onto dev without the merge | <ul><li>Clean four-commit diff.</li></ul> | <ul><li>Delays the follow-ups and needs a rebase later.</li></ul> |
| Fold the follow-ups into the 26.1 PR | <ul><li>One PR.</li></ul> | <ul><li>Breaks the freeze on the release backport and conflicts with dev's typed rewrite.</li></ul> |
