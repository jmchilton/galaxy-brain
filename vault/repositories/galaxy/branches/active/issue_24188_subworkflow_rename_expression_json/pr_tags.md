- `kind/bug`
- `area/workflows`
- `area/workflows/subworkflows`
- `area/testing` — new `metadata: {name:}` key for Collection outputs in the workflow test format.

The labeler would also add `area/tool-framework` (from `lib/galaxy/tool_util/**`). Dropped: the tool_util change only touches the test format, which `area/testing` covers.
