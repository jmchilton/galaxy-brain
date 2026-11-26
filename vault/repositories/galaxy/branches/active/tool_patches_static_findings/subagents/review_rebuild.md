# Review: rebuilt integration commit 8e5cda36884

Reviewer: normal review subagent, read-only. Scope: `git show 8e5cda36884` on top of tool_security_static_findings (d4ae281e442) + tool_patches.

## Verdict

Shape is right: thin (`patch_review.py` 80 lines), offline, reuses `patches_as_dicts`, `review_tool_source`, `ToolPatchDatabase.apply_patches`, `finding_to_dict`, `sorted_refs`. Every fix from `review_integration.md` survived: `finding_match` with context + `sorted_refs`, `unanalyzed_added`, computed `cleared`/`introduced`, judging the patched source, error on an unloadable collection, `--guid`. `test_patch_review.py`: 15 passed.

It has **two real regression-detection holes**, both reproduced with scratch probes: a patch that **raises the severity** of an existing finding, and a patch that makes a finding **uncheckable** without adding a finding. In both, `regressed` is False and the CLI exits 0. Fix both before handoff. The rest are nits.

## Bugs

1. **A severity raise under the same match key is not "introduced"** (`patch_review.py:24-26`, `:34-36`). `finding_match` leaves out severity, and the same rule + context can carry different severities depending on which characters get through. For example, `charsets.code()` gives `nested-interpreter` HIGH or MEDIUM (`charsets.py:296-301`). Probe: an awk tool with `awk 'BEGIN { print $x }'`. A patch swaps the sanitizer's `<add value="/"/>` for `<add value=";"/>`. Before is `nested-interpreter medium`, after is `nested-interpreter high`, same context and refs. Result: `introduced=[]`, `cleared=[]`, `regressed=False`, CLI exit 0, even with `--fail-on uncheckable`. A sanitizer-loosening patch is exactly the risky case. Fix: count a match whose severity got worse as introduced. A separate `worsened` list folded into `regressed` also works.
   ```python
   def _gained(before, after):
       worst = {}
       for f in before:
           k = finding_match(f)
           worst[k] = max(worst.get(k, -1), SEVERITIES.index(f.severity))
       return [f for f in after if SEVERITIES.index(f.severity) > worst.get(finding_match(f), -1)]
   ```
   With this, `cleared` becomes the findings whose severity dropped or that disappeared (symmetric). Red test: the awk/sanitizer probe, with the tool XML written to `tmp_path`.

2. **`regressed` ignores `classify()` codes and classify-only unchecked locations. Known gap: confirmed** (`patch_review.py:28-30`, `:53-62`). `_notes` reads only `report.unanalyzed` and `report.unchecked_locations`. `classify._unchecked_locations` adds locations from findings that turn `not checkable` (`classify.py:105-113`). It also adds codes (REWRITES and others) that depend on `report.rewrites` and on those locations. Probe: `identifier_single` with `${str($input1.element_identifier).encode().decode("unicode_escape")}` in place of the plain value. The shell-injection finding keeps its key (high/code), but `checkable` goes True→False. After the patch, classify gives `uncheckable-rewrites` + `command: a finding there is not decided by the characters of a value`, yet `introduced=[]`, `unanalyzed_added=[]`, `regressed=False`, exit 0. Also, the `_notes` docstring says it words notes "as the CLI's NOTE lines", but the CLI prints `classification.unchecked_locations` and `classification.reasons` (`__main__.py:271-274`), not the report's. Fix: compare classifications, keyed by location and by code, not by reason text. Reason text lists locations and expressions, so it would churn.
   ```python
   def _notes(report):
       c = classify(report)
       return report.unanalyzed + [f"unchecked {k}: {v}" for k, v in c.unchecked_locations.items()] + [str(code) for code in c.codes]
   ```
   The simplest form is above. Keying unchecked locations by location only (dropping the reason) avoids a false NEW when only the reason changes, for example NOT_ANALYSED→NOT_CHECKABLE on an already-unchecked location. Then `_notes` matches the CLI NOTE lines for real. The broken-template test (`test_cli_fails_on_a_patch_breaking_the_template`, which expects exactly 2 NEW lines) will need its expected list updated if classify adds a code there. Red test: the decode probe.

