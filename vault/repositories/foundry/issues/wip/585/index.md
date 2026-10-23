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

## #617 readiness check (2026-10-23)

- Coverage of #585: vendored `authoringHelp.yml` `api` section has the `/api/unprivileged_tools` table and `{"representation": ...}` body; binding note states the gating (`enable_beta_tool_formats` + Custom Tool Execution role). Gaps: nothing says `/api/dynamic_tools` is admin-only; the vendored help is not cast into any skill (only the binding note is), so `author-galaxy-tool-wrapper` / `run-workflow-test` agents never see the endpoint; registers ≠ executes not stated.
- Upstream deps all merged: galaxy#23694 (`7ca102fe1f2`, release_26.1), gtu-ts#185 (in 1.13.1+), gxformat2#254.
- gxwf 1.14.0 (Foundry pin) on embedded `GalaxyUserTool`: `validate`, `draft-validate --concrete` OK; `draft-extract` keeps outputs without `out:`. #617's crash workarounds are obsolete.
- Trial merge onto origin/main (132 commits ahead of its base): 9 conflicts; source ones README, `advance-galaxy-draft-step/index.md` (2), `implement-galaxy-tool-step/index.md` (2) + `eval.md`, all additive; rest generated (casts, Dashboard).
- To finish: rebase keeping mvdbeek's commits, re-pin vendored help to `galaxy` at/after `7ca102fe1f2` (drop `galaxy_mvdbeek` prefix), remove gxwf workaround text, close the #585 gaps above, recast, `make check`.
