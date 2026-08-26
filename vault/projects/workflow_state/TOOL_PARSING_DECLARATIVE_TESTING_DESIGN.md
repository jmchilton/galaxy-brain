# Design: Declarative Testing + Extension Points for Galaxy Tool Parsing

**Status:** proposal / not yet implemented
**Scope:** one layer below workflow-state — parse an XML/YAML tool source into a `ParsedTool` and assert its structure declaratively from YAML, mirrorable to TypeScript.

**Decisions locked (2026-07-17):** base branch = **`dev`** (this worktree); output-collections fix = **same PR, red-to-green**; `data_column` `data_ref` = **fix in this pass**; CWL = **deferred**. requirements/containers/stdio expectations = Python-only for now (TS skip-set); `value_falsy` port = deferred (avoid in shared files). The sections below still show the option analysis for the record; the recommendation rows now reflect these choices.

---

## TL;DR

- **Reuse the existing harness verbatim.** `gxformat2.testing` (already shipped in the PyPI `gxformat2==0.27.0` that Galaxy `dev` pins) is the whole harness. Its `navigate()` already walks Pydantic models by attribute, and `run_declarative_case` is literally `operation(load_fixture(name))`. A `ParsedTool` is a Pydantic model. **Zero harness changes are needed for the common cases.**
- **The parse seam already exists.** `model_factory.parse_tool(tool_source) -> ParsedTool` is the clean, single-call seam. The declarative testing layer is **purely additive** — no redesign of `parse_tool` or `parameters/factory.py` is required to make it testable. The prompt's "extension points / refactor" ask is separable and I recommend **deferring it** (one caller is not enough to justify a pluggable-stage abstraction).
- **New assertion driver = one small test module + one expectations dir + one fixture resolver**, all copying `workflow_state/test_declarative.py` almost line-for-line. The operation is `parse_tool`; the fixture resolver is the already-existing `functional_test_tool_source()`.
- **Two real behavior bugs surface as red-to-green targets, both fixed this pass:** (1) output **collections are commented out** of `from_tool_source()` so `ParsedTool.outputs` silently drops every `<collection>` output (two-line fix + contract change); (2) `data_column` does not capture its referenced data input (`data_ref`) — add the field to the model, read it in the factory, mirror to TS.
- **Base-branch decision is yours (Unresolved Q1).** I was dropped on a bare-`dev` worktree (`tool_parsing_abstraction`), not `wf_tool_state`. `dev` is *viable and arguably cleaner* — the harness comes from the existing PyPI pin, so there is no git-pin fragility and this can land independently of the whole `wf_tool_state` stack. But the prompt was written against `wf_tool_state`. Decide before I build.

---

## Option summary (decisions embedded)

| Decision | Options | Recommendation |
|---|---|---|
| **BASE_BRANCH** | `dev` (this worktree) vs `wf_tool_state` | **`dev`** — harness is in PyPI 0.27.0; lands independently. *Confirm with user (Q1).* |
| **HARNESS_CHANGES** | extend `gxformat2/testing.py` vs use as-is | **Use as-is.** `navigate` already handles the full `ParsedTool` model tree. |
| **PARSE_SEAM** | refactor `parse_tool` into hookable stages vs leave it | **Leave it.** `parse_tool` is already the seam. Defer stage-hooks — no second caller yet. |
| **EXPECTATION_LOCATION** | new dir beside `parameter_specification.yml` vs extend that file | **New dir** `test/unit/tool_util/tool_parsing/expectations/`. `parameter_specification.yml` tests *state validation*; this tests *parse structure*. Different subject, keep separate. |
| **FIXTURE_RESOLVER** | new resolver vs reuse `functional_test_tool_source()` | **Reuse `functional_test_tool_source()`** — same `_y`-suffix YAML convention, so names resolve identically in the test and in the TS sync dumper. |
| **OUTPUT_COLLECTIONS** | fix now vs defer | **DECIDED: fix now (red-to-green), this PR.** Uncomment 2 lines in `from_tool_source`; it's a `ParsedTool` wire-contract change — handle TS schema + goldens deliberately. |
| **DATA_COLUMN data_ref** | add to model now vs flag | **DECIDED: fix in this pass.** Add `data_ref` to `DataColumnParameterModel` + read in factory + TS parity. Plan in Part 1 / Gap B. |
| **SYNC_MECHANISM** | new manifest group vs extend `sync-parsed-tools` | **Extend the `sync-parsed-tools` family** — it already dumps `ParsedTool` JSON + sha256 manifests; add a spec-driven variant + a `check-sync` guard. |

