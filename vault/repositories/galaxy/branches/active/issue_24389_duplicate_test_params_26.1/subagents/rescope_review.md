# Re-scope review

Verdict: approve, no bugs. I acted on the main suggestion. A dedicated test, `test_data_test_param_edit_attributes_survive_json_round_trip`, replaces the serialization assertion that was piggybacked on the duplicate test. It checks the round-tripped `required_files` dict shape. Before relying on it, I confirmed it goes red by restoring the old `xml.py` in the worktree. A check against an extracted lib copy would have been invalid, because pytest's config puts the worktree `lib` first on the path. I also reworded the commit message to say what actually happens: `Tool.tests` becomes None and `/api/tools/{id}/test_data` raises. Amended as `a462963ff1d`.

Not acted on:
- `EditAttributeDict` TypedDict: the containing `ToolSourceTestInputAttributes` is `Dict[str, Any]`, so it adds little.
- Splitting into its own PR against an older release: optional, and small enough to ride along. The PR body should list it as a separate fix.

<details><summary>Full review</summary>

**Verdict: approve.** Correct and safe, and it fixes a long-standing bug end to end. Release-appropriate.

**Q1, consumers:** the parser is the only producer. The three consumers (`verify/parse.py:602` `require_file`, `verify/interactor.py:2300` `test_data_iter`, `case.py` `_comparable_test_input`) only call `.get()`. Nothing uses `.attrib`/`.tag`/`.text`, iteration, etree serialization, pickling or isinstance. The generated composite rename was already a dict, so the list was mixed before and is now uniform. Side effect: `require_file`'s `(value, extra) not in required_files` now dedupes identical explicit renames, which is harmless.

**Q2, JSON path:** real.
- `Tool.parse_tests` (`tools/__init__.py:1645-1650`) caches `json.dumps([t.to_dict()...])`. On any exception it logs and sets `__tests = None`.
- `/api/tools/{id}/test_data` (`api/tools.py:673`) then iterates None and raises a TypeError.
- `GalaxyInteractorApi.get_tool_tests` and `verify_tool` (framework tests, galaxy-tool-test, planemo) depend on that endpoint.
- Probe at profiles 16.04 and 24.2: base and `497b90bc667` raise `_Element is not JSON serializable`; HEAD round-trips `edit_attributes: [{'type': 'name', 'value': 'renamed'}]`.
- The bug has been present since 071c3767735 (≥24.2), and no functional test tool uses `<edit_attributes>`.

**Q3, test:** the added assertion fails without the fix but is weak and in the wrong place: it's unrelated to duplicates and checks no content. Suggested a dedicated round-trip test (adopted).

**Q4, release branch:** yes. It's a one-line, value-preserving change. Call it out separately in the PR description.

**Nits:** commit-message precision (done); optional TypedDict (skipped); comment goes away with the dedicated test (done).

154 passed, 1 skipped. No security concerns.
</details>
