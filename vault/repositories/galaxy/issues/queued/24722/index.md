# galaxy#24722 — Invoking via the API reports installed Tool Shed tools as "not installed" when a step's `tool_id` is unversioned

[Issue](https://github.com/galaxyproject/galaxy/issues/24722)

Upstream Galaxy half of foundry#591. Reproduced at the toolbox level; no duplicate. Filed 2026-11-04, assigned to jmchilton, labels `kind/bug`, `area/workflows`, `area/API`. [proposal](proposal.md) · [tags](issue_tags.md) · [debrief](debrief.md) · [raw](raw.md)

## Next

- Red API test: upload a workflow with an unversioned shed `tool_id` + `tool_version`, then invoke with the default `require_exact_tool_versions` → 400 today.
- Then fix the pre-flight (non-exact lookup + version match) and the `ToolModule.__init__` save miss, per [proposal](proposal.md).
- Check `CachedToolBox.has_tool` and short ids, which are still unchecked.
