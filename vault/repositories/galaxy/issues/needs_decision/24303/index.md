# galaxy#24303 — Tool XML can't declare an output collection type as "the input's type plus one list level"

[Issue](https://github.com/galaxyproject/galaxy/issues/24303) · [Draft](issue_draft.md) · [Proposal as filed](proposal.md) · [Prep debrief](debrief.md) · Review: `reviews/active/24190/`

Filed 2026-10-20, assigned jmchilton. A follow-up to #24190 (Nest `list:paired` fix, open against `release_26.0`). The declarative `type_prefix` modifier on `type_source` would replace the Nest-only `Tool.output_collection_type()` hook on `pr_24190_review_0`, so the workflow editor sees `list:list:paired`.

## Open decisions

- Attribute name: `type_prefix` or another name.
- Should the shared `type_source` resolution rule (direct match first, else mapped-over declared type) be in scope here, or a separate fix?
- Bare `paired`: a new Nest version with the uniform rule, or keep `paired` as a special case?
- Which `list:X` types should Nest accept, and is an input wildcard in scope?

## Caveats

- Filed before #24190 merged and before the hook branch was pushed into the PR.
- tools-iuc not surveyed. Editor behaviour inferred from code, not seen in a browser.

## Implementation

- Branch [`issue_24303_collection_type_prefix_26.2`](../../../branches/active/issue_24303_collection_type_prefix_26.2/index.md) (base `release_26.2`), also replaces #24190.