## Nits / design points

3. **The JSON `after` duplicates the top level** (`patch_review.py:66-71`, `__main__.py:130,136`). The top level is already `after.to_dict()` (the test even asserts `report["findings"] == report["after"]["findings"]`), so every finding, write, read and closer is serialised twice. Keep the top level as the patched report: it keeps `codes`, `--fail-on` and `--judge` coherent and gives the same schema as a run without patches. Drop `after` from `PatchReview.to_dict()`; library callers have `review.after.to_dict()`. Also, `before` has no `codes`/`uncheckable_locations` while the top level does. Fix 2's codes diff covers what a consumer needs from that.
4. **`--min-severity` does not filter CLEARED/NEW lines** (`__main__.py:277-285`). The help text says it hides findings below the threshold in the text output. Keeping NEW unfiltered is defensible, since any NEW fails the run, but filter CLEARED by `threshold`, or say in the help text that NEW is always shown.
5. **`--guid` is accepted silently when it can't apply**:
   - without `--tool-patch-path` (exit 0, ignored);
   - with a non-shed string (`keys.py:82`), where `is_shed_guid` is false and the tool quietly falls back to its `_local` key.

   Fix: `parser.error` when `args.guid and not args.tool_patch_paths`, and when `not is_shed_guid(args.guid)` (`__main__.py:105`).
6. **A patch that mismatches exits 0.** It prints `PATCH mismatch` (seen in a probe: `op 0: neither`), but `regressed` stays False, so offline CI over a security collection won't notice a patch that no longer applies. The goal of seeing the targeted finding cleared is documented as not checked, which is fine. A mismatched **security** state is a cheap, unambiguous signal, though. Question for John: fold `state == "mismatch"` into the failure, or add `--fail-on mismatch`?
7. **A second write in the same context is not new** (`report.py` `Report.add` merges by key into `more_lines`). The probe added a second `echo '$input1.element_identifier'` line: after has one finding with `more_lines=(3,)`, and `introduced=[]`. That's acceptable because lines shift, but the commit message says "adding a second place for it reports a new finding". Reword it to "a new location or quoting context", or count `len(more_lines)` growth.
8. **`FindingMatch = tuple[Any, ...]`** (`patch_review.py:21`). Typing could be narrower: `tuple[str, str, str, str | None, tuple[SourceRef, ...] | str | None]`. Cheap.
9. **`cleared` / `introduced` / `unanalyzed_added` are recomputed on every access.** `to_dict` computes `introduced` once directly and again through `regressed` in `main`, and the text output computes it again. That's harmless at this size; use `functools.cached_property` if the dataclass becomes frozen.
10. **Library `review_patches` doesn't see a collection that failed to load** (probe: a bad op file gets logged and skipped, and the tool is reported unmatched). The CLI guards this (`__main__.py:107-109`), and that guard belongs to the loader, so this needs no change here. It's just noted for library callers.

## Checked, fine

- Error entry when the patch review raises: `NotReviewed(..., found)` carries the unpatched source's id and version, and the test covers it. `judge_report` raising is outside the try, but that was already true on the base.
- `apply_patches` sets `patch_state` on the input source when there is a state but no applied op. In that case `after is before`, so the JSON and text stay coherent.
- `--fail-on` runs on the patched report, as the doc says. A regression fails the run whatever `--fail-on` says.
- Imports are at the top, and the comments are short.
- Tests are meaningful red/green behaviour tests (clearing, cosmetic rewrite, unquoting, a broken template, guid, judge on the patched source), with no trivial ones. Add the two red tests from bugs 1 and 2.

Probe scripts, not kept in the repo:
- `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/3992c9f6-bde5-4234-b312-7fcfd117647a/scratchpad/probe.py` (decode)
- `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/3992c9f6-bde5-4234-b312-7fcfd117647a/scratchpad/probe3.py` (severity raise)
- `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/3992c9f6-bde5-4234-b312-7fcfd117647a/scratchpad/probe4.py` (second site, guid)
