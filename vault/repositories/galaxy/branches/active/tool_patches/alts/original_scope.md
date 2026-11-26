# Alt: original scope

`tool_patches_alt_original_scope` at `4ec188d7a21`: the branch as hardened before the scope evaluation's expansion. It has everything the request listed, but:

- the in-process populator builds its own patch database instead of using `app.tool_patches`;
- the eager store-hit fallback serves patched content without `Tool.patch`;
- digests carry no engine version;
- there is no startup patch summary or populator patch counters.

The parent branch adds those four items on top.
