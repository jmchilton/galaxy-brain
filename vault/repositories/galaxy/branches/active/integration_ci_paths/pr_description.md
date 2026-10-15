Reduce Integration CI runs for changes confined to test suites covered by other workflows.

| Changed paths | Before | After |
|---|---|---|
| Only unit, API, Selenium or workflow-framework test suites listed below | Run Integration | Skip Integration |
| Shared test helpers in `lib/galaxy_test/base/` | Run Integration | Run Integration |
| Integration tests, production Python, or a mix of excluded and relevant paths | Run Integration | Run Integration |

A historical replay of 300 merged `dev` PRs reduced Integration triggers from 223 to 174: 49 fewer runs, **22% of runs that previously triggered**. At roughly 211 runner-minutes per run, avoiding redundant runs matters. This is an estimate from path-filter replay, not a measured reduction after deployment.

***This changes CI selection for Galaxy contributors; Galaxy's application behavior and scientific workflow behavior stay the same.***

<details><summary>What changes, and why the refactor comes first</summary>

Integration imported API-suite helpers, directly and through `galaxy_test/conftest.py`. Excluding the whole API directory first would have skipped relevant changes. The first commit moves that shared code into `galaxy_test.base`, including `ApiTestCase`, mixins, sample-sheet helpers and the common workflow fixture. The API framework keeps its `ApiTestCase` re-export. Existing test bodies and assertions are preserved.

The second commit excludes these directories from both push and pull-request Integration triggers:

- `test/unit/`
- `test/integration_selenium/`
- `lib/galaxy_test/api/`
- `lib/galaxy_test/selenium/`
- `lib/galaxy_test/workflow/`
- `lib/galaxy/selenium/`

Changes to shared helpers still trigger Integration. `lib/galaxy/navigation/` stays included because `galaxy.tours` imports it at runtime. The weekly Tuesday run remains unchanged.

</details>

## Risks

This is a reversible CI and test-code refactor, with a risk of silently missing relevant Integration runs if future imports cross the excluded suite boundaries.

***Integration tests, shared base/driver code and their conftests must not import from `galaxy_test.api`, `galaxy_test.selenium`, `galaxy_test.workflow` or `galaxy.selenium`; shared code belongs in `galaxy_test.base`.***

<details><summary>Risk Details</summary>

- The import rule is a convention documented in the YAML, with no automated guard. A violating import could let later edits confined to an excluded directory skip Integration on both PRs and `dev` pushes, delaying detection until the weekly scheduled run.
- Relocating shared test code could affect imports, test collection or inheritance. Existing API imports retain their compatibility shim, and moved function/method bodies are unchanged.
- The historical savings estimate depends on the PR mix and runner durations; it is not a guarantee for future runs.

</details>

<details><summary>Risk Review Advice</summary>

Review the exclusion list together with Integration's import dependencies, especially the shared conftest and base/driver modules. Confirm that shared helpers remain in included paths. Rolling back the path-filter commit restores broader coverage without undoing the helper relocation.

</details>

## Context

Companion to [integration_ci_scope](https://github.com/jmchilton/galaxy/tree/integration_ci_scope), which selects costly test families within Integration. ***This branch independently decides whether Integration runs at all; it does not change sharding, select plugin families, or alter other workflows' filters.*** An API-module allowlist was considered and replaced with shared-code relocation so the path list does not need individual helper exceptions.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the shared-code relocation and path exclusions together.</summary>

An allowlist, splitting the PR, reciprocal exclusions in other workflows, and finer family selection were considered. Those alternatives either retain the dependency-maintenance problem or require separate analysis. No import guard is included.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Shared imports move before exclusions, preserving existing test behavior.</summary>

The common workflow fixture is reused, non-API imports reference `base`, and the refactor precedes the filter change. The remaining import-convention risk is disclosed above.

</details>

### ✅ Second Frontier Model Review

<details><summary>Moved function and method bodies remain unchanged.</summary>

AST comparison checked the moved code. The final polish checklist independently repeated that comparison and found no failing agent-checkable items. Human review remains outstanding.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? A future import-rule violation could silently skip relevant Integration runs; runtime test diagnostics are preserved.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A; existing behavioral tests are preserved.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? Explain regression coverage and asynchronous metadata waits.

## How to test the changes?

- [x] This is a refactoring of components with existing test coverage.

<details><summary>Validation</summary>

Before the conflict-free rebase, fork Integration, API, workflow framework, Python lint and the other runtime workflows passed at `fb7c6a96a759`. Package checks failed only on the unrelated mypy `galaxy/security/ssh_util.py:18` untyped `publickey` call. Earlier local runs exercised sample-sheet uploads, history import/export and legacy store-by behavior; an export timeout passed on rerun.

Polish independently compared moved bodies and checked 18 path-filter scenarios, identical push/PR patterns, and the preserved weekly schedule. Both rebased commits compare identically to their originals via `git range-diff`. Fresh fork CI at `ec49da686a6e` is pending; earlier CI evidence belongs to the previous head.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
