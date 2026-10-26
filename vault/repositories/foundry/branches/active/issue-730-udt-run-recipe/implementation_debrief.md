# Implementation debrief

Docs/Mold-only change for #730 on `issue-730-udt-run-recipe` (base `f48c01b6`).

- `run-workflow-test`: step 2 exception for workflows embedding `GalaxyUserTool` (skip managed, use served Galaxy + `--engine external_galaxy`); new step 3 data-table detect-and-defer; binding note added as an on-demand reference; eval mode/non-execution properties extended; scenarios coverage gap widened (no fixture, so no new case).
- `planemo-workflow-test-architecture`: UDT recipe (serve empty dir, user/role/key payloads, ephemeris preinstall of all shed repos, test command) and data-table detection section (Tool Shed `tool_source` endpoint with `owner~repo~tool` id, `GET /api/tool_data/<table>`).
- `galaxy-user-tool-workflow-binding`: `role_type: user_tool_execute`, admins not exempt, open question replaced with tested result.
- Casts, Dashboard, Index regenerated.

Red-to-green: no executable test applies to prose; facts verified against planemo 0.75.47/master, Galaxy source at the binding note's pinned commit, and a live Tool Shed request. The recipe itself was not rerun on this branch; evidence is the egapx run (preflight 1/1 pass).

Local gate: validate, check-generated, check-planemo-pin, check-casts, check-verify, check-assemble-pipelines, check-fixtures, test (496 pass), lint, format green. `validate-roadmap` fails on live GitHub roadmap drift (#672 under #501) and `check-vendored` on local Galaxy checkout drift; both outside the branch.
