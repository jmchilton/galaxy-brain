Run via Claude Opus at high effort. **Recommendation: keep the scope as implemented.** This is the second scope evaluation. The first one's expansion, `--fail-on uncleared` (`ff7567349f0`, hardened in `937ca04214d` and `87eab50a554`), supplied the request's one missing condition. The branch now covers the whole request: findings before and after a patch, targeted findings cleared (opt-in `--fail-on uncleared`), nothing new (the default gate), and patch state in the static CLI's text and JSON reports. It is small, the library is reusable, and it is offline with no runtime enforcement. One new modest expansion came up in re-hardening: report the findings a patch makes less severe. It is not recommended now, because it depends on a question only John can answer: does a lowered finding count as progress? It is listed below as a decision. The scopes the first evaluation rejected (typing `PatchFile.fixes`, per-tool guids, runtime surfacing) have no new evidence and stay out.

## Possible Decompositions

Sized on the integration only (`bd7d4595d4b..HEAD`, 12 commits): +679/−30 across 5 files. That is about 250 lines of library and CLI code, 23 of docs and 407 of tests. The 25 carried `tool_patches` commits land through that branch's own PR and are not counted here.

These constraints apply to every option:
- This PR's base is whichever parent lands second, `tool_security_static_findings` or `tool_patches`. Until both have landed, the compare view shows the other parent's commits.
- The 12 integration commits are review-fix history on one feature. They can be squashed to one commit, or to two or three.

**Option A: one PR.** Open it after both parents land. It is one small review: `patch_review.py`, the `__main__.py` options, the docs paragraph and `test_patch_review.py`.

**Option B: library first, then the CLI.**
1. `patch_review.py` (`finding_match`, `note_lines`, `report_dict`, `PatchReview`, `review_patches`), the `finding_to_dict` rename and the library tests.
2. `--tool-patch-path`, `--guid`, `--fail-on mismatch|uncleared`, the PATCH/CLEARED/NEW lines, the docs and the CLI tests.

PR 1 would have no caller, which is the "Unused Infrastructure" concern.

**Option C: the core gate first, then the opt-in gates.**
1. The library, `--tool-patch-path`, `--guid`, the regression gate, reporting, docs and tests. This is the alt `_alt_original_scope`'s shape.
2. `--fail-on mismatch` and `--fail-on uncleared`, about 30 lines plus their tests and docs bullets.

This gives reviewers a smaller first PR and isolates the opt-in gate semantics (including the lowered-severity question) in a follow-up. The cost is a second review round for about 30 lines.

**Option D: Option A, with `note_lines`, `report_dict` and the `finding_to_dict` rename hoisted into the static-findings PR** (see `baseline_refactor.md`). This PR then touches only its new module, `__main__.py`'s patch parts, the docs and a new test file. The cost is reopening the static parent, which is BLOCKED on a PR-shape decision.

## Scopes considered

### As implemented (recommended)

`review_patches(tool_source, db, guid)` returns a `PatchReview`, with `cleared`, `introduced` (new or worse), `notes_added`, `mismatched` and `uncleared`. The CLI's `--tool-patch-path` adds PATCH, CLEARED and NEW lines and JSON keys, fails on any regression, and offers the opt-in `--fail-on mismatch` and `--fail-on uncleared`.

| Pros | Cons |
|---|---|
| <ul><li>Covers every condition in the request</li><li>Thin: reuses `review_tool_source`, `apply_patches`, `patches_as_dicts`, `key_from_ids`, `sorted_refs` and `finding_to_dict`</li><li>No parent changes and no runtime code</li><li>Base CLI output byte-identical to the parent</li></ul> | <ul><li>`uncleared` is attributed per tool, not per unit</li><li>A severity-lowering security patch fails `--fail-on uncleared`, and a lowered finding doesn't show in the patch lines</li><li>Only `_local` keys match a directory of tools; `--guid` covers one file</li></ul> |

### Expand (new, not recommended yet): report lowered findings

Add `PatchReview.lowered`: findings whose match survives at a lower severity. Add it to the JSON and as `LOWERED` lines. Optionally, let a lowered finding satisfy `--fail-on uncleared`. This is about 15 lines and a test (the awk fixture already exists).

| Pros | Cons |
|---|---|
| <ul><li>A partial fix is invisible today: the text shows only the remaining, lower finding</li><li>Small, and in this branch's own module</li><li>Answers the sanitizer-tightening case the re-scope review found</li></ul> | <ul><li>Its gate half depends on John's answer: strict "cleared" (the coordinator's earlier call) or "progress"</li><li>Not in the request, which says "cleared"</li><li>Adds one more JSON key and line label</li></ul> |

<details><summary>Details</summary>

- Probe: a synthetic awk tool with a sanitizer change that takes out `;`. `nested-interpreter` goes from HIGH to MEDIUM, with no CLEARED and no NEW. `--fail-on uncleared` exits 1. The JSON `before` still shows HIGH, so the change can be recovered by diffing, but nothing names it.
- If John answers "strict", only the reporting half is left. That alone is a nicety, not a gap in the request.

</details>

### Expand: per-unit attribution for `uncleared`

Review once per security unit, so a compat unit that clears something can't hide a security unit that clears nothing.

| Pros | Cons |
|---|---|
| <ul><li>Exact attribution</li></ul> | <ul><li>Needs applying one unit at a time, which `ToolPatchDatabase` doesn't offer (parent engine API)</li><li>One review per unit; not modest</li><li>Typing `fixes` (below) is the precise version anyway</li></ul> |

### Expand: type `PatchFile.fixes` to name target rules

Rejected in the first evaluation: it is a `tool_patches` schema change in a parent, and it couples the patch format to the static review's rule ids. No new evidence.

### Expand: per-tool guids

Rejected in the first evaluation: it overlaps the toolbox walk both parents deferred. No new evidence.

### Expand: runtime surfacing

Excluded by John.

### Contract: back to the original scope (drop `--fail-on uncleared`)

The alt `tool_patches_static_findings_alt_original_scope`.

| Pros | Cons |
|---|---|
| <ul><li>About 30 fewer lines</li><li>No lowered-severity semantics to settle</li></ul> | <ul><li>Leaves the request's "targeted findings cleared" unchecked</li><li>The first evaluation's reason to add the flag still holds</li></ul> |

### Contract: library only

| Pros | Cons |
|---|---|
| <ul><li>Smaller diff</li></ul> | <ul><li>The request asks for patch state in the CLI report</li><li>The library would have no caller</li></ul> |

## Decisions for John (not scope changes)

- **A lowered finding under `--fail-on uncleared`:** strict (today, documented) or progress? If progress, take the "report lowered findings" expansion.
- **Flag name.** `uncleared` sits next to `unchecked` and `uncheckable`. The review recommends `clears-nothing`.
- **Hoists into the parents:** `note_lines` and `report_dict` → `classify.py`, and `compat_doc` → `unittest_utils` (see `baseline_refactor.md`). These are only worth doing if the parents are reopened.
- **`capability-obfuscation` matched by its constant message**, carried over from the earlier thermo review.
