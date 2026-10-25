# Thermo-nuclear review

**Acted on nothing. No code changes.** Verdict: approve. The diff is a small, private helper that replaces `split_if_str` at the two sites with the bug. It adds no new branching to the busy `_process_raw_inputs` flow, and `parse.py` stays at 621 lines. No code-judo move would make it meaningfully simpler for a release-branch fix.

## Not acted on

1. **Conditional site could be a bare `[case_when]`**: a conditional test param is never `data` or `multiple`, so the helper always wraps there. Not done. Using the same helper at both sites keeps one rule in one place, while inlining it would add a special case.
2. **Fold the `param_type != "text"` gate into the helper**: not done. A text value would then be wrapped as `[value]` instead of passed as a raw string, which changes behavior on a release branch.
3. **`param_type` is computed in both the helper and the caller**: not done. The conditional call site has no `param_type` local (normal review 1 reached the same conclusion).
4. **The return type is `Any` and the name says "as list"**: not done. A non-string `value_json` value (a list, bool or int) passes through unchanged, as it did with `split_if_str`. Narrowing the type would mean a wider cleanup of the neighboring helpers.
5. **The ftpfile default (`param_type == "ftpfile"`) is a one-off**: not done. `tool_util` has no canonical "default multiple per type" helper (searched with grep: `ftpfile` appears nowhere else in `tool_util` apart from the xsd). It is a single expression with a comment that points to `FTPFileToolParameter`. Adding a type-to-default table for one entry would be a thin abstraction.
6. **The data `location` branch still uses `get_bool("multiple", False)` with a separate `split_if_str(location)`**: that code predates this branch, the data default is False so the two rules agree, and it is out of scope.

<details>
<summary>Full review</summary>

### Scope
`git diff origin/release_25.1...HEAD` has 2 commits, `4b8173d90ec` and `6caf89ba51d`. Changed: `lib/galaxy/tool_util/verify/parse.py` (+10/-2), the new `test/functional/tools/select_comma_value.xml` plus its line in `sample_tool_conf.xml`, and one ftpfile unit test in `test/unit/tool_util/test_test_definition_parsing.py`.

### Structural / code judo
- The fix is one predicate ("split only for data or multiple inputs") placed in a named helper and used at both sites that had the bug. This is the smallest correct shape: no flags, modes or extra arguments are threaded through `_process_raw_inputs`.
- It matches the sibling path `tool_util/parameters/case.py`, which already splits comma strings only when `parameter.multiple`. So the change brings the two parse paths into agreement.
- A larger reframing would retire the legacy `_process_raw_inputs` path in favor of the validated test-case-state path (`case.py`). That is the real long-term fix, but it is dev-only and far out of scope for a 25.1 bug fix.

### Spaghetti / branching
- No new conditionals in the main loop: the call site went from `split_if_str(x)` to `_test_value_as_list(input_source, x)`.
- The helper has one compound condition and a fallback, all in one place. The ftpfile default is an argument to `get_bool`, not a separate branch.

### Boundaries / types
- `Any` in and out matches the neighboring helpers (`split_if_str`, `_process_simple_value`). See not-acted item 4.
- `input_source.get_bool("multiple", ...)` is the canonical idiom (`tool_util/parameters/factory.py`, `tools/parameters/basic.py`). `multiple_select_value_split` in `parser/util.py` is not a drop-in replacement, because it also splits on newlines and strips whitespace (normal review 1).

### File size
`parse.py` is 621 lines, nowhere near 1k.

### Tests
- The framework tool checks both shapes from the issue (a plain select, and a conditional `when` value that contains commas) plus `value_json`, and asserts the real command output.
- The ftpfile unit test pins the regression found in the codex review and needs no server. It is small and kept on purpose: no framework tool declares `ftpfile`, so no framework test covers that case.
- I made no code changes, so I did not rerun the tests. Earlier debriefs report them green.

### Forward-merge note
Dev's site checks `param_type in ("data", "hidden_data")`, so the helper condition needs `hidden_data` added on merge (already in the initial debrief).

</details>