---

## Part 1 — What I confirmed about the parsing layer

### The seam is already clean

`lib/galaxy/tool_util/model_factory.py:26` —

```python
def parse_tool(tool_source: ToolSource) -> ParsedTool:
    return parse_tool_custom(tool_source, ParsedTool)
```

`parse_tool_custom` is a flat sequence of `tool_source.parse_*()` calls plus `input_models_for_tool_source()` (inputs) and `from_tool_source()` (outputs). This is *exactly* the shape a declarative operation wants: **one function, `ToolSource -> ParsedTool`, no side effects, no runtime deps.** The fixture-to-source step (`get_tool_source(path)`) is equally clean.

**Conclusion:** the "add extension points to the parsing layer" ask is already satisfied for testing purposes. I would *not* introduce a stage-registry / pluggable-pipeline abstraction — there is exactly one production caller and one test caller, and the user's standing guidance is to avoid parallel scaffolding that doesn't earn its keep. If a real second consumer appears (e.g. a partial-parse mode, or a parse that wants to inject a custom parameter factory), revisit then. I call this out explicitly per the prompt's item 2: **testing layer = additive; `parse_tool` redesign = deferred.**

### `ParsedTool` is already a cross-language contract

`lib/galaxy/tool_util_models/__init__.py:418`. Served by `/api/tools/{id}/parsed` and the ToolShed 2.0 TRS API, decoded by TS `packages/schema/src/schema/parsed-tool.ts`. So assertions written against it are, by construction, assertions against the wire shape TS must match.

### Two real gaps found by reading (red-to-green candidates)

**Gap A — output collections dropped.** `lib/galaxy/tool_util/parser/output_objects.py:545`:

```python
def from_tool_source(tool_source: "ToolSource") -> Sequence[ToolOutputModel]:
    tool_outputs, tool_output_collections = tool_source.parse_outputs(None)
    outputs = []
    for tool_output in tool_outputs.values():
        outputs.append(tool_output.to_model())
    # for tool_output_collection in tool_output_collections.values():
    #    outputs.append(tool_output_collection.to_model())   # <-- COMMENTED OUT
    return outputs
```

`ToolOutputCollection.to_model()` exists (`output_objects.py:382`) and `ToolOutputT` already includes `ToolOutputCollection` (`tool_util_models/tool_outputs.py:200`). So `ParsedTool.outputs` is *typed* to hold collections but *never populated* with them. Any tool with a `<collection>` output (e.g. `test/functional/tools/all_output_types.xml`) parses to a `ParsedTool` that silently omits that output. This is the ideal red-to-green demonstration: write the expectation first (asserting the collection output is present), watch it fail, uncomment, watch it pass.

**Caveat (this is a wire-contract change, not a freebie):** uncommenting changes `/api/tools/{id}/parsed` + TRS payloads. Before landing:
- confirm TS `parsed-tool.ts` `ToolOutput` union admits collection outputs (the subagent confirmed it does — data/collection/text/integer/float/boolean);
- grep `test_output_models.py` / `test_parsing.py` for any golden asserting outputs *without* collections; per your rules, if one breaks it gets *fixed* (implementation-driven), not gutted.

**Gap B — `data_column` loses its `data_ref` (DECIDED: fix in this pass).** `DataColumnParameterModel` (`tool_util_models/parameters.py:1968`) carries `multiple`, `value`, `optional`, `name` — but **not** the referenced data input. `parameters/factory.py:282` never reads it. So a declarative assertion "column param X references input Y" is currently un-expressible because the data isn't in the model.

The value is available at parse time — `input_source.get("data_ref")`, exactly as `ColumnListParameter.__init__` reads it (`galaxy/tools/parameters/basic.py:1319, 1433`). Concrete plan:

