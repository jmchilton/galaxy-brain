# Thermo-nuclear review debrief

Reviewed `b81cb14...3dd0a45`. Acted on findings 1 and 2 in `6b375cf`: the hand-maintained type tables are now derived from the input models, and a guard test was added. Findings 3–6 were not acted on. They are pre-existing or generated, so they're logged as follow-ups. Full pytest: 940 passed, 8 skipped. `make lint` passes, including the schema drift check.

Not acted on:
- **Discriminator map in about four copies.** The copies are in `Process.yml`, the generated `disc_map`, the `scripts/patch_generated_pydantic.py` literal and `_input_parameter.py`. They predate this branch. Removing them means changing the codegen and patch pipeline, so it's left as a follow-up.
- **Mermaid `STEP_TYPE_SHAPES`, abstract `_galaxy_type_to_cwl`, lint `_DEFAULT_CHECKS`.** These still need a hand edit for each new type. Deriving mermaid shapes would change the existing int/string fallback to the data shape. The abstract mapping also emits non-CWL `text`/`integer` for the aliases, which predates the branch. Both are follow-ups.
- **Error-message pinning on the `validate_format2` `expect_error` cases.** The declarative harness (`gxformat2/testing.py`) can't assert on exception messages, and galaxy-tool-util-ts syncs these YAMLs. Adding that would extend the harness on both sides, so it's left as a follow-up.
- **`v19_09.py` / `v19_09_draft.py` +1089 lines each.** These files are generated legacy codegen and were already far over 1k lines. Waived.
- **`_conversion.py` is over 1k lines (1884).** It was already over before this branch, which adds about 10 net lines. No decomposition was asked of this branch.

<details><summary>Full review</summary>

**Verdict:** The behavior was correct and the structure acceptable. The main miss was a code-judo opportunity. To add one input type, the branch edited eight hand-written dispatch sites: the SALAD enum and record, Process.yml, `_input_parameter.py`, the patch script, `_INPUT_TYPE_STEP_TYPES`, `_PARAMETER_FIELD_TYPE_VALUES`/`REGEX_VALIDATOR_TYPE_VALUES`, mermaid, lint and abstract. Several of those tables restate facts the generated models already encode.

**1. (acted on) Field-validity tables duplicate the schema.** `_TEXT_TYPE_VALUES`, `REGEX_VALIDATOR_TYPE_VALUES` and `_PARAMETER_FIELD_TYPE_VALUES` hand-list which types may carry restrictions, suggestions, restrictOnConnections and validators. The per-type models already say this: `WorkflowTextParameter` declares all four, `WorkflowDirectoryUriParameter` declares only `validators`, and `WorkflowColorParameter` declares none. The branch also made `_conversion` import a constant from the validators module, which is a layering smell.
- Fix: `input_types_declaring(field)` in `schema/_input_parameter.py` now derives each set from `model_fields`.
- The semantic validator and conversion both consume it, so adding a type is a schema-only change for these rules.
- The derived sets match the old hand tables exactly, and the error messages are unchanged.
- The dead second `is None` check in the touched loop and its stale "non-text input" comment were dropped.

**2. (acted on) `_INPUT_TYPE_STEP_TYPES` restates the discriminator keys.** It is now built from `INPUT_TYPES` plus a two-entry class→step-type map (Data→`data_input`, Collection→`data_collection_input`, else `parameter_input`). Unknown types still map to `None`. The derived table equals the old one.
- Guard: no test covered native multiple text with a regex validator. That case is the `["string"]` list branch in `_build_input_param`. A `synthetic-multiple-text-validators.ga` fixture and a `to_format2` expectation were added before the refactor; the case passed before and after.

**3. (follow-up) Discriminator map duplication.** The type→class map exists in `Process.yml`, the generated `disc_map`, the patch-script literal that is injected into the generated modules, and `_input_parameter.py`. Converging on one source needs pipeline work outside this branch's scope.

**4. (follow-up) Remaining per-type hand tables.** Mermaid shapes, the abstract CWL mapping and lint default checks are still edited by hand. Mermaid's pre-existing fallback to the data shape for `int`/`string` would change if derived. The abstract mapping passes through `text`/`integer`, which are not CWL types.

**5. (follow-up) Error-path expectations are loose.** The `expect_error: true` cases prove a failure but not which rule fired. Lax-mode `restrictions` on `directory_uri` is only rejected by the semantic layer, so that layer is exercised, but the message isn't pinned.

**6. (waived) File size.** The generated `v19_09*.py` files grow by about 1.1k lines each. `_conversion.py` was already over 1k lines before the branch.

**Fine as is:** `_SCALAR_ONLY_TYPE_VALUES` stays hand-written, since "multiple" can't be expressed in the models. `_STRING_DEFAULT._replace(...)` in lint is fine. The `BaseComment.color` predicate fix is required and commented.

</details>
