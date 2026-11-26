# Initial implementation debrief

```
created .../tool_patches_static_findings/differential-review/snapshots/20261126T042109Z-implementation-8e5cda36884c.json
  implementation @ 8e5cda36884c vs tool_security_static_findings (merge-base d4ae281e442c)
  first snapshot: 26 commits, 52 files, 101 hunks
```

## What was built

- **25 `tool_patches` commits** (`origin/dev..tool_patches` at `1e92a257548`), cherry-picked onto `tool_security_static_findings` at `d4ae281e442` with `rerere.enabled=false`. `git range-diff` shows them unchanged apart from `MANIFEST.in` context.
- **`8e5cda36884` "Review tools before and after their tool patches"**, the integration. It was first written as `de7acf57d7a` and `4e21fc2167d` on the pre-re-scope bases, then rebuilt as one commit on the final bases.
  - **`galaxy.tool_util.security.patch_review`.**
    - `review_patches(tool_source, db, guid)` returns a `PatchReview`.
    - The review holds the before and after reports, the patched source, and the patch state (via `galaxy.tool_util.patches.patches_as_dicts`).
    - `cleared`, `introduced`, `unanalyzed_added` and `regressed` are computed from the reports.
    - Findings are matched by rule, kind, location, context and sorted source refs.
  - **The CLI:**
    - `--tool-patch-path`, repeatable, applies every op offline.
    - `--guid` is allowed for one tool.
    - The text output gains PATCH, CLEARED and NEW lines with severity.
    - Each JSON entry gains `patches`, `before`, `after`, `cleared`, `introduced` and `unanalyzed_added`.
    - `--fail-on` and `--judge` see the patched tool.
    - A patch regression fails the run.
    - An unloadable collection is a usage error.
  - Docs paragraph and `test_patch_review.py`.

## Decisions

- **Restart-only reviews.** The pre-rebuild review findings are kept (`subagents/review_integration.md`).
- **Only `_local` keys match by default.** Tools are reviewed under their XML id and version; `--guid` gives the shed key for a single tool.
- **The gate checks that nothing new appears, not that the targeted findings cleared.** This is documented.

## Tests

- `test/unit/tool_util/security` and `test/unit/tool_util/test_tool_patches.py`: 782 passed.
- ruff, black and isort are clean. mypy has only the existing `managers/notification.py` error.
