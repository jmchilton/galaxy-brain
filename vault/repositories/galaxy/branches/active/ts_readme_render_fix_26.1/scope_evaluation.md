# Scope evaluation

**Recommendation: don't change scope.** Ship the branch as implemented: commit 1, byte-identical to the deployed patch, plus the three test-only commits, against `release_26.1` only. Put every implementation follow-up the reviewers raised into one separate PR against `dev` after 26.1 merges forward. Retire both sibling branches. The dev sibling is redundant once 26.1 merges forward, and opening it as well would cause add/add conflicts. The 25.0 sibling targets a release outside Galaxy's 12-month support window (v25.0.0 shipped 2025-06-18). One open question is John's call, not a recommendation: whether to also cover 25.1 and 26.0, the other releases still inside the support window (see "Base on release_25.1").

## As implemented: release_26.1, frozen fix and test strengthening

Four commits. `3c56ef0d1b1` adds `render_readme()`, which renders `.rst` without template evaluation, substitutes the placeholders literally and sanitizes the output. Old-revision READMEs now go through it too. Three test-only commits follow: placeholder and formatting tests, a manager-level `readmes()` test covering both the latest-revision and old-revision branches, and a helper cleanup.

| Pros | Cons |
|---|---|
| <ul><li>Matches the request exactly. Commit 1 is byte-identical to the deployed patch.</li><li>The test commits fix the weak red from the first commit. The old-revision (manifest) branch is now covered, and the red check fails for the right reason.</li><li>Small (2 files, +119/−17) and easy to review on a release branch.</li><li>Uses existing fixtures and adds no committed test data.</li></ul> | <ul><li>Old-revision READMEs still skip `set_image_paths`, so relative images break on old revisions. This is not a regression, since those READMEs were raw text before.</li><li>The 26.1→dev forward merge conflicts in `readme_util.py` (one hunk, details below).</li><li>The test file no longer matches the siblings, so stacking a sibling on top gives an add/add conflict.</li></ul> |

<details>
<summary>Forward merge into dev</summary>

`git merge-tree origin/dev ts_readme_render_fix_26.1` conflicts only in `lib/tool_shed/util/readme_util.py`. Merging plain `release_26.1` into dev has the same four conflicts as before; none of them come from this branch. The single hunk is dev's typed `build_readme_files_dict(...) -> dict[str, str]` signature (`0acfab53bb9`, which also put `readme_util` on dev's mypy green-list) next to the new `render_readme`. The fix is to keep both: put `render_readme` above the typed signature. `render_readme` is already fully annotated, so it shouldn't trip the green-list. The merger also has to keep `render_readme(...)` on the manifest branch, inside dev's rewritten `if fctx is not None and fctx != "DELETED":` guard. Git auto-merges that line, but check it after resolving. Worth a sentence in the PR description.

</details>

## Contract: commit 1 only

Drop the three test-only commits so the branch matches the deployed patch and both siblings exactly.

| Pros | Cons |
|---|---|
| <ul><li>Identical to the siblings, so there's no add/add conflict if more than one ever lands.</li><li>The smallest possible diff for release managers.</li></ul> | <ul><li>Brings the weak red back. Commit 1's tests fail only at import, and nothing exercises `build_readme_files_dict` or the old-revision branch.</li><li>Throws away coverage that changes no implementation. The frozen file is untouched either way.</li><li>The add/add argument goes away once the siblings are retired.</li></ul> |

## Base on release_25.1 (oldest supported release) and merge forward

Retarget the branch to `release_25.1`, the oldest release inside the 12-month window (v25.1.0, 2025-12-12), and let the fix merge forward through 26.0 and 26.1 to dev. This follows Galaxy's usual convention of fixing the oldest supported branch first.

| Pros | Cons |
|---|---|
| <ul><li>Covers every supported release, not just the newest.</li><li>25.0, 25.1 and 26.0 share one `readme_util.py` blob, so the 25.0 sibling's commit applies to 25.1 and merges into 26.0 cleanly.</li><li>A single merge-forward chain, with no per-branch PRs.</li></ul> | <ul><li>Not what John asked for. Only 26.1 was requested.</li><li>The commit can't be byte-identical to the deployed 26.1 patch: 26.1's `readme_util.py` differs (`6ac47fec4d6` removed `get_readme_files_dict_for_display` and its imports).</li><li>The 26.0→26.1 merge conflicts in `readme_util.py`, and then again into dev, so release managers resolve two conflicts instead of one.</li><li>The test commits would need rebasing onto 25.x fixtures (unverified).</li></ul> |

