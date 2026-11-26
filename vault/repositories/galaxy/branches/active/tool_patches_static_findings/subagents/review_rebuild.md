# Review: rebuilt integration commit 8e5cda36884

Acted on in `83ece287280` (reworded integration commit, was `8e5cda36884`), `b4bcd37f017`, `fa6cea12a32`:

- Bug 1 (`b4bcd37f017`): a severity raise under the same match key is `introduced`. Per the coordinator, `cleared` stays strict (match gone), so a lowered severity is not cleared and CLEARED HIGH never prints for a finding still there as MEDIUM. Red-to-green: the awk/sanitizer probe as a synthetic tool in `tmp_path`, library and CLI exit 1.
- Bug 2 (`b4bcd37f017`): the note diff is built from `classify()`: unanalyzed parts, unchecked locations keyed by location only, and uncheckable codes, rendered as the CLI's NOTE lines. `unanalyzed_added` renamed `notes_added`. The `_notes` docstring is fixed. Red-to-green: the decode probe. Unit test: a new reason for an already-unchecked location is not new. The broken-template test needed no change.
- Nit 3 (`fa6cea12a32`): `after` dropped from `PatchReview.to_dict()`. The top level stays the patched report. `before` gains `codes`/`uncheckable_locations`; the test asserts `before` keys equal the unpatched top level minus `tool_version`.
- Nit 4 (`fa6cea12a32`): `--min-severity` filters CLEARED lines. NEW is always shown, and the help and docs say so.
- Nit 5 (`fa6cea12a32`): `parser.error` for `--guid` without `--tool-patch-path`, and for a guid that is not a full shed guid (checked via `key_from_ids`). The tests assert the error text.
- Nit 6 (`fa6cea12a32`): `--fail-on mismatch` fails on a tool with a `kind: security` unit in state `mismatch`. It needs `--tool-patch-path`. The default is unchanged and documented.
- Nit 7 (`83ece287280`): commit message reworded to "a new location or quoting context". The docs made no second-place claim.
- Nit 8 (`fa6cea12a32`): `FindingMatch` narrowed.

Not acted on:

