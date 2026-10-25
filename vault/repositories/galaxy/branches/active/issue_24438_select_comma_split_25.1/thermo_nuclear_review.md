# Thermo-nuclear review (round 2)

**Acted on 1 finding:** the new linter re-implemented `inputs._iter_param` (it skipped params with no name or argument, then called `_parse_name`). It now imports and uses that helper, which removes the bespoke comprehension and the `_parse_name` import. This was folded into the linter commit with a fixup and autosquash, so that commit is now `30baf371bf0`. The new HEAD is `386a1c925b0`, and a backup of the old HEAD is on `issue_24438_select_comma_split_25.1_backup_thermo`. Verdict: approve. Nothing blocks.

## Not acted on

1. **Extract a helper that builds the comma-select map.** It would have only one caller. The sibling linters in `tests.py` and `inputs.py` are flat, single-body classes, and the body shrank after the `_iter_param` swap. A helper would just be a thin wrapper.
2. **Move `_iter_param` into `_util.py` instead of importing it from `.inputs`.** A move would touch `inputs.py` on a release branch, and dev's copy has already diverged (`tuple` vs `Tuple`), so it would cause a forward-merge conflict. The import is cycle-free because `inputs.py` doesn't import `.tests`. Lint discovery doesn't pick it up either: its name has no `lint_` prefix and it isn't a `Linter`.
3. **Key test params by qualified path (`inputs._param_path`) instead of skipping duplicate short names.** Legacy test parsing accepts both short names and `|` paths, so keying by full path would miss tests that use the short name. The conservative skip from codex round 2 is the right trade for 25.1.
4. **Code judo: detect this from the validated test-case path (`parameters/case.py` and `TestsCaseValidation`) instead of raw XML.** That path models multiple selects and their options properly, so it is the long-term home. But it is gated by profile and oriented toward dev, so it is out of scope for a 25.1 fix.
5. **The `parse.py` helper:** it is unchanged since round 1. See `earlier_drafts/1/thermo_nuclear_review.md`.
6. **The xsd wording:** it is accurate given the parse fix, so no change was needed.

<details>
<summary>Full review</summary>

### Scope
`git diff origin/release_25.1...HEAD` has 4 commits. The focus was the `TestsParamMultipleSelectCommaOptions` linter in `lib/galaxy/tool_util/linters/tests.py`. That file is now 674 lines, well below 1k.

### Structural / reuse
- **Bespoke near-duplicate of a canonical helper (acted on).** The comprehension `(_parse_name(name, argument), param) for param in tool_xml.findall(".//inputs//param") if name or argument` duplicated `inputs._iter_param`. It now reads `input_params = list(_iter_param(tool_xml))`, and the tuple order at the use sites was flipped to match. The `Counter` still runs over *all* params, not only selects, so duplicates across types are still skipped (the codex round 2 fix).
- Small differences in behavior, both harmless:
  - `_iter_param` searches `./inputs//param` where the old code searched `.//inputs//param`. The new path is more precise, since inputs only appear under the tool root.
  - `_iter_param` checks whether a key is present, where the old code checked whether it was truthy. So `name=""` with no `argument` now yields `""`. A match would need a test param literally named `""`, and `InputsNameEmpty` already flags an empty name.
- `string_as_bool(param.attrib.get("multiple", "false"))` matches the idiom in `inputs.py` (`InputsSelectMultipleCheckboxes` and others).

### Branching / legibility
The body runs in two phases: first build the comma-select map, then check test `value=` params against it, with one early return between them. The two conditions that skip a select (wrong type or duplicate name, then not multiple) sit at the top of the loop. That is acceptable for a linter of this size.

### Boundaries / types
`Dict[str, Set[str]]` is explicit. It uses `typing` generics, which matches the file on 25.1.

### Tests
- No tests were changed. The fixture already covers nameless and `argument`-only params, duplicate names across types, sections and `|` paths, `value_json`, and empty values.
- Ran `test_tool_linters.py`, `test_test_definition_parsing.py` and `test_parameter_test_cases.py` before and after the autosquash: 103 passed, 1 skipped.
- black and ruff are clean, and the pre-commit hooks passed.
- mypy on `tests.py` reports no errors in `linters/`. Its 50 errors are in unrelated modules and come from the environment.

</details>
