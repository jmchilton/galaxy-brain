# upload1 exemption (static findings refusals)

Commit `60e85e935d2` on `tool_patches_static_findings` exempts Galaxy's own `upload1` from static findings refusals, unless a tool patch applies to it. It is pushed to `jmchilton` as a fast-forward over `12af42b3aab`.

- The review's findings (`subagents/review_upload1_exemption.md`) were folded in with a fixup and an autosquash. The earlier unpushed version was `6e28b7debd8`.
- It uses the same helpers as branch 3 (`tool_security_runtime` `e3d98e549b7`). These are byte-identical on both branches:
  - `_GALAXY_UPLOAD_TOOL`
  - `_UPLOAD_ACTION`
  - `is_galaxy_upload_tool()`
  - `declares_upload_tool()`
  - `upload_tool_lookalike_message()`
- The `lib/galaxy` exemption is unchanged.

**For John: the `lib/galaxy` rule has the same patch gap.**
- That rule exempts by `abspath` under the galaxy package. Tool patches don't change that, so a patched `set_metadata_tool.xml` or data fetch tool is still not reviewed.
- In an installed package, the bundled tools live under the galaxy package. The rule therefore also exempts every bundled tool there, a patched upload1 included. In a source checkout it doesn't.
- Whether patched Galaxy-own tools should be reviewed under that rule too is your call. It was left alone, as asked.

Not acted on:

- **Where the exemption sits.** It is in `reviews_tool()`, at load, not in `check_static_findings()` at job preparation, so it changes what is stored for upload1 (below). That is necessary: tools the cached toolbox materializes have `config_file = None`, so a check at job preparation could not see the path.
- **Review items left as is.** The review found no bypass. The cached-toolbox integration class (item 7) was kept as is.

## Predicate and placement

- **The path check.** `is_galaxy_upload_tool(path)` compares `realpath(path)` with the real path of `lib/galaxy/tools/bundled/data_source/upload.xml`.
  - Only a tool file at Galaxy's bundled path, or a link to it, matches. That covers a source checkout, an installed package and `test/functional/tools/upload.xml`.
  - A copy elsewhere with the same id or action does not match.
- **The patch condition.** `_unpatched_upload_tool(path, patch)`, at branch 4's call site, adds "no tool patch with state `applied`".
  - `reviews_tool(config, path, patch)` returns False only for an unpatched upload1.
  - `patch` is a required argument, so a caller can't forget it.
- **Freshness agrees with load.**
  - `static_review_is_current(config, review, path, patch)` takes the index entry's `patch`.
  - The populator passes `old_entry.patch`. The populator also checks `indexed_patch_is_current` first, so a changed patch makes the entry stale anyway.
  - `with_static_review` reads `tool_source.patch_state`. At materialization the cached toolbox sets it from `entry.patch` before the call.
- **Logging in `with_static_review`.** The checks are now an `elif` chain:
  1. Refusals on and an unpatched upload1: INFO "exempt", and no review.
  2. Else, not a tool to review (`lib/galaxy`, refusals off): no review.
  3. Else, keep `kept` or review.
- **Warning for a lookalike.**
  - When `_review` reviews a source that declares id `upload1` with `galaxy.tools.actions.upload`/`UploadToolAction` from another path, it logs one WARNING naming that path and the bundled file.
  - That happens once per new review (load or populate parse), not per job.
  - The lookalike is still reviewed (fails closed).
- **What upload1 reports when reviewed:** `template-reflection` (medium) and `option-injection` (low, a false positive on `$paramfile`).

## Stored review, freshness, INDEX_SCHEMA_HASH

- **`INDEX_SCHEMA_HASH`:** unchanged. No model or field changes.
- **Stored `StaticReview`:**
  - An unpatched upload1's entry stores None, like the `lib/galaxy` tools.
  - A patched upload1 stores its review.
  - Both apply only when `tool_security_refuse_static_findings` is on, which is off by default.
- **Freshness:** an index built by this branch before the change, with refusals on, re-populates upload1's entry once. No released index is affected.

## Tests

- **Unit, red then green:** `test_static_findings_refusal.py`.
  - `test_galaxy_upload_tool_path`.
  - `test_galaxy_upload_tool_is_exempt`: at `low`, the review is None, the entry is current with no patch, and the INFO is logged once.
  - `test_upload_tool_lookalike_is_reviewed[upload.xml | data_source/upload.xml]`: refused with `option-injection` at `low`, with exactly one WARNING naming both paths.
  - `test_patched_galaxy_upload_tool_is_reviewed`: a `_local/upload1/1.1.7` patch applies. The patched source gets a review that refuses `option-injection`. `static_review_is_current` is False with no review and True with that review.
  - Red before the change: the patched and warning tests failed on behaviour; the other failures were the new `patch` argument.
- **Integration:** `test_tool_static_findings_refusal.py`, including `test_galaxy_upload_tool_runs` in the eager and the cached-toolbox class. Run alone: 8 of 8 passed. The earlier red, with the exemption reverted, failed 2 of 2 with `template-reflection`.
- **Unit suites:** security, `test_static_findings_refusal.py`, toolbox, cached tool, populate store, freshness and index versions: 854 passed, 2 xpassed.
- **Static checks:** ruff, black and isort are clean. mypy reports 318 errors on the changed files both before and after; all are already there, in imported modules.

## Docs

- **"Refusing tools with findings":** the upload1 bullet now says:
  - "the file at Galaxy's bundled path";
  - while no tool patch applies to it (a patched upload tool is reviewed);
  - a copy is reviewed and gets a warning naming the bundled file.
- **`tool_security_refuse_static_findings` description:** names upload1, "unless a tool patch applies to it".
- The sample and rst were regenerated.