1. **Model:** add `data_ref: Optional[str] = None` to `DataColumnParameterModel` (`tool_util_models/parameters.py:1968`).
2. **Factory:** in the `data_column` branch (`parameters/factory.py:282`) read `data_ref = input_source.get("data_ref")` and pass it to the model constructor.
3. **JSON Schema (optional):** surface it in `field_kwargs`'s `json_schema_extra` if downstream schema consumers need it; not required for the model/API to carry it.
4. **TS parity:** add `data_ref` to the TS `gx_data_column` interface (`packages/schema/src/schema/bundle-types.ts`) and populate it in `user-tool-parse` inputs (`inputs.ts`) so the mirror stays 1:1.
5. **Contract note:** like Gap A this changes `/api/tools/{id}/parsed` payloads (an added optional field — additive, low-risk). Watch `parameters.py:81`'s "implement data_ref on rules" TODO — out of scope here, but the same attribute; don't let the two diverge.

This makes the `inputs_data.yml::parse_data_column` assertion `[inputs, {name: col}, data_ref] → value: <input name>` express-able (it is shown live in Part 3).

---

## Part 2 — The design

### Directory layout (new)

```
test/unit/tool_util/tool_parsing/
  test_declarative_parsing.py       # ~40 lines, copies workflow_state/test_declarative.py
  expectations/
    outputs.yml
    inputs_conditional.yml
    inputs_repeat_section.yml
    inputs_selects.yml
    inputs_data.yml
    metadata.yml                    # id/version/name/profile/license/edam/xrefs/help
    requirements_containers_stdio.yml
    errors.yml                      # expect_error cases (malformed sources)
```

Location satisfies the constraint that `galaxy-tool-util` tests live in the isolated `test/unit/tool_util/` env with no galaxy-app/galaxy-data reach — `parse_tool` + `get_tool_source` depend only on `galaxy.tool_util` + `galaxy.tool_util_models`, both in-package.

### The test module (essentially the reference caller, retargeted)

```python
"""Declarative YAML-driven tests for Galaxy tool parsing.

ToolSource (XML/YAML) -> ParsedTool -> path-based YAML assertions.
Mirrors test/unit/tool_util/workflow_state/test_declarative.py.
"""
import os

from gxformat2.testing import DeclarativeTestSuite

from galaxy.tool_util.model_factory import parse_tool
from galaxy.tool_util.parser.factory import get_tool_source
from galaxy.tool_util.unittest_utils import functional_test_tool_source

EXPECTATIONS_DIR = os.path.join(os.path.dirname(__file__), "expectations")


def _load_fixture(name: str):
    # `name` is a functional-tool basename ("all_output_types") or a
    # "<name>_y" YAML alias, resolved by the existing helper; absolute
    # paths and inline dirs handled by the fallbacks below.
    if os.path.isabs(name) and os.path.exists(name):
        return get_tool_source(name)
    return functional_test_tool_source(name)


def _parse_op(tool_source):
    return parse_tool(tool_source)


OPERATIONS = {"parse": _parse_op}

suite = DeclarativeTestSuite(
    operations=OPERATIONS,
    load_fixture=_load_fixture,
    expectations_dir=EXPECTATIONS_DIR,
)


@suite.pytest_params()
def test_declarative_parsing(test_id, case):
    suite.run(test_id, case)
```

That is the whole driver. Everything else is data in `expectations/`.

Note: `functional_test_tool_source()` already encodes the fixture convention the TS sync dumper uses (`_y` suffix ⇒ `.yml`, else `.xml`), so a fixture named the same way resolves identically in the Python test and in `scripts/sync-parsed-tools.py`. **One resolver, both sides** — no drift.

### Why the harness needs no changes

`navigate()` (`gxformat2/testing.py:110`) walks: `str` ⇒ dict key *or* `getattr`; `int` ⇒ list index; `"$length"` ⇒ `len`; `{field: value}` ⇒ first list item where `getattr(item, field) == value`. The entire `ParsedTool` tree is Pydantic models and lists-of-models, so every path is a `getattr`/index chain. **The `{field: value}` selector is the key enabler** — it turns `inputs`/`whens`/`parameters` (order-independent model lists) into name-addressable maps.

