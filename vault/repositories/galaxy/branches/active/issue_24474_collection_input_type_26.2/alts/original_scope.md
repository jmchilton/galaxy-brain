# Alt: original scope

Branch `issue_24474_collection_input_type_26.2_alt_original_scope` (head `b6791d07a7c`, pushed to `jmchilton`). This is the branch as hardened before the re-scope: the tool-parameter fix only.

`DataCollectionToolParameter.from_json` rejects collections whose type the declared `collection_type` does not accept. The check uses `HistoryQuery.direct_match_type`, and also `can_map_over_type` for workflow runtime step parameters. It skips unexpanded batch wrappers. This covers the legacy tool API, the tool request API, the tool form/rerun and job preparation.

How it differs from the parent:

- A workflow edge that passes an incompatible collection through to a tool, such as an untyped workflow input feeding a `paired` input with a `list`, is not rejected at scheduling. The job fails at preparation instead.
- Collections supplied to typed workflow collection inputs are not checked when the invocation is requested.
- Sample sheet `column_definitions` are not checked at run time.
