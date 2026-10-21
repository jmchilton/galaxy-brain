# Codex review (round 2, head `3d257117fe9`…`c2b64d54901`)

Two findings. Both are real but fall under the `type_source` resolution-order issue John deferred ([#24308](https://github.com/galaxyproject/galaxy/issues/24308), paths 1–3; record `issues/needs_decision/24308/`), so nothing was changed on this branch. Codex's reproductions were added to the #24308 record. Round 1 findings (legacy remap, subworkflow over-prepend) are resolved by the re-scope ([earlier_drafts/1/codex_review.md](earlier_drafts/1/codex_review.md)).

Not acted on (NEEDS-DECISION, already decided as a separate issue):
- Runtime `create_collection` prefixes the declared `can_map_over` type rather than the concrete per-job slice (`get_collection`).
- The client prefixes the declared accepted type rather than the connected type.

Both are pre-existing for plain `type_source`; the prefix inherits them.

<details><summary>Findings</summary>

1. **P2** `lib/galaxy/tools/actions/__init__.py:1236`: map a tool accepting `paired_or_unpaired` over a `list:paired`, with `type_source` + `type_prefix="list"`. Precompute gives `list:paired` per job (`list:list:paired` overall), but `create_collection` makes `list:paired_or_unpaired` per job, so the implicit collection's nested type disagrees with its children. Codex reproduced this with a real DCE and suggests reusing `get_collection`. The same divergence was recorded in the research and the #24308 issue, path 1 vs 2.
2. **P2** `client/.../terminals.ts:837`: a `paired` input connected to a `paired_or_unpaired`-accepting tool with a prefix shows `list:paired_or_unpaired`. Execution and subworkflow export give `list:paired`, and the editor then rejects a valid downstream `paired` connection. Also, first-declared-wins can pick a mappable declaration before a later exact match. This is #24308 path 3.

Coverage: all 43 files plus surrounding consumers. 41 structure/type tests passed. API/framework tests were not run (sandbox).

</details>