I traced the hard cases the advisor flagged; all express cleanly:

- **Conditional when-branch nested param type:**
  `[inputs, {name: p1}, whens, {discriminator: "true"}, parameters, {name: p1v}, parameter_type]`
  (`whens` is `list[ConditionalWhen]`, each with `.discriminator`/`.parameters`/`.is_default_when`; `parameters.py:2086`.)
- **Repeat nested param:**
  `[inputs, {name: rep}, parameters, {name: inner}, type]`
- **Section nested param:** same shape as repeat.
- **Dynamic / `from_dataset` select:** dynamic selects have `options: None` and `is_dynamic: True`:
  `[inputs, {name: sel}, is_dynamic] → value: true` and `[inputs, {name: sel}, options] → value_absent: true`.
- **`data_column`:** `[inputs, {name: col}, multiple] → value: false`, `[inputs, {name: col}, value] → value: 1`. (The `data_ref` is *not* assertable — Gap B.)

No new assertion mode or path-element type is required to cover the parameter tree. (If we later want richer numeric/collection assertions, that's a `gxformat2` change — see Part 5 mirror cost.)

---

## Part 3 — The expectation format, worked

Same idiom as `workflow_state/expectations/*.yml`: top-level map of `test_id -> {fixture, operation, [expect_error], assertions[]}`. `operation` is always `parse` here.

### Outputs incl. collection + discovered datasets (the red-to-green file)

```yaml
# outputs.yml
parse_all_output_types_has_collection_output:
  fixture: all_output_types
  operation: parse
  assertions:
    # FAILS today (Gap A): collection outputs are dropped by from_tool_source.
    - path: [outputs, {name: out_collection}, type]
      value: collection
    - path: [outputs, {name: out_collection}, structure, collection_type]
      value: list

parse_all_output_types_discovered_dataset:
  fixture: all_output_types
  operation: parse
  assertions:
    - path: [outputs, {name: discovered}, discover_datasets]
      value_truthy: true

parse_simple_data_output:
  fixture: output_format
  operation: parse
  assertions:
    - path: [outputs, "$length"]
      value: 1
    - path: [outputs, 0, type]
      value: data
```

### Conditionals

```yaml
# inputs_conditional.yml
parse_disambiguate_cond_when_branch:
  fixture: disambiguate_cond
  operation: parse
  assertions:
    - path: [inputs, {name: p1}, parameter_type]
      value: gx_conditional
    - path: [inputs, {name: p1}, test_parameter, parameter_type]
      value: gx_boolean
    - path: [inputs, {name: p1}, whens, {discriminator: true}, parameters, {name: p1v}, parameter_type]
      value: gx_integer
    - path: [inputs, {name: p1}, whens, "$length"]
      value: 2
```

### Repeats + sections

```yaml
# inputs_repeat_section.yml
parse_repeat_min_max_and_nested:
  fixture: repeat            # test/functional/tools/repeat.xml (or a section fixture)
  operation: parse
  assertions:
    - path: [inputs, {name: queries}, parameter_type]
      value: gx_repeat
    - path: [inputs, {name: queries}, min]
      value: 1
    - path: [inputs, {name: queries}, parameters, {name: input}, parameter_type]
      value: gx_data
```

### Selects (static + dynamic/from_dataset)

```yaml
# inputs_selects.yml
parse_static_select_options:
  fixture: <select fixture>
  operation: parse
  assertions:
    - path: [inputs, {name: choice}, multiple]
      value: false
    - path: [inputs, {name: choice}, options, {value: opt1}, label]
      value: Option One

parse_dynamic_select_from_dataset:
  fixture: <from_dataset select fixture>
  operation: parse
  assertions:
    - path: [inputs, {name: col_source}, is_dynamic]
      value: true
    - path: [inputs, {name: col_source}, options]
      value_absent: true          # dynamic ⇒ options is None
```

### Data / data_column / collection inputs

```yaml
# inputs_data.yml
parse_data_column:
  fixture: <data_column fixture>
  operation: parse
  assertions:
    - path: [inputs, {name: col}, parameter_type]
      value: gx_data_column
    - path: [inputs, {name: col}, multiple]
      value: false
    # data_ref now assertable after the Gap B fix (this pass):
    - path: [inputs, {name: col}, data_ref]
      value: <referenced input name>

parse_data_extensions:
  fixture: <data fixture>
  operation: parse
  assertions:
    - path: [inputs, {name: input}, extensions]
      value_set: [txt, tabular]

parse_collection_input_type:
  fixture: collection_creates_list
  operation: parse
  assertions:
    - path: [inputs, {name: input}, parameter_type]
      value: gx_data_collection
    - path: [inputs, {name: input}, collection_type]
      value: list
```

### Metadata (id/version/name/profile/license/edam/xrefs/help)

```yaml
# metadata.yml
parse_metadata_basics:
  fixture: <a tool with rich metadata>
  operation: parse
  assertions:
    - path: [id]
      value: <tool id>
    - path: [profile]
      value_matches: '^[0-9]+\.[0-9]+$'
    - path: [edam_operations, "$length"]
      value: 1
    - path: [xrefs, 0, type]
      value: bio.tools
    - path: [help]
      value_truthy: true
```

### Requirements / containers / stdio (Python-only for now — see mirror note)

```yaml
# requirements_containers_stdio.yml
parse_requirements_and_container:
  fixture: <tool with requirement + container>
  operation: parse
  assertions:
    - path: [requirements, {type: package}, name]
      value: samtools
    - path: [requirements, {type: package}, version]
      value: "1.9"
    - path: [containers, 0, type]
      value: docker
    - path: [stdio, exit_codes, "$length"]
      value_truthy: true
```

**Mirror caveat:** TS `ParsedTool` omits `requirements`/`containers`/`stdio` entirely (subagent-confirmed), and the generated JSON *does* contain them but Effect's `onExcessProperty:"ignore"` drops them on decode. So these assertions **pass in Python but cannot be replayed in TS until those three structs are added to `parsed-tool.ts`.** Options: (a) keep this file Python-only and gate it out of the TS run via the existing skip-set mechanism; (b) add the three structs to TS. I recommend **(a) for now, (b) as follow-up** — it keeps this PR scoped.

### Error cases

```yaml
# errors.yml
parse_malformed_tool_raises:
  fixture: <deliberately broken tool fixture>
  operation: parse
  expect_error: true
```

### CWL

In scope structurally (there is a `cwl_*` parameter family on both sides and `_from_input_source_cwl` in the factory), but **out of scope for the first cut** — the CWL path has its own `CwlToolSource` quirks and fewer checked-in fixtures. Flag as Q5; add a `cwl.yml` once the Galaxy-path files are green.

---

## Part 4 — Fixture story

Follow the `framework_tool_checks.yml` reasoning (its header: "applies to any tool in the older and more general `test/functional/tools` directory"). We do **not** invent new tool fixtures; we select from the existing **293 XML + 6 YAML** corpus (note: the prompt said 302/6 — on `dev` it is **293 XML**; the delta is branch drift, not a problem).

Selection principle: **one fixture per parsing feature**, chosen because it already exercises that feature, not for breadth. Concretely, a starter set of ~12–15 fixtures:

| Feature                            | Fixture (confirmed present)                                             |
| ---------------------------------- | ----------------------------------------------------------------------- |
| collection + discovered outputs    | `all_output_types.xml`                                                  |
| simple data output                 | `output_format.xml`                                                     |
| nested conditionals (boolean test) | `disambiguate_cond.xml`                                                 |
| collection inputs / types          | `collection_creates_list.xml`, `collection_list_paired_or_unpaired.xml` |
| repeats                            | a `repeat*.xml`                                                         |
| YAML source path                   | one `*_y` fixture (exercise the YAML `ToolSource`)                      |
| dynamic select                     | a `from_dataset`/`from_data_table` fixture                              |
| requirements/containers            | a fixture with `<requirement>` + `<container>`                          |

Coverage grows by adding expectation entries, not fixtures. The corpus is the fixed asset; the expectation YAML is where investment goes.

---

## Part 5 — Sync story (Python → TS)

### What exists (subagent-confirmed, with one correction to the prompt)

- There is **no `sync-manifest.json` group for parsed tools.** Parsed-tool generation is a *separate* Make target `sync-parsed-tools` that (i) rsyncs `.gxwf.yml` connection fixtures via the `connection-workflows` manifest group, then (ii) runs `scripts/sync-parsed-tools.py` under the Galaxy venv to dump one `ParsedTool` JSON per referenced `tool_id` + a `parsed_tools.sha256` manifest. Guard: `check-sync-parsed-tools` (bespoke inline-node sha256 verifier), wired into `make check`.
- `scripts/sync-parsed-tools.py` already: collects tool_ids, resolves each via `functional_test_tool_source()` (walk fallback), `parse_tool()`s it, writes JSON + sha256, **fails loud** on any unresolved id.

So the dumper is **~90% of what we need** — it is already "dump `ParsedTool` goldens for TS." The only change: **drive selection off the expectation files' `fixture:` names instead of off `.gxwf.yml` step `tool_id`s.**

### Proposed additions

1. **New expectations corpus in the manifest.** Add a `sync-manifest.json` group `tool-parsing-expectations` (patterns `*.yml`, `src` = `test/unit/tool_util/tool_parsing/expectations/`, `dst` = `packages/schema/test/fixtures/tool_parsing/expectations/`), plus the standard 2-line `sync-tool-parsing-expectations` / `check-sync-tool-parsing-expectations` Makefile pair.

2. **A spec-driven parsed-tool dumper.** Either extend `sync-parsed-tools.py` with a `--from-expectations DIR` mode (collect the set of `fixture:` values across the expectation YAMLs; resolve each via `functional_test_tool_source()`; dump JSON + sha256 into `packages/schema/test/fixtures/tool_parsing/parsed_tools/`), or add a sibling `sync-parsed-tool-goldens.py`. Prefer extending — same resolver, same loud-failure discipline, same sha256 manifest shape. Add `sync-parsed-tool-goldens` + `check-sync-parsed-tool-goldens` and wire the `check-` guard into `make check`.

3. **TS replay test.** Copy `packages/schema/test/parameter-specification.test.ts`'s loop: read the synced expectation YAMLs, for each case load the pre-generated `ParsedTool` JSON golden by `fixture` name, register `parse` as an identity op (the golden *is* the parsed result — TS isn't re-parsing XML yet), and run the same `runAssertions` from `declarative-test-utils.ts`.

