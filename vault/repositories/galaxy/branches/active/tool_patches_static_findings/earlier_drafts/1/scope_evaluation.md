Run via Claude Opus at high effort. **Recommendation: expand, modestly.** Add one opt-in gate condition: `--fail-on uncleared` (the name is a question for John). It fails a tool that has an `applied` `kind: security` patch state when `PatchReview.cleared` is empty. John's request named two conditions for the gate: "targeted findings cleared, nothing new". The branch checks only "nothing new". Review gap 6 (`subagents/review_integration.md`) raised the first condition, and it was settled by documenting it as unchecked. No decision of John's dropped it. The branch's own fixtures show the gap. Each of the two `test/functional/tool_patches` security collections applies to `identifier_single.xml`, clears nothing, still reports the same high `shell-injection` finding, and exits 0. The addition is about 15 lines in `PatchReview` and `FailOn.met`, a red-to-green test on those two fixture collections, and a doc sentence. It needs no change to `tool_patches`. It must stay opt-in, because a security patch can fix something the static review cannot see, such as the validator-only `rejects_inputs` fixture. Everything else stays as implemented:
- Typing `PatchFile.fixes` to name target rules is a `tool_patches` schema change.
- Per-tool guids overlap the toolbox walk that both parents deferred.
- The open matching tradeoffs are decisions for John, not scope changes.
- No runtime surfacing or enforcement, per John.

## Possible Decompositions

Sized on the integration only (`bd7d4595d4b..HEAD`, 6 commits): +603/−30 across 5 files. That is about 240 lines of library and CLI code, 22 of docs and 367 of tests. The 25 carried `tool_patches` commits land through that branch's own PR (see its `scope_evaluation.md`) and are not counted here.

Constraints that apply to every option:
- This PR's base is whichever parent lands second, `tool_security_static_findings` or `tool_patches`. Until both have landed, the GitHub compare shows the other parent's commits.
- The six integration commits are review-fix history on one feature. They can be squashed to one commit, or to two (library, then CLI).

**Option A: one PR.** Open it after both parents land. It is one small review: `patch_review.py`, the `__main__.py` options, the docs paragraph and `test_patch_review.py`.

**Option B: library first, then the CLI.**
1. `patch_review.py` (`finding_match`, `note_lines`, `report_dict`, `PatchReview`, `review_patches`), the `finding_to_dict` rename and the library tests.
2. `--tool-patch-path`, `--guid`, `--fail-on mismatch`, the PATCH/CLEARED/NEW lines, the docs and the CLI tests.

PR 1 would have no caller. That is the "Unused Infrastructure" concern in `GX_DEVELOPMENT.md`. `note_lines` and `report_dict` are also only shared once the CLI uses them.

**Option C: Option A, with the `finding_to_dict` rename moved into the static-findings PR.** It is a 2-line rename in `report.py`. Moving it means this PR touches only a new module, `__main__.py`, the docs and a new test file. The cost is reopening the static parent, which is BLOCKED on a PR-shape decision anyway.

## Scopes considered

### As implemented

An offline `review_patches(tool_source, db, guid)` returns a `PatchReview`: before and after reports, the patched source, and patch states. It computes `cleared`, `introduced` (new findings, or worse severity), `notes_added` and `mismatched`. The CLI's `--tool-patch-path` reports PATCH/CLEARED/NEW lines and JSON keys, fails on any regression, and adds an opt-in `--fail-on mismatch`.

| Pros | Cons |
|---|---|
| <ul><li>Thin, and it reuses `review_tool_source`, `apply_patches`, `patches_as_dicts`, `key_from_ids`, `sorted_refs` and `finding_to_dict`</li><li>"Nothing new" is hardened against the severity, uncheckable, unquoting and import-line holes the reviews found</li><li>Patch state is surfaced in both the text and JSON reports, as asked</li><li>No runtime code and no parent changes</li></ul> | <ul><li>It doesn't check the request's "targeted findings cleared": a security patch that fixes nothing exits 0 (both fixture collections do)</li><li>Only `_local` keys match a directory of tools; `--guid` covers one file</li></ul> |

### Expand (recommended): opt-in gate for a security patch that clears nothing

Add `PatchReview.uncleared` to `patch_review.py`. It is the `applied` `kind: security` states when `cleared` is empty. Fold it into `FailOn.met` as `--fail-on uncleared`, which needs `--tool-patch-path` (the `_patch_database` guard), the same way `mismatch` is folded in. Add a test that runs the two `test/functional/tool_patches` collections through the CLI: exit 0 without the flag, exit 1 with it. Add one sentence to the docs paragraph.

