Fix 🎯 #212 - `validate-tool-source`, `validate` and `draft-validate --concrete` now catch user-defined tool templates that read `inputs.*` fields the job's inputs won't have, instead of passing tools that fail at job time.

Here is a tool built around the issue's egapx `star_wnode` configfile: a `paired_or_unpaired` collection `reads`, with the reads taken straight off the collection:

```
# main
$ gxwf validate-tool-source star_wnode.yml
star_wnode.yml: OK

# this branch
star_wnode.yml: 3 validation error(s)
  /configfiles/0/content: inputs.reads.unpaired: data_collection input 'reads' (paired_or_unpaired) has no field 'unpaired' at job runtime (fields: class, collection_type, column_definitions, columns, elements, fields, has_single_item, name, tags). Use inputs.reads.elements.unpaired. [input_path]
  /configfiles/0/content: inputs.reads.forward: data_collection input 'reads' (paired_or_unpaired) has no field 'forward' at job runtime (…). Use inputs.reads.elements.forward. [input_path]
  /configfiles/0/content: inputs.reads.reverse: data_collection input 'reads' (paired_or_unpaired) has no field 'reverse' at job runtime (…). Use inputs.reads.elements.reverse. [input_path]
```

The fixed form (`inputs.reads.has_single_item ? inputs.reads.elements.unpaired.path : …`) passes. Embed the same tool in a workflow and `gxwf validate` fails the step with the same three messages, each prefixed `embedded GalaxyUserTool`; it exits 1, where `main` reports `tool_state: OK` and exits 0. `draft-validate --concrete` counts the step as failed.

***It reports a path only when the input's shape is known and the path can't be read from it.*** Every path is resolved against the value Galaxy gives that input when the job runs. Field names come from Galaxy's own runtime models (`DataInternalJson` and the collection runtime models), synced into the repo by the new `make sync-job-runtime-schema`. The layout of `elements` by collection type, including `paired_or_unpaired`'s `unpaired` key, is ported from `galaxy.tools.runtime`. String and array methods at the end of a path (`.path.replace(...)`, `.elements.map(...)`) are fine.

***Paths are checked against the runtime model Galaxy's workflow path uses.*** Galaxy's legacy `/api/tools` input builder gives some collections a bare `{forward, reverse}`. A tool written for that shape is reported as wrong.

***No findings on Galaxy's YAML functional tools.*** I swept 957 tool definitions:

| Source | Tools | With findings |
|---|---|---|
| Galaxy dev `test/functional/tools` and other YAML test tools | 34 | 0 |
| This repo's fixtures | 16 | 2 |
| Galaxy Workflow Foundry run drafts (many copies of the same tools across iterations) | 907 | 66 copies of 6 distinct tools |

A new `tool-xml` test also checks the YAML tools synced from Galaxy's `test/functional/tools/` and expects no findings, so CI covers part of this. Every hit is `.path` read directly off a collection, which is `undefined` at job runtime.

***The two Galaxy fixtures it flags are real bugs that never run.*** `ok_udt_collection_input` and `fail_paired_to_udt_list_collection`, synced from Galaxy's connection-validation tests, read `.path` off a `list`. They only feed connection checks.

***This is stricter than Galaxy's create-time checks, on purpose.*** Galaxy's model validators only check that each referenced input is declared, `validate_expression_template` only checks that each expression is closed, and `lint_user_tool_source` has no path check either. The mirrored checks are unchanged. The new check runs beside them, so `runSemanticChecks` still mirrors Galaxy exactly.

***One case in Galaxy's validator tests is flagged.*** It references a child of an empty repeat (`inputs.my_repeat[0].x`). The ported mirror test now declares `x`; the mirrored check itself is unchanged.

***Output labels are checked against Galaxy's label rules, not the runtime model.*** Galaxy fills `$(inputs.<name>.<key>)` from the tool state when the job is created (`galaxy.tools.expressions.labels`), not by evaluating JavaScript. A dataset reference ends with `name`, `element_identifier` or `format`, and a collection reference with `name` or `element_identifier`. Galaxy keeps a reference it can't fill in as written, so the job doesn't fail, but the label is wrong. These are reported as errors too.

***gxwf-web's workflow validation and `validate-tool-source-tree` report these failures too; only the response shape is unchanged.***

***When the check can't know, it skips.*** These are skipped, not guessed:
- computed keys (`inputs.reads[k]`)
- aliases (`const r = inputs.reads; r.x`), including callback parameters (`e` in `inputs.l.elements.map(e => e.path)`), and expressions that bind their own `inputs`
- collections with no `collection_type`, a choice of types, or `record` contents
- bodies that aren't JavaScript
- YAML `section` inputs: this repo's YAML parser doesn't read them yet, though Galaxy's `CanonicalYamlInputSource` does

Where Galaxy can give an input one of several shapes, a path passes if any of them has it. That covers parameters of the same name in different conditional branches, and a plain `list` given to `list:paired_or_unpaired`.

<details><summary>How it works</summary>

