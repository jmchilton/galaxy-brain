Warn in the workflow editor's best practices panel when a step's `when` condition reads an input nothing is connected to.

Turning on **Conditionally skip step?** gives the step a `when` input and the condition `$(inputs.when)`, but nothing asks the author to connect it, and the best practices panel doesn't look. The workflow saves cleanly and then fails every invocation: "…is a conditional step and the result of the when expression is not a boolean type." The conditional-step Selenium test has carried a `TODO: hook up best practice panel` for this since 2023.

| Step condition | What it reads | Best practices on `dev` | This branch | At runtime |
|---|---|---|---|---|
| `$(inputs.when)` | `when` port, nothing connected | ✅ no issues | ⚠️ `gated: when` | ❌ invocation fails (`when_not_boolean`) |
| `$(inputs.input1 !== null)` | tool's `input1`, connection removed | ✅ no issues | ⚠️ `gated: input1` | 😬 the gate only tests what the runner types into the run form |
| `$(inputs.queries[0].input2 !== null)` | repeat input, connected | ✅ | ✅ | runs when connected |
| `$(inputs.cond.cond_test === "first")` | tool state value | ✅ | ✅ | evaluates normally |
| `$(inputs[name])` | can't resolve statically | ✅ | ✅ (stays quiet) | — |

✅ no issue reported · ⚠️ new warning · ❌ fails · 😬 works, but probably not what the author wired the condition for

A **conditional gates** section appears in the panel once any step has a `when`. It lists every name a condition reads that has no connection and no value in the step's state. Hovering an item highlights the tool input it names, or the step when the name is a gate port (like `when`) that isn't one of the tool's inputs. Clicking it opens the step.

So that the warning's "connect the input" is always possible, the editor now gives every name a `when` reads, and that nothing supplies, a boolean port. On `dev` the `when` port existed only until the workflow was saved with it unconnected; after a reload, or for an imported workflow, the step had no port to connect. Disconnecting a gate port also now brings the warning back (the port keeps its key with no value, which the check first counted as connected).

***It's a warning in the editor panel, not a block. Saving, running, and backend/gxformat2 workflow linting are unchanged; the old TODO's idea of disabling save isn't part of this.***

***Workflows without conditional steps see nothing new. Gated workflows get the new section, which counts toward the panel's high-priority issues, so a gated workflow that was "all clear" can now show an issue when a condition reads an unconnected name.***

***A required tool input that a condition reads and that is disconnected is reported twice, once under disconnected inputs and once here, because the two warnings ask for different fixes (connect or extract the input vs. fix the condition).***

<details><summary>How it works</summary>

- `getDanglingGates` (in `modules/linting.ts`) parses each `when` with the expression analyzer from 🔀 #23816 and checks every static path it reads against the step's `input_connections`, using the same connection-name resolution as connection validity. Nested conditional (`inputs.cond.input1`) and repeat (`inputs.queries[0].input2` ↔ `queries_0|input2`) references therefore resolve the same way in both places.
- A path naming one of the tool's connectable inputs is satisfied only by a connection. Any other path is satisfied by a connection or by a value in the step's state.
- It skips steps whose tool failed to load (with no inputs or state, every reference would look missing; the missing tool is the problem to report) and conditions with dynamic access (`inputs[name]`).
- Each missing name is reported once per step, labelled with the tool input's connection name, or with the path as the condition wrote it (`queries[0].input2`).
- `hasGatedSteps` is a step store getter, like `hasInputSteps` and `hasActiveOutputs`, shared by the panel and the lint summary.

</details>

<details><summary>Why a separate section instead of the disconnected-inputs check</summary>

The disconnected-inputs check walks `step.inputs`, which holds the tool's declared inputs. The `when` port is an extra input the editor adds, so it never appears there, and that check's autofix (extract a workflow input) doesn't fit a boolean gate. A gate on a tool input also needs different logic: an optional `input1` is flagged by nothing else, yet a `!== null` condition on it no longer tests an upstream step's output once it's disconnected. A section of its own can name the condition as the problem without changing what the disconnected-inputs check reports.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Builds on 🔀 #23816, whose `when` expression analyzer and connection-name resolution this reuses. Split from 🌿 [optional_input_gating](https://github.com/jmchilton/galaxy/tree/optional_input_gating), which stacks on it, so that a "run when a connected input is provided" condition is flagged once its input is disconnected.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The panel warns: "Some conditional steps read an input that nothing is connected to. Such a step is skipped on every run, or its invocation fails. Connect the input or change the condition:", followed by items such as `gated: when`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They build steps with conditions and connections and check which names are reported and how they're highlighted. `Lint.test.ts` checks the rendered section status and item text.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None at runtime. In the editor, gated workflows get the new section, and it warns only when a condition reads something unconnected.
- [x] Who hits this in practice and what is the evidence? Anyone who turns on **Conditionally skip step?** and doesn't connect `when`; the editor's own Selenium test leaves it in that state and has a 2023 TODO asking for this check. Authors of null-check gates (`!== null`) hit the second row after rewiring a step. Runtime evidence for the first row: `test_run_workflow_fails_when_input_not_connected` (new API test).
- [x] Were simpler or existing approaches considered? Yes. Extending the disconnected-inputs check and disabling save; see "Why a separate section" above.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] Instructions for manual testing are as follows:

<details><summary>Tests and manual check</summary>

- `modules/linting.test.ts`: `getDanglingGates` cases: connected vs not, null-check gates, state values, nested conditional and repeat connections, a literal `|` in a property name, extra connections, a subworkflow step, unloaded tools, dynamic access, de-duplication, and the input-vs-step highlight with item names.
- `Lint.test.ts`: the section is hidden without gated steps, passes when `when` is connected, and warns with `gated: when` when it isn't.
- API `test_run_workflow_fails_when_input_not_connected`: a `when: $(inputs.when)` step with nothing connected fails with `when_not_boolean` (`Type is: NoneType`), the runtime half of row 1.
- `workflowStepStore.test.ts`: an unconnected `when` name gets a boolean port; names that are tool inputs, step state or read dynamically don't.
- `test_editor_create_conditional_step`: the TODO is replaced by opening the panel after the `when` connection is removed and asserting the section's status is `warning`. It was red until disconnected ports stopped counting as connected.
- `test_best_practices_dangling_conditional_gate` (new): imports a workflow whose `when` reads an unconnected input, checks the warning names `cat1` and `when`, connects a boolean input to the port and checks the section passes. It was red at the connect step until the port was added.
- These two, `test_conditional_subworkflow_step` and `test_best_practices_input_label` pass locally under Playwright.

Manually:
1. Create a workflow, add a tool and turn on **Conditionally skip step?**.
2. Open best practices. The conditional gates section warns about `when`; hovering it highlights the step.
3. Save and reload. The `when` port is still there.
4. Connect a boolean parameter to `when`. The section passes.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
