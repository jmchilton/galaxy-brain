# galaxy 16477 — funding information on tool form (hechth)

Branch `hechth:grant_tool_tag`, head `9a0ff66d9c2`, base dev. 15 files +292/-6. Mergeable; CI 61 pass / 2 skipped.

## Prior review

- Old reviewer asks (bernt-matthias, mvdbeek, bgruening): `Creator(Thing)` inheritance, YAML parser, type hints, short-inline/full-popover display. All resolved by the author or by our pushes.
- Our pushes: `a499403` dev merge (9 conflicts, schema drift), `6c8a87a` reverted `catWrapper.xml` debug edit, `7528ced` GrantViewer rebuilt on `ThingViewerMixin` + BPopover/GTable, grant mypy fixes, `9a0ff66d9c2` Selenium `test_tool_footer_creators_and_funding`.
- Left open: YAML creator/funding shape mismatch; no `funder`; no frontend unit tests.

## Summary

Adds `<funding><grant .../></funding>` to tool XML (xsd + XML parser), YAML `parse_creator`/`parse_funding`, `funding` in `Tool.to_json`, `Funding.vue`/`GrantViewer.vue` in the tool footer, a `Thing`/`Grant` pydantic refactor, and `creator`/`funding` in `xml_order` `TAG_ORDER`. The tool XML + UI path is clean and mirrors creators well. Four things need fixing: the YAML shape, the new lint warnings, the reused "Thing" attribute group, and a dead pydantic model.

Verified locally: `test_parsing -k "creator or funding"` passes (4). `test_tool_linters` passes (105). New `xml_order` behaviour was measured by running the linter directly (below).

## API / tool-syntax consistency (funding vs creator)

| Aspect | creator | funding | Verdict |
|---|---|---|---|
| XML container / child | `<creator>` → `<person>`/`<organization>` | `<funding>` → `<grant>` | Consistent: container = schema.org property, child = class |
| XSD shape | attrs only, `attributeGroup ref="Thing"` | same group | Consistent, but the group is wrong for Grant (see schema.org) |
| XML parser | `parse_creator`, `creator_el.attrib`, `{"class": ...}` | `parse_funding`, `_element_to_dict`, `{"class": "Grant"}` | Fine. `parse_creator` now returns `[]`, not `None` (harmless; to_json emits `[]`) |
| Method naming | singular `parse_creator` / `tool.creator` / key `creator` | `parse_funding` / `tool.funding` / key `funding` | Consistent (both schema.org property names) |
| Return type hint | untyped (interface) | interface `list[dict[str, Any]]`, XML `list[dict[str, str]]`, YAML `list[dict[str, dict[str, str]]]` | Three different hints. YAML's hint encodes the bug |
| YAML parser | none on dev; this PR adds raw passthrough | raw passthrough | **Wrong shape** (below) |
| tool_util_models `YamlToolSource`/`UserToolSource` (`extra="forbid"`) | absent | absent | Validation rejects both: `creator`/`funding` → `extra_forbidden` (checked) |
| `ParsedTool` / `model_factory.parse_tool` | absent | absent | Pre-existing gap for both |
| Tool API | untyped `to_json` dict | same | Parity |
| pydantic `galaxy.schema` | `Person`/`CreatorOrganization`, used by `StoredWorkflowDetailed.creator` → in `schema.ts` | `Grant(Thing)` used nowhere; not in `schema.ts` | Dead model |
| Client | `Creators.vue` → `CreatorViewer` → Person/OrganizationViewer, `itemprop="creator"` | `Funding.vue` → `GrantViewer`, `itemprop="funding"` itemtype Grant | Mirrors the creator pattern and reuses `ThingViewerMixin` |
| Tool content lints | none | none | Parity. No lint needed |
| `xml_order` | not in `TAG_ORDER` on dev, so it was never checked | PR appends `creator`, `funding` after `citations` | **New warnings** (below) |

**YAML shape: resolved.** XML produces `[{"class": "Person", ...}]`. The PR's YAML accepts and returns `[{"person": {...}}]` unchanged. `CreatorViewer` keys on `class`, so a YAML creator falls through to `PersonViewer` with only a `person` key and shows `[object Object]` in the popover and meta. `GrantViewer` shows an empty grant. The YAML shape should be the flat, `class`-discriminated list that the XML parser emits and the API returns. gxformat2 workflows already use it (`CreatorPerson.class_: Literal["Person"]`):

```yaml
creator:
  - class: Person
    givenName: Björn
    familyName: Grüning
    identifier: https://orcid.org/0000-0002-3079-6586
  - class: Organization
    name: Galaxy IUC
funding:
  - class: Grant        # default it in parse_funding if omitted
    name: EuroScienceGateway
    identifier: "101057388"
```

`test_parse_creator` and `test_parse_funding` are new in this PR and assert the buggy shape. Changing them is fixing the tests to match the right design, not weakening them. They should also assert `class`.

## schema.org

