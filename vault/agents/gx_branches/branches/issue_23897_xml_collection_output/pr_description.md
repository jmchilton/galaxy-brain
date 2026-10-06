Fix 🎯 #23897 - XML `<output type="collection">` has crashed the tool parser on every valid form since 20.05, so no tool using it can load.

| `<output name="out" type="collection" …>` | `dev` | This PR |
| --- | --- | --- |
| `collection_type="list"` | `TypeError: Argument must be bytes or unicode, got 'NoneType'` ❌ | parses like `<collection type="list">` ✅ |
| `collection_type_source="input_collect"` | same `TypeError` ❌ | parses like `<collection type_source="input_collect">` ✅ |
| `structured_like="input_collect"` | same `TypeError` ❌ | parses like `<collection structured_like="input_collect">` ✅ |
| `collection_type="list" collection_type_source="input_collect"` | `Cannot set both type and type_source` | unchanged |

The generic `<output type=…>` element has had a `collection` branch since expression tools (19.05), and the XSD documents `collection_type`, `collection_type_source` and `structured_like` on it. The branch copies `collection_type`/`collection_type_source` onto the element as `type`/`type_source` so it can reuse the `<collection>` parser. That worked under the stdlib ElementTree, but since Galaxy switched to lxml (20.05), lxml refuses whichever of the two is `None`.

`_parse_collection` now takes the names of the two attributes to read. `<collection>` keeps reading `type`/`type_source`, and `<output type="collection">` reads `collection_type`/`collection_type_source`. The element is no longer rewritten, and the existing "Cannot set both" and dynamic-structure checks apply to both spellings.

***`<collection>` parsing is unchanged: it runs the same code, reading the same `type`/`type_source` attributes, now passed as defaults.***

***This makes a form the XSD already documents work again. It doesn't promote it: the `OutputsOutput` linter still tells authors to prefer `<data>`/`<collection>`.*** No tool in Galaxy, tools-iuc, galaxytools or tools-devteam uses the form. Nobody reported the crash in six years, and nothing on current releases can depend on the rewritten attributes. YAML tools parse collection outputs separately and are untouched.

## Risks

The one lasting effect is that tools can rely on `<output type="collection">` again, as the XSD has always advertised, so removing the form later would break them.

<details><summary>Risk Details</summary>

- Tools written against this form won't load on Galaxy 20.05 through 26.x. The linter already warns against the generic `<output>` element.
- `<collection>` parsing is unchanged.

</details>

<details><summary>Risk Review Advice</summary>

Check that the `<collection>` call site still passes the default attribute names, and that the generic call site reads `collection_type`/`collection_type_source`. The whole parser change is in `_parse_collection` and its two callers in `lib/galaxy/tool_util/parser/xml.py`.

</details>

## Context

Bug discovered while working on 🔀 #23890 (fix for 🎯 #23886), whose unit test for this form crashed before reaching its new `type_source` check. #23890 has merged into `release_26.1`, so this targets `dev` on its own.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Before, the tool didn't load (lxml `TypeError`). Now it loads, and invalid combinations get the same `ValueError` as `<collection>`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Each case parses the `<collection>` form and the `<output type="collection">` form and checks that they produce the same output model.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test/unit/tool_util/test_parsing.py::test_generic_collection_output_matches_collection` covers 8 combinations of explicit type, type source or `structured_like` with no children, discovered datasets or a static `<data>` child (`structured_like` with discovered datasets is the rejected case below). It checks that the parsed structure, the element outputs and the output model match the `<collection>` form, that parsing twice gives the same result, and that the source XML is unchanged. On `dev`'s parser, all 8 cases fail with the lxml `TypeError`.
- `test_collection_output_rejects_invalid_structure` checks that both spellings reject type plus type source, and `structured_like` plus discovered datasets. Both spellings must also leave the source XML unchanged. On `dev`, the `<output>` cases fail: the `structured_like` one with the `TypeError`, and the type-plus-type-source one because `dev` rewrites the element before raising.
- The framework test tool `collection_output_type_source.xml` is `collection_type_source.xml` with the generic form. It runs a list and a paired input collection and checks each element's contents. It validates against `galaxy.xsd`, and both tests pass locally with `./run_tests.sh -framework -id collection_output_type_source`.
- `test_parsing.py`: 105 passed.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
