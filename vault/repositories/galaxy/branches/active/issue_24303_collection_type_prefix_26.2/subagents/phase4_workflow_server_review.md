# Phase 4 workflow server review (`559034464e8`→`3a8de0e5829`, `5e1e34f58c2`→`c1b7a41b761`)

No blockers. Acted on: type hints on `_prefixed_collection_type`; reordered commits so the server change precedes the client commit that reads `collection_type_prefix`.

Not acted on:
- Failed prefix + map-over leaves `collection_type` = bare map-over type (editor shows a wrong concrete type, not ANY) — same as today for an unresolved `type_source`; this code path is covered by the queued over-prepend issue (`gx_issues/to_file/type_source_direct_match_before_map_over.md`, now marked confirmed).
- `TYPE_PREFIX_PAIRED` / `TYPE_PREFIX_MAPPED` labels — linked from `collection_semantics.yml` in phase 6.

<details><summary>Full review</summary>

1. Low: failed prefix + map-over → wrong concrete type (pre-existing for unresolved type_source).
2. Nit: missing type hints; placement fine (editor-specific wrapper).
3. `log.warning` + swallow appropriate (editor-only, mirrors sibling warning).
4. No client double-apply: fixed `collection_type` wins (`terminals.ts:822`).
5. Other consumers (build_module, gxformat2 export, refactor, recommendations) need nothing.
6. Both API tests worthwhile; two framework workflows needed (input types differ); ids `collection_semantics_type_prefix_0`, `collection_semantics_type_prefix_mapped_0`.
7. Commit order: client read key before server sent it — harmless, matters only if split.
No security issues.

</details>
