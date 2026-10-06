# XML `<output type="collection">` never parses

Agent-to-agent issue draft. Found 2026-10-03 while polishing `type_source_nested_inputs` (fixes #23886) on `release_26.1`. That work adds a load-time check on `type_source` and `collection_type_source`. The planned unit test for the `<output type="collection" collection_type_source=…>` form crashed before reaching the check.

## Symptom

In an XML tool, every `<output type="collection">` fails in `XmlToolSource.parse_outputs`, so the tool doesn't load. It doesn't matter which attributes it carries. Reproduced on the `type_source_nested_inputs` worktree (`release_26.1` base). `origin/dev` has the identical code (`xml.py:561-564`).

| `<output type="collection" …>` | Result |
|---|---|
| `collection_type="list"` | `TypeError: Argument must be bytes or unicode, got 'NoneType'` |
| `collection_type_source="input_collect"` | `TypeError: Argument must be bytes or unicode, got 'NoneType'` |
| `structured_like="input_collect"` | `TypeError: Argument must be bytes or unicode, got 'NoneType'` |
| `collection_type="list" collection_type_source="input_collect"` | `ValueError: Cannot set both type and type_source on collection output.` |

So no combination parses.

Repro, which needs no app:

```python
from galaxy.tool_util.parser import get_tool_source
src = get_tool_source(raw_tool_source="""<tool id="t" name="t" version="1">
<inputs><param name="input_collect" type="data_collection"/></inputs>
<outputs><output name="out" type="collection" collection_type="list"/></outputs></tool>""", tool_source_class="XmlToolSource")
src.parse_outputs(None)
```

Traceback tail:

```
  File ".../lib/galaxy/tool_util/parser/xml.py", line 567, in parse_outputs
    out_child.attrib["type"] = unicodify(out_child.get("collection_type"))
  File "src/lxml/etree.pyx", line 2600, in lxml.etree._Attrib.__setitem__
TypeError: Argument must be bytes or unicode, got 'NoneType'
```

## Mechanism

`lib/galaxy/tool_util/parser/xml.py`, in `parse_outputs`:

```python
elif out_child.tag == "output":
    output_type = out_child.get("type")
    ...
    elif output_type == "collection":
        out_child.attrib["type"] = unicodify(out_child.get("collection_type"))
        out_child.attrib["type_source"] = unicodify(out_child.get("collection_type_source"))
        _parse_collection(out_child)
```

- It rewrites the element so `_parse_collection` can read it like `<collection type=… type_source=…>`.
- `unicodify(None)` returns `None`, and lxml refuses to set an attribute to `None`.
- Whichever of `collection_type` and `collection_type_source` is missing crashes.
- If both are set, `ToolOutputCollectionStructure.__init__` (`output_objects.py:450`) rejects the pair.

So the branch can't succeed.

It has been this way since at least `939e7774a8d` (2019-05-13, "Create galaxy-tool-util package"; the code moved there, so the bug may be older).

## Who hits it

- Nobody, apparently. No XML tool in `lib/galaxy/tools`, `test/functional/tools` or `tools/` uses `<output type="collection">`.
- tools-iuc, galaxytools and tools-devteam: `git grep -E '<output [^>]*type="collection"'` gives 0 hits in each local clone (checked 2026-10-03).
- YAML tools are fine. `yaml.py:272` accepts `collection_type_source` or `type_source` via `output_dict.get`, with no lxml.
- The XSD advertises the form: `complexType name="Output"` (`galaxy.xsd` ~6602, element `output` at ~6259) declares `collection_type` and `collection_type_source`. The `type_source_nested_inputs` branch just added doc text to `collection_type_source` there, so it now documents an attribute that can't parse in XML.
- The `Output` complexType looks like it's meant for the newer generic `<output type=…>` syntax (data, collection, expression types).

## Suggested fix

- Only set the attributes that are present. For example:

  ```python
  if (ct := out_child.get("collection_type")) is not None:
      out_child.attrib["type"] = ct
  if (cts := out_child.get("collection_type_source")) is not None:
      out_child.attrib["type_source"] = cts
  ```

  Or pass them to `_parse_collection` as kwargs rather than mutating the element.
- Add a parsing test to `test/unit/tool_util/test_parsing.py` for each row of the table above. Expect the first three to parse, and the fourth to keep raising "Cannot set both".
- Optionally add a framework test tool using `<output type="collection" collection_type_source=…>` so it's exercised end to end.

## Notes for the filer

- Target: probably `dev`. Nothing uses it, so it's not urgent for a release branch, unless #23886's branch (on `release_26.1`) wants its new XSD docs to be truthful.
- Related to #23886 / `type_source_nested_inputs`: its load-time bare-alias check reads `output_collections[...].structure.collection_type_source`, which would cover this form once it parses.
- Related to #23444 (shared nested-reference resolver for output sources), loosely.
