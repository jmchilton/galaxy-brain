(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: claude-opus-5-5 · Effort: low · Reviewed commit: 234b345ca41

Mostly a two-way door, but one-way in effect for workflows imported or saved after it ships: their persisted `tool_state` will now contain repeat instances (with tool defaults for non-data children) that earlier releases never wrote, and that stored state outlives a code revert.

<details><summary>Risk Details</summary>

- Applies on every `from_dict` path (API import, editor save/update, refactor), not just format2 import - any step dict whose `input_connections` target a missing repeat index now gets that instance created and persisted.
- New instances get `get_initial_value` defaults for non-data children; those defaults are baked into stored state, so later tool-default changes no longer apply to these steps.
- Only top-level repeats are handled (`self.tool.inputs[repeat_name]`); repeats nested in conditionals/sections still silently drop connections - behavior is now inconsistent across nesting.
- Conditionals inside a new repeat instance get the conditional's initial value; nested repeats/sections inside it rely on `get_initial_value` of those group types being correct without `fill_defaults`.
- Workflows that "worked" by silently running on fewer inputs will now run with all connected inputs - a visible output change for existing users re-importing them (intended fix, but a behavior change on a release branch).
- `repeat.type != "repeat"` -> `isinstance(repeat, Repeat)`: equivalent for current classes, low risk.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the release-branch target is justified: it changes what gets persisted for newly imported/saved workflows, so check that editor round-trips and `fill_defaults=True` imports produce identical state to before (augment only adds missing indices, so this should hold).

Consider whether the nested-repeat gap (repeat inside a conditional/section) should be called out or rejected, and whether defaults for non-data children should instead come from the same path `fill_defaults` uses, so the two import modes cannot drift.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24409_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch `pr_24409_review_0` is built on the PR head `234b345ca41`. It stops connection keys shaped like `<name>_<N>|` from crashing workflow import when they don't point at a repeat. It also replaces the PR's copied default-filling loop with a reusable `Repeat.get_initial_instance`, and makes the conditional repeat test check which datasets ended up where. It adds a small test tool, `section_name_digit_suffix`, which has a top-level section named `opts_1`.

- [`ecdefb23f8f`](https://github.com/jmchilton/galaxy/commit/ecdefb23f8f) Skip non-repeat `<name>_<N>|` connection keys in augment: switches to `self.tool.inputs.get(repeat_name)`, and adds the `section_name_digit_suffix` tool plus an API test. The test fails with a 500 / `KeyError: 'opts'` without the fix and passes with it.
- [`3aed62c0788`](https://github.com/jmchilton/galaxy/commit/3aed62c0788) Reuse Repeat initial-instance construction for added instances: extracts `Repeat.get_initial_instance` from `get_initial_value` and uses it in `augment` without `fill_defaults`, so data children get `RuntimeValue` and the context has a parent, the same as on the `fill_defaults` path.
- [`333ee95ffce`](https://github.com/jmchilton/galaxy/commit/333ee95ffce) Assert identifiers and contents in conditional repeat connection test: the test now asserts element identifiers `["0", "1"]` (which come from the `id_cond` default) and contents `a`/`b`, not just the element count.

</details>

</details>

### P2 1: Top-level sections or conditionals named `<x>_<N>` now break workflow import with a KeyError (implementation verified)

`augment()` treats any connection key shaped like `<prefix>_<N>|rest` as a reference into a repeat and looks the repeat up with `self.tool.inputs[repeat_name]`. When a tool has a top-level section or conditional named, for example, `opts_1`, and a data input inside it is connected, the key `opts_1|input1` gets parsed as instance 1 of a repeat called `opts`. That raises `KeyError: 'opts'` before the `isinstance(repeat, Repeat)` guard is reached. The bug was already there, but only `fill_defaults=True` could reach it. This PR runs `augment` on every `from_dict` call that has `input_connections`, so a plain API or format2 import of such a workflow now fails with a 500.

<details><summary>Evidence</summary>

I added a new test tool, `section_name_digit_suffix`, with a top-level `<section name="opts_1">` that contains a data param. Importing a format2 workflow that connects `opts_1|input1` with `fill_defaults=False` at the PR head returns `POST /api/workflows` 500 with `KeyError: 'opts'`.

</details>

Look the input up without assuming it exists, and keep the type guard: `repeat = self.tool.inputs.get(repeat_name)`. Fixed in [`ecdefb23f8f`](https://github.com/jmchilton/galaxy/commit/ecdefb23f8f).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: New-instance defaults duplicate `Repeat.get_initial_value` and diverge from it (implementation verified)

The new loop that fills defaults for added instances copies the per-instance body of `Repeat.get_initial_value`, with two differences. It skips data children, so an unconnected data input in an added instance ends up as a missing key where the `fill_defaults` path stores `RuntimeValue`. It also builds `ExpressionContext` without a parent, so children whose defaults depend on enclosing state see an empty context. Every caller that reaches this code (`build_module`, workflow create, workflow update) sets `workflow_building_mode = ENABLED`, and in that mode data params return `RuntimeValue()` without scanning the history. So the data filter gains nothing.

Move the per-instance construction into `Repeat.get_initial_instance(trans, context, index)`, have `get_initial_value` call it, and use it in `augment` with the enclosing state as the parent context. Fixed in [`3aed62c0788`](https://github.com/jmchilton/galaxy/commit/3aed62c0788).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort; the shared-path concern was also raised in [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Conditional repeat test asserts only element count (implementation verified)

`test_repeat_connection_with_conditional_without_fill_defaults` passes as long as two elements exist, whichever datasets ended up in them. It also never checks directly that the defaults filled into the added instances (`id_cond` → `idx`) took effect.

Assert the element identifiers (`["0", "1"]`, which come from the `id_cond` default) and the element contents (`a`, `b`). Fixed in [`333ee95ffce`](https://github.com/jmchilton/galaxy/commit/333ee95ffce).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>
