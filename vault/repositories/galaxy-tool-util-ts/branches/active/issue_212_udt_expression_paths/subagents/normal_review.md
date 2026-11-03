# Normal review debrief

Run via Claude Opus 5.5 at the session's default effort, on `c5ac7bac` + `967a6caf`. Fixes landed in `3d91bb6b`.

I acted on everything except P3 4 (the duplicate runtime model), the brittleness of the generated-TS checksum, the browser-bundle note, and label severity. I fixed:

- **P1 1.** Same-named conditional branch parameters now become a `union` shape, for templates and labels. The reviewer's single/paired example is now a test.
- **P2 1.** Indexing a string is allowed.
- **P2 2.** `--mode json-schema` now applies the check to embedded tools; the CLI test covers both modes, native and format2.
- **P2 3.** `checkInputPaths` now runs beside `runSemanticChecks` in `validateUserToolSource`, not inside it. The fake `Value error, ` prefix is gone, and the header docs are updated.
- **P3 1.** Galaxy passes a plain `list` given to `list:paired_or_unpaired` through as is: `runtimeify` sees the raw HDCA, and no adapter rewraps it. So `*:paired_or_unpaired` elements are now a union of the nested collection and a dataset.
- **P3 2.** Label references to multiple data and multiple select inputs are now flagged.
- **P3 3.** Added a comment on `inputs` shadowing.
- **P3 5.** Galaxy's YAML v1 set now includes `SectionParameterModel`, so section handling stays (with a comment); the TS parser is what lags. I reverted the section edit in the mirror test. The repeat edit stays, with a comment: the input path check runs in `validateUserToolSource`, and Galaxy's case references an undeclared `x`.
- **P3 6.** Added scanner tests (double backslash, `)` in quotes, object literals in `${}`, trailing `//`, a quoted template literal, escaped `${`). The skip and label cases now use `it.each` and match on reasons, not full strings.
- **P3 7.** The scanner is split out into `template-scanner.ts`.
- **P3 8.** acorn is now `^8.16.0`, resolved to the 8.16.0 already in the lockfile.

Not acted on:

- **P3 4, duplicate runtime model.** Deriving the Effect `job_runtime` schemas (`gx-data.ts`, `gx-data-collection.ts`) from `job-runtime.schema.json` changes state validation, which is out of scope. It's a follow-up issue candidate.
- **P3 8, generated `.ts` not checksummed.** This mirrors the existing user-tool-source and test-format pattern; changing all three is a separate cleanup.
- **P3 8, acorn in browser bundles.** It's about 100 KB minified and has no dependencies. It's mentioned in the changeset.
- **P2 3, label severity.** Label findings stay errors. Galaxy never fails a job on them, but the label it writes is wrong, and the report contract has no warning level for these commands. Left as a default for John.

<details><summary>Full review</summary>

# Review: `issue_212_udt_expression_paths` (c5ac7bac, 967a6caf, base f5470fe5)

This was a read-only review. I ran small probe scripts against the built `dist/` from my scratchpad, and both test files pass (38 tests).

## Checked and correct

- **Synced schema.** `job-runtime.schema.json` is byte-identical to a fresh `scripts/dump-job-runtime-schema.py` run against the Galaxy dev export, and the checksum matches.
- **Field sets.** They match Galaxy's StrictModels: `DataInternalJson`, `DataCollectionElementInternalJson`, and `DataCollectionInternalJsonBase`, including `has_single_item`, `columns`, `column_definitions` and `fields`. `build_collection_model_for_type` (list-like outer gives an array, record-like gives a dict) matches `elementsShape`.
- **Scanner.** `scanWindow` is a faithful port of `cwl_utils.expression.scanner`. These cases all behave like `interpolate`: `\$(` and `\${` escapes, `\\$(`, quotes containing `)`, nested parens and braces, and backtick bodies that contain `'`.
- **Acorn wrapping.** It is equivalent to `code_fragment_to_js`: `{return (body);}` for `$()`, and `(function(){body})()` for `${}`. The trailing `\n` correctly tolerates `//` comments.
- **Labels.** The grammar follows `labels._resolve` / `_dataset_attribute`: dataset `name`/`element_identifier`/`format`, collection `name`/`element_identifier`, repeats never filled in, conditionals and sections not text.
- **Report shape.** Unchanged: the existing `status: "fail"` plus string `errors`. Nothing for the gxwf-web OpenAPI to regenerate.

