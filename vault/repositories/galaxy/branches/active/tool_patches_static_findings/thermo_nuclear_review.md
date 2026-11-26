Run via Claude Opus at high effort.

# Thermo-nuclear review: patch review integration (after the re-scope)

Scope: this branch's integration, `git diff bd7d4595d4b..HEAD`, reviewed at `87eab50a554` by a read-only subagent. It was given only the diff and the constraints, not the earlier findings. The earlier draft is in `earlier_drafts/1/thermo_nuclear_review.md`.

Acted on:

- **Bug B1** (`ed335897a19`). When no patch op applied (every unit mismatched, already applied or advisory), the patched report was the same object as the unpatched one. `--judge` therefore also filled in the JSON `before.findings[*].assessment`, but only in that case. The patched report is now `dataclasses.replace(before)`. A shallow copy is enough, because `Report.assess` rebinds `findings`. Red-to-green: `test_cli_judges_only_the_patched_report_when_no_op_applies` uses `--judge` with a stale security patch. Before the fix, `before` held the stand-in verdict.
- **S2** (`9fc1faf4440`). A patched tool's failure was decided in two places: opt-in gates via a new `review` parameter on `FailOn.met`, and `regressed` bolted onto `main`. `FailOn.patch_met(review)` now holds all three, and `FailOn.met` is back to the parent's exact signature and body.
- **S3** (`9fc1faf4440`). `finding_match` splits by kind. Capabilities match by message (they never carry refs), and vulnerabilities by refs, then by `expr`. A one-line comment says why it is not `Finding.key()`.
- **Symmetry** (`9fc1faf4440`). `mismatched` returned a list and `uncleared` a bool, and both were only used for truth. Both are now bools over one `_has_security_unit(state)` helper.
- **Nits** (`9fc1faf4440`):
  - `FailOn.parse` uses keyword arguments, since it has five fields.
  - `_finding_line(finding)` is shared by the report's finding lines and the `CLEARED`/`NEW` lines.
  - An over-long docs line is rewrapped.

Checks, against the commit before each change:

- Base CLI text and JSON (no `--tool-patch-path`, over `test/functional/tools` and the spec tools) are byte-identical to the parent `tool_security_static_findings`, except the `identifier_single_fixed.xml` entry that only this branch has.
- Patched CLI text and JSON, with `--fail-on uncleared --fail-on mismatch` and each `test/functional/tool_patches` collection, are byte-identical between `87eab50a554` and `9fc1faf4440`.
- The analyser dump is byte-identical.
- 801 tests pass. ruff, black and isort are clean. mypy for `galaxy/tool_util/security` shows no errors in `security/`; the only one is the existing `managers/notification.py` error.

Not acted on:

- **S1. `note_lines` and `report_dict` render any report but live in `patch_review.py`, and the base CLI imports them from there.** The reviewer called this the presumptive blocker.
  - Their home is the parent's `classify.py`. It is a byte-identical hoist now, per `baseline_refactor.md`, but it reopens a parent that is BLOCKED on a PR-shape decision.
  - The in-branch alternative is a `security/render.py` holding two functions, as a stopgap until that hoist. It would add a module only to move the dependency. Decision for John: hoist into the parent if it is reopened.
  - Moving `PatchReview.to_dict` into the CLI was also declined. A library caller of `review_patches` wants the serialized review too.
- **S4. A bad collection path is found by counting `db.collections`, and the error says "see the log".** The fix is a `strict` loader flag in `tool_patches` (parent).
- **`REPRODUCIBILITY_LEVELS[-1]` equals the loader default.** It is kept explicit: offline review must apply every op whatever the default becomes, and the comment says so.
- **`notes_added` and `to_dict` re-run `classify()`.** It is cheap, and caching would conflict with the recomputed-properties choice.
- **Drop `PatchReview.patched`.** Low conviction. It costs a fabricated ToolSource in one test.
- **Parent `apply_patches` sets `patch_state` on the caller's ToolSource when nothing applied.** This is parent code.
- **Docs paragraph is dense.** It could be turned into bullets. Kept as prose to match the rest of the page.

