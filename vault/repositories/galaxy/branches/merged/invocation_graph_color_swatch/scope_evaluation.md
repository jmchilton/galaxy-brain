# Scope evaluation: invocation_graph_color_swatch

**Recommendation: keep the scope as implemented. No scope change.** The branch is the proposed issue's preferred fix. It decides by the step's declared type (`outputs[0].type === "color"`) and passes the raw hex through to `NodeInvocationText`'s existing swatch branch. It has two red-to-green composable tests and one component test for the swatch branch. Every expansion raised (`directory_uri` parity, moving HTML out of `nodeText`, a shared formatter, an E2E test) is a different change, not this bug's fix. The proposal itself put the structural refactor out of scope ("may be worth doing separately, but this bug doesn't need it"), so keeping it out doesn't go against John's "build the abstraction the issue proposes" rule. And bolting scaffolding onto a ~6-line cosmetic fix is the overkill pattern John has pushed back on. Two non-code follow-ups: (1) add a color-swatch bullet to the Tests list in `proposed_invocation_graph_no_e2e_coverage.md`, which the test-challenge agent found doesn't mention the swatch; (2) record `directory_uri` parity, and possibly the `nodeText` HTML refactor, as follow-up candidates and mention `directory_uri` in one line of the PR description.

## A. As implemented: type-based raw passthrough for color

`initializeGraphInput` gets a new `else if`. When the parameter's output type is `color` and the value is a string, the raw value goes to `nodeText`. Booleans and everything else behave as before. Tests: two composable cases (color is passed raw; a text param holding `#ff0000` stays bold) and one `NodeInvocationText` swatch-branch mount.

| Pros | Cons |
|---|---|
| <ul><li>Exactly the issue's preferred approach. Uses data already loaded (editor-style download), with no new request</li><li>Mirrors how the run graph decides (by parameter class, not value shape)</li><li>The text-param-that-looks-like-hex test pins type over value shape</li><li>Tiny and easy to review. Clean in Codex and the normal review</li></ul> | <ul><li>Leaves the two composables formatting parameter text separately, with the same drift risk that caused this bug</li><li>Still builds HTML in `nodeText` for every other value</li><li>No browser check yet (screenshots step pending)</li></ul> |

## B. Expand: `directory_uri` parity

Add a `parameterType === "directory_uri"` branch that renders `Directory: <b>…</b>` as the run graph does (`useWorkflowRunGraph.ts`, `DirectoryUriToolParameter` case). Also add `"directory_uri"` to the client `ParameterTypes` union (`stores/workflowStepStore.ts:56`). `Editor/modules/inputs.ts:11` and the backend (`modules.py:1373,1609`) already know the type.

| Pros | Cons |
|---|---|
| <ul><li>Same function, same pattern. About 3 lines plus one test</li><li>Fixes a real type-union gap: `outputs[0].type` can be `directory_uri` at runtime, but TS doesn't model it</li><li>Closes the second known gap between the two graphs</li></ul> | <ul><li>A different symptom (a missing label, not a dead swatch). It would need its own PR title/description section</li><li>No issue or repro for it. Rare parameter type</li><li>Every reviewer (research debrief, implementer, normal review, test challenge) deferred it</li><li>Pulls toward "fix all parity", which is really option D</li></ul> |

<details>
Good as a fold-in if a Galaxy reviewer asks for it. The cost is low and the change is local. Not worth growing the PR for unprompted. The `ParameterTypes` union fix is the most defensible piece. It could also go in a separate types-only tidy-up.
</details>

## C. Expand: move bold/HTML out of both composables into `NodeInvocationText`

Have `nodeText` carry structured data (e.g. `{ hid?, name, value, kind }`) or plain values, and let `NodeInvocationText` do the bolding, the swatch and the `Directory:` prefix. Both composables would stop building HTML strings for HDA/HDCA/parameter inputs.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the root cause: the swatch detection broke only because presentation markup was baked into data</li><li>Would remove the `textHtml` sanitize path for these values and the dependence on DOMPurify keeping `<b>`</li><li>One renderer would make A, B and future types consistent by construction</li></ul> | <ul><li>Touches both composables, `GraphStep`/`WorkflowRunStepInfo` types, `NodeInvocationText`, and both test suites. That's large for a cosmetic bug</li><li>The proposal explicitly made this an alternative and said "this bug doesn't need it"</li><li>The run graph's `getStepDescription` also adds `(optional)` and status text, so the refactor has to model those strings too. That is a design decision, not a mechanical change</li><li>Adds regression risk to two working views for no user-visible gain beyond A</li></ul> |