## Findings

### P1 1: Same-named parameters in different `when` branches cause false positives
`packages/schema/src/user-tool-source/input-paths.ts:168-176` and `childShapes` at `:182-193` keep only the first parameter with a given name (`if (!fields.has(p.name))`). Labels have the same problem at `:440` (`scope.find`). In Galaxy, branch-specific parameters with the same name are common (single vs paired layouts).

Reproduced with conditional `lib` (select `layout`): the `single` branch has `reads: data`, the `paired` branch has `reads: data_collection (paired)`. The valid command `$(inputs.lib.layout == 'paired' ? inputs.lib.reads.elements.forward.path : inputs.lib.reads.path)` fails with:

```
inputs.lib.reads.elements: data input 'lib.reads' has no field 'elements' at job runtime
```

Swap the when order and the label `$(inputs.lib.reads.format)` would be rejected instead. Because embedded steps get `status: "fail"`, this breaks `gxwf validate` / `draft-validate` on correct workflows.

**Fix:** when names collide across whens, merge the shapes. Either accept a path if any branch's shape accepts it (a union shape kind), or degrade to `UNKNOWN` when the shapes differ. For labels, accept if any branch's parameter resolves. Add a test for this case.

### P2 1: Indexing a string is flagged
`input-paths.ts:416-418`: the primitive case only allows `seg in String.prototype`. `$(inputs.t[0])` on a text input, or `inputs.d.path[0]`, is reported as "is a string at job runtime and has no field '0'" (verified), but it is valid JS.

**Fix:** for `kind: "string"`, accept numeric segments.

### P2 2: `--mode json-schema` skips the new check
`packages/cli/src/commands/validate-workflow-json-schema.ts:456-473` (`_validateEmbeddedNativeStepJsonSchema`) and `:661-676` (`_validateEmbeddedFormat2StepJsonSchema`) don't call `withEmbeddedToolChecks`. So `gxwf validate --mode json-schema`, and gxwf-web's validate with `mode=json-schema` (`packages/gxwf-web/src/workflows.ts:293-295`), pass the same embedded tool that effect mode fails.

**Fix:** wrap both results the same way, or apply the check once at the shared embedded-step resolution point so a future mode can't miss it.

### P2 3: A TS-only lint is placed inside the "Galaxy mirror" semantic checks
`semantic.ts:178` adds `checkInputPaths` to `runSemanticChecks`. But that function's header (`semantic.ts:1-11`) and `validate.ts:1-15` describe these checks as mirrors of Galaxy's pydantic `model_validator` rules, and `user-tool-source.test.ts` is a hand-port of Galaxy's `test_user_tool_source_validation.py`. The new check:

- Rejects tools that Galaxy's model accepts.
- Had to edit the mirror test (`user-tool-source.test.ts:105-110`).
- Emits a pydantic-style `"Value error, "` prefix (`input-paths.ts:476`) that `embedded-tool.ts:101` then strips with a regex.

Labels make this sharper. An unfilled label reference is kept as written and never fails a job (`labels.py` docstring), yet it is now a hard error that fails `validate-tool-source` and embedded workflow steps.

**Fix:**

- Keep `runSemanticChecks` as the faithful mirror, and run `checkInputPaths` as a separate lint layer that `validateUserToolSource` also calls.
- Drop the fake `Value error, ` prefix.
- Update the header docs, and leave the mirror test verbatim (move the new case to the new test file).
- Consider warning-level severity for label findings, at least in the workflow-step integration.

