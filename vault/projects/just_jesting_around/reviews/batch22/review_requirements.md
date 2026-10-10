# Review: requirements.test.js

Approved.

Suite run: 28/28 pass (`NODE_OPTIONS=--no-webstorage pnpm exec vitest run src/components/Markdown/Utilities/requirements.test.js`). Only that test file changed. No production code touched.

## Original cases and where they live now

| Original case (assertions) | New form |
|---|---|
| getRequiredObject known tool (tool_a, tool_c, tool_d → exact type, `toBe`) | `it.each` "returns the object type listed for %s", 3 rows, same matcher |
| getRequiredObject 'none' (tool_x → null) | same case, renamed |
| getRequiredObject unknown (nonexistent_tool, undefined → null) | `it.each` 2 rows |
| getRequiredLabels known types (composed via tool_a, tool_c, tool_d) | `it.each` on object types hdi, hdci, job_id; same `toEqual` labels |
| getRequiredLabels unknown or none (composed via tool_x, nonexistent_tool → []) | `getRequiredLabels(null)` → [] |
| hasValidLabel one present (tool_a, input A, output Wrong → true) | "exactly one required label matches" |
| hasValidLabel none matched (→ false) | kept |
| hasValidLabel tool_x, {} → true | `it.each` row "a 'none' tool" |
| hasValidLabel labels undefined (tool_d → true) | kept |
| hasValidLabel nonexistent_tool, {} → true | `it.each` row "an unknown tool" |
| hasValidObject present (tool_a, tool_d) | `it.each` 2 rows |
| hasValidObject missing (tool_a, tool_d) | `it.each` 2 rows |
| hasValidObject collection fallback / implicit-collection-jobs fallback | unchanged |
| hasValidName known (tool_a, tool_c, tool_x) / unknown (some_unknown_tool, undefined) | `it.each` 3 rows / 2 rows |

Added: both-labels-match rejection (pins `matchCount === 1`), and `getRequiredLabels("history_id")` → [] (a real object type with no label rule).

## Extra focus: composed `getRequiredObject` → `getRequiredLabels` paths

Every original composed path is still covered. Both functions are pure, and each link is asserted exactly:

- tool_a → `history_dataset_id` → `["input","output"]`
- tool_c → `history_dataset_collection_id` → `["input","output"]`
- tool_d → `job_id` → `["step"]`
- tool_x → `null` (`toBeNull`) → `[]` (`getRequiredLabels(null)`)
- nonexistent_tool → `null` → `[]`

Each `getRequiredObject` output is asserted with `toBe`/`toBeNull`, and the same value is a `getRequiredLabels` input row, so the chain has no gap. The `hasValidLabel` cases also run the real composition end to end: tool_x and nonexistent_tool with defined labels and `{}` return true only if `requiredLabels` is empty, and the tool_a true/false pair needs `input` to be among the required labels. Restoring the composed calls would add no coverage. The split also makes each `getRequiredLabels` case independent of the YAML mock.

## Findings

- Boundaries: same mock data. Dropping `{ virtual: true }` is correct. Vitest's `vi.mock` takes no third argument, and the real `requirements.yml` exists, so the factory still replaces it. The passing tool_* rows prove the mock applies.
- Readability: clearer. Each row names its failing input, names state behavior and condition, and the inline args remove the `const args` indirection. No leftover noise.
- Reuse: pure module test. There is no `WorkflowLabel` factory under `tests/test-data`, `tests/vitest` or `__mocks__`, and the only other inline label list is in `MarkdownGalaxy.test.js` with a different shape. A module-level constant is right here.
- Scope: no process comments.
- Optional nit, not a blocker: "accepts any arguments when workflow labels are undefined" says more than one `{ step: "S" }` input shows. The case still has teeth, because removing the `labels !== undefined` guard would throw.
