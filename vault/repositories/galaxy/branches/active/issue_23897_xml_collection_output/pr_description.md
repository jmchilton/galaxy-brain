Fix 🎯 #23897 - XML `<output type="collection">` has crashed the tool parser on every valid form since 20.05, so no tool using it can load.

| `<output name="out" type="collection" …>` | `dev` | This PR |
| --- | --- | --- |
| `collection_type="list"` | `TypeError: Argument must be bytes or unicode, got 'NoneType'` ❌ | parses like `<collection type="list">` ✅ |
| `collection_type_source="input_collect"` | same `TypeError` ❌ | parses like `<collection type_source="input_collect">` ✅ |
| `structured_like="input_collect"` | same `TypeError` ❌ | parses like `<collection structured_like="input_collect">` ✅ |
| static `<data>` element children | `TypeError` ❌, and the XSD rejects `<data>` children ❌ | parses and validates ✅ |
| `collection_type="list" collection_type_source="input_collect"` | `Cannot set both type and type_source` | `Cannot set both collection_type and collection_type_source on collection output out` |

The generic `<output type=…>` element has had a `collection` branch since expression tools (19.05), and the XSD documents `collection_type`, `collection_type_source` and `structured_like` on it. The parser copied `collection_type`/`collection_type_source` onto the element as `type`/`type_source` so it could reuse the `<collection>` parser. That worked under the stdlib ElementTree, but since Galaxy switched to lxml (20.05), lxml refuses whichever of the two is `None`.

***`<collection>` parsing is unchanged: it runs the same code, reading the same `type`/`type_source` attributes, now passed as defaults.***

***This makes a form the XSD already documents work again, and makes the XSD agree with the parser about it. It doesn't promote the form: the `OutputsOutput` linter still tells authors to prefer `<data>`/`<collection>`.*** No tool in Galaxy, tools-iuc, galaxytools or tools-devteam uses it. Nobody reported the crash in six years, and nothing on current releases can depend on the rewritten attributes. YAML tools parse collection outputs separately and are untouched.

<details><summary>What changed</summary>

- **Parser (`lib/galaxy/tool_util/parser/xml.py`).** `_parse_collection` takes the names of the two attributes to read. `<collection>` reads `type`/`type_source`, `<output type="collection">` reads `collection_type`/`collection_type_source`, and the element is no longer rewritten. The "Cannot set both" error names whichever attributes the author wrote, plus the output name. The existing structure check stays as a backstop for YAML tools.
- **XSD (`lib/galaxy/tool_util/xsd/galaxy.xsd`).** The generic `Output` type only allowed `<data>`'s children (`change_format`, `filter`, `discover_datasets`, `actions`), so static collection elements failed validation although the parser accepts them. It now allows the union of both child sets, and its documentation says which children apply to which `type`.
- **XSD limitation.** XSD 1.0 can't pick a content model by the `type` attribute, and one content model can't declare `discover_datasets` with two different types. So the generic form keeps the dataset flavour of `discover_datasets`, and the documentation says `assign_primary_output` doesn't apply to collections. That was already the case for the parser.

</details>

## Risks

The one lasting effect is that tools can rely on `<output type="collection">`, including static elements, as the XSD has advertised, so removing the form later would break them.

<details><summary>Risk Details</summary>

- Tools written against this form won't load on Galaxy 20.05 through 26.x. The linter already warns against the generic `<output>` element.
- The XSD now accepts `<data>` children under any generic `<output>`, including `type="data"` and expression outputs, where the parser ignores them. XSD 1.0 can't tell those apart.
- `<collection>` parsing and its error messages are unchanged apart from the output name added to "Cannot set both".

</details>

<details><summary>Risk Review Advice</summary>

Check that the `<collection>` call site still passes the default attribute names, and that the generic call site reads `collection_type`/`collection_type_source`. For the XSD, check the new `OutputElement` group and the `Output` documentation. All 311 test tools still validate.

</details>

## Context

Bug discovered while working on 🔀 #23890 (fix for 🎯 #23886), whose unit test for this form crashed before reaching its new `type_source` check. #23890 has merged into `release_26.1`, so this targets `dev` on its own.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Before, the tool didn't load (lxml `TypeError`). Now it loads, and invalid combinations get the same `ValueError` as `<collection>`, naming the attributes that were set.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Each case parses the `<collection>` form and the `<output type="collection">` form and checks that they produce the same output model. The XSD test runs the real XSD linter.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- **`test/unit/tool_util/test_parsing.py`:**
  - `test_generic_collection_output_matches_collection` covers 8 combinations of explicit type, type source or `structured_like` with no children, discovered datasets or a static `<data>` child. (`structured_like` with discovered datasets is the rejected case below.) It checks that the parsed structure, element outputs and output model match the `<collection>` form, that parsing twice gives the same result, and that the source XML is unchanged. On `dev`'s parser, all 8 cases fail with the lxml `TypeError`.
  - `test_collection_output_rejects_invalid_structure` checks that both spellings reject type plus type source, naming their own attributes, and reject `structured_like` plus discovered datasets, leaving the source XML unchanged. On `dev`, 3 of the 4 fail: the two `<output>` cases, and the `<collection>` type-plus-type-source case, whose message now names the output.
- **`test/unit/tool_util/test_tool_linters.py::test_outputs_generic_collection_children`** runs the XSD linter on a generic collection output with static `<data>` children and a `<filter>`, and on one with `discover_datasets`, then parses both. With `dev`'s XSD it fails: `Element 'data': This element is not expected.`
- **Framework test tool `collection_output_type_source.xml`:** this is `collection_type_source.xml` with the generic form. It runs a list and a paired input collection and checks each element's contents. Both tests pass locally with `./run_tests.sh -framework -id collection_output_type_source`.
- **Local results:**
  - `test_parsing.py` and `test_tool_linters.py`: 240 passed.
  - `.ci/validate_test_tools.sh`: all 311 test tools validate.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
