# galaxy#24474 — Collection input validation accepts undeclared types

[Issue](https://github.com/galaxyproject/galaxy/issues/24474) · [draft](raw.md) · [proposal](proposal.md) · [debrief](debrief.md)

Filed 2026-10-26, assigned to jmchilton. Status: `queued`.

Collection parameter parsing and validation accept directly supplied collections that the declared `collection_type` and dropdown matching rule exclude. A six-case parameter-layer reproduction used real Galaxy models and methods verified against upstream `dev` at `557e7f327839dd3ec0adee0b0660e7ed0d3c7fe2`. HTTP submission, eventual job outcomes, and workflow invocation remain untested.

Next: add a failing API test for an incompatible direct HDCA input, then enforce compatible collection types during parameter validation while preserving valid mapping, unrestricted inputs, and sample-sheet compatibility.

Found during [#24303](https://github.com/galaxyproject/galaxy/issues/24303) work on [issue_24303_collection_type_prefix_26.2](../../../branches/active/issue_24303_collection_type_prefix_26.2/index.md). This is independent of output type prefixes and the client matching fix in [#24453](https://github.com/galaxyproject/galaxy/pull/24453).
