### P2 1: Top-level sections or conditionals named `<x>_<N>` now break workflow import with a KeyError (implementation verified)

`augment()` treats any connection key shaped like `<prefix>_<N>|rest` as a reference into a repeat and looks the repeat up with `self.tool.inputs[repeat_name]`. When a tool has a top-level section or conditional named, for example, `opts_1`, and a data input inside it is connected, the key `opts_1|input1` gets parsed as instance 1 of a repeat called `opts`. That raises `KeyError: 'opts'` before the `isinstance(repeat, Repeat)` guard is reached. The bug was already there, but only `fill_defaults=True` could reach it. This PR runs `augment` on every `from_dict` call that has `input_connections`, so a plain API or format2 import of such a workflow now fails with a 500.

<details><summary>Evidence</summary>

I added a new test tool, `section_name_digit_suffix`, with a top-level `<section name="opts_1">` that contains a data param. Importing a format2 workflow that connects `opts_1|input1` with `fill_defaults=False` at the PR head returns `POST /api/workflows` 500 with `KeyError: 'opts'`.

</details>

Look the input up without assuming it exists, and keep the type guard: `repeat = self.tool.inputs.get(repeat_name)`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: New-instance defaults duplicate `Repeat.get_initial_value` and diverge from it (implementation verified)

The new loop that fills defaults for added instances copies the per-instance body of `Repeat.get_initial_value`, with two differences. It skips data children, so an unconnected data input in an added instance ends up as a missing key where the `fill_defaults` path stores `RuntimeValue`. It also builds `ExpressionContext` without a parent, so children whose defaults depend on enclosing state see an empty context. Every caller that reaches this code (`build_module`, workflow create, workflow update) sets `workflow_building_mode = ENABLED`, and in that mode data params return `RuntimeValue()` without scanning the history. So the data filter gains nothing.

Move the per-instance construction into `Repeat.get_initial_instance(trans, context, index)`, have `get_initial_value` call it, and use it in `augment` with the enclosing state as the parent context.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort; the shared-path concern was also raised in [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Conditional repeat test asserts only element count (implementation verified)

`test_repeat_connection_with_conditional_without_fill_defaults` passes as long as two elements exist, whichever datasets ended up in them. It also never checks directly that the defaults filled into the added instances (`id_cond` → `idx`) took effect.

Assert the element identifiers (`["0", "1"]`, which come from the `id_cond` default) and the element contents (`a`, `b`).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>