- The property/class naming is right. `funding` is a CreativeWork property whose range is `Grant`, and `Grant` is a subclass of `Intangible`/`Thing`. Galaxy uses `class` in place of `@type`, as it does for creators.
- **The attribute set is wrong.** The xsd `attributeGroup name="Thing"` really means "contact-bearing Thing": name, url, identifier, image, address, email, telephone, faxNumber, alternateName, plus the `description` this PR adds. address/email/telephone/faxNumber are Person/Organization properties, not Thing properties, so `<grant email=... faxNumber=...>` validates but is not schema.org. The pydantic `Thing` repeats the same mistake, and adds `identifier: "typically an orcid.org ID"`, which is wrong for grants.
- Missing: `funder` (Organization|Person), the thing that gives a grant number its meaning. `sponsor` and `MonetaryGrant.amount` are lower value.
- Recommended shape:
  - Split the xsd group into a true `Thing` (name, url, identifier, image, alternateName, description) and a `ContactPoint`-ish group (address, email, telephone, faxNumber) that only Person/Organization reference. Grant takes only `Thing`. Removing attrs later is breaking, so this belongs in this PR.
  - Add `funder` in a follow-up as a child that reuses the existing `PersonOrOrganization` group. This is additive, and the parser emits `"funder": [{"class": "Organization", ...}]`:
    ```xml
    <grant name="EuroScienceGateway" identifier="101057388" url="https://cordis.europa.eu/project/id/101057388">
        <funder><organization name="European Commission" identifier="https://ror.org/00k4n6c32"/></funder>
    </grant>
    ```
  - pydantic: do the same split. `Grant.class_: Literal["Grant"] = "Grant"`, the same pattern as `Person`, plus later `funder: list[Person | CreatorOrganization]`. Alternatively, drop `Thing`/`Grant` from this PR until a response model uses them.

## Completeness vs creators

Creators footprint (`0215c418e10` "Tool and workflow metadata & microdata", then workflow refactor/RO-Crate/BCO work):

| Surface | creators | funding | Needed |
|---|---|---|---|
| Tool XSD | yes | yes (PR) | Thing split (this PR); `funder` (follow-up) |
| Tool XML parser | yes | yes (PR) | — |
| Tool YAML parser | this PR (wrong shape) | this PR (wrong shape) | flat `class` shape (**this PR**) |
| tool_util_models YAML/User tool models | no | no | add both, `extra=forbid` rejects them (follow-up, jointly) |
| `ParsedTool` / tool shed metadata | no | no | follow-up, jointly |
| `Tool.to_json` / tool form | yes | yes (PR) | — |
| Tool footer UI + microdata (`ToolForm` CreativeWork scope) | yes | yes (PR) | — |
| Tool list JSON-LD (`ToolsJson.vue` `application/ld+json`) | no | no | optional follow-up: add `creator`/`funding` to each SoftwareApplication |
| Tool linters (content) | none | none | none |
| Workflow model column (`creator_metadata`, migration 0171) | yes | no | new column + alembic migration |
| Workflow API (`StoredWorkflowDetailed.creator`, managers import/export .ga, copy/rename) | yes | no | field + manager plumbing |
| Refactor action (`update_creator`) | yes | no | `update_funding` action |
| gxformat2 schema + lint | yes | no | upstream gxformat2 field (+ Galaxy dependency bump) |
| Workflow editor attributes (`CreatorEditor`, Person/OrganizationForm, `ThingFormMixin`) | yes | no | GrantForm/FundingEditor reusing `ThingFormMixin` |
| Published workflow page / list badges | yes | no | optional |
| Workflow RO-Crate export (`ro_crate_utils.py`) | yes | no | `funding` → Grant entities (WorkflowHub/RO-Crate use `funder`/`funding`) |
| BCO export (`get_contributors`) | yes | n/a | BCO has no funding slot |
| Page/history ld+json | none | none | — |

Priority for follow-ups:
1. Workflow model + API + gxformat2 + RO-Crate. Workflow funding is where WorkflowHub/IWC would use it.
2. tool_util_models + `ParsedTool` for creator and funding together.
3. Editor UI.
4. JSON-LD on the tool list.

Only the rows marked "this PR" block merging.

## Findings

### Blocker
- None.

### Major
1. **YAML shape**: `yaml.py` `parse_creator`/`parse_funding` return `[{"person": {...}}]`, but the XML parser and client expect the flat `class` shape. Normalize to the flat `class` form and fix the two tests. The alternative is dropping the YAML methods from this PR.
2. **`xml_order` adds new warnings**: on dev the linter skips any tag missing from `TAG_ORDER`, so `<creator>` never warned. The PR description's premise is incorrect. Appending `creator`/`funding` after `citations` warns on 24 of 49 tools-iuc tool files that have an inline `<creator>`. It also warns on the PR's own fixture: `bibtex.xml` → "[xrefs] elements should come before [funding]". The IUC standards doc (`tool_xml.rst`) was never updated, and galaxy-iuc/standards#75 is still open. Either drop the change or land it together with a standards PR, and fix `bibtex.xml`/`mulled_example_multi_1.xml` ordering either way. It also needs a linter test.
3. **Grant inherits contact attributes**: see schema.org above. Split the xsd `Thing` group, and do the same for pydantic, before the syntax ships.

