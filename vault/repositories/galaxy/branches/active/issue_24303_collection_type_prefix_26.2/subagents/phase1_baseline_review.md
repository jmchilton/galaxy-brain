# Phase 1 baseline review (`d4833259a4a`)

Acted on: removing `test_nest_map_over_list_of_pairs` from the baseline commit (it asserts corrupt state — declared `list:list:list` holding `list:list:list:paired` — and baseline commits may be split into their own PR); it returns in the Nest phase red-to-green with correct expectations. Parametrizing the two `type_source` structure unit tests into one table for prefix cases. Dropping the redundant `as OutputCollectionTerminal` cast. Applied as a fixup rebase after phase 2.

Not acted on:
- `test_nest_list` duplicates the tool XML `<test>` — kept as the 1.0.0 API control next to the 1.1.0 tests.
- `test_tool_output_to_structure_dataset_output` near-trivial — kept, cheap, documents the `leaf` branch.
- `_sliced_structures` returning `__getitem__` opaque — minor, left.

<details><summary>Full review</summary>

Unit suite 17 passed; API/client not run. No security issues.

1. `test_nest_map_over_list_of_pairs` pin conflicts with baseline split usage (`test_tools.py:1315-1342`) — move to Nest phase red-to-green, or TODO.
2. `test_nest_list` largely duplicates `nest_collection.xml:23-42` `<test>` — keep as 1.0.0 control or drop. `test_nest_paired` is new coverage.
3. `..._type_source_nested_slice` same path as prior test — parametrize.
4. `..._dataset_output` near-trivial — optional drop.
5. `_sliced_structures` opaque — minor.
6. Redundant cast `terminals.test.ts:982`.

Good: imports at top, minimal `SimpleNamespace` fake, reuse of `test_matching` builders / populators, sparse comments, good extension points for prefix × map-over.

</details>