### What a TS tool parser must implement to pass (and how much of `user-tool-parse` generalizes)

Today TS `user-tool-parse` is **YAML/inline-`GalaxyUserTool`-only, no XML**, and its `ParsedTool` **omits requirements/containers/stdio**. Two-phase path:

- **Phase 1 (now):** TS replays against the *Python-generated JSON goldens* (identity op). This proves the expectation format + assertion vocabulary port, and immediately locks the `ParsedTool` wire shape — **no TS parser work required.** This is the `parameter-specification.test.ts` model exactly.
- **Phase 2 (later):** TS parses tools itself. The parameter/output tree builders (`parseInputs`/`parseOutputs`) generalize directly; what's missing is (a) an XML front-end (the big open question — there is none today), (b) requirements/containers/stdio builders + schema structs, (c) a `ToolSource` abstraction. When those land, flip the TS op from identity to real parse and the *same* expectation YAML validates it.

### Assertion-mode mirror cost (measured)

The TS harness (`declarative-test-utils.ts`) implements **8 of the 9** Python assertion modes. Missing: **`value_falsy`**. Also, `value_absent` diverges — TS additionally passes when a path resolves to `null`/`undefined`; Python fails ("resolved but expected absent"). Practical guidance for authoring:

- **Avoid `value_falsy`** in shared expectation files until it's ported (add `assertValueFalsy` in *both* identical copies of `declarative-test-utils.ts`, plus interface + dispatch — ~4 small edits). Use `value: false` / `value_absent` instead where possible.
- **For "field is None"**, be aware `value_absent` means "path doesn't resolve" in Python but "doesn't resolve *or* is null" in TS. For a field that is present-but-`None` (e.g. dynamic select `options`), the two harnesses disagree. Prefer asserting a *sibling* discriminator (`is_dynamic: true`) over asserting `options` absence, or align the two harnesses first.

