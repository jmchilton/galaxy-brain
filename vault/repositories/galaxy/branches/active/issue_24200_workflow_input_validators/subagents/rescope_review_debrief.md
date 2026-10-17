# Re-scope review debrief

I acted on the main finding. Boolean and color inputs used to pass unchecked. Validators that never worked on them would be stored and then misbehave at runtime: length on a boolean raised `TypeError`, and regex on a boolean rejected every value. Both types now allow no validators. `WORKFLOW_PARAMETER_VALIDATOR_TYPES` now covers every `INPUT_PARAMETER_TYPES` value (typed), so a missing type is a KeyError, not a silent skip. Also acted on:
- The compatibility constant is typed `dict[str, list[ValidatorType]]` and placed after both TypeAdapters.
- The error message now lists the allowed types.
- Tests cover a positive control (directory_uri + length) and boolean/color rejection.

Not acted on:
- Nothing beyond "no action" items. Old Galaxy could not have stored mismatched types, gxformat2 0.27.0 has no validator conversion, and packaging/imports are fine. The `galaxy.tool_util.linters.inputs.PARAMETER_VALIDATOR_TYPE_COMPATIBILITY` import still resolves.

<details><summary>Review summary</summary>

1. Should-fix: boolean and color are unchecked, so validators that never worked get stored and enforced at runtime.
2. No action: no stored workflow from older versions can hold mismatched types.
3. OK: the directory_uri text list is correct.
4. OK: packaging (`galaxy-tool-util` already depends on `galaxy-tool-util-models`).
5. Nice-to-have: constant placement and typing.
6. Nice-to-have: list the allowed types in the error; add a positive control test.

</details>