- Nit 9 (cache `cleared`/`introduced`): `judge_report` replaces `after.findings` after `PatchReview` is built, so caching would bring back the stale-assessment bug.
- Nit 10 (library callers don't see an unloadable collection): the loader owns this. No change, per the review.

<details><summary>Full review</summary>

Reviewer: normal review subagent, read-only. Scope: `git show 8e5cda36884` on top of tool_security_static_findings (d4ae281e442) + tool_patches.

## Verdict

Shape is right: thin (`patch_review.py` 80 lines), offline, reuses `patches_as_dicts`, `review_tool_source`, `ToolPatchDatabase.apply_patches`, `finding_to_dict`, `sorted_refs`. Every fix from `review_integration.md` survived: `finding_match` with context + `sorted_refs`, `unanalyzed_added`, computed `cleared`/`introduced`, judging the patched source, error on an unloadable collection, `--guid`. `test_patch_review.py`: 15 passed.

It has **two real regression-detection holes**, both reproduced. In each, `regressed` is False and the CLI exits 0:
- a patch that **raises the severity** of an existing finding;
- a patch that makes a finding **uncheckable** without adding a finding.

Fix both, each with a red test (repros inline below). The rest are nits.

## Bugs

### 1. A severity raise under the same match key is not "introduced"

`patch_review.py:24-26` and `:34-36`. `finding_match` leaves out severity. The same rule and context can carry different severities depending on which characters get through: `charsets.code()` gives `nested-interpreter` HIGH or MEDIUM (`charsets.py:296-301`). A sanitizer-loosening patch is exactly this case.

Repro:

```xml
<tool id="probe" name="probe" version="1.0">
<command><![CDATA[awk 'BEGIN { print $x }' > '$out']]></command>
<inputs>
<param name="x" type="text" value="a"><sanitizer invalid_char=""><valid initial="string.letters"><add value="/"/></valid></sanitizer></param>
</inputs>
<outputs><data name="out" format="txt"/></outputs>
</tool>
```

The patch is `_local/probe/1.0.yml` with a single `replace_element` op:

```python
{"path": "inputs/param[@name='x']/sanitizer/valid/add", "old": '<add value="/"/>', "new": '<add value=";"/>', "occurrences": 1}
```

The patch applies. The finding goes from `nested-interpreter medium` to `nested-interpreter high`, with the same context (`inside single quotes, in awk program text`) and the same refs. `introduced=[]`, `cleared=[]`, `regressed=False`, and `main([...,"--tool-patch-path", c])` exits 0.

Fix (preferred): put worsened findings in `introduced` and keep `cleared` strict (the key is gone).

```python
def _worsened_or_new(before: list[Finding], after: list[Finding]) -> list[Finding]:
    worst: dict[FindingMatch, int] = {}
    for f in before:
        k = finding_match(f)
        worst[k] = max(worst.get(k, -1), SEVERITIES.index(f.severity))
    return [f for f in after if SEVERITIES.index(f.severity) > worst.get(finding_match(f), -1)]
```

`introduced` uses this. `cleared` stays as `_gained(after, before)` (key-only). Do not make this symmetric: a HIGH→MEDIUM drop would then print `CLEARED HIGH …` while the finding is still in the report as MEDIUM. The alternative is a separate `worsened` field folded into `regressed`. It's more JSON for little gain, so I'd take the `introduced` route.

### 2. `regressed` ignores `classify()` codes and classify-only unchecked locations

Known gap: confirmed. `_notes` (`patch_review.py:28-30`) reads only `report.unanalyzed` and `report.unchecked_locations`. `classify._unchecked_locations` (`classify.py:105-113`) also adds locations from findings that become `not checkable`, and the codes (REWRITES and others) depend on `report.rewrites` and on those locations. A patch can change these while every `finding_match` key stays the same.

Repro: in `identifier_single`, replace `echo 'identifier $input1.element_identifier' > 'output1';` with this:

```
echo 'identifier ${str($input1.element_identifier).encode().decode("unicode_escape")}' > 'output1';
```

- The shell-injection finding keeps its key and its severity (high/code), but `checkable` goes from True to False.
- After the patch, classify gives `[uncheckable-rewrites]` and `command: a finding there is not decided by the characters of a value`. Before the patch, it gave nothing.
- `introduced=[]`, `unanalyzed_added=[]`, `regressed=False`.

How big the gap is: the top-level classification is of the patched report, so `--fail-on uncheckable` does exit 1 (checked). A plain `--tool-patch-path` run, or one with only `--fail-on high`, exits 0 (checked). The hole is that `regressed` misses this independently of `--fail-on`.

Also, the `_notes` docstring says it words notes "as the CLI's NOTE lines". The CLI actually prints `classification.unchecked_locations` and `classification.reasons` (`__main__.py:271-274`), not the report's.

Fix: compare classifications, keyed by unchecked location and by code. Leave out the reason text: it lists locations and expressions, so it churns, and NOT_ANALYSED→NOT_CHECKABLE on an already-unchecked location is not new.

```python
def _notes(report: Report) -> dict[str, str]:
    """Unanalyzed parts, unchecked locations and uncheckable codes, keyed by what is compared."""
    c = classify(report)
    notes = {note: note for note in report.unanalyzed}
    notes.update({f"unchecked {loc}": f"unchecked {loc}: {why}" for loc, why in c.unchecked_locations.items()})
    notes.update({str(code): f"{code}: {why}" for code, why in c.reasons.items()})
    return notes

# unanalyzed_added: [text for key, text in _notes(after).items() if key not in _notes(before)]
```

(`unanalyzed_added` might be better renamed `notes_added`.) `test_cli_fails_on_a_patch_breaking_the_template` asserts exactly 2 NEW lines, so update its expected list if classify adds a code for the broken template.

## Nits / design points

3. **The JSON `after` duplicates the top level** (`patch_review.py:66-71`, `__main__.py:130,136`). The top level already is `after.to_dict()`, and the test asserts `report["findings"] == report["after"]["findings"]`. So every finding, write, read and closer is serialised twice. Keep the top level as the patched report: it keeps `codes`, `--fail-on` and `--judge` coherent, and the schema matches a run without patches. Drop `after` from `PatchReview.to_dict()`; library callers have `review.after.to_dict()`. This is more than a one-liner because three things change with it:
   - `doc/source/admin/tool_security_review.md` (the paragraph that lists `before` and `after`);
   - `PATCH_KEYS` in `test_patch_review.py`;
   - the `report["after"]` assertion in `test_cli_reports_patch_review`.
4. **`--min-severity` does not filter CLEARED/NEW lines** (`__main__.py:277-285`). The help text says it hides findings below the threshold in the text output. Leaving NEW unfiltered is defensible, since any NEW fails the run. Still, filter CLEARED by `threshold`, or say in the help text that NEW is always shown.
5. **`--guid` is accepted silently when it can't apply** (`__main__.py:105`):
   - Without `--tool-patch-path` it is ignored, exit 0 (checked).
   - A non-shed string makes `is_shed_guid` false (`keys.py:82`), and the tool quietly falls back to its `_local` key. Checked: `--guid not-a-guid` matched and applied the `_local` patch, exit 0.

   Fix: `parser.error` when `args.guid and not args.tool_patch_paths`, and when `not is_shed_guid(args.guid)`.
6. **A patch that mismatches exits 0.** It prints a `PATCH mismatch` line (`op 0: neither` in a probe), but `regressed` stays False. Offline CI over a security collection won't notice a patch that no longer applies. Not checking that the targeted finding cleared is documented, and that's fine. A mismatched **security** state, though, is a cheap and unambiguous signal. Question for John: fold `state == "mismatch"` into the failure, or add `--fail-on mismatch`?
7. **`FindingMatch = tuple[Any, ...]`** (`patch_review.py:21`). It could be narrower: `tuple[str, str, str, str | None, tuple[SourceRef, ...] | str | None]`. Cheap.
8. **`cleared` / `introduced` / `unanalyzed_added` are recomputed on every access.** `introduced` runs in `to_dict`, again through `regressed`, and again in the text output. Harmless at this size.
9. Note only, no change: duplicates in the same location and context merge into `more_lines` (`Report.add`), so they are not NEW. That's correct: a new location or context does report NEW.
10. Note only, no change: library `review_patches` doesn't see a collection that failed to load. The loader logs it and skips it, so the tool shows as unmatched. The CLI guards this (`__main__.py:107-109`), and the guard belongs with the loader.

## Checked, fine

- Error entry when the patch review raises: `NotReviewed(..., found)` carries the unpatched source's id and version, and a test covers it. `judge_report` raising is outside the try, but that was already true on the base.
- `apply_patches` sets `patch_state` on the input source when there is a state but no applied op. Then `after is before`, so the JSON and text stay coherent.
- `--fail-on` runs on the patched report, as the doc says. A regression fails the run whatever `--fail-on` says.
- Imports are at the top, and the comments are short.
- Tests are meaningful behaviour tests (clearing, cosmetic rewrite, unquoting, a broken template, guid, judge on the patched source), with no trivial ones. Add the two red tests from bugs 1 and 2. The tool for bug 1 can be written to `tmp_path`.

</details>
