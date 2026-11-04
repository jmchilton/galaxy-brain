# Codex review debrief

Run via gpt-6.1-sol, on `3d91bb6b`; fixes landed in `1c38389a`. Codex reported its reasoning effort as `none`, so the effort is omitted.

Codex's sandbox (bwrap) can't run commands on this machine (`RTM_NEWADDR: Operation not permitted`), so the first run reviewed nothing. The second run kept `-s read-only` and got everything on stdin: the branch diff (generated TS and lockfile excluded), full copies of `input-paths.ts`, the YAML input parser and `validate-workflow.ts`, Galaxy dev's runtime models, `runtime.py`, `runtimeify`, `labels.py` and `evaluation.py`, and `cwl_utils/expression.py`. The brief held only the issue's intent, with none of the earlier review findings.

I fixed two of the three findings. The third is real but sits in the shared YAML parser, so it's left for John:

- **Fixed: undeclared roots in embedded tools (Codex P1).** Confirmed: `withEmbeddedToolChecks` ran only `checkInputPaths`, which left unknown roots to a mirrored check that workflow validation never runs. `checkInputPaths` now takes `{ undeclaredRoots: true }`, which the embedded check sets. Inputs the parser skipped still count as declared. A test covers each path: the CLI step, and both option values.
- **Fixed: shadowed `inputs` (Codex P2).** Confirmed: `map(inputs => inputs.reads.custom)` was flagged. Any expression that binds `inputs` (function parameter, variable, destructuring, catch, function or class name) is now skipped. Two skip cases cover it.
- **Not fixed: sections disable checking (Codex P1), needs a decision.** Confirmed: the TS YAML parser treats `section` as an unknown leaf type. Galaxy reads UDT inputs through `CanonicalYamlInputSource`, which does support sections. So references into a section go unchecked, as does a whole conditional or repeat that contains one. It's a false negative, not a false positive. The fix is to port `CanonicalYamlInputSource` into `user-tool-parse`, the parser that tool-state validation also uses. That changes parsing for every YAML tool, so it belongs in its own branch.
  - It's not new: an embedded `GalaxyUserTool` with a section already fails workflow validation with "could not be parsed" on `origin/main`.
  - The skipping is now documented in `parseEachInput`.

<details><summary>Codex findings (verbatim JSON)</summary>

```json
[
  {
    "severity": "P1",
    "category": "correctness",
    "file": "packages/schema/src/user-tool-source/input-paths.ts",
    "line": 514,
    "title": "Supported sections silently disable path validation for their containing input",
    "detail": "parseEachInput catches and discards parseInputs failures. DictInputSource treats section as a leaf, so parseInputs rejects it even though Galaxy's YAML runtime explicitly supports SectionParameterModel. A section nested inside a conditional or repeat also causes the entire top-level container to be discarded, leaving even its other children unchecked.",
    "failure_scenario": "Declare a section opts containing a data input ref and use $(inputs.opts.ref.filepath). Validation reports no input_path error, although Galaxy supplies ref.path and no filepath. Likewise, placing a section alongside a data child in a repeat disables checking that data child's paths.",
    "confidence": "certain"
  },
  {
    "severity": "P1",
    "category": "correctness",
    "file": "packages/cli/src/commands/embedded-tool.ts",
    "line": 102,
    "title": "Embedded tools still accept undeclared input roots",
    "detail": "withEmbeddedToolChecks invokes only checkInputPaths, whose resolveChain deliberately ignores unknown roots because it assumes the separate semantic check reports them. The workflow integration does not invoke that semantic check; the surrounding workflow validators validate parameter state instead.",
    "failure_scenario": "Embed a GalaxyUserTool with inputs: [] and shell_command: 'echo $(inputs.missing.path)', with otherwise valid outputs and empty step state. Both workflow validation paths return no template error because missing has no runtime shape, although Galaxy cannot evaluate that reference.",
    "confidence": "certain"
  },
  {
    "severity": "P2",
    "category": "correctness",
    "file": "packages/schema/src/user-tool-source/input-paths.ts",
    "line": 260,
    "title": "Locally shadowed inputs identifiers produce false errors",
    "detail": "collectChains treats every identifier named inputs as the job's inputs without tracking JavaScript bindings. Function parameters and local variables may legally shadow the global identifier, so their member paths cannot be resolved against the declared tool parameters.",
    "failure_scenario": "Declare reads as a data input and use ${ return [{reads: {custom: 'ok'}}].map(inputs => inputs.reads.custom).join(''); }. Galaxy evaluates this to 'ok', but this validator reports that data input reads has no custom field.",
    "confidence": "certain"
  }
]
```

Coverage note: "Reviewed the supplied file contents and diff excerpts, plus the supplied Galaxy and cwl_utils ground truth. Files omitted from stdin and generated TypeScript were unavailable; tests were not run."

</details>
