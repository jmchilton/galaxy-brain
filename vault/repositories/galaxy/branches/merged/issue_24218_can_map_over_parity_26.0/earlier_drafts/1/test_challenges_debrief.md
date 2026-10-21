# Test challenges debrief: issue_24218_can_map_over_parity_26.0

**Top line:** No test changes. All new tests sit at the right layer, use no mocks, test public behavior, and pass the red/green rules. Nothing committed or pushed.

## Red/green check

Swapped `collectionTypeDescription.ts` and `terminals.ts` for their `origin/release_26.0` versions with `git show` (no stash), ran the two test files, then restored from HEAD.

- Baseline tests (`3e3b6d75e8b`, 3 `it`s) pass on base.
- All 5 non-baseline tests fail on base at their own assertions (`expected true to be false` / strict-equal mismatch). None fail from a missing API or fixture:
  - unit: `does not map over without a remaining outer rank`, `does not map over itself`
  - terminals: `rejects paired -> list:paired_or_unpaired`, `rejects paired_or_unpaired -> list:paired_or_unpaired`, `resolves collection type source for a list:paired_or_unpaired input`. On base this last one fails at its second assert (`list:paired`). With only the canMapOver fix applied, it fails at the first assert (`list`), so it is red on each commit it covers.
- HEAD: `vitest run src/components/Workflow/Editor` (node 22.20.0) gives 17 files and 150 tests, all passing.

## Per-test challenges

- **`collectionTypeDescription.test.ts`** (new file): tests the public `canMapOver` of a pure value class against server-parity cases. It has no mocks and doesn't mirror the implementation, since the asserts are input/output pairs taken from the issue table. No API, integration or Selenium test covers client `canMapOver`, and server behavior is unchanged. Kept.
- **Overlap, unit vs terminals** (`paired` / `paired_or_unpaired` over `list:paired_or_unpaired`): the unit test pins the predicate. The terminal test pins the user-facing symptom (the editor accepting the connection), which goes through `canMatch` -> `canMapOver` -> `_effectiveMapOver`. These are different layers, not trivial duplicates. Kept both.
- **Self case and `list -> list:paired_or_unpaired`**: these exist only as unit tests. At the terminal layer they go through `canMatch` first, so a terminal test would be green on base and would add nothing. That is correct as is.
- **`list -> list:list:paired_or_unpaired`**: unit-only, because `parameter_steps.json` has no fixture for it. Adding a fixture for one row is disproportionate.
- **`resolves collection type source for a list:paired_or_unpaired input`**: changes `collection_types` on the store step inline, then calls `rebuildTerminal`. The store is reset in `beforeEach`, so nothing leaks. Writing a new fixture step would be heavier than this. It follows the neighboring `resolves collection type source` test. Kept.
- **Mocks / SimpleNamespace / restructuring**: none apply. `canMapOver` is already a pure method on a value object, and the terminal tests use the real stores with JSON fixtures.
- **client/README best practices**: the tests check behavior, have one behavior per `it`, use descriptive names and clean state per test. They meet these.

## E2E

No Selenium/Playwright test added. The fix is a client predicate that already has editor-terminal coverage (`canAccept` with the real stores). A browser test would only add a drag-and-drop check of the same rejection, at high cost, for a small 26.0 parity fix. Python is untouched, so no API test is needed.

## Not acted on

- Shared client/server parity table: the issue defers it, and it would collide with the dev-era test file at merge-forward.
- Asserting the rejection `reason` text in the terminal reject tests: the neighboring tests don't, and it would couple the tests to message wording.
