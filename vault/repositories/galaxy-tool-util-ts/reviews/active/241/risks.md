Profile: generic_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: `28e93b564fc6fd132ee5fb6bcae621c09db568df`

Mostly a two-way door (a patch release that can be reverted), but `toNative` and lint now reject Format2 workflows they used to accept, and the connection report adds a new synthetic `step_type: "unresolved_source"` value. Once downstream consumers start depending on these, they are harder to walk back.

<details><summary>Risk Details</summary>

- `toNative` and `gxwf convert` now throw `UnresolvedSourceError` where they used to return `input_connections` with `id: null`. Only `validateConnectionsReport` catches the error. Every other caller (gxwf-web convert endpoints, the VS Code extension, Foundry, stateful/roundtrip conversion, IWC corpus sweeps) now gets an exception or a non-zero exit where it used to get output.
- `gxwf lint` adds new structural errors for step-input sources. Existing workflows that name a labelled step by its id (or name a source that doesn't exist) will start failing lint in CI where they passed before.
- The `outputSource` lint now resolves the way conversion does, so labels that contain `/` stop being false positives. This is a behavior change in the other direction, and it is welcome.
- The connection report's new shape puts the raw source string in `step` and adds `step_type: "unresolved_source"`, with null label, tool and version. Any consumer that keys on step ids or switches on `step_type` sees a value it doesn't know. The Python report model and its fixtures in gxwf-web/gxformat2 don't know this value either, so cross-language parity drifts.
- The `runtime_value` placeholder is still special-cased to a NaN step id. This keeps the old silent-null behavior on that one path.
- The changeset marks this as `patch`, but it tightens what input is accepted. Consumers on caret ranges pick up the new rejections automatically.

</details>

<details><summary>Risk Review Advice</summary>

Check whether gxwf-web and the VS Code extension call `toNative` or convert without catching errors, and whether they should surface `UnresolvedSourceError` as a diagnostic instead of a 500 or a crash. Also confirm that a pass over the IWC corpus shows no newly rejected real workflows beyond the intended ones.

Decide whether `step_type: "unresolved_source"` should become part of the shared report contract. If it stays, mirror it in the Python report models and the gxwf-web OpenAPI schema. Otherwise, use a top-level report error field. Also consider whether a `minor` changeset fits the stricter behavior better than `patch`.

</details>
