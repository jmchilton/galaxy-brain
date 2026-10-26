Fix 🎯 #24471 — import workflows containing embedded tools after steps with workflow outputs or rename actions.

| Imported workflow | Before | After |
| --- | --- | --- |
| Earlier workflow output → embedded user tool | Import fails with a database constraint error | Imports with outputs and connections preserved |
| Earlier rename action → embedded user tool | Same failure | Imports with the rename preserved |
| Earlier output or rename → embedded admin tool | Same failure | Imports with metadata and connections preserved |

***This fixes workflow import for embedded user and admin tools, including nested user-tool workflows; it retains the existing tool permissions and ownership rules.***

Embedded-tool creation can commit the database session while a preceding workflow step is only partially constructed, producing `NOT NULL constraint failed: workflow_step.workflow_id`. Resolve embedded definitions in the existing dependency pre-pass, before constructing steps. Standalone module construction uses the same extracted resolver.

***The change preserves existing tool-creation transactions; it does not make failed imports atomic or dry runs write-free.***

## Risks

This is a reversible importer fix with no schema migration or new workflow format; the main risk is changing when embedded-tool creation and validation happen.

<details><summary>Risk Details</summary>

- Embedded definitions are resolved before parent steps are built, so tool permission or definition errors can surface earlier.
- Existing independent tool commits remain: an import that fails later can leave created tools.
- User tools retain an additional ownership lookup during module construction.

</details>

<details><summary>Risk Review Advice</summary>

Review the dependency pre-pass ordering and shared resolver against standalone callers. Check the round-trip assertions for outputs, rename actions and connections, plus the existing ownership and permission tests.

</details>

## Context

Targets `release_26.1`, the first release branch with embedded user-tool imports. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the shared user/admin ordering fix and existing transaction contract.</summary>

Deferred output/PJA persistence would address individual cascade triggers. Atomic transactions and resolution caches would add separate contracts without being needed for this failure.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The existing dependency phase and shared resolver provide the required boundary.</summary>

The resolver's possible session commit is documented. No extra cache, trusted-UUID bypass or workflow representation was added.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Eight regressions reproduce the original error; all ten import variants pass with the fix.</summary>

Two baseline cases passed before implementation. Six user-tool and two admin-tool regressions failed with the original workflow-step constraint error on the base implementation. Round-trip checks cover metadata, embedded definitions and connections. The broader selected validation covered 28 distinct relevant API cases, including permissions, sharing, execution and refactoring.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Baseline tests and resolver extraction precede the import-ordering fix.</summary>

The leading commit adds the two passing baseline cases; the next extracts resolution without changing its timing. The fix and regression cases follow.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Import fails with `NOT NULL constraint failed: workflow_step.workflow_id`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? API round trips verify imported metadata and connections.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? Explain the ordering requirement and commit side effect.
- [x] Which existing workflows change behavior (if any)? Affected embedded-tool imports now succeed, including nested imports.
- [x] Who hits this in practice and what is the evidence? Importers in #24471; eight regressions reproduce the same database error.
- [x] Were simpler or existing approaches considered? Deferred association writes fix individual triggers; transaction redesign exceeds this bug's scope.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>API coverage</summary>

Run `lib/galaxy_test/api/test_workflows.py` selecting `test_import_embedded_user_tools_after_step_metadata` and `test_import_embedded_admin_tool_after_step_metadata` for ten import variants. Existing selected user-tool API tests cover permissions, ownership and execution.

</details>

- [x] This is a refactoring of components with existing test coverage.

<details><summary>Resolver extraction</summary>

The extraction retains the resolution policy used by standalone module construction; the importer adds an earlier call.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