- **Finding the JavaScript.** `template-scanner.ts` is a port of `cwl_utils.expression.scanner`, which Galaxy's `do_eval` uses. It handles escapes, quotes and nesting the same way. Each `$(...)` body is parsed as an expression and each `${...}` body as a function body, both with acorn.
- **Reading chains.** `template-chains.ts` collects every member chain rooted at `inputs`, dotted or with literal brackets.
- **Resolving.** `runtime-shape.ts` builds each input's job runtime shape the way `runtimeify` does:
  - datasets, and multiple data as an array of them;
  - collections, with `elements` by type: an array for `list`/`sample_sheet`, `forward`/`reverse` for `paired`, plus `unpaired` for `paired_or_unpaired`, nested types recursively;
  - conditionals (test parameter plus every branch's parameters), repeats as arrays of blocks, and scalars.
- **Labels.** `label-references.ts` ports `labels._resolve` / `_dataset_attribute`.
- **Wiring.**
  - `validateUserToolSource` runs `checkInputPaths` after the Galaxy-mirroring semantic checks; `--schema-only` skips both.
  - Every embedded `GalaxyUserTool` step goes through one `validateEmbeddedToolStep`: effect and json-schema modes, native and format2. That step also reports undeclared inputs, since workflow validation doesn't run the mirrored check.
- **Contract.**
  - Diagnostics use the existing `UserToolSourceDiagnostic` with keyword `input_path`.
  - Workflow step results keep their shape: `status: "fail"` plus string `errors`, so gxwf-web's OpenAPI is unchanged.
  - `@galaxy-tool-util/schema` gains `acorn`, at the 8.16.0 already in the lockfile.

</details>

<details><summary>Tests</summary>

- `packages/schema/test/user-tool-source-input-paths.test.ts`:
  - the egapx case and its fixed form;
  - `${}` bodies, dataset fields, string methods and string indexing;
  - paired, `list:paired` and multiple data inputs;
  - conditionals (including same-named branch parameters) and repeats;
  - `list:paired_or_unpaired` given a `list`;
  - scanner cases (escapes, `\\$(`, `)` in quotes, object literals, `//` comments, quoted template literals);
  - each skip case;
  - undeclared roots with and without `undeclaredRoots`;
  - labels: accepted references, each never-filled-in reference, and same-named branches.
- `packages/tool-xml/test/user-tool-input-paths.test.ts`: no findings on each YAML tool synced from Galaxy's `test/functional/tools/`.
- `packages/cli/test/user-defined-tool-step.test.ts`: `gxwf validate` in effect and json-schema modes, format2 and native, plus undeclared roots and `draft-validate --concrete`.
- With the check unwired, the egapx test fails: 0 errors instead of 3.
- `packages/schema/test/user-tool-source.test.ts` (the port of Galaxy's `test_user_tool_source_validation.py`) changed one fixture. Galaxy's repeat case references `x` in an empty repeat; `x` is now declared.

</details>

## Risks

Risks are low. `@galaxy-tool-util/schema` takes on acorn as a runtime dependency, which is the closest thing to a one-way door here; the rest is cheap to walk back.

<details><summary>Risk Details</summary>

- Tools and workflows that pass today can fail after upgrading. That is the point, but a false positive would block a correct tool. The sweep found none on Galaxy's tools.
- Label references Galaxy can't fill in are errors, though Galaxy doesn't fail the job for them.
- The field lists follow Galaxy dev at `e922a682`. If Galaxy's runtime models change, `make sync-job-runtime-schema` must be re-run.
- `@galaxy-tool-util/schema` gains acorn (no dependencies, about 100 KB minified), which reaches browser bundles that import `validateUserToolSource`.

</details>

<details><summary>Risk Review Advice</summary>

The main question is false positives: a template that works in Galaxy but is flagged here. Check the runtime shapes in `runtime-shape.ts` against `galaxy.tools.runtime` and the `parameters.py` runtime models. Also decide whether label findings should be errors.

</details>

## Context

Related: galaxyproject/foundry#672 (the UDT authoring note documents the runtime shapes) and galaxyproject/foundry#734 (the egapx test fix from the same run). The same check is proposed for Galaxy's `lint_user_tool_source`. Follow-ups:
- Read YAML sections the way Galaxy's `CanonicalYamlInputSource` does.
- Derive the Effect `job_runtime` schemas (`gx-data.ts`, `gx-data-collection.ts`) from `job-runtime.schema.json`; they are stale against the same Galaxy models.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Six structural findings acted on; behavior and messages unchanged.</summary>

- Split `input-paths.ts` into the scanner, chain reading (`template-chains.ts`, on acorn's AST types), runtime shapes (`runtime-shape.ts`, model names typed from the generated schema) and label references (`label-references.ts`).
- The undeclared-root decision is made once, in `checkInputPaths`.
- All four embedded-step validators go through `validateEmbeddedToolStep`, so a validation mode can't skip the template check.
- Left as follow-ups: a shared conditional-parameters helper in `bundle-types.ts`, and one Makefile macro for the three schema sync/verify target pairs.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_212_udt_expression_paths/thermo_nuclear_review/). Run via Claude Opus 5.5.

</details>

### ✅ Second Frontier Model Review

<details><summary>Two of three findings fixed: undeclared inputs in embedded tools, and expressions that rebind <code>inputs</code>.</summary>

- Workflow validation never ran the mirrored undeclared-input check, so `$(inputs.missing.path)` in an embedded tool passed. Embedded steps now report it.
- An expression that binds its own `inputs` (an arrow parameter, a local) was resolved against the job's inputs. It is now skipped.
- Not fixed here: references into YAML `section` inputs go unchecked, because the TS YAML parser doesn't read sections. That's a parser follow-up.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_212_udt_expression_paths/codex_review/). Run via gpt-6.1-sol.

</details>
