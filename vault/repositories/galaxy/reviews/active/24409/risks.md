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
