# Codex review debrief — `issue_210_test_kind_checks`

Codex (read-only, findings schema, unprimed brief) reviewed `a3494e70..1822b9fb` (pre-rebase; the rebase onto `dd7a4397` touched no B files). 4 findings; none acted on in code — three refuted against Galaxy source, one already a recorded follow-up.

- **P1 comma-separated input `collection_type` (`list,paired`) rejected — refuted.** Galaxy rejects such workflow inputs: `InputDataCollectionModule.validate_state` runs `COLLECTION_TYPE_REGEX` on the whole string (`lib/galaxy/workflow/modules.py:1309-1317`, `model/dataset_collections/type_description.py:259-262`). Comma lists exist only on tool params.
- **P1 classless `element_tests` still schema-invalid — refuted as a branch defect.** The schema is synced from Galaxy's `tool_util_models.Tests`; it rejects the form on main too. The cross-check only avoids stacking a misleading `workflow_output_kind` on top. Fixing the synced schema is Galaxy's call.
- **P2 `attributes.collection_type` ignored — refuted.** Galaxy's verifier and planemo read `attributes.type` (top-level `collection_type` copied into it), not `attributes.collection_type` (`lib/galaxy/tool_util/parser/interface.py:914,937-946`). A mismatch there passes in Galaxy, so flagging it would be a false positive. Galaxy-side inconsistency (schema advertises `CollectionAttributes.collection_type`, verifier reads `type`) noted as a follow-up.
- **P2 unlabelled native outputs never shape-checked — confirmed, not acted.** Missed check, not a false positive; already listed in the normal-review debrief.
