# #724 implement-galaxy-tool-step leaves Tool Shed tool_id versionless

Filed 2026-10-26 from the [smrnaseq golden v0 build](../../../pipeline_runs/2026-10-25-wb2g-golden-smrnaseq-v0/index.md). Fix: [PR #727](https://github.com/galaxyproject/foundry/pull/727), branch [`issue-724-shed-tool-id-version`](../../../branches/active/issue-724-shed-tool-id-version/index.md).

Templates keep identity pins versionless by design (`tool_version: TODO`); the fix belongs in implement, not the template Molds.
