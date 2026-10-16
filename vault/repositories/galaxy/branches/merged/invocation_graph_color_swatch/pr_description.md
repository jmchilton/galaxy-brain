Fix the invocation graph showing a color parameter input as bold hex text instead of the color swatch the run form's graph shows.

Run a workflow with a `color` parameter input, then open the invocation's **Overview**. The input node only shows the value in bold. The run form's graph draws a swatch for the same value, using the same node component:

| Invocation Overview, before | With this branch |
| --- | --- |
| ![Highlight color input node shows bold #e31a1c text, no swatch](screenshots/before_graph_closeup.png) | ![Highlight color input node shows #e31a1c: and a red swatch](screenshots/after_graph_closeup.png) |

`NodeInvocationText` draws the swatch only when the node text is a bare `#rrggbb`. The invocation graph wrapped every non-boolean parameter value in `<b>`, so a color never matched. ***The fix decides by the step's declared parameter type, as the run graph does, not by how the value looks: a text parameter whose value happens to be `#ff0000` stays bold text.***

***Not a regression: the invocation graph has bolded parameter values since 🔀 #18615, before the swatch existed, so color inputs have never shown one there.***

***Only color-typed inputs change: other parameter types render as before, and the run form's graph and `NodeInvocationText` are untouched.***

<details><summary>Implementation</summary>

- `useInvocationGraph.ts` `initializeGraphInput`: when the step's parameter output type is `color` and the value is a string, pass the raw value through as `nodeText`. Booleans and all other types are unchanged. A color value that isn't `#rrggbb` (the API doesn't enforce the format) now shows as plain text, as it does in the run graph.
- The type comes from the editor-style workflow the composable already loads, so there's no new request. On a real server that download reports `outputs[0].type === "color"` for a color parameter input step.
- `NodeInvocationText.vue` is unchanged; the fix makes the invocation graph reach its existing swatch branch.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It's a client-only display change with no API change.

## Context

The run graph got the swatch in 🔀 #19294 (25.0); the invocation graph's `<b>` wrapping comes from 🔀 #18615 (24.2), so color inputs have never shown a swatch there. Targets `release_26.2`; it merges cleanly into `dev`. A `directory_uri` input still lacks the run graph's `Directory:` label in the invocation graph; that's a separate gap, left for its own PR.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the scope as implemented.</summary>

The branch decides by declared type and reuses `NodeInvocationText`'s existing swatch branch. Considered and left out: `directory_uri` parity, moving HTML out of `nodeText`, a formatter shared with the run graph, and an E2E test. Each is a different change, and would add scaffolding to a ~6-line fix.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Kept both composable tests and added a component test for the swatch branch.</summary>

- "passes a color parameter's raw hex through" checks the composable's `nodeText` output and fails on the base code (`expected '<b>#ff0000</b>' to be '#ff0000'`).
- "bolds a text parameter even when its value looks like a color" pins the decision to the declared type and covers the `<b>` fallback.
- New `NodeInvocationText` test: mounts the component and checks a bare hex renders an `input[type=color]` with that value. It pins the existing swatch branch the fix relies on, which no test covered. It passes on the base too; the composable test is the one that fails without the fix.
- No E2E: no browser test runs a workflow with a color parameter, and there are no invocation graph selectors yet.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings.</summary>

Reviewed the composable, its tests, `NodeInvocationText`, the run graph's `useWorkflowRunGraph.ts`, the workflow step store types and `modules.py`; nothing to act on, including missed abstractions.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Text instead of a swatch. The swatch needs the declared `color` type and a `#rrggbb` value; other types keep the `<b>` text, and a color value that isn't `#rrggbb` shows as plain text, as in the run graph.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They check the composable's `nodeText` output and the swatch the component renders, and one pins type over value shape.
  <details>

  - The color case fails on the base composable (`expected '<b>#ff0000</b>' to be '#ff0000'`).
  - A text parameter holding `#ff0000` staying bold is a behavior contract, not a mirror of the code.
  - The `NodeInvocationText` test is the first coverage of the swatch branch the fix depends on. It mounts the component and checks the rendered `input[type=color]`, not a stub's props. It passes on the base too; the composable color test is the red one.
  - The composable tests assert an HTML string in `nodeText`. That's the existing HTML-in-data design, not something this branch adds.
  </details>
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None. Only the invocation graph's color input node changes; scheduling and execution are untouched.
- [x] Who hits this in practice and what is the evidence? Anyone opening the Overview of an invocation with a color parameter input. Reproduced on a local server (screenshots above); no user report, color parameters are uncommon.
- [x] Were simpler or existing approaches considered? Yes. Matching the value's shape instead of the type, and moving the bolding into `NodeInvocationText`.
  <details>

  - Value shape (reuse `isColor`): just as small, but a text parameter holding `#rrggbb` would wrongly become a swatch. The declared type is already loaded, and the run graph decides by parameter class too.
  - Moving HTML out of both composables into the component: fixes the root cause, but touches both graphs and the dataset/collection, `Directory:` and `(optional)` text. A candidate for a separate refactor.
  </details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] Instructions for manual testing are as follows:

<details><summary>Tests and manual steps</summary>

- vitest:
  - `useInvocationGraph.test.ts`: a color parameter's raw hex reaches `nodeText`; a text parameter holding a hex value stays bold.
  - `NodeInvocationText.test.ts`: a bare hex value renders the read-only color input.
- Manually: run a workflow with a `color` parameter input (e.g. connected to the `gx_color` test tool, `GALAXY_RUN_WITH_TEST_TOOLS=1`), open the invocation's Overview tab, and check that the input node shows the value followed by a swatch.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
