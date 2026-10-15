# Invocation graph shows a color parameter input as bold hex text instead of a color swatch

The input node for a `color` workflow parameter shows a color swatch in the workflow run form's graph, but in the invocation graph it shows only the hex value in bold.

Take a workflow with a color parameter input set to `#ff0000`. The same component, `NodeInvocationText`, draws the input node in both graphs:

| Graph | Text passed to the node | Rendered |
| --- | --- | --- |
| Run form graph | `#ff0000` | *#ff0000:* plus a read-only color swatch |
| Invocation graph (Overview) | `<b>#ff0000</b>` | **#ff0000**, no swatch |

The invocation graph wraps the value in `<b>`, so the node's color check never matches.

<details><summary>Why (dev <a href="https://github.com/galaxyproject/galaxy/commit/c63ffc2ccae4875976677b468dce3ac3e1ba74d8"><code>c63ffc2ccae</code></a>)</summary>

- `initializeGraphInput` in [`useInvocationGraph.ts`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/composables/useInvocationGraph.ts#L365-L371) passes booleans through and wraps every other parameter value in `<b>`, colors included.
- [`NodeInvocationText.vue`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Editor/NodeInvocationText.vue#L17-L19) draws the swatch only when the text matches `/^#[0-9a-f]{6}$/i`. `<b>#ff0000</b>` doesn't match, so it falls through to the sanitized HTML branch, which keeps the `<b>`.
- The run graph passes the raw hex for `ColorToolParameter` ([`useWorkflowRunGraph.ts`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/composables/useWorkflowRunGraph.ts#L165-L167)), so only that graph reaches the swatch.
- The backend isn't involved: `input_step_parameters` on the invocation returns the color as a plain `#rrggbb` string.

</details>

<details><summary>Reproduction (vitest)</summary>

A temporary test next to `client/src/composables/useInvocationGraph.test.ts` runs an invocation with a color parameter through the composable and mounts `NodeInvocationText` with the resulting step. For comparison, it also mounts the component with the raw value the run graph passes. Imports and the file's `createTestingPinia` setup are omitted.

```ts
const colorOutput = { name: "output", type: "color", optional: false, multiple: false, parameter: true };
vi.mock("@/stores/workflowStore", () => ({
    useWorkflowStore: () => ({
        getFullWorkflowCached: vi.fn().mockResolvedValue({
            steps: { 0: { id: 0, type: "parameter_input", position: { left: 0, top: 0 }, outputs: [colorOutput] } },
        }),
    }),
}));
vi.mock("@/components/Workflow/Editor/modules/model", () => ({ fromSimple: vi.fn() }));
vi.mock("./workflowStores", () => ({ provideScopedWorkflowStores: vi.fn() }));

it("renders a color swatch for a color parameter input", async () => {
    const invocation = ref({
        id: "inv1",
        steps: { 0: { workflow_step_id: 10 } },
        inputs: {},
        input_step_parameters: {
            color: { label: "color", parameter_value: "#ff0000", workflow_step_id: 10 },
        },
    } as unknown as WorkflowInvocationElementView);
    const { steps, loadInvocationGraph } = useInvocationGraph(invocation, ref([]), ref("wf1"), ref(0));
    await loadInvocationGraph(false);
    const graphStep = steps.value[0]!;
    const wrapper = mount(NodeInvocationText as object, {
        localVue: getLocalVue(),
        propsData: { invocationStep: graphStep },
    });

    // Run graph input: passes
    const runWrapper = mount(NodeInvocationText as object, {
        localVue: getLocalVue(),
        propsData: { invocationStep: { type: "parameter_input", nodeText: "#ff0000" } },
    });
    expect(runWrapper.find("input[type=color]").exists()).toBe(true);

    // Invocation graph input: fails
    expect(graphStep.nodeText).toBe("#ff0000");
    expect(wrapper.find("input[type=color]").exists()).toBe(true);
});
```

Result, with both mounts' HTML logged (scoped `data-v-*` attributes trimmed):

```text
invocation graph rendered: <div class="truncate w-100"><span>#ff0000</span></div>
run graph rendered: <div class="truncate w-100"><span class="d-flex align-items-center"><i>#ff0000: </i><input class="form-control form-control-sm ml-1 p-0 color-input" type="color" readonly="" value="#ff0000"></span></div>

AssertionError: expected '<b>#ff0000</b>' to be '#ff0000'
```

The `<b>` is missing from the rendered invocation graph span only because DOMPurify is unreliable under happy-dom. In a browser, both sanitizer passes (`textHtml` and the `default` `v-sanitize-html` profile) keep it.

</details>

## Context

The invocation graph has wrapped parameter values in `<b>` since 🔀 #18615 added input values to the graph. The swatch branch came later, in 🔀 #19294 (workflow run form enhancements), along with the run graph that passes raw hex values. The invocation graph has never shown the swatch, so this is a gap between the two graphs, not a regression. 🔀 #23791 moved the text branch to `v-sanitize-html` and didn't change this.

## Proposed Approach

In `initializeGraphInput`, pass the raw value through when the step is a color parameter, the way booleans already are. The graph step is copied from the editor-style workflow step (`/api/workflows/{id}/download?style=editor`), and a parameter input's output already carries its parameter type (`outputs[0].type === "color"`, from `InputParameterModule.get_all_outputs`), so no extra request or parsing is needed. Add a unit test in `useInvocationGraph.test.ts`.

<details><summary>Sketch</summary>

```diff
-import type { Step } from "@/stores/workflowStepStore";
+import type { ParameterOutput, Step } from "@/stores/workflowStepStore";
 ...
         } else if (inputParam) {
-            if (typeof inputParam.parameter_value === "boolean") {
+            const outputType = (graphStep.outputs[0] as ParameterOutput | undefined)?.type;
+            if (typeof inputParam.parameter_value === "boolean" || outputType === "color") {
                 graphStep.nodeText = inputParam.parameter_value;
             } else {
                 graphStep.nodeText = `<b>${inputParam.parameter_value}</b>`;
```

With this change the reproduction test passes, and so do the existing `useInvocationGraph` and `NodeInvocationText` unit tests.

</details>

## Alternative Approaches

Two other fixes would work. One checks the value's shape instead of the step's type. The other moves the bolding out of both composables and into `NodeInvocationText`. The type check is preferred because it uses data the graph already has, matches how the run graph decides (by parameter class), and doesn't turn a text parameter that happens to hold `#ff0000` into a swatch.

<details><summary>Alternatives in detail</summary>

### Alternative: Check the value against the hex color pattern

<details><summary>Description</summary>

Skip the `<b>` when the value matches `/^#[0-9a-f]{6}$/i`. To avoid two copies of the regex, move `isColor` out of `NodeInvocationText` into a shared helper.

#### Why the proposed approach is preferred

It is just as small, but it guesses from the value. A text parameter whose value looks like a hex color would get a swatch. The step's declared type is already loaded, so there's no reason to guess.

</details>

### Alternative: Move bolding into `NodeInvocationText`

<details><summary>Description</summary>

Have both composables return plain values and let the component apply the bold styling, so neither composable builds HTML for parameter values.

#### Why the proposed approach is preferred

Dataset and collection inputs in both graphs also build `hid: <b>name</b>` strings, and the run graph adds labels such as `Directory: <b>…</b>`. Removing HTML from `nodeText` means refactoring both composables. That may be worth doing separately, but this bug doesn't need it.

</details>

</details>
