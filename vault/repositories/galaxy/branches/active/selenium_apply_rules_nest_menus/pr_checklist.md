Run via Claude Sonnet 5.5 at medium effort.

GENERAL checklist only: test-only change; the map-over check asserts a tool-form hint and touches no workflow or collection-mapping code.

- [x] What does the user see when it fails? Developer sees a Selenium test failure: `assert_rule_builder_source` failures print the full source dict (`, source`), and the nested-collection and map-over hint asserts show actual vs expected values; no end-user impact.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Tests assert rule-builder JSON and resulting `list:list` identifiers via API, not helper internals.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `07d55d69f66` (rules examples 3 and 4 source asserts) leads, then the selector refactor `57d840de21c`, then the new test `084390a898f`.
- [x] Are the comments free of excess archeology? Yes. Only a one-line docstring on `assert_rule_builder_source`.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
