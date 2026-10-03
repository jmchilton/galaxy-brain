Title: XML `<output type="collection">` can never parse

_Posted by an AI assistant (Claude) on jmchilton's behalf — not personally authored._

XML tools can declare outputs with the generic `<output type=…>` element, and `type="data"` works there (`expression_pick_larger_file.xml` uses it in an expression tool), but `type="collection"` crashes the parser on every valid form, so no tool using it can load.

That element arrived in f5c93e868b7 (2018, "Implement expression tools and non-data tool outputs"), which added both a `data` and a `collection` branch. The XSD documents both, and says `type="collection"` follows the semantics of the `<collection>` tag. The `collection` branch has never parsed.

| Attributes | `<output name="out" type="collection" …>` on `dev` | Same attributes on `<collection name="out" …>` |
|---|---|---|
| `collection_type="list"` | ❌ `TypeError: Argument must be bytes or unicode, got 'NoneType'` | ✅ parses |
| `collection_type_source="input_collect"` | ❌ same `TypeError` | ✅ parses |
| `structured_like="input_collect"` | ❌ same `TypeError` | ✅ parses |
| `collection_type="list" collection_type_source="input_collect"` | rejected as intended (`Cannot set both type and type_source`) | rejected the same way |

(`<collection>` spells the first two attributes `type` and `type_source`.)

<details><summary>The problematic code (`lib/galaxy/tool_util/parser/xml.py`)</summary>

The branch copies `collection_type` and `collection_type_source` onto the element as `type` and `type_source` so it can reuse the `<collection>` parser. Whichever attribute is absent gets set to `None`, which lxml refuses, so only the invalid both-present form gets past it.

```python
elif output_type == "collection":
    out_child.attrib["type"] = unicodify(out_child.get("collection_type"))
    out_child.attrib["type_source"] = unicodify(out_child.get("collection_type_source"))
    _parse_collection(out_child)
```

</details>

<details><summary>Nobody seems to be affected</summary>

No tool in Galaxy, tools-iuc, galaxytools or tools-devteam uses the form, and YAML tools parse their collection outputs separately. But the XSD's `Output` type declares `collection_type`, `collection_type_source`, `structured_like` and the other collection attributes, so an author who follows the schema gets a tool that won't load.

</details>

<details><summary>Reproduce (no app needed)</summary>

```python
from galaxy.tool_util.parser import get_tool_source

src = get_tool_source(raw_tool_source="""<tool id="t" name="t" version="1"><command>x</command>
<inputs><param name="input_collect" type="data_collection"/></inputs>
<outputs><output name="out" type="collection" collection_type="list"/></outputs></tool>""",
    tool_source_class="XmlToolSource")
src.parse_outputs(None)
```

```
  File "lib/galaxy/tool_util/parser/xml.py", line 562, in parse_outputs
    out_child.attrib["type"] = unicodify(out_child.get("collection_type"))
  File "src/lxml/etree.pyx", in lxml.etree._Attrib.__setitem__
TypeError: Argument must be bytes or unicode, got 'NoneType'
```

</details>

## Context

Bug discovered while working on 🔀 #23890 (fix for 🎯 #23886). That PR adds a load-time check on output collection `type_source` and documents nesting rules on the XSD `Output` type's `collection_type_source`. A unit test for the `<output type="collection">` form crashed before reaching the check.

## Proposed Approach

Stop rewriting the element. Have `_parse_collection` take the names of the attributes to read, so `<output type="collection">` reads `collection_type`/`collection_type_source` directly and the "Cannot set both" check still applies. Add parsing tests for each table row and a framework test tool so the form is exercised end to end.

<details><summary>Proposed Approach In Detail</summary>

```python
def _parse_collection(collection_elem: Element, type_attr="type", type_source_attr="type_source"):
    ...
    collection_type = collection_elem.get(type_attr)
    collection_type_source = collection_elem.get(type_source_attr)
    ...

elif output_type == "collection":
    _parse_collection(out_child, "collection_type", "collection_type_source")
```

- Tried locally: rows 1–3 give the same structure as the matching `<collection>`, row 4 still raises, a `<discover_datasets>` child works, and `test/unit/tool_util/test_parsing.py` passes. The `unicodify` import becomes unused.
- Only copying the attributes that are present isn't enough. The element's own `type="collection"` stays, so a bare `collection_type_source` hits "Cannot set both", and `structured_like` parses with `collection_type="collection"`.
- Unit tests in `test/unit/tool_util/test_parsing.py`: one per table row, compared against the `<collection>` form.
- A framework test tool using `<output type="collection" collection_type_source="…">`.
- Small enough to land in #23890 on `release_26.1`, which would keep that PR's new XSD docs true. Otherwise it targets `dev`.

</details>

## Alternative Approaches

The other option is to stop advertising the form. Fixing it is a few lines and matches what the XSD already promises, so removing it saves little.

<details><summary>Alternatives In Detail</summary>

### Alternative: Remove `type="collection"` from `<output>`

<details><summary>Description</summary>

#### Details

The form has never worked. Drop the collection attributes from the XSD `Output` type and have the parser raise a clear "use `<collection>`" error.

#### Why the proposed approach is preferred

The generic `<output type=…>` element is how XML expression tools declare their non-data outputs (e.g. `<output type="integer" from="…"/>`), and it already handles `type="data"`. Supporting `collection` keeps the element uniform, and the fix is smaller than a deprecation. Removing it is still reasonable if we'd rather not keep a second spelling for collection outputs.

</details>

</details>
