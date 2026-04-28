# `@galaxy-tool-util/schema` workflow-tests schema: usability regressions in 0.4.0

Comparing the test-format JSON schema produced by `@galaxy-tool-util/schema@0.4.0` against the 0.2.0-era vendored `tests.schema.json` previously shipped by `galaxy-workflows-vscode`. The new schema adds breadth (description count ~213 → ~385, nodes 1045 → 1675) but leaks pydantic internals and regresses on titles, descriptions, and required-field semantics. Fixes should land upstream in the pydantic models that generate the schema.

## P0 — `doc` is incorrectly marked required on `TestJob`

`TestJob.required = ["doc", "job", "outputs"]`. Old `Test.required = ["job", "outputs"]`. **This is a bug** — workflow test files in the wild routinely omit `doc`, and this was optional in the prior schema. Root cause is almost certainly a pydantic model where `doc` is typed as a non-`Optional` string; fix by typing it `Optional[str] = None` (or equivalent) so it is emitted as optional in the generated schema. Same re-examination should be done on every `required` list in the new schema — many look like accidental byproducts of Python type annotations rather than intentional validation constraints.

## P1 — Internal Python artifacts leaking into the public schema

The upstream `model_json_schema()` output appears to be published as-is. Heavy cleanup needed:

1. **Mangled `$defs` keys from `RootModel` wrappers.** e.g. `RootModel_dict_str__Union_Annotated_Union_Annotated_LocationFile__Tag___Annotated_PathFile...` (400+ chars) is the `$ref` for `TestJob.job`. Similar for the assertion list. Fix: give `RootModel` wrappers explicit, stable names (`JobInputs`, `AssertionList`, etc.) via `model_config`/`json_schema_extra`, or replace `RootModel` with named aliases.

2. **31 `base_*` defs and 31 `*_nested` defs triple every assertion.** `has_text_model`, `base_has_text_model`, `has_text_model_nested` — downstream tools (LSP, docs) walk all three and users can't tell which to use. Mark base/nested variants private (suppress from `$defs`) or inline them.

3. **Discriminator field `that` exposed on every assertion.** Every `has_text_model`/`has_n_lines_model`/etc. has `that: { const: "has_text", title: "That" }` as a user-visible property. This is the internal pydantic discriminator used for round-tripping the tag name and shouldn't be part of the authored document surface.

## P2 — Titles regressed from human-readable to identifier-verbatim

Titles are now pydantic-auto-derived from Python attribute names instead of human labels.

Properties:
- `"Doc"` → `"doc"`, `"Outputs"` → `"outputs"`, `"Lines Diff"` → `"lines_diff"`
- `"Class"` → `"class_"` (Python's reserved-word trailing underscore leaks into the schema)

Definition titles:
- `"Test"` → `"TestJob"`
- `"ListOfTests"` → `"RootModel[List[TestJob]]"` — the top-level schema title is literally a Python type signature
- `"AssertHasText"` → `"has_text_model"`, `"TestOutputCollection"` → `"TestCollectionOutputAssertions"`

Fix upstream by setting explicit `title=` on every `Field(...)` and `model_config = ConfigDict(title=...)` on every model.

## P3 — Descriptions dropped on the most-hovered properties

Most of the added descriptions landed on nested assertion internals. The top-level properties users hit first *lost* their descriptions:

| property on `Test` / `TestJob` | old | new |
|---|---|---|
| `doc` | "Describes the purpose of the test." | *(none)* |
| `job` | "Defines job to execute. Can be a path to a file or an line dictionary describing the job inputs." | *(none)* |
| `outputs` | "Defines assertions about outputs (datasets, collections or parameters)…" | *(none)* |
| `expect_failure` | *(didn't exist)* | *(no description on new prop)* |

Same pattern in `TestDataOutputAssertions`: `asserts`, `metadata`, `file`, `ftype`, `sort`, `md5`, `checksum`, `compare`, `lines_diff`, `decompress`, `delta`, `delta_frac`, `location` — **every one had a description in 0.2.0 and has none now.** This is the single biggest practical regression for hover UX in editors and for agent legibility.

## P4 — Top-level schema metadata missing

- No `$schema` declaration. Add `"$schema": "https://json-schema.org/draft/2020-12/schema"` (or whichever draft pydantic actually targets) so editors select the right validator semantics.
- No top-level `description`. Add a one-liner: "Galaxy workflow tests file — a YAML list of test entries…"
- Top-level `title` is `"RootModel[List[TestJob]]"`; should be `"GalaxyWorkflowTests"` or `"ListOfTests"`.

## P5 — Value-type normalizations (likely improvements, call-outs)

Not regressions, noted so the upstream discussion is complete:
- `negate.default` changed from string `"false"` to boolean `false`.
- `delta.default` in `has_text_model` / `has_n_lines_model` changed from `null` to `0`.

## Suggested upstream fix order

1. **P0** — make `doc` optional; audit other `required` entries for similar accidents.
2. Suppress/inline `base_*` and `*_nested` defs; suppress the `that` discriminator from the public schema.
3. Name the `RootModel` wrappers explicitly (`JobInputs`, `AssertionList`, `TestsFile`).
4. Reinstate titles and descriptions on top-level `TestJob` props and on `TestDataOutputAssertions` props — port the 0.2.0 strings back.
5. Add top-level `$schema`, `title`, and `description`.