<details>
<summary>Why this is listed, not recommended</summary>

The deployed patch is the 26.1 one, and the request was explicit, so the default stays 26.1. Whether 25.1 and 26.0 also need the fix is a release-policy decision for John. If he wants it, the cleanest route is the 25.0 sibling's commit cherry-picked onto `release_25.1` as its own PR, with this 26.1 branch kept as is. When the 25.1 fix merges forward into 26.1, the hand resolution keeps the 26.1 side of `readme_util.py`, and `test_readme_util.py` conflicts add/add. 25.0 itself is outside the window, so the 25.0 sibling shouldn't become a PR.

</details>

## Expand: shared post-processing and image paths for old revisions

The reviewers' main follow-up (codex, thermo-nuclear and test debrief). `build_readme_files_dict` would only produce the text, from disk or from the manifest. One shared step would then run `size_string`, then `set_image_paths`, then `render_readme`. That removes the duplicated calls and fixes the old-revision image gap by construction.

| Pros | Cons |
|---|---|
| <ul><li>Fixes a real (non-regression) display bug that codex confirmed with certainty.</li><li>Removes the two-branch asymmetry, so the next fix can't land on one branch only.</li><li>Reuses the existing `set_image_paths` abstraction.</li></ul> | <ul><li>Breaks the frozen-implementation constraint, which is the whole premise of this branch.</li><li>On 26.1 it would also conflict with dev's typed rewrite of the same function.</li></ul> |

**Verdict:** a follow-up PR against `dev`, written against the typed version after 26.1 merges forward. Start it red-to-green with an old-revision `.. image::` case in the existing `readmes()` manager test.

## Expand: dead-code and pre-existing cleanups

Covers the remaining items the reviewers raised:
- The `app.name == "galaxy"` branch, the `tool_path` parameter and the "used by both Galaxy and the Tool Shed" docstring.
- The no-op `unicodify(rst_to_html(...))`.
- `UtilityContainerManager.build_readme_files_folder`, which has no callers on 26.1.
- The pre-existing `ctx.files()` manifest lookup, which misses old-revision READMEs not touched in that changeset.

| Pros | Cons |
|---|---|
| <ul><li>The dead Galaxy branch is now clearly dead. `readmes()` is the only caller and passes no `tool_path`, and 26.1 already deleted the Galaxy-side `get_readme_files_dict_for_display`.</li><li>Shrinks a five-level-nested function before the restructure above.</li></ul> | <ul><li>None of it belongs on a frozen release backport.</li><li>The `ctx.files()` gap is a separate behavior bug that needs its own red test and probably its own issue.</li></ul> |

**Verdict:** fold the dead-code removal and the `unicodify` nit into the same dev follow-up as the restructure. Track `ctx.files()` separately.

## Expand: assert rendered content in the functional API test

`lib/tool_shed/test/functional/test_shed_repositories.py::test_readmes` checks only the dict key. Extend it to assert rendered, sanitized HTML through the real endpoint.

| Pros | Cons |
|---|---|
| <ul><li>Exercises the API path the frontend calls.</li><li>Test-only, so it's compatible with the freeze.</li></ul> | <ul><li>The manager-level `readmes()` test already covers the contract in-process (~1.5s).</li><li>Functional shed tests are slow, and the gain over the manager test is small.</li></ul> |

**Verdict:** optional. If it's done, put it in the dev follow-up, not this backport.

## Siblings: ts_readme_render_fix (25.0) and ts_readme_render_fix_dev

Both contain only commit 1, with the same `+`/`−` lines as the 26.1 commit.

| Pros of keeping | Cons of keeping |
|---|---|
| <ul><li>The 25.0 sibling is a ready source commit if John picks the 25.1 option.</li></ul> | <ul><li>The dev sibling is redundant once 26.1 merges forward. It lacks the strengthened tests. Opening it as well gives add/add on `test_readme_util.py` plus the `readme_util.py` conflict.</li><li>The 25.0 sibling targets an unsupported release.</li></ul> |

**Verdict:** don't open either one. Delete the dev sibling once the 26.1 PR is up. Keep the 25.0 sibling only until John decides on 25.1.
