Correct shared JobInformation message fixtures, make the message-content assertion effective, and remove the duplicate CollectionProgress JavaScript suite.

The shared fixture supplied strings where the job API supplies structured messages. JobInformation consequently rendered character-index fields in its mocked test, while the content expectation ended at `expect(...)` without a matcher. CollectionProgress also ran the same four scenarios in both JavaScript and TypeScript.

| Test problem | Change |
| --- | --- |
| Four string-shaped job messages | Four `RegexJobMessage` objects with the original descriptions and explicit nullable fields |
| Message-content expectation without a matcher | Assert every numbered heading and exact visible `type`, `desc`, and `error_level` fields |
| Four duplicate CollectionProgress executions | Keep the unchanged TypeScript cases for running counts, mixed states, summary updates, and queued visibility |

***This is maintenance for Galaxy's client tests; production job-message rendering and API behavior are unchanged.***

***All four CollectionProgress scenarios and their assertions remain in the existing TypeScript suite; the focused test count falls from 18 to 14 by removing duplicate executions.***

The fixture's other consumer, ToolSuccessMessage, retains all four tests. The three affected suites pass locally, and the [fork client unit run](https://github.com/jmchilton/galaxy/actions/runs/38139208867) passes **565 test files**, including all 14 affected tests. [Client linting](https://github.com/jmchilton/galaxy/actions/runs/38139208958) and [client API tests](https://github.com/jmchilton/galaxy/actions/runs/38139208851) also pass on this SHA.

## Risks

Risks are minimal: these test-only changes are easy to reverse and establish no API or saved-workflow behavior. The shared fixture is used by two suites, both verified; every deleted progress assertion has a retained counterpart.

## Context

These are two focused cleanup findings: invalid shared message data and duplicate progress coverage. ***The branch is based directly on `dev` and changes only these three test files; it imports no readability refactoring or test-migration infrastructure.***

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>The scope stays with the fixture correction, effective assertion, and duplicate removal.</summary>

Keeping the ineffective expectation or retaining the duplicate suite would leave a requested cleanup incomplete. Broader fixture validation, extra message variants, and readability refactoring are separate changes.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The cleanup adds no helpers, wrappers, casts, or production architecture changes.</summary>

The fixture follows the existing message contract. JobInformation keeps its existing setup and other cases; CollectionProgress keeps its existing TypeScript suite. No additional code changes were requested.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Every removed progress assertion survives, and message assertions check visible rendering.</summary>

Reviewed running count 3, mixed counts 3/1/1, the update to running 1 and success 2, and queued count 3 against their retained TypeScript cases. Exact message field lists also reject rendering null metadata. The tests reuse existing API mocks; browser or server tests would add setup without improving this test-only cleanup's signal.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? Application behavior is unchanged; regressions fail client assertions on message content or progress counts.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes—rendered headings, visible fields, and progress counts.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Run the affected client suites</summary>

From `client/` with dependencies installed:

```sh
VITE_CONFIG_NATIVE_IGNORE_WARNING=true npm_config_use_node_version=22.20.0 pnpm exec vitest run src/components/JobInformation/JobInformation.test.js src/components/History/Content/Collection/CollectionProgress.test.ts src/components/Tool/ToolSuccessMessage.test.ts
```

Expected: 14 passing tests across three suites. Changed-file lint/format checks and full client typing also passed during implementation with checkout-local dependencies.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