### P3 1: `list:paired_or_unpaired` receiving a plain `list` (unverified at job time)
Galaxy's `can_match_type` accepts a plain `list` for `list:paired_or_unpaired` (`type_description.py:202-208`). `collection_to_runtime(hdca.collection)` would then build `collection_type: "list"` with dataset elements. The check models each element as a nested paired_or_unpaired collection, so:

- `inputs.r.elements[0].path` is flagged, though it would work.
- `inputs.r.elements[0].elements.unpaired.path` is accepted, though it would throw.

I did not confirm whether an adapter re-wraps the input before runtimeify. Worth a check, or `UNKNOWN` for `*:paired_or_unpaired` inner elements.

### P3 2: Label false negatives
`input-paths.ts:455-465`. For `gx_data multiple: true` and `gx_select multiple`, the label state value is a list, and `_resolve` returns `None` (never filled in). The check accepts `$(inputs.files.name)` and `$(inputs.sel)` anyway.

### P3 3: `inputs` shadowing
`collectChains` treats every `inputs` identifier as the root, including a nested function parameter or local named `inputs`. This is rare; a scope check or a comment would do.

### P3 4: Duplicate runtime model
Issue #212 asked to reuse `gx-data.ts` / `gx-data-collection.ts` (`buildJobRuntimeCollectionSchema`). The branch adds a second, more accurate source instead. The Effect `job_runtime` schemas are now visibly stale against the same Galaxy models:

- `gx-data.ts:50-60`: `path` is required as a non-null string, and `checksum`, `listing` and `class: "Directory"` are missing.
- `gx-data-collection.ts:30-39`: `name` is required as a non-null string.

Suggest a follow-up issue to derive the Effect schemas from `job-runtime.schema.json`, so there is one runtime model.

### P3 5: Dead `gx_section` handling
`input-paths.ts:152-157` and `:447-454` handle sections, but `parseInputs` rejects YAML sections, so this code is unreachable. The section parameter added to the mirror test is also unnecessary. Remove both, or comment why they stay.

### P3 6: Scanner fidelity is not pinned by tests
Several cases I probed work today but no test covers them: `\\$(` (double backslash, which evaluates), `)` inside quotes in `$()`, `${}` bodies with object literals or nested braces, and a trailing `//` comment. Porting a few cwl_utils scanner cases would protect the port.

Separately:

- The "skips what it can't resolve" test packs 9 cases into one `[]` assertion. `it.each` would localize a failure.
- The label test pins 7 full message strings, which is brittle.

### P3 7: File organization
`input-paths.ts` (555 lines) combines the cwl_utils scanner port, AST chain collection, the runtime shape model and the label grammar. Splitting the scanner into its own module would make it reusable and testable in isolation.

### P3 8: Packaging and sync

- `acorn ^8.19.0` duplicates the `acorn@8.16.0` already in the lockfile; `^8.16.0` would dedupe it.
- `validateUserToolSource` now pulls acorn into browser bundles of `@galaxy-tool-util/schema`.
- `verify-job-runtime-schema` hashes only the JSON. The generated `.ts`, which is what's actually imported, isn't checked against it. This mirrors the existing user-tool-source pattern.

No security issues found.

## Overall
The core design is sound: a faithful scanner port, a real parser, a runtime shape model synced from Galaxy's own pydantic models, and a separate label grammar. The field lists, collection nesting, scanner behavior and parse wrapping all check out against Galaxy and cwl_utils. The main correctness risk is P1 1, a realistic false positive that now fails correct workflows. P2 1 is a smaller one of the same kind. The integration has two gaps: the json-schema mode bypass, and wiring a stricter-than-Galaxy lint into code and tests documented as a Galaxy mirror, with label findings promoted to hard errors. Fix P1 1 and the P2s, add tests for the colliding-when and string-index cases, and this is in good shape.

</details>
