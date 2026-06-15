	
- lib/galaxy/webapps/galaxy/api/tools.py:353 exposes GET /api/tool_executions/{id}
    without an access check. It fetches any decoded ToolExecutionState and returns
    the captured request. That should be gated through the owning
    ToolRequest.history, related jobs’ histories, or
    WorkflowInvocationStep.workflow_invocation.history. Also, lib/galaxy/webapps/
    galaxy/services/base.py:274 returns raw tes.id, so Pydantic re-encodes with the
    default kind, while the endpoint only decodes tool_exec_st. The returned id will
    not round-trip to the same endpoint.

lib/galaxy/managers/tool_source.py:31 dedupes solely by source hash and source
    class, but the row also carries tool_id, tool_version, and dynamic_tool_id. The
    dedupe migration does the same at lib/galaxy/model/migrations/alembic/
    versions_gxy/29fe58dda936_add_tool_source_hash_source_class_uq.py:39. If two
    dynamic/user tools have identical source text but distinct dynamic tool rows,
    the second request can reuse the first row and later queue with the wrong
    dynamic_tool. Either include identity in the uniqueness rule, or split immutable
    source content from per-execution tool identity.

- lib/galaxy/managers/history_graph.py:394 still finds collection producers only
    through JobToOutputDatasetCollectionAssociation. A jobless tool-request-backed
    output collection, such as empty map-over, has
    ToolRequestImplicitCollectionAssociation but no jobs, so it will appear as an
    HDCA with no producer. That is exactly the case the extraction path now
    supports, so the graph should probably add a TRICA producer leg.

- Replace some mocked unit tests in test_extract_tool_request_state.py and
    test_extract_by_ids_validation.py with API/integration coverage for:
    unauthorized tool_executions access, response-id round-trip, empty-map-over
    history graph producer, and workflow jobs retaining TES immediately after
    scheduling.

- Consider caching ICJ resolution in lib/galaxy/managers/history_graph.py:416;
    mapped jobs from the same ICJ currently re-run the ICJ attribute scan per job.

- lib/galaxy/managers/history_graph.py:512 can add all visible elements of a
    selected collection, bypassing the public limit. A large visible collection can
    still explode the response; add a cap/truncation flag or make element expansion
    opt-in.
