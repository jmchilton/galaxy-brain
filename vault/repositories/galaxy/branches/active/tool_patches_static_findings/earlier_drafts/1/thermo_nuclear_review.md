Run via Claude Opus at high effort.

# Thermo-nuclear review: patch review integration

Scope: `git diff tool_security_static_findings...HEAD -- lib/galaxy/tool_util/security test/unit/tool_util/security doc` at `a417855700b`. The review was done by a read-only subagent.

Acted on in `c5b8f3cab24` and `b53897840ee`:

- **Bug 1** (`c5b8f3cab24`): capability findings were matched by `expr`, which for an import is the whole `#import` statement. Appending a harmless module or reordering the line read as CLEARED plus NEW critical, with exit 1. Capability findings are now matched by `message`, which names the module or dotted name. Red-to-green: a synthetic importing tool with append and reorder cases. Docs say capabilities match by message.
- **2** (`b53897840ee`): `note_lines(report, classification)` in `patch_review.py` is now the single source of NOTE lines. `_print_report` and `notes_added` both use it.
- **3** (`b53897840ee`): `report_dict(report, classification)` builds both the CLI top-level report and the JSON `before`.
- **4** (`b53897840ee`): `--fail-on mismatch` is folded into `FailOn.met(..., review)`. `regressed` stays the one unconditional patch rule in `main`.
- **5** (`b53897840ee`): the patch-option guards and the collection-load check moved into `_patch_database(parser, args)`.
- **Nits 7, 8, 9** (`b53897840ee`):
  - `MISMATCH` and `SECURITY` constants replace the string literals.
  - New `PatchReview.states` property.
  - `REPRODUCIBILITY_LEVELS[-1]` replaces `"ordinary_inputs"`.

Checks:

- With and without a patch collection, the text and JSON CLI output is byte-identical before and after `b53897840ee` (spec tools + `identifier_single`, from a temp worktree).
- Analyser dump byte-identical to the base.
- 795 tests pass.
- ruff, black and isort are clean. mypy shows only the existing `managers/notification.py` error.

Not acted on:

- **Bug 1, cost of matching by message:** `capability-obfuscation` has a constant message, so a second encoded blob in a location that already has one is no longer NEW. The reviewer's fallback, `(message, expr)` everywhere except the import rules, needs a rule special case. Decision for John.
  - Also, `Report.add` merges capability findings by `(rule, location, expr)`. One `#import` that names two modules of the same rule therefore keeps only the first module's message. Reordering such a line still reads as cleared plus new. This is narrow, and fixing it needs an analyser change.
- **5 (optional):** a `load_collection` in `patches/database.py` to report the real load error. That is parent (`tool_patches`) code.
- **Nit 6:** sharing the finding-line format between `_print_report` and `_print_patch_review`. The label padding differs, so sharing it would change the base CLI output.
- **Nit 10:** `FindingMatch` as a `NamedTuple`. Low value.
- **Placement:** `note_lines` and `report_dict` live in `patch_review.py` rather than `classify.py`, so the base analyser modules stay untouched. They could move to `classify.py` if the base is reopened.

<details><summary>Full review</summary>

## Verdict

**Changes requested.** The branch is small and thin. It reuses `review_tool_source`, `apply_patches`, `patches_as_dicts`, `key_from_ids`, `sorted_refs` and `finding_to_dict`. No file nears 1k lines (`__main__.py` 314, `patch_review.py` 106). Imports are at the top of each file. All 26 tests in `test_patch_review.py` pass.

Findings:
- **One real correctness bug.** Capability findings are matched by template text, and an `#import` line makes this easy to hit. It produces a false CLEARED critical, a false NEW critical and exit 1.
- **Three structural reuse problems:**
  - The NOTE-line rendering is duplicated.
  - The report dict is duplicated.
  - The failure policy is split between `FailOn` and an inline `patch_failed`.
- The rest are nits.

Checked and fine:
- Narrowing one of two sources clears only that finding and introduces nothing. Probed `$a$b`→`$a'$b'`, dropping `$b`, and a `#set` concatenation; the analyser splits these findings per source.
- An unloadable collection gives a clean usage error with exit 2.
- `unanalyzed` notes carry no line numbers, so shifting lines cannot fake `notes_added`.

## Real bugs

### 1. Capability findings are matched by raw `#import` text: false CLEARED and false NEW, exit 1

`patch_review.py:29`

