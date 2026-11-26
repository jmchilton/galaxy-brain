# Implementation debrief

```
created .../tool_patches_static_findings/differential-review/snapshots/20261126T051834Z-hardening-9fc1faf4440f.json
  hardening @ 9fc1faf4440f vs tool_security_static_findings (merge-base d4ae281e442c)
  since 20261126T045810Z-revision-ff7567349f06:
    commits: 33 same, 0 rebased, 0 changed, 4 new, 0 dropped
```

**STATUS: BLOCKED** on a scope decision, stacked on two parents.

- Head: `9fc1faf4440` on `jmchilton/tool_patches_static_findings`.
- Parent: `tool_security_static_findings` (`d4ae281e442`), which is itself waiting on a history decision.
- Carried: the 25 `tool_patches` commits, cherry-picked unchanged.
- This branch's own work: `git log bd7d4595d4b..HEAD`.

## What it is

- **`galaxy.tool_util.security.patch_review`.**
  - `review_patches(tool_source, db, guid)` returns a `PatchReview`.
  - The review holds the before and after reports, the patched source and the patch state.
  - `cleared` means the match key is gone.
  - `introduced` covers new keys, and also findings whose severity got worse.
  - `notes_added` lists unanalyzed parts, classified unchecked locations and uncheckable codes that appear only after the patch.
  - `regressed`, `mismatched` and `uncleared` are derived from those.
  - Findings are matched by rule, kind, location, context and sorted source refs. Capability findings are matched by message.
  - `note_lines` and `report_dict` are shared with the CLI. Repeated NOTE lines are kept.
- **CLI.**
  - `--tool-patch-path` is repeatable and applies every op offline. `--guid` takes a single shed tool.
  - The text output gains PATCH, CLEARED and NEW lines with severity; `--min-severity` filters CLEARED but not NEW.
  - Each JSON entry gains `patches`, `before`, `cleared`, `introduced` and `notes_added`. The top level is the patched report.
  - A patch regression fails the run.
  - `--fail-on mismatch` (security only) and `--fail-on uncleared` are both opt-in.
  - Without patches, the base CLI's output is byte-identical to the parent's. The only exception is the extra fixture tool this branch carries.
- **Docs paragraph and tests.** `test_patch_review.py` plus the patches suite: 801 passed.

## Hardening

- Reviews:
  - `subagents/review_integration.md`: before the rebuild.
  - `subagents/review_rebuild.md`: caught the severity-raise and classify holes.
  - `subagents/review_rescope.md`.
- Test challenges, run twice.
- Thermo-nuclear review, run twice. The second run fixed `--judge` assessments leaking into `before` when no op applied, and moved the patch failure into one `FailOn.patch_met`.
- Refactor baseline: report-only. Optionally, `note_lines`/`report_dict` could move into the parent's `classify.py`.
- Scope evaluations:
  - Round 1: expand. It added `--fail-on uncleared`; the alt `tool_patches_static_findings_alt_original_scope` is at `812703c96b6`.
  - Round 2: expand modestly again (report findings a patch makes less severe: `PatchReview.lowered`, a JSON `lowered` key and `LOWERED` lines, about 15 lines plus a test on the awk fixture). Not implemented: a second evaluation parks the branch for John. The reviews, test challenges and thermo fixes still apply if the expansion is taken.
- Codex was blocked by the permission classifier.
- The analyser's output is byte-identical throughout.

## Decisions for John

- **Take the "report lowered findings" expansion?** This is the reason for BLOCKED. Taking it needs a red-to-green test on the awk fixture and a re-run of the output comparisons.
- **The flag name `uncleared`.** Alternatives: `clears-nothing`, `no-clear`, `ineffective`.
- **Should a lowered finding count as progress (cleared)?** Today `cleared` is strict.
- **Matching capability findings by message.** A second `capability-obfuscation` blob in the same place is not reported as new. Reordering a multi-module `#import` still churns, and fixing that needs an analyser change.
- **The base CLI now imports `note_lines` and `report_dict` from `patch_review`.** Output is identical. The alternative is to move them into the parent's `classify.py`.
- **Landing order.** This branch lands after both parents. If `tool_patches` changes, rebuild by re-picking `origin/dev..tool_patches` onto `tool_security_static_findings`.