| Pros | Cons |
|---|---|
| <ul><li>Delivers the request's first gate condition, which is currently documented as unchecked</li><li>About 15 lines in the two places that already own the gate policy; no parent change</li><li>Its red-to-green test uses the existing fixture collections, so no new fixtures</li><li>Gives a patch repository's CI a signal that a "security" patch is not a static-review fix</li></ul> | <ul><li>Coarse: it is attributed per tool, not per unit, because every collection is applied before the after-review</li><li>It can't be the default: a patch may fix something the static review can't see, such as validator-only or `rejects_inputs` patches</li><li>One more `--fail-on` choice and one more JSON/docs term</li></ul> |

<details><summary>Details</summary>

- **Which states count.** Only `applied`. An `already_applied` unit had nothing left to clear. `mismatch` has its own flag. `skipped` and `advisory` change no ops.
- **The name.** `uncleared` would sit beside `unchecked` and `uncheckable` in the same `choices` list. Three near-identical `un…` words invite misreads, so ask John to pick. Candidates: `clears-nothing`, `no-clear`, `ineffective`.
- **Evidence (synthetic fixtures).**
  - `identifier_single` rewrites `.` to `_` through a `#set`. The finding keeps its match key (same rule, location and context) and stays high.
  - `identifier_single_validator` adds an `empty_dataset` validator, which the static review can't credit.
  - Both runs print `PATCH applied security _local/identifier_single/1.0.0` and no CLEARED line, and exit 0.
- **A precise version** would need patches to name their targets (see the next scope). This opt-in check is the version that needs no schema change.

</details>

### Expand: type `PatchFile.fixes` so a security patch names the rules it targets

`PatchFile.fixes` is untyped (`Any`), ops-only, and has no consumer in the engine, state or API. Typing it, for example as a list of rule ids, and carrying it on `PatchState` would let the review check "these targeted findings cleared" exactly.

| Pros | Cons |
|---|---|
| <ul><li>Exactly the request's wording: targeted findings, not just "something cleared"</li><li>Attribution per unit</li></ul> | <ul><li>Changes the `tool_patches` file format and `PatchState`, in a parent that is READY</li><li>It ties the patch format to the static review's rule ids, which are a separate PR's catalog</li><li>Patch authors would have to keep the rule ids current</li></ul> |

### Expand: per-tool guids (`tool.xml=guid`, or inferred from a shed install path)

This lets the CLI match shed keys across many tools (review gap 5). `--guid` was the cheap single-tool form.

| Pros | Cons |
|---|---|
| <ul><li>Installed shed tools are the main users of patch collections</li></ul> | <ul><li>Inferring guids from paths overlaps the toolbox walk that both parents deferred</li><li>A `path=guid` argument form is awkward CLI surface for a follow-up that a toolbox walk would replace</li></ul> |

### Expand: surface patch review at runtime (populate-time review, admin API, tool form)

| Pros | Cons |
|---|---|
| <ul><li>Admins would see whether a patch fixed anything without running a CLI</li></ul> | <ul><li>Excluded by John: no runtime enforcement</li><li>`tool_patches` put the admin endpoint and the badge out of scope</li><li>It runs the analyser at load time, which the static parent deliberately left out</li></ul> |

### Deferred decisions (not scope changes)

- **`capability-obfuscation` matching by message.** Its message is constant, so a second blob where one already was is not NEW. The fix would be a `(message, expr)` special case for that rule. Thermo review, John's call.
- **`Report.add` merging multi-module imports.** It keeps the first module's message, so reordering such a line still reads as cleared plus new. The fix is analyser code, which the parent excludes.
- **`load_collection` in `patches/database.py`.** It would report the real load error instead of "see the log". This is parent code; take it into `tool_patches` if wanted.
- **Moving `note_lines` and `report_dict` into `classify.py`.** This reopens the static base. Fold it into that PR if its shape is reopened (see Option C).

### Contract: library only, or drop `--fail-on mismatch` / `--guid`

| Pros | Cons |
|---|---|
| <ul><li>A smaller diff</li></ul> | <ul><li>The request asked for patch state in the static CLI's report</li><li>`--fail-on mismatch` and `--guid` are a few lines each, guarded and tested</li><li>Dropping the CLI leaves the library with no caller</li></ul> |
