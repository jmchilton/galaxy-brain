# Review: patch review integration

Acted on in `4e21fc2167d`: bugs 1 (match on `context` + `sorted_refs`), 2 (`unanalyzed_added` counts as a regression), 3 (`patched` source judged; cleared/introduced computed), 4 (CLI errors on an unloadable collection), gaps 5 (`--guid`), 6 and 7 (documented: gate checks only nothing-new, any severity), nits 7, 9, 10. Red-to-green tests for unquoting and a broken template.

Not acted on:

- Nit 8 (move `patches_as_dicts` into `galaxy.tool_util.patches`): a `tool_patches` change; folded into its hardening.
- Nit 11 (`apply_patches` sets `patch_state` on its input when nothing applied): `tool_patches` behaviour; noted.

<details><summary>Full review</summary>

# Review: integration commit `de7acf57d7a`

Verdict: thin, offline, right layering, reuses `Report.to_dict`/`review_tool_source`/`apply_patches` well; JSON shape changes only with the flag; offline policy correct. But `finding_match` drops `context`, so it misses real regressions (a quote change, a second sink for the same value), and a patch that breaks the template reads as "cleared" with exit 0. `--judge` judges the patched report against the unpatched source. Bugs 1, 2, 4 undermine the exit-1 gate; 3 affects `--judge` output only. Tests pass (6/6).

## Bugs

1. `lib/galaxy/tool_util/security/patch_review.py:27` `finding_match` drops `Finding.context`, so findings that differ only in where the value lands share one match, and the set comparison (`:53-54`) hides changes:
   - A patch that unquotes a single-quoted `$input1.element_identifier`: the `shell-injection` (single quotes → unquoted) matches the old one. Only a low `option-injection` shows as NEW.
   - A patch that adds a second sink for the same value (e.g. into `eval "..."`): the new `shell-injection` "in sh program text" is masked by the old single-quoted one. Only the `nested-interpreter` rule happened to catch it.
   Fix: `(rule, kind, location, context, sorted_refs(finding.refs) or expr)`. `context` is text the analyser generates, so most cosmetic edits keep it. But it names the program (``in an argument of `echo` ``), so swapping `echo` for `printf` around the same value would read as cleared+introduced (exit 1). That's defensible for a gate, but a false positive for a pure rename. I checked by monkeypatching: all 6 tests still pass, and both cases now report NEW. Side effect: single → double quotes now reads as cleared+introduced, which is correct.
2. `patch_review.py:52-60`: a patch that stops the template compiling clears every finding. After it, `after.findings == []` and `after.unanalyzed == ['command: template does not compile (ParseError)']`, so CLEARED lists the target finding, NEW is empty, and the exit code is 0. The gate sees a broken patch as a perfect fix. Fix: diff `unanalyzed` (by location prefix, or `unchecked_locations` keys, so line shifts do not count) too, expose them as `PatchReview.unanalyzed_added`, and have the CLI count them toward exit 1.
3. `lib/galaxy/tool_util/security/__main__.py:63` `judge_report(tool_source, report, judge)` with `report = review.after` sends the unpatched source as the model's context for the patched findings. Also, `judge_report` swaps findings in `after.findings` (`Report.assess` uses `replace`), so `review.introduced`/`cleared` keep the unassessed objects and the JSON `introduced` entries have no `assessment`. Fix: add `patched: ToolSource` to `PatchReview` and judge `review.patched`. Make `cleared`/`introduced` properties computed from `before`/`after`, not stored lists, so assessments flow through.
4. `__main__.py:49-51`: an unloadable `--tool-patch-path` (typo, not a directory) is only logged by `load_tool_patch_database` and skipped, and the run exits 0 ("nothing introduced"). Skipping is right at runtime but wrong for an offline gate. Fix: in the CLI, check `len(patch_db.collections) == len(args.tool_patch_paths)`, or build `PatchCollection` directly and `parser.error` on `CollectionError`.

## Design gaps (not bugs, documented)

5. The CLI only matches `_local` keys (`review_patches(tool_source, patch_db)` with no guid). Patch collections exist mainly for installed shed tools, whose keys are `(owner, repo, tool_id, version)`, so the CLI can't review the main use case. Cheap fix: `--guid` (allowed with exactly one tool), or a `tool.xml=guid` argument form. `review_patches` already takes `guid`.
6. Gate only checks "nothing new", not "targeted findings cleared": a `mismatch`/`skipped`/`advisory` state, or an applied `kind: security` unit that clears nothing, exits 0 (patch files do not name the rule they target). Either exit nonzero on `mismatch` or an applied security unit with empty `cleared`, or state in the doc that the gate only checks for new findings.
7. NEW findings ignore `--min-severity`, and any NEW finding (even `info`/`low`, capabilities included) gives exit 1. That's probably intended for "nothing new", but say so in the doc paragraph, or gate on the threshold.

## Nits

8. `patch_review.py:26` rebuilds refs by hand and drops `SourceRef.key`, so `$input.name` → `$input.info` (same accessor, another key) still matches. Use the existing `sorted_refs(finding.refs)` from `report.py` (`SourceRef` is frozen and hashable), as in bug 1.
9. `patch_review.py:40` repeats `galaxy.tools.patches.patches_as_dicts` (`[state.model_dump(mode="json") for state in patch.states]`). `tool_util` can't import `galaxy.tools`, so move that helper down into `galaxy.tool_util.patches` (or make it a `ToolPatchInfo` method) and use it from both places. Note the None vs `[]` difference.
10. `__main__.py:71-72`: CLEARED/NEW lines don't show severity, and the label takes the severity column. Something like `f"  {label:8} {finding.severity.upper():8} {finding.rule:22} ..."` would help.
11. `test_patch_review.py:72` `all(f.refs and f.refs[0].param == "input1" ...)` is loose. Asserting the expected rule set (e.g. `("shell-injection", "high") in _rules(review.introduced)`) would pin what UNQUOTING actually introduces. Stricter, not new coverage.
12. Pre-existing (patches commits, not this one): when no op changes the tree, `apply_patches` sets `patch_state` on the caller's `tool_source`, so `review_patches` changes its input in place. Harmless here; just be aware of it.

## Checked and fine

- Offline policy: `requirement_changes=True` plus the default `reproducibility="all_inputs"` (the top level) plus `galaxy_series=None` (`series_satisfied` → every op) does apply every op. Right for an offline review.
- Without the flag, the JSON and text output are unchanged (`review is None` → `report.to_dict()`). The `_finding_to_dict` → `finding_to_dict` rename is the right reuse.
- Location identity: moving a value into a configfile shows as cleared+introduced (exit 1). Acceptable, since it is a new place; mention it in the doc.
- Capability `expr` is mostly a dotted name or program name (`capabilities.py:421-480`, `:519-530`), so it holds up against text edits. The exception is `template-import`, which keys on the import line text (`:246`).
- Same-key findings within one report merge in `Report.add`, so a single report has no duplicate `key()`. But `finding_match` is coarser than `key()` (no context/source), which is what causes bug 1.
- Tests: not trivial. They cover clears, cosmetic rewrite, introduces, no match (no second review), and the CLI exit codes and shape. Red-to-green coverage for bugs 1-2 would come naturally from the fixes (unquote patch → NEW, broken template → exit 1).

Repro script (scratch): edge cases built on `identifier_single.xml` with `replace_text_op` patches (unquote, double-quote, break template, add `eval` sink, missing collection path).

</details>
