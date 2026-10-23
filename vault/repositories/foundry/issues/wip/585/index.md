# #585 The real UDT registration endpoint is `/api/unprivileged_tools`, not the admin-only `/api/dynamic_tools`

[Issue](https://github.com/galaxyproject/foundry/issues/585) — opened 2026-09-18 by scottcain (AI-assisted), currently only `needs-triage`.

Addressed in part by draft PR [#617](https://github.com/galaxyproject/foundry/pull/617) (`mvdbeek:udt-workflow-binding`).

## Proposed labels

- `roadmap/substep`: a doc/Mold gap in UDT authoring, not backbone work.
- Parent: #501 "Improved Support for Tool Development" (`roadmap/main`, `priority/mvp`).
- `priority/mvp`: wrong endpoint guidance blocks using the Foundry now with correct results.
- `agent/implement`: fix is known (document the endpoint and gating); #617 already does most of it.
- No blocker labels.

## Derived status

`wip`: open PR #617 addresses it (rule 1).

## Findings

- Request: document `POST /api/unprivileged_tools` (gated by `USER_TOOL_EXECUTE` + `enable_beta_tool_formats`) vs admin-only `/api/dynamic_tools`, and that the result is a `tool_uuid`.
- PR #617 body: "Partly addresses #585". Its `galaxy-user-tool-workflow-binding` note names `/api/unprivileged_tools`, and embedding in `run:` makes `tool_uuid` mostly moot for format2.
- Not on `origin/main` yet: `git grep unprivileged|dynamic_tools origin/main -- content` is empty.
- Comment from scottcain: independent repro on usegalaxy.org 26.1, 2 UDTs registered first try with body `{"representation": <GalaxyUserTool dict>}`, then executed OK (181 jobs ok). Suggests the issue/docs also state the body shape and that "registers" is not "executes".
- Related: #566 (real-Galaxy import guidance, untriaged), #582 (Planemo running embedded tools), #587, #573.

## Next

After #617 merges, check whether the body shape and registration-vs-execution distinction landed in the note or `author-galaxy-tool-wrapper` / `run-workflow-test`; if not, small follow-up PR, then close.
