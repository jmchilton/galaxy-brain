# Stop exposing flat pipe-prefixed tool-input aliases in workflow `when` expressions

## Problem

Galaxy currently merges nested tool execution state with `extra_step_state` before evaluating a workflow step's `when` expression. For a connected parameter inside a tool conditional, this can expose the same value through three spellings:

```javascript
inputs.cond.param
inputs["cond"]["param"]
inputs["cond|param"]
```

The first two are ordinary JavaScript access to the nested tool state. The third leaks Galaxy's internal, pipe-prefixed connection name into the expression API. It is undocumented, the workflow editor cannot produce it, and we found no live use in the IWC, GTN, Galaxy, or gxformat2 corpora. Keeping it nevertheless turns an implementation detail into a second public representation that importers, editors, linters, and documentation must understand indefinitely.

## Proposed change

Do not add a flat pipe-prefixed alias to the `when` expression context when a step connection corresponds to a recognized nested tool parameter already represented in `execution_state.inputs`.

Continue exposing genuine extra step inputs that are not tool parameters. In particular, this must preserve the established boolean gate and data-probe forms:

```javascript
inputs.when
inputs.probe
```

This change should remove only the duplicate internal alias:

```javascript
// Supported
inputs.cond.param
inputs["cond"]["param"]

// No longer exposed
inputs["cond|param"]
```

Top-level bracket access such as `inputs["input1"]` should remain valid; it addresses a real top-level key and is standard JavaScript.

## Acceptance criteria

- Nested tool inputs are present in the expression context only through their nested tool-state shape.
- Dot access and chained bracket access work for both provided and omitted optional nested inputs.
- Flat pipe-prefixed access is no longer supported for recognized tool parameters.
- Extra non-tool connections such as `when` and `probe` remain available to expressions.
- Top-level input access and existing `$(inputs.when)` workflows are unchanged.
- The compatibility change is called out in the release notes.

## Compatibility

This can break hand-authored private workflows that rely on the undocumented alias. The risk appears small given the lack of public usage, and removing it now is preferable to legitimizing it through new editor behavior and documentation.

We are preparing an editor affordance that gates a step on whether an optional dataset was supplied. Normalizing the expression context first lets that feature emit and recognize one intentional nested representation instead of permanently supporting an accidental one.
