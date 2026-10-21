# Phase 5 client review (`39d8a2f2b2e`)

Correct and small; 91/91 terminal tests. Acting on: an invalid prefixed type (e.g. `list:sample_sheet` via an `any` source input) falls back to ANY in `OutputCollectionTerminal` rather than advertising an invalid type — with a vitest case.

Not acted on:
- Editor shows `list:list` where the server rejects a `sample_sheet` matched to a declared `list` — the separate resolution-rule issue (`gx_issues/to_file/type_source_direct_match_before_map_over.md`).
- `collection_type_prefix` optional (`?`) vs non-optional — kept optional; fixtures and older payloads lack the key.
- Trailing-whitespace fix in `parameter_steps.json` — pre-commit hook enforces it; harmless.
- Two `toBeInstanceOf` lines in the factory test — match existing pattern.

<details><summary>Full review</summary>

Verified: prefix applied to collectionType, not mapOver; downstream `paired` input gives mapOver `list:list`, effective `list:list:paired`; ANY absorbs prefix; only `terminals.ts`/`workflowStepStore.ts` read `collection_type_source` client-side; fixture keys match server `get_all_outputs`.

1. sample_sheet disagreement (medium) — `any` passthrough → `list:sample_sheet` shown; declared-`list` match → `list:list` shown while server 400s. Suggest ANY fallback via `isValidCollectionTypeStr`.
2. Optional typing nit.
3. it() names stable: "applies type_prefix to type source collection type", "applies type_prefix to mapped over type source", "leaves unconnected type_prefix output as any".
4. Whitespace churn.
No security issues.

</details>
