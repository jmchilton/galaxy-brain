```yaml
documents:
  - path: vault/repositories/galaxy/issues/needs_decision/24529/proposal.md
    why: Root cause (history=None -> assert history for API-key requests), ownership concern for shared FASTAs, and the red API test.
  - path: vault/research/Component - Implicit Dataset Conversion.md
    why: How get_converted_dataset/converter.execute/history flow works; covers the tool-input path only, not the no-history case (stale line refs).
    load_when: Reviewing history selection or checking other get_converted_dataset callers.
  - path: vault/repositories/galaxy/branches/active/custom_build_no_converter_400_26.0/index.md
    why: Sibling branch (#24313) on the same add_custom_builds code and release_26.0 base; watch for merge conflicts in users.py/test_users.py.
    load_when: Rebasing, or touching error handling in add_custom_builds.
  - path: vault/repositories/galaxy/branches/merged/better_custom_build_error_handling_25.1/index.md
    why: #24310, prior error handling on the same endpoint.
    load_when: Reviewing exception handling around the conversion calls.
  - path: vault/repositories/galaxy/branches/merged/custom_build_from_fasta/index.md
    why: E2E for custom build from FASTA (#24312); origin of this bug and the dropped API test.
    load_when: Writing or reviewing tests.
research_requests:
  - vault/agents/gx_research/todo/implicit_conversion_history_resolution.md
```