These two are the *only* portability liabilities in the assertion layer; everything else (`$length`, `{field:value}`, model-attribute navigation over serialized dicts) is byte-for-byte compatible.

---

## Part 6 — Migration path for `test_parsing.py` & friends

`test/unit/tool_util/test_parsing.py` is inline `TOOL_XML_1 = """..."""` heredocs + imperative `TestCase` assertions. Migrate **opportunistically, not wholesale**:

- **Convert:** any assertion that is "parse this source, check this field on the resulting `ParsedTool`." These become expectation entries pointing at a functional-tools fixture (or, where the heredoc has no functional-tools equivalent, at a new minimal fixture — but check for reuse first). This is the bulk of `test_parsed_tool_model.py`, `test_input_models.py`, `test_output_models.py`.
- **Keep imperative:** tests that assert on *intermediate* objects (raw `ToolSource.parse_*` return values, `InputSource` behavior, factory internals) or that exercise error-message text / exception types beyond `expect_error`'s boolean. The harness only sees the final `ParsedTool`; anything below that stays a unit test. Per `GXWF_AGENT.md`, these internal-function unit tests are "expendable" but not *wrong* — don't churn them without cause.
- **Delete nothing** as part of migration. A heredoc test stays until its coverage is demonstrably reproduced by an expectation entry (run both green, then remove the heredoc in a separate, reviewable step).

