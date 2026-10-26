Fix 🎯 #730 - `run-workflow-test` sends user-defined-tool workflows down a managed path that cannot run them, and never checks data tables.

A Foundry-translated workflow that embeds `GalaxyUserTool` steps cannot be tested the way `run-workflow-test` says to. The Mold calls Planemo-managed Galaxy "the default" and says the lack of a running Galaxy is no reason to skip. For these workflows the managed path always fails:

| Route | Result (planemo 0.75.47) |
| --- | --- |
| `planemo test <wf>` (managed) | `KeyError: 'tool_id'` before Galaxy starts (galaxyproject/planemo#1757) |
| managed, `tool_id` added by hand | HTTP 403 "User is not allowed to run unprivileged tools" |
| `planemo serve` + `--engine external_galaxy`, user with `user_tool_execute` role | small UDT smoke workflow, 1/1 passed |

In the ncbi/egapx `nextflow-to-galaxy` run, the harness had to hand the worker that third route and read planemo source to find it. The same run hit a BUSCO step whose `cached_db` select reads the `busco_database` data table. The served Galaxy had the table, but `GET /api/tool_data/busco_database` returned `fields: []`. Nothing in the Mold looked for that.

This branch puts both cases in the Mold and its references, so the next run gets them from the cast instead of from the harness. Managed stays the default for every workflow without an embedded `GalaxyUserTool`.

Not in scope: the planemo crash itself (galaxyproject/planemo#1757). #582 stays open, since it asks for the managed path, which still crashes. This documents the external route instead. egapx itself still fails at import with a separate Galaxy 500 (`IntegrityError` on a nested UDT step), and it uses built-in collection tools the empty-dir serve lacks.

- **`run-workflow-test` step 2** makes an exception: if any step at any subworkflow depth has a `GalaxyUserTool` under `run:`, skip the managed path and use the external route. The binding note is now a declared on-demand reference, so the cast bundles it.
- **New step 3** detects data-table-backed selects and records `not-run` naming the table, value, and step when the target Galaxy lacks the row. Provisioning stays the caller's call, in line with the Foundry's no-data-tables posture for translated workflows.
- **`planemo-workflow-test-architecture`** gets the recipe (serve an empty dir, user + role + key payloads, ephemeris preinstall of every shed repo, `planemo test --engine external_galaxy`) and a data-table detection section.

One limit is stated rather than solved: an empty-dir serve has no built-in collection tools (`__BUILD_LIST__`, `__APPLY_RULES__`, ...), because planemo adds those only for tool ids in the served target. The note names `--extra_tools` as an untested workaround and says to record `not-run` until it is verified.
- **`galaxy-user-tool-workflow-binding`** replaces its "managed path untested" open question with the tested result and adds the API `role_type` value.

<details><summary>Facts checked against source</summary>

- planemo 0.75.47 `load_shed_repos` reads only top-level format2 steps. Planemo `master` walks embedded subworkflows (`iter_workflow_steps`, galaxyproject/planemo#1742, merged 2026-10-15, unreleased). The recipe preinstalls every repo anyway, because the data-table check needs tools installed before `planemo test` would install them.
- Galaxy `DynamicToolManager.ensure_can_use_unprivileged_tool` checks for a `user_tool_execute` role on every user. Admins are not exempt. `RoleDefinitionModel` requires `name` and `description` and accepts `role_type: user_tool_execute`.
- planemo 0.75.47 sets `enable_beta_tool_formats="true"` in every Galaxy it configures, and its tool_conf holds only `upload.xml` plus distro tools for tool ids found in the served target.
- A select's `add_value` filter (Galaxy `AdditionalValueFilter`) can supply a value missing from the table, so the check accepts it.
- `GET /api/tool_data/{table}` is `public=True`. A missing table raises `ObjectNotFound` (404).
- The parsed tool model shows a data-table select as `options: null`. The Tool Shed's `GET /api/tools/iuc~busco~busco/versions/5.8.0%2Bgalaxy1/tool_source` returns macro-expanded XML with both `from_data_table="busco_database"` and `from_data_table="busco_database_options"`. The full-GUID id form returns 500.

</details>

Once planemo handles embedded tool steps and provisions the role, step 2's exception can be revisited.

## Risks

Risks are minimal. This changes Mold guidance and research notes only, and any of it can be reverted without migration (a two-way door).

## Context

Builds on 🔀 #714, which settled how a step embeds a `GalaxyUserTool`. Refs #582, where the working route was first posted.

## Agentic Checks

### ✅ Second Frontier Model Review

<details><summary>Two findings, both fixed: empty-dir serve lacks built-in collection tools, and <code>add_value</code> filters can supply a value.</summary>

Codex verified the planemo and Galaxy claims against source. The built-in tool gap is now documented with an untested <code>--extra_tools</code> workaround and a <code>not-run</code> fallback. The data-table check accepts <code>add_value</code> choices.

</details>
