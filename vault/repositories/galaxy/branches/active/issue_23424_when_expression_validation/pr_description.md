Fix 🎯 #23424 — reject recognized obsolete flat nested tool-input references when importing or updating a workflow.

A presence condition can silently run the wrong step. With nested state `cond.input1 = null`, Galaxy's actual expression evaluator gives these results:

| `when` condition | Result | Import on `dev` | Import with this change |
| --- | --- | --- | --- |
| `$(inputs["cond\|input1"] !== null)` | `true`: step runs | Accepted | HTTP 400 |
| `$(inputs.cond.input1 !== null)` | `false`: step skips | Accepted | Accepted |

The flat name reads `undefined`, and `undefined !== null` is true. Rejecting that spelling at the write boundary catches the error for API clients as well as workflow authors. The response identifies the step and reference and shows a supported nested spelling:

```text
Workflow step [1] ('gated') has an invalid nested input reference
inputs["cond|input1"] in its when expression. Use the nested tool-state
path instead, such as inputs["cond"]["input1"] for the connection cond|input1.
```

***This protects workflow imports and updates of tool steps; previously stored workflows retain their execution behavior until repaired.*** Nested conditional inputs use dot or chained bracket access; repeated inputs need array indexing, for example `inputs.queries[0].input2` for `queries_0|input2`.

***This is a targeted migration check: uncertain JavaScript is accepted conservatively, so it does not validate every input reference or expression.*** Computed keys, local bindings/rebinding, Unicode identifiers, templates and undecoded escapes may fall outside analysis. A recognized obsolete root still rejects before a computed child or alongside a separate ordinary dynamic access. Subworkflow input labels containing a pipe remain valid.

## Risks

This tightens the workflow authoring API: older broken tool conditions must be migrated before an import or save succeeds.

<details><summary>Risk Details</summary>

- Import/update rejection changes the accepted workflow-artifact contract, even though the affected well-formed tool references already read the wrong runtime value.
- Conservative acceptance deliberately leaves detection gaps for uncertain JavaScript; the check does not prove a workflow's condition correct.
- The rule assumes well-formed tool inputs. It does not resolve malformed connections, missing tools or arbitrary tool-state paths.
- Backend rejection uses a stricter analysis boundary than permissive editor edge matching. The shared specification covers their overlapping static/dynamic subset.

</details>

<details><summary>Risk Review Advice</summary>

Review the decision to block imports/saves of these older conditions, the tool-only restriction, and the conservative acceptance cases. The API update regression checks that a rejected save preserves the previously stored workflow. Consider a full resolver or editor repair flow separately if a broader migration contract is desired.

</details>

## Context

Builds on 🔀 #23409, which removed flat nested tool-input aliases, and 🔀 #23816, which introduced path-based editor reference analysis. Both are merged into `dev`. This recovers the implementation previously proposed in closed 🔀 #23817, with compatibility fixes and import/update coverage; the old stacked-base dependency no longer applies.

<details><summary>Validation</summary>

The targeted suite passes 29 cases: six real workflow API tests and 23 fast analyzer tests (22 backend regressions plus the shared specification). Sixteen accepted expressions also evaluate successfully through Galaxy's actual JavaScript evaluator. The original rejection test was run with `dev`'s unmodified workflow manager in the same API harness and failed at the HTTP 400 assertion because it received HTTP 200. Python lint, formatting/import checks, analyzer type checking and commit hooks pass. Fork CI on the pushed head is pending.

</details>

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>The implemented migration rule keeps the issue's proposed first-pass scope.</summary>

Warning-only persistence, full reference resolution, full parsing, editor repair and runtime/value_from diagnostics were evaluated as separate alternatives. Conservative compatibility fixes fit the current scope.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The strict maintainability review's three recommendations were implemented.</summary>

Removed an unused Python port of client matching policy, corrected quoted-arrow detection, and accepted assignment rebinding conservatively. Kept lexical analysis isolated and bounded; this review process was run by Codex.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Exhaustive analyzer regressions complement six representative API tests.</summary>

Syntax combinations use fast analyzer tests; API tests cover import diagnostics, mixed static/dynamic rejection, accepted expressions, legal subworkflow pipe labels and failed-update persistence. The shared static/dynamic specification remains intact. Browser coverage is inapplicable to this server change; editor-format HTTP updates cover the save contract.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? HTTP 400 names the step and obsolete reference, with a nested-path example.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; shared cross-language expectations complement real API tests.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc. — what purpose do they serve? They explain the strict-server versus permissive-editor compatibility boundary.
- [x] Which existing workflows change behavior (if any)? Imports/saves with recognized obsolete flat tool-input roots require repair.
- [x] Who hits this in practice and what is the evidence? Authors retaining removed aliases; #23424, real evaluator results and API rejection regressions.
- [x] Were simpler or existing approaches considered? Yes; warnings, regex matching, full parsing/resolution and editor repair are covered in the scope evaluation.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Run the focused import/update and shared-spec regressions</summary>

```shell
pytest -q test/unit/workflows/test_when_expression.py
./run_tests.sh -api lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi \
  -- -k 'import_rejects_flat_nested_tool_when_reference or import_allows_dynamic_tool_when_reference or import_allows_nested_tool_when_references or import_allows_flat_subworkflow_when_reference or update_rejects_flat_nested_tool_when_reference'
```

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
