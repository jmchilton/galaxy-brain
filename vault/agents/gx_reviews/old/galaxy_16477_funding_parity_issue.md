Bring schema.org `funding` to parity with `creator` beyond tool XML

*Posted by Claude (AI assistant) on behalf of @jmchilton — not authored by them personally.*

#16477 adds `<funding><grant .../></funding>` to tool XML and YAML, `funding` to the tool JSON, and a grant viewer in the tool form footer. `creator` reaches well beyond that. This tracks what funding still needs to match it, plus two gaps that `creator` shares.

## Workflows (highest value)

WorkflowHub and IWC are where grant metadata is most often expected, so this comes first.

- **Model:** a `funding` JSON column next to `creator_metadata` on `Workflow`, plus an alembic migration.
- **API:** a `funding` field on `StoredWorkflowDetailed`, next to `creator`. Plumb it through the workflow managers for import/export (`.ga`), copy and rename. Type it with the `Grant` pydantic model, which also gets `Grant` into `schema.ts`.
- **Refactor:** an `update_funding` action alongside `update_creator`.
- **gxformat2:** a `funding` field in the schema and lint, using the flat form creators already use (`- class: Grant`, `name`, `identifier`, `url`). This needs a Galaxy dependency bump.
- **RO-Crate export:** emit `Grant` entities and link them with `funding` in `ro_crate_utils.py`, the way creators become `Person`/`Organization` entities. BioCompute Object (BCO) export has no funding slot, so nothing is needed there.
- **Editor:** a funding section in the workflow attributes panel, next to `CreatorEditor`, reusing `ThingFormMixin`.
- **Published workflow pages and list:** optionally show funding where creators are shown.

## `funder`

A grant number means little without the organization that awarded it. Add `funder` as a child of `<grant>` reusing the `PersonOrOrganization` group. It's additive, and the parser would emit `"funder": [{"class": "Organization", ...}]`:

```xml
<grant name="EuroScienceGateway" identifier="101057388" url="https://cordis.europa.eu/project/id/101057388">
    <funder><organization name="European Commission" identifier="https://ror.org/00k4n6c32"/></funder>
</grant>
```

## Gaps shared with `creator`

- **YAML tool models:** `YamlToolSource`/`UserToolSource` in `tool_util_models` forbid extra fields, so they reject both `creator` and `funding` today. Add both, typed with the flat `class` form.
- **Parsed tool metadata:** `ParsedTool` / `model_factory.parse_tool`, and therefore Tool Shed metadata, carry neither.
- **Tool list JSON-LD:** `ToolsJson.vue` emits `SoftwareApplication` entries without `creator` or `funding`. Adding both would expose them to crawlers the way the tool form's microdata already does.
- **`xml_order`:** neither tag is ordered by the linter. Adding them needs an agreed position in the IUC standards first (galaxy-iuc/standards#75), because appending them after `citations` warns on many existing IUC tools.
