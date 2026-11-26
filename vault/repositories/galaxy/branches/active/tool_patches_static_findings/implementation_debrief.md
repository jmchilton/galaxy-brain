# Implementation debrief

```
created .../tool_patches_static_findings/differential-review/snapshots/20261126T235030Z-revision-60e85e935d25.json
  revision @ 60e85e935d25 vs jmchilton/tool_security_static_findings (merge-base d4e4f68dd259)
  first snapshot: 50 commits, 64 files, 122 hunks
```

**STATUS: BLOCKED on a scope decision** (the capability-findings switch, unchanged). Head `60e85e935d2` on `jmchilton/tool_patches_static_findings`. The earlier debrief is `earlier_drafts/3/implementation_debrief.md`; everything in it still holds except where this revision changes it.

## This revision

- **collection_fix commits** (t7t, 2026-11-26). `12af42b3aab` carries `tool_patches`' three collection_fix commits, re-picked on top of `cab486f13a1`.
- **upload1 exemption** (John, 2026-11-26: exempt `upload1`). `60e85e935d2` adds it, with the same helper as branch 3.
  - `upload1` is exempt only when it is Galaxy's bundled file (or a link to it) *and* no tool patch has state `applied`. A patched `upload1` is reviewed.
  - `reviews_tool` and `static_review_is_current` take the patch state. A lookalike gets one WARNING and is still reviewed.
  - The exemption changes upload1's stored `StaticReview` only when refusals are on. `INDEX_SCHEMA_HASH` doesn't change.
  - The admin docs ("Refusing tools with findings") and the config docs describe it.
- **Plan.** `plan_finding_dismissals.md` (no code) designs reviewed finding dismissals in patch files. Only this branch would change.
- **Notes.** `subagents/upload1_exemption.md` and `subagents/review_upload1_exemption.md`. Every review item was acted on, except keeping branch 3's cached-toolbox integration class.

## Tests

- Related unit suites (security, refusal, toolbox, cached tool, populate store, freshness, index versions): 854 passed, 2 xpassed.
- `test_tool_static_findings_refusal.py` alone: 8 of 8 passed. Its new `test_galaxy_upload_tool_runs` runs under both the eager and the cached toolbox.
- ruff, black and isort are clean; mypy shows no new errors.

## Decisions for John

1. **Scope (the BLOCKED reason).** The capability-findings switch is item 1 of the earlier debrief.
2. **The `lib/galaxy` exemption ignores tool patches.** Patched Galaxy-own tools are not reviewed, and in a packaged install that covers every bundled tool. Apply the upload1 patch rule to it too?
3. **Dismissals plan.** The open decisions are at the end of `plan_finding_dismissals.md`.
4. Items 2–7 of the earlier debrief are still open.
