# Cross-Reference Suggestions: Terminal Documents

Recommendations for adding cross-references between `WORKFLOW_UI_TERMINALS.md` (architecture) and `WORKFLOW_UI_TERMINAL_TESTS.md` (tests).

## 1. Collection Type Summary Table → Tests Doc

The architecture doc's "Collection Type Handling Summary" table (§Collection Type Handling Summary) is an excellent quick-reference for what each connection scenario should produce. The tests doc's `canAccept` section enumerates ~42 scenarios but has no summary table.

**Suggestion**: Add a note near the top of the tests doc's `canAccept` section:
> "For a quick-reference matrix of collection type connection outcomes, see WORKFLOW_UI_TERMINALS.md §Collection Type Handling Summary."

## 2. Coverage Gaps → Architecture Doc

The tests doc identifies 11 specific coverage gaps (§Gaps and Uncovered Areas). The architecture doc's test coverage section is a brief summary that doesn't mention gaps.

**Suggestion**: Add to the architecture doc's §Test Coverage:
> "For detailed coverage gap analysis, see WORKFLOW_UI_TERMINAL_TESTS.md §Gaps and Uncovered Areas."

## 3. Fixture Step ID Mapping → Architecture Doc

The tests doc (§Test Data Fixtures) has a precise mapping of fixture step IDs to terminal types (e.g., `id:21` = `paired_or_unpaired`, `id:17` = `filter_failed`). The architecture doc discusses collection type handling in depth but doesn't reference which scenarios have test fixture coverage.

**Suggestion**: Add to the architecture doc's §Collection Type Handling Summary or §Test Coverage:
> "Test fixtures in `parameter_steps.json` cover all rows of this table; see WORKFLOW_UI_TERMINAL_TESTS.md §Test Data Fixtures for the step ID mapping."

## 4. `useTerminal` Reactivity Bridge → Tests Doc

The architecture doc explains how the `useTerminal` composable watches store state and rebuilds terminal instances (§Integration with Vue Components > useTerminal Composable). The tests doc's `rebuildTerminal` helper section notes this briefly but could make the connection more explicit.

**Suggestion**: Add to the tests doc's `rebuildTerminal` helper description:
> "This mirrors production behavior in the `useTerminal` composable; see WORKFLOW_UI_TERMINALS.md §useTerminal Composable for the full reactivity architecture."

## 5. `producesAcceptableDatatype` Dual Nature

Both docs describe this function but from different angles. The tests doc treats it as a standalone export (§Describe Block 4). The architecture doc describes it within BaseInputTerminal's method table as `_producesAcceptableDatatype`. Neither clearly notes it is *both* an exported standalone function and invoked internally by `_producesAcceptableDatatype()` on BaseInputTerminal.

**Suggestion**: Clarify in the architecture doc's BaseInputTerminal section:
> "`_producesAcceptableDatatype(other)` delegates to the standalone exported function `producesAcceptableDatatype()`, which is also tested independently (see WORKFLOW_UI_TERMINAL_TESTS.md §Describe Block 4)."

## 6. Related Documents Section

Neither doc links to the other or to `FRAMEWORK_WORKFLOW_TESTS.md` (the backend/API workflow testing white paper).

**Suggestion**: Add a "Related Documents" section to both:

```markdown
## Related Documents

- `WORKFLOW_UI_TERMINALS.md` — Architecture of the terminals module
- `WORKFLOW_UI_TERMINAL_TESTS.md` — Test coverage analysis
- `FRAMEWORK_WORKFLOW_TESTS.md` — Backend workflow test frameworks (YAML-based + API)
```