<details><summary>Full review</summary>

**Verdict: changes requested, minor.** The diff is small: a 125-line new module, and about +100 net in `__main__`. No file nears 1k lines, and the code is mostly direct. There is one presumptive blocker under the prompt's bar: base-report rendering lives in the wrong layer. There is also one small verified bug. Everything else is fix-or-justify.

Checks run (read-only):
- `test_patch_review.py`: 33 passed. `test/unit/tool_util/security/`: 623 passed.
- The base CLI without `--tool-patch-path` is byte-identical to the parent package extracted from `bd7d4595d4b`, text and `--json`, over `test/functional/tools`.

## Real bugs

**B1. Before and after alias when no patch op applied, so `--judge` assessments leak into `before`.** `patch_review.py:124`.
- `after = before if patched is tool_source else review_tool_source(patched)`. When the units all mismatch, are already applied or advisory, or no key matches, `after is before`.
- `judge_report` runs on `after` and so writes onto the shared object.
- Verified: under a mismatched patch, `before.findings` held `[{'verdict': 'arg', ...}]`; under an applied patch it held `[None]`.
- The recomputed-properties constraint doesn't excuse this; that constraint exists because judge mutates `after`, which is exactly why the alias leaks.
- Fix: `after = dataclasses.replace(before) if patched is tool_source else ...`. A shallow copy is enough, because `Report.assess` rebinds `self.findings`.

## Structural

**S1 (presumptive blocker). Base-report rendering lives in the patch module.** `patch_review.py:43-59`.
- `note_lines` and `report_dict` render any report (its NOTE lines, and the CLI JSON shape of report plus classification), and neither is about patches.
- The base CLI path now imports them from `patch_review`, so every unpatched run depends on the feature module for its own output.
- Natural home: `classify.py`, which already imports `Report` and owns `Classification` (parent).
- In-branch alternative: a small `security/render.py`.
- Related: `PatchReview.to_dict` also encodes the CLI JSON shape and could move to `__main__`, leaving `patch_review.py` as pure diff logic.

**S2. Patch failure is decided in two places.** `__main__.py:78-80` and `:137`. The opt-in conditions go through an optional `review` parameter on `FailOn.met`, and `regressed` is added in `main`. Suggested one predicate:

```python
def patch_met(self, review: PatchReview) -> bool:
    return review.regressed or (self.mismatch and bool(review.mismatched)) or (self.uncleared and review.uncleared)
```

**S3. `finding_match` sits next to `Finding.key()` without saying why.**
- `key()` matches vulnerabilities by source text and capabilities by `expr`, which can be the whole `#import` line. Changing `key()` would change analyser output.
- Make the divergence explicit, or add a `Finding.match_key()` (parent).
- The `sorted_refs(refs) or named` union slot hides a per-kind fact: capability findings never carry refs. Split by kind.
- `refs` is already sorted at construction and on merge, so `sorted_refs` is redundant.

**S4. A bad collection path is detected by counting.** `__main__.py:201-203`. `len(db.collections) != len(paths)` exists because the parent loader logs and swallows `CollectionError`, so the message says "see the log". Fix in the parent: a `strict=True` loader flag.

## Nits

- `REPRODUCIBILITY_LEVELS[-1]` is the loader default. Name the level, or drop the argument.
- `FailOn.parse` passes five positional values. Use keywords.
- The finding-line f-string is duplicated (`:283`, `:300`). Extract `_finding_line`.
- `notes_added` and `to_dict` re-run `classify()`. Cheap.
- `PatchReview.patched` is only used to build `Reviewed`. Low conviction.
- Parent: `apply_patches` sets `patch_state` on the caller's ToolSource when nothing applied.
- Docs: one over-long line, and a dense paragraph.

No security issues found.

</details>

## Author notes on the review

- `sorted_refs` is kept in `finding_match`. Refs are sorted wherever the analyser builds a finding, but that is a convention the `Finding` type doesn't enforce, and `Report`s built by hand (as in the tests) would skip it.
