Fix 🎯 #24476 — preserve output filter expressions in parsed tool metadata so consumers can identify outputs that may not be produced.

The XML parser already retains output filters, but conversion to `ParsedTool` drops them. For example, Galaxy's existing `output_filter.xml` fixture declares these conditions:

| Output | Before: serialized filter metadata | After: `filters` |
| --- | --- | --- |
| Dataset `out_1` | Missing | `["produce_out_1 is True"]` |
| Collection `list_output` | Missing | `["produce_collection is True"]` |
| An unconditional output | Missing | `[]` |

***This gives consumers of parsed tool metadata, including Tool Shed API clients and external workflow-building tools, the conditions they need to recognize optional outputs.*** Consumers still need to use this metadata; this PR does not add that downstream behavior.

***The change preserves metadata only: Galaxy's execution of existing tools and workflows is unchanged, and incoming tool-authoring models do not gain a `filters` field.*** Data, collection, and all four scalar output types expose the same ordered list of expressions, with surrounding whitespace stripped. All expressions must evaluate to true for the output to be produced; conversion itself does not evaluate them.

<details><summary>Compatibility and generated types</summary>

The parsed-output models default `filters` to an empty list, so older serialized objects remain loadable. The Tool Shed's existing schema-keyed cache invalidates old parsed-tool entries when the model schema changes. Regenerated Tool Shed TypeScript types add `filters?: string[]` to the six parsed-output variants. External consumers such as `galaxy-tool-util-ts` need their own schema update after deployment.

</details>

## Risks

The additive `filters` field becomes a public parsed-output API contract that consumers may depend on, so removing or redefining it later would require compatibility care.

<details><summary>Risk Details</summary>

- Strict clients that reject unknown response fields may need updating.
- An empty list means no declared output filter; it is not a guarantee that a job succeeds or creates a valid output.
- Filter strings retain tool-language expressions; this change supplies no portable evaluator.
- Tool Shed parsed-tool caches will be repopulated under the updated schema key.

</details>

<details><summary>Risk Review Advice</summary>

Review the parsed-only field placement and the default empty-list contract. Check the three conversion paths and generated output types together, including the tests that keep user-defined tool authoring strict.

</details>

## Context

Addresses the metadata loss reported in #24476, which describes external workflow tooling connecting outputs that may be filtered out. Targets `release_26.1`. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>The fix covers every parsed output variant that supports XML filters.</summary>

Scalar outputs share the same omission as datasets and collections. A derived boolean loses expression details; adding evaluation or authoring support would establish separate behavior beyond this fix.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>One parsed-only field and one shared conversion property cover all three conversion paths.</summary>

The diff adds no runtime evaluation, source-specific branching, or changes to incoming models. Generated changes are confined to the six parsed-output variants.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Real XML/YAML inputs exercise serialized filters and the authoring boundary.</summary>

The three added baseline cases pass before the fix. All eight regression cases fail on the original source at missing serialized <code>filters</code> assertions, after parsing succeeds. Coverage includes data and collection filters, all scalar types, multiple expressions, whitespace, unconditional outputs, and incoming user-tool rejection.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No independent behavior-preserving refactor was needed.</summary>

The new base and conversion property serve the new field directly. Passing baseline tests remain in their own leading commit.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Metadata consumers can treat a conditional output as guaranteed and create connections that cannot be satisfied when its filter is false.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; they assert the public serialized contract from real XML/YAML sources.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Focused regression tests</summary>

```sh
source .venv/bin/activate
PYTHONPATH=lib pytest test/unit/tool_util/test_parsed_tool_model.py test/unit/tool_util/test_output_models.py
```

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
