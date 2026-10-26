No correctness changes were recommended. The parsed-only base and common expression conversion preserve filters across dataset, collection, and scalar outputs without changing user-defined tool authoring.

- No unacted correctness findings.
- Generated Tool Shed client schema was still being regenerated during this review; the coordinator should verify its diff contains the six parsed output variants and no incoming authoring fields.

<details>
<summary>Full review</summary>

Reviewed the branch against `origin/release_26.1`, including uncommitted implementation and tests, using the focus areas in `REVIEW_FOCUS.md` and the optional brain research. No blocking or nonblocking correctness defects found.

`ToolOutputBaseModel` binds the existing common generic fields to their parser-facing types and carries the new field. All concrete parsed variants inherit it; incoming dataset, collection, scalar, and user-tool variants retain their existing generic hierarchy. This keeps authoring schemas separate. The baseline rejection tests pin the user-tool boundary independently of the implementation.

The three conversion paths pass `filter_expressions` consistently. XML filters are ordered expressions with surrounding whitespace stripped, matching the runtime expression preparation. No expression is evaluated during conversion. Empty elements remain represented as empty strings, so malformed authoring does not crash metadata serialization or silently turn a filtered definition into an unconditional output. YAML and CWL outputs retain empty filter lists.

The regression tests exercise the public serialized `ParsedTool` shape through real parser sources: existing XML fixtures for data, multiple filters and collections; small inline XML for all scalar types; and XML/YAML unfiltered outputs. The reported focused run passed 147 tests. Unit-level parser coverage is appropriate for an independently distributed library serialization contract; a running Galaxy or Tool Shed would add setup without exercising a different conversion path.

Tool Shed's `ShedParsedTool` directly inherits `ParsedTool`. Its model cache hash includes the complete Pydantic JSON schema, so this schema change naturally invalidates old cached metadata; no parsing-version bump is necessary.

The scalar inclusion is a small consistency improvement in the exact same loss path. No output execution, filter evaluation, workflow wiring, or downstream tool-cache behavior is changed.

</details>
