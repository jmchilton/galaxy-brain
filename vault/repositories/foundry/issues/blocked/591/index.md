# #591 `download?style=ga` emits unversioned `tool_id`s, producing workflows that save but cannot be invoked

[Issue](https://github.com/galaxyproject/foundry/issues/591) — opened by scottcain (AI-assisted), 2026-09-18. Open, `needs-triage` only, no comments, no PRs or branches.

## Proposed labels

- `roadmap/off` — upstream Galaxy API bug, not Foundry backbone; no `roadmap/main` fits (closest: #365 job cache, #501 tool development, neither really). No parent. Could be `roadmap/substep` if John wants a home for "Galaxy round-trip gotchas".
- `priority/mvp` — silently breaks invocation of downloaded/edited workflows in real runs; but workaround is trivial (versioned `tool_id`), so `v2` is defensible.
- `agent/research` — Galaxy-side fix is outside Foundry; agent drafts the upstream Galaxy issue and a Foundry-side doc note.
- `upstream/galaxy` — real fix lands in Galaxy.

Parent: none.

## Status

`blocked` (upstream/galaxy).

## Findings

- Claim is plausible from code: `lib/galaxy/webapps/galaxy/services/workflows.py` (~L360) checks `toolbox.has_tool(tool_id, tool_version=..., exact=require_exact_tool_versions)` before invoking; the error message omits the version unless exact mode is on, which fits the misleading "not installed" text.
- No matching issue or PR found in galaxyproject/galaxy (searched "required tools are not installed", unversioned tool_id/download). No upstream issue is linked yet.
- Sibling: #584 (stale toolbox read vs. real install failure), same run, distinct cause. Both belong in the invocation-failure reference.

## Next

- Agent: file the Galaxy issue (needs John's OK), link it here and in a #591 comment.
- Foundry: add to the invocation-failure reference: "400 not installed but tool present -> check `tool_id` is versioned".
- Drop `upstream/galaxy` when the Galaxy fix lands.