---

## Part 7 — Test plan (red-to-green)

1. **Live smoke first.** Bootstrap the worktree venv (`/galaxy-bootstrap`; `uv pip install psycopg_binary` if pq errors), then run `parse_tool(functional_test_tool_source("output_format"))` and one trivial expectation to prove the wiring end-to-end before writing 8 files. *(No `.venv` exists in this worktree yet — this is step 0.)*
2. **Red:** write `outputs.yml::parse_all_output_types_has_collection_output` **first**. Run — it **fails** (Gap A: collections dropped).
3. **Green:** uncomment the two lines in `from_tool_source` (`output_objects.py:550-551`). Re-run — passes. Then grep `test_output_models.py`/`test_parsing.py` for goldens now broken by the added collection output; **fix** those goldens (implementation-driven), do not delete/gut them. If a fixture edit *seems* required to make something pass — stop and ask (per your standing rule).
4. **Green-from-start:** author the remaining expectation files against current behavior (metadata, conditionals, repeats, selects, data). These document/lock existing behavior.
5. **Run the isolated suite** `pytest test/unit/tool_util/tool_parsing/` (one suite, not parallel — Galaxy guidance). Verify newly added tests actually pass before claiming done.
6. **Sync path:** run the extended `sync-parsed-tool-goldens` + the TS replay test locally (needs `GALAXY_ROOT` + Galaxy venv) to prove the goldens generate and TS replays them.
7. **Contract check:** `make check` in the TS repo must stay green (the new `check-sync-parsed-tool-goldens` guard included).

---

## Resolved decisions (2026-07-17)

1. **Base branch = `dev`** (this worktree). Harness ships in the pinned PyPI `gxformat2==0.27.0`; lands independently, no git-pin fragility.
2. **Output-collections fix = same PR, red-to-green.** Wire-contract change to `/api/tools/.../parsed` + TRS handled deliberately (TS union already admits it; fix any broken output-model goldens).
3. **`data_column` `data_ref` = fix in this pass.** Model + factory + TS parity per Gap B plan.
4. **CWL = deferred.** Land Galaxy XML/YAML green first; add `cwl.yml` after.

## Remaining defaults (proceeding unless you object)

- **requirements/containers/stdio expectations — Python-only for this pass.** TS `ParsedTool` lacks those three structs; gate that expectation file out of the TS run via the existing skip-set. Add the Effect structs as a fast follow.
- **`value_falsy` + `value_absent` alignment — avoid both in shared files for now.** Port `value_falsy` into the two TS `declarative-test-utils.ts` copies + align `value_absent` null-semantics as a small follow-up; until then prefer `value: false` / sibling-discriminator assertions.
