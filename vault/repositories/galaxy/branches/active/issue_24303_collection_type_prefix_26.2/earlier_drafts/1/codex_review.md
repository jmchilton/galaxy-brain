# Codex review (round 1, head `3cb5777162b`)

Codex (read-only, fresh session, brief = issue intent only) returned two findings; both CONFIRMED and both identical to the round 1 scope evaluation's expansion items, so they are acted on in the re-scope (see [alts/original_scope.md](alts/original_scope.md), `implementation_rescope_debrief.md`).

Not acted on: none. Nothing refuted.

<details><summary>Findings</summary>

1. **P1 — legacy prefix declaration can't be parsed** (`lib/galaxy/tool_util/parser/xml.py:566`). `<output type="collection" collection_type_source="input" collection_type_prefix="list"/>` → `TypeError: Argument must be bytes or unicode, got 'NoneType'` from the pre-existing remap assigning `unicodify(None)` to `type`. Codex reproduced directly. CONFIRMED (scope evaluation reproduced too). Fix the remap's `None` assignments.
2. **P2 — mapped subworkflow outputs count mapping levels twice** (`lib/galaxy/managers/workflows.py:1783`). `_resolve_collection_type` prefixes the full upstream type, then prepends map-over: `list:paired` into the prefix tool inside a subworkflow → `list:list:list:paired`; runtime gives `list:list:paired`. CONFIRMED (phase 4 probe reproduced; pre-existing for plain `type_source`).

Coverage: 48 files reviewed incl. client, parser, runtime, workflow server, Nest, tests; no notes.

</details>