<details>
This is the "reusable abstraction" candidate, but the issue didn't propose it as the fix. The issue treated it as a possible separate refactor. If `nodeText` keeps gaining special cases (there are three types now: boolean, color, directory), this becomes worth its own issue or PR. Better trigger: the next parity bug, or 🎯 #21989 / #22075 changing what nodes show.
</details>

## D. Expand (middle ground): shared parameter-text formatter

Pull a small `formatParameterNodeText(parameterType, value)` helper into a shared module and call it from both composables. The run graph would map `model_class` to `parameter_type` (`ColorToolParameter`→`color`, `DirectoryUriToolParameter`→`directory_uri`). This keeps HTML in `nodeText` but has one switch for both graphs.

| Pros | Cons |
|---|---|
| <ul><li>Prevents the exact drift that caused this bug without C's blast radius</li><li>Would fix B for free</li></ul> | <ul><li>New abstraction with a `model_class`↔`parameter_type` mapping that doesn't exist today, so it's extra surface</li><li>The run graph's branch is entangled with `getStepDescription`'s empty/optional handling, so the "shared" piece is only ~3 cases</li><li>Codex looked for missed abstractions and found none worth extracting</li><li>Half-measure if C is the eventual direction</li></ul> |

## E. Expand: add an E2E test on this branch

Add a Selenium/Playwright test that runs a workflow with a color parameter and asserts `input[type=color]` on the invocation graph node.

| Pros | Cons |
|---|---|
| <ul><li>Only layer that proves the swatch renders against a real server and the real editor-style download</li></ul> | <ul><li>Needs a new color-param workflow fixture, invocation-graph navigation, and new `navigation.yml` selectors. That's the scaffolding the sibling `proposed_invocation_graph_no_e2e_coverage.md` plans</li><li>Heavy scaffolding on a tiny fix, which John has called overkill</li><li>The unit pair (composable output + component swatch branch) already covers the fix end to end at client level</li></ul> |

<details>
Right home is the sibling proposal. Its Tests list doesn't currently mention the swatch (test-challenge correction). Add a bullet like: "run a workflow with a color parameter; the input node renders `input[type=color]` with the value". The debrief also says to cross-link the two if both get filed. The color issue is PR-first, so this PR's description could link the sibling issue once it's filed.
</details>

## F. Contract: value-shape check instead of type check

Drop the `outputs[0].type` lookup and skip `<b>` when the value matches the hex regex (possibly with a shared `isColor`).

| Pros | Cons |
|---|---|
| <ul><li>No cast, no dependence on the editor-download `outputs` shape</li></ul> | <ul><li>Turns text params holding `#rrggbb` into swatches. The branch deliberately pins this with a test</li><li>Rejected in the proposal. Not smaller than A</li></ul> |

## G. Noted, not recommended: unset optional parameter display

Possibly another parity gap, found reading `run.py`. An unset optional parameter may record `parameter_value: null`, so the invocation graph would render `<b>null</b>`. The run graph shows the input as unpopulated/`(optional)`. **Unverified**: not reproduced, and it depends on `get_input_default_value`.

| Pros | Cons |
|---|---|
| <ul><li>If real, a more visible wart than `directory_uri`</li></ul> | <ul><li>Unverified, unrelated to color, needs its own repro</li></ul> |

<details>
Worth a 5-minute check by whoever picks up B/C/D, and worth filing as its own small issue if it reproduces. It doesn't belong on this branch.
</details>

## Handoff implications

Scope is unchanged, so the normal review, test-challenge debrief and Codex review all still apply. The screenshots step is still pending (it touches the client UI). No E2E tests were added, so E2E polish doesn't apply. Branch is at ~50 lines of diff, mostly test, so a thermo-nuclear review is optional at best. Follow-ups to record outside the branch: the sibling-proposal Tests bullet (E), and `directory_uri` / unset-optional parity candidates (B, G).