### Minor
4. `Grant`/`Thing` pydantic models are unused, so `schema.ts` has no Grant. Drop them, or type `class_` as `Literal["Grant"]` and wire them into something. Pydantic `Thing` has no `description`, although the xsd adds it.
5. `Creator(Thing)` redeclares `class_` and `name` only to change description text.
6. The parse return hints disagree across interface/xml/yaml (`Any` / `str` / nested dict).
7. `Funding.vue` is a copy of `Creators.vue`, which is acceptable. There is no vitest for GrantViewer/ToolFooter funding. The Selenium test covers rendering, so this is optional.
8. `funder` is out of scope per the PR description. That is fine as a follow-up only if the Thing split lands now.

### Nits
- `test_funding`: remove the two `print()` calls. The multiline description plus `re.sub` is convoluted; use a one-line description and drop the `re` import.
- The `parse_funding` docstring says "dict with array of grants" but it returns a list.
- xsd `Funding` doc: "A Grant that ... provide" → "provides".
- The `bibtex.xml` trailing-whitespace fix is unrelated to the feature, but harmless.

## Suggested verdict

Request changes (small). Fix Major 1–3, then approve. Workflow/RO-Crate/tool_util_models parity goes in follow-ups.

## Draft GitHub review

*Posted by Claude (AI assistant) on behalf of @jmchilton — not authored by them personally.*

Thanks for sticking with this. The tool XML → footer path looks good and follows the existing creator pattern closely (`<funding>`/`<grant>` mirrors `<creator>`/`<person>`, `GrantViewer` reuses `ThingViewerMixin`, and there is an E2E test now). A few things before merge:

1. **YAML shape.** `YamlToolSource.parse_creator`/`parse_funding` return the raw `[{"person": {...}}]` / `[{"grant": {...}}]`. The XML parser and client use `[{"class": "Person", ...}]`, so YAML creators show `[object Object]` and grants show up empty. I'd suggest the flat `class`-discriminated form that gxformat2 workflows already use (`- class: Person` / `- class: Grant`, defaulting `class: Grant` if omitted), with the two new tests asserting that.
2. **`xml_order`.** On dev the linter skips tags that aren't in `TAG_ORDER`, so `<creator>` doesn't warn today. Adding `creator`/`funding` after `citations` makes about half of tools-iuc tools with an inline `<creator>` warn (24/49 locally), including this PR's own `bibtex.xml` ("[xrefs] elements should come before [funding]"). Could this either be dropped or paired with an update to the IUC standards' element order (galaxy-iuc/standards#75), plus a linter test and fixed fixtures?
3. **Grant attributes.** `Grant` reuses the xsd `Thing` attribute group, which includes `email`, `telephone`, `faxNumber` and `address`. Those are Person/Organization properties, not schema.org Grant/Thing ones. Could the group be split into a real `Thing` (name, url, identifier, image, alternateName, description) plus a contact group used only by person/organization? Removing attributes later would be a breaking change, so it's worth doing before this ships. `funder` (reusing the `PersonOrOrganization` group as a child of `<grant>`) can come later as an additive change.

Smaller items:
- The `Grant`/`Thing` pydantic models aren't used by any response model. Either drop them or give `Grant` `class_: Literal["Grant"] = "Grant"` like `Person`, plus `description` on `Thing`.
- Make the `parse_funding` type hints consistent across interface/xml/yaml.
- In `test_funding`, drop the `print()` calls and the `re` workaround (a one-line description is enough).
- xsd typo: "provide" → "provides".

Follow-ups, not for this PR: funding on workflows (model column, API, gxformat2, editor, RO-Crate export) and adding creator + funding to `tool_util_models` (`YamlToolSource`/`UserToolSource` currently reject both with `extra="forbid"`) and `ParsedTool`.

## Our fixes (2026-09-27, pushed to `hechth:grant_tool_tag` at `c48f1244559`)

- `b4b61f63123` YAML creator/funding use the flat `class` form; grants default `class: Grant`; parse hints aligned to `list[dict[str, Any]]`; test prints/`re` removed.
- `b0096f10627` xsd `Thing` split into `Thing` + `PersonOrOrganizationContact` (address/email/telephone/faxNumber, Person/Organization only); pydantic same split, `Grant.class_` defaults `"Grant"`; `schema.ts` regenerated (+`description` on Person/Organization). `<grant email=...>` now fails xsd.
- `c48f1244559` dropped `creator`/`funding` from `xml_order` `TAG_ORDER` (the option that needs no standards change).
- Verified: `test_parsing` + `test_tool_linters` 197 passed; `bibtex.xml`, `mulled_example_multi_1.xml` validate.
- Still minor/open: `Grant` pydantic unused (no `schema.ts` entry); PR description's `xml_order` claim now stale.
- Parity issue drafted: `galaxy_16477_funding_parity_issue.md`.
