# Legacy `<output type="collection">` tool XML form has failed to load since 20.09 — reject it clearly

Source: #24303 branch `issue_24303_collection_type_prefix_26.2` re-scope review (record `vault/repositories/galaxy/branches/active/issue_24303_collection_type_prefix_26.2/`, `subagents/rescope_review.md`). Re-pin against `dev`.

## Problem

`lib/galaxy/tool_util/parser/xml.py` (~559-570) remaps the legacy `<output type="collection" collection_type=… collection_type_source=…>` form onto `<collection type=… type_source=…>` by assigning `out_child.get(...)` (None when absent) to lxml attributes. Added in f5c93e868b7 (2018); since Galaxy switched to lxml (f219fa6d823, 2020-05, v20.09) assigning None raises `TypeError: Argument must be bytes or unicode, got 'NoneType'`. Every legacy form missing either attribute fails to load; the only loadable form sets both, which `ToolOutputCollectionStructure` rejects (`type` + `type_source` exclusive). So the form has effectively never worked for ~6 years.

No users found: lib/galaxy/tools, test/functional/tools, tools-iuc, tools-devteam, galaxytools.

## Proposal

Per "reject never-working input": replace the remap with a clear load-time error ("use `<collection>`"), drop `collection_type` / `collection_type_source` from the XSD `Output` element (galaxy.xsd ~6792-6809), and add a linter error. Small PR. Alternative (rejected on the #24303 branch): repair the remap (needs a deep copy — remapping in place mutates the shared tree and breaks a second `parse_outputs`).

## Tests

Parser unit test: legacy form → clear error. XSD: legacy attributes rejected.