```python
return (finding.rule, finding.kind, finding.location, finding.context, sorted_refs(finding.refs) or finding.expr)
```

- Capability findings never have `refs` or `context`, so they always fall back to `expr`.
- For an import, the analyser sets `expr = ast.unparse(node)` (`capabilities.py:220`), which is the whole statement.
- Any edit to an import line therefore changes the match key, even when the module's finding is unchanged.

Reproduced with a synthetic tool whose command is `#import os, subprocess` followed by `echo ${os.getcwd()} > '$out'`, and a security patch with a single `replace_text` on the import line.

| Patch to the import line | cleared | introduced | `regressed` | CLI exit |
|---|---|---|---|---|
| append harmless `re` (`#import os, subprocess, re`) | `template-exec` critical | `template-exec` critical, same message | True | 1 |
| reorder only (`#import subprocess, os`) | `template-exec` critical | `template-exec` critical | True | 1 |

- A patch that adds `re` for a sanitising `re.sub` to an existing import line fails the gate.
- The text output then shows `CLEARED CRITICAL template-exec` for a finding that is still present.
- This also contradicts the docs, which say findings are matched "not by template text".

Fix options:

**(a) Key capability findings on `message`.** It names the module, dotted name or program.

```diff
-    return (finding.rule, finding.kind, finding.location, finding.context, sorted_refs(finding.refs) or finding.expr)
+    named = finding.message if finding.kind == CAPABILITY else finding.expr
+    return (finding.rule, finding.kind, finding.location, finding.context, sorted_refs(finding.refs) or named)
```

The cost: `capability-obfuscation` has a constant message ("Contains a long encoded blob."), so a second blob added in the same location would no longer be NEW. If that matters, use `(message, expr)` for every capability rule except the import ones. That is a special case.

**(b) Keep the behaviour, fix the docs, and pin it with a test.**

Related, no action needed: vulnerability findings come only from `interp.py:1279`, with `refs=source_refs(text.sources)`. If those refs could ever be empty, the same fallback would key on raw `expr`. No such case was found.

## Structural / reuse

### 2. NOTE lines are rendered twice, with copy-pasted format strings

- `patch_review.py:32-40` (`_notes`) and `__main__.py:285-290` (`_print_report`) contain the same three loops and f-strings.
- `notes_added` is only correct while these two copies stay in sync, and no test fails if one changes.
- Make the keyed notes the single source:
  - `note_lines(report, classification) -> dict[tuple[str, str], str]`;
  - the printer iterates `.values()`;
  - `notes_added` diffs the keys.
- Output order is unchanged.
- The natural home is `classify.py`. Put it in `patch_review.py` if the base must stay untouched.

### 3. The report dict is built in two places

`patch_review.py:43-49` (`_report_dict`) and `__main__.py:137-143` both splice `codes` and `uncheckable_locations` onto `report.to_dict()`.
- Make one public `report_dict(report, classification)`.
- Have `main` build `{"tool_id": ..., "tool_version": ..., **report_dict(report, classification)}`.
- The `before == top level minus tool_version` invariant then holds by construction.

### 4. The failure policy is split between `FailOn` and an inline predicate in `main`

- `FailOn.mismatch` carries a "Checked by the caller" comment, and `main` has a separate `patch_failed` expression.
- Fold mismatch into `met(report, classification, review=None)`.
- Keep `review.regressed` as the one unconditional rule in `main`.

### 5. Patch-option guards bloat `main`

- 11 lines of patch-only checks sit at the top of `main`. Move them, with `_patch_database`, into `_patch_database(parser, args)`.
- Optional: a `load_collection(path)` in `patches/database.py` that raises `CollectionError` would let the CLI report the real reason. That is parent-branch code.

## Nits

6. The finding-line format is duplicated at `__main__.py:280` and `:301`. Extract `_finding_line(label, finding)`, then check the padding.
7. `"mismatch"` and `"security"` are literals at `patch_review.py:84`. Use `MISMATCH` (`patches/engine.py`) and `SECURITY` (`patches/model.py`).
8. The None-guard `self.patch.states if self.patch else []` is repeated. Add a `PatchReview.states` property.
9. `reproducibility="ordinary_inputs"` reads as arbitrary. Use `REPRODUCIBILITY_LEVELS[-1]`.
10. `FindingMatch` is a bare 5-tuple. A `NamedTuple` would be more readable. Optional.

</details>
