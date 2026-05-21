---
type: research
subtype: design-problem
tags:
  - research/design-problem
  - galaxy/tools
  - galaxy/tools/yaml
  - galaxy/tools/runtime
  - galaxy/models
status: draft
created: 2026-05-21
revised: 2026-05-21
revision: 3
ai_generated: true
sources:
  - "https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/tools/parameters/basic.py"
summary: "Structural dossier on basic.py: parser fused with codec, isinstance dispatch, god-class data params, parallel Pydantic schism, hidden HistoryItemRef ADT"
related_notes:
  - "[[Component - Tool State Specification]]"
  - "[[Component - Tool State Dynamic Models]]"
  - "[[Component - YAML Tool Runtime]]"
  - "[[Component - User-Defined Tools]]"
  - "[[Problem - YAML Tool Post-Hoc State Divergence]]"
  - "[[Workflow Extraction Issues]]"
  - "[[PR 21828 - YAML Tool Hardening and Tool State]]"
  - "[[PR 20935 - Tool Request API]]"
  - "[[PR 21842 - Tool Execution Migrated to api jobs]]"
---

# `basic.py` Parameter Hierarchy — Unified Diagnostic

`lib/galaxy/tools/parameters/basic.py` (3,191 lines, ~30 classes) is the
legacy `ToolParameter` hierarchy. It has been the central choke point for tool
parameters in Galaxy for over a decade. This note collects, in one place, the
structural reasons it has resisted decomposition. It is not a refactor plan —
it is the dossier that should accompany every plan that touches this file.

The file's problems are not specific to any one downstream consumer. Workflow
extraction, post-hoc state divergence, the new tool form, the workflow editor,
the job display panel, and the YAML runtime all suffer for related but not
identical reasons. This dossier tries to describe the file on its own terms;
the consumer-specific symptom catalogues live in the cross-referenced notes.

Cross-references in this note point at file paths in the working tree at
`lib/galaxy/...`. Line numbers reference the state at the time of writing
(2026-05-21, branch `refactor-data-options-builder`).

---

## Executive summary

1. **Two products glued together.** The file is *both* the parameter
   description authority (parses XML `input_source`, owns
   `to_dict`/`get_initial_value`/`validate`/`get_options` for the form) *and*
   the value codec for arbitrary persisted `JobParameter` rows (`to_json` /
   `to_python` / `value_to_basic` / `value_from_basic` for every consumer that
   re-reads a finished job). The two roles have incompatible contracts. Every
   method ends up serving both at once.

2. **The polymorphic surface is a mirage.** ~30 `isinstance(..., XxxToolParameter)`
   sites across `lib/galaxy/` reach past the base class to discriminate on
   concrete subclasses. Direct construction of `BooleanToolParameter(None, …)`,
   `DataToolParameter(None, …, self.trans)`, `IntegerToolParameter(None, …)`
   happens in `workflow/modules.py` at `:1005, 1021, 1159, 1173, 1225, 1289,
   1356, 1366, 1388, 1419, 1451, 1459, 1474, 1483, 1493, 1502`. The base class
   is a method bag.

3. **Pervasive type erasure.** Base-class signatures are effectively
   `Any → Any`. `value_from_basic` (`:284–301`) dispatches on
   `MutableMapping["__class__"]` sentinels (`UnvalidatedValue`,
   `NoReplacement`), `is_runtime_value`, falls back to `to_python`, optionally
   swallows exceptions via `ignore_errors`. There is no coherent state
   machine — every consumer re-discriminates the shape.

4. **The data parameters are god classes.** `DataToolParameter` (~500 lines,
   `:2180–2683`) and `DataCollectionToolParameter` (~250 lines, `:2684–2933`)
   bundle XML parsing, input coercion, validation, paginated SQL option
   building, workflow converter-safety analysis, dynamic-options filter
   machinery, UI default seeding, *and* DB-row-committing default-object
   materialization (`raw_to_galaxy` at `:3048–3133`, where `app.model.session.commit()`
   lives inside what reads as a value coercion path).

5. **The Pydantic side is a parallel reimplementation with zero shared code.**
   `lib/galaxy/tool_util_models/parameters.py` and `lib/galaxy/tools/runtime.py`
   re-define the same taxonomy in Pydantic and do not import `basic.py`
   (confirmed via grep — no hits). `basic.py` does not import them either.
   They are kept aligned by convention.

6. **A `HistoryItemRef` ADT is trying to escape from the helpers at the
   bottom.** `src_id_to_item` (`:2133`), `src_id_to_item_collection` (`:2171`),
   `history_item_dict_to_python` (`:3159`), `history_item_to_json` (`:3174`),
   `raw_to_galaxy` (`:3048`) do the polymorphic dispatch over
   `{HDA, HDCA, DCE, LDDA, CollectionAdapter}` that the class hierarchy
   refuses to model. They are called from four parameter classes and from
   `Tool.to_json`. The src whitelist is duplicated at `:3162` and `:2151`.

7. **Inheritance leaks, MRO hazards, and Liskov violations are out in the
   open.** The file contains in-source confessions —
   `# why does Integer and Float subclass this :_(` (`:429`),
   `# skip SelectToolParameter (the immediate parent) bc we need to get
   options in a different way here` (`:1276, 1854` duplicate),
   `As with all hidden parameters, this is a HACK.` (`:2937`).
   `DrillDownSelectToolParameter` returns an incompatible list type from
   `get_options`, and the supertype annotation was widened to absorb the
   violation (`:1009`).

---

## 1. The two roles, in detail

### Forward direction — parameter description authority

`ToolParameter.__init__` parses XML `input_source` (or the YAML-derived adapter
view). The forward methods (`get_options`, `get_initial_value`, `to_dict`,
`get_legal_values`, `validate` against fresh form submissions) consume the spec
and a live `trans`/history context and produce form-renderable JSON or a
validated incoming value. The relevant consumers are the tool form
(`Tool.to_json` in `tools/__init__.py`), the workflow editor
(`managers/workflows.py`, `workflow/modules.py`), and live execution
(`tools/parameters/__init__.py:306` in `check_param`).

### Backward direction — post-hoc value codec

The same classes are called to decode arbitrary `JobParameter` rows for *any*
tool, including YAML tools that the class hierarchy was never designed to
describe. `BaseDataToolParameter.to_python` (`:2039–2070`) carries a comment
labelling four branches as *"Handle legacy string values potentially stored in
databases"*:

- comma-separated id strings (`:2054–2059`)
- `"__collection_reduce__|<encoded_id>"` (`:2060–2064`)
- `"dce:N"` / `"hdca:N"` (`:2065–2068`)
- the canonical `{"values":[…]}` envelope (the modern shape)

The same method body has to serve both directions because there is no separate
codec type. `DataToolParameter.from_json` (`:2245–2401`, ~150 lines) is the
clearest case: it dispatches over `MutableMapping`, `list`, `str`,
`__collection_reduce__|`, `HDA`/`HDCA`/`DCE`/`LDDA`, mutates
`value_to_check.implicit_conversion` (`:2354`) as a side effect, and includes
a 16-character-length heuristic at `:2294–2298` to guess whether an id is
encoded (a 16-digit integer ≥ 1e15 would defeat it; the code logs a warning
then decodes anyway).

This is the deep structural sin. Every other problem on this page is downstream
of it.

---

## 2. The polymorphic mirage

`ToolParameter` is polymorphic on paper. In practice ~30 callsites reach for
concrete subclasses via `isinstance`:

- `tools/__init__.py:168–179` — imports 10 concrete classes, 7 `isinstance`
  sites (`:1788, 1891, 1958, 2543, 2557, 2580, 3261, 3273`).
- `tools/evaluation.py:62–66` — 3 imports, 6 `isinstance` sites
  (`:418, 457, 492, 505, 518, 530, 659`).
- `tools/actions/__init__.py:64–67` — 7 `isinstance` sites.
- `managers/workflows.py:91–94` — 7 `isinstance` sites.
- `tools/wrappers.py:38–41` — 4 imports.
- `tools/parameters/wrapped.py:11–16` — 4 `isinstance` sites.
- `workflow/modules.py:95–107` — 9 imports, both `isinstance` *and* direct
  construction at `:1005, 1021, 1159, 1173, 1225, 1289, 1356, 1366, 1388, 1419,
  1451, 1459, 1474, 1483, 1493, 1502`.
- `tool_shed/tools/tool_validator.py:34` — `isinstance` against
  `SelectToolParameter` for dynamic-options detection.

Direct construction with `None` as the `tool` argument
(`DataToolParameter(None, data_src, self.trans)` at `workflow/modules.py:1159`)
demonstrates that the class can be torn from its supposed XML-spec context —
which it can, because nothing in the data path uses the spec context
faithfully past initialization.

Exactly **one** subclass exists outside `basic.py`: `ConditionalStepWhen`
(`workflow/modules.py:162`), a `BooleanToolParameter` for workflow conditional
step semantics. Everything else lives in `basic.py`.

---

## 3. Inheritance leaks and MRO hazards

### `IntegerToolParameter(TextToolParameter)`, `FloatToolParameter(TextToolParameter)` (`:465, 538`)
In-source confession at `:429`: `# why does Integer and Float subclass this :_(`.
Both numeric classes carry `datalist`, `area`, `optionality_inferred`, and
`wrapper_default` attributes they have no semantic use for.
`IntegerToolParameter.__init__` (`:484`) immediately re-validates the parent's
`self.value` as int, contradicting the parent's text contract. The
`optionality_inferred` flag at `:433` only fires when `self.type == "text"`,
exposing a runtime type discriminator inside an inheritance hierarchy that is
supposed to obviate it. `FloatToolParameter.from_json` (`:578`) is a
copy-paste of the integer version, including an error message that still says
"integer" (`:588`) when reporting failures on a float input.

### `BaseURLToolParameter(HiddenToolParameter)` (`:902`)
URL building is conceptually unrelated to hiding; the inheritance exists
purely for `self.hidden = True` and to skip label rendering. Reuse-via-
inheritance for two booleans.

### The Select hierarchy
`GenomeBuildParameter`, `SelectTagParameter`, `ColumnListParameter`, and
`DrillDownSelectToolParameter` all inherit from `SelectToolParameter` and then
*skip the immediate parent* in `to_dict` (`:1276, 1854` — same comment
duplicated: *"skip SelectToolParameter (the immediate parent) bc we need to
get options in a different way here"*).

`DrillDownSelectToolParameter.get_options` returns
`list[DrillDownOptionsDict]` (`:1700`), while the parent's annotation is
`Sequence[Union[ParameterOption, DrillDownOptionsDict]]` (`:1009`) — the
supertype was widened to admit the subtype, enshrining the Liskov violation in
the parent. The class calls `ToolParameter.__init__(self, tool, input_source)`
directly (`:1672`), bypassing its declared parent.

`ColumnListParameter` does file I/O inside `get_options` (`:1560`:
`open(dataset.get_file_name())` to read header rows). An option-builder
performing disk I/O is a clear smell; it ties the form-rendering path to
dataset filesystem state.

### `HiddenDataToolParameter(HiddenToolParameter, DataToolParameter)` (`:2937`)
Declares MRO Hidden-first, but `__init__` calls
`DataToolParameter.__init__(self, tool, elem)` directly (`:2944`) to defeat
the declared order. Currently safe because `HiddenToolParameter` defines no
`to_json`/`from_json` overrides — one future override would silently break
every caller that depends on the data semantics. Docstring at `:2938`:
*"As with all hidden parameters, this is a HACK."* `:2950–2954` rejects
`not self.optional` with a comment noting the only known user is the cufflinks
tool. An entire class lives in this file to support one historical tool.

---

## 4. Method-level conflation

### `value_from_basic` (`:284–301`)
Five different jobs in one method body: dispatch on `is_runtime_value`,
`MutableMapping["__class__"] == "UnvalidatedValue"`, `"NoReplacement"`,
delegate to `to_python`, optionally swallow exceptions. The `ignore_errors`
toggle inverts the contract.

### `SelectToolParameter._select_from_json` (`:1047–1131`)
Legal-value lookup, name-based fallback when value lookup fails, runtime-
context detection, multiple-value list splitting on whitespace, a
`Version(profile) < "18.09"` workaround (`:1081–1085` — eight years of carried
legacy), and finally raises. Six concerns, one method.

### `DataToolParameter.to_dict` (`:2472–2505`)
Executes paginated SQL, builds match dictionaries, dedups by HID, and
serialises — alongside computing `extensions`, `edam`, `multiple`, `min`,
`max`, `tag` (all static info). The recent split into
`_fill_to_dict_static`/`_page_hda_matches`/`_pin_live_hda_inputs`/
`_carry_unresolved_inputs`/`_page_hdca_matches` re-packs but does not
re-distribute the responsibilities; they still all live on the parameter
class.

### `from_json` everywhere
Coercion + workflow-parameter pass-through + optional/empty handling + two
different error messages depending on `workflow_building_mode`, in a method
ostensibly named for parsing.

### `get_initial_value` is overloaded
`BaseDataToolParameter.get_initial_value` (`:1981–2027`) serves both as
*UI default* for `/api/tools/{tool_id}/build` (pre-populate the form when the
user hasn't picked anything) *and* as *validation/from_json fallback* when an
existing `from_json` returns `None` and the param isn't optional. A
post-hoc reader cannot tell whether a returned value came from the user's
persisted choice or from a "pick first matching HDA" heuristic.

---

## 5. Type uncertainty / union proliferation

- `:2119–2130`: explicit `ItemFromSrcAny = Union[DCE, HDA, HDCA, LDDA,
  CollectionAdapter]` and `ItemFromSrcCollection = Union[DCE, HDCA,
  CollectionAdapter]`. Every consumer needs `isinstance` chains.
- `DataToolParameter.from_json` returns `Optional[Union[HistoryItem,
  list[HistoryItem]]]` depending on `self.multiple`; the same return slot also
  carries `batch_wrapper` HDCAs (`:2374–2383`) for a different mode entirely.
- `SelectToolParameter.get_options`: `Sequence[Union[ParameterOption,
  DrillDownOptionsDict]]` (`:1009`) — union exists *only* to absorb the
  Drilldown LSP violation.
- `ColumnListParameter.get_legal_values` (`:1577`) returns `set[str]` of column
  numbers but extends with raw user values when the file is empty (`:1587`).
- `SelectToolParameter.get_initial_value` returns `Optional[Union[str,
  list[str]]]`, shape determined by combinations of `self.optional`,
  `self.multiple`, and the count of selected options.
- `FileToolParameter.to_json` (`:734`) returns `Optional[Union[str, None]]`
  from inputs that may be `str`, `MutableMapping`, `cgi_FieldStorage`, or
  raises.

The "flag combinations" pattern is everywhere: `multiple`, `optional`,
`is_dynamic`, `refresh_on_change`, `default_object`, `accept_default`,
`default_value`, `usecolnames`, `batch_wrapper`, `workflow_building_mode` —
each pair compounds the shape of inputs and outputs without type narrowing.

---

## 6. Data parameters as god classes

`DataToolParameter` (`:2180–2683`) and `DataCollectionToolParameter`
(`:2684–2933`) each combine, in one class:

1. **Source parsing** — `__init__` reads `load_contents`, `format`,
   `multiple`, `min`/`max`, `tag`, conversions, `default_object`,
   `allow_uri_if_protocol`, plus comma-typed `collection_type` for the
   collection variant.
2. **Input coercion** — `from_json`, with `DataToolParameter` weighing in at
   ~150 lines of `isinstance` dispatch.
3. **Validation** — inherited from `BaseDataToolParameter` plus inline
   validation cascades in `from_json`.
4. **Paginated DB option building** — `_page_hda_matches`,
   `_pin_live_hda_inputs`, `_carry_unresolved_inputs`, `_page_hdca_matches`,
   `_classify_hdca`, `_history_query`. Roughly half of each class.
5. **Workflow converter-safety analysis** — `converter_safe` (`:2427–2451`)
   walks other tool inputs.
6. **Dynamic-options filter attribute machinery** —
   `get_options_filter_attribute` (`:2453–2470`), preceded by a multi-line
   HACK comment.
7. **DB-row materialization of default objects** via `raw_to_galaxy`
   (`:3048–3133`). This commits sessions (`app.model.session.commit()` at
   `:3099`) inside what reads as a value coercion path. Layering wart.
8. **UI default seeding** — `get_initial_value` doubling as UI default and
   validation fallback (see §4).

`DataCollectionToolParameter._classify_hdca` (`:2899–2934`) returns 0, 1, or
2 entries encoding two semantic flavours (`"direct"`, `"multirun"`) in a
tagged tuple because the class can't represent two distinct match kinds.

`match_collections` / `match_multirun_collections` on
`DataCollectionToolParameter` (`:2721, 2737`) have **zero callers outside the
class itself**. The codebase's actual collection matching goes through
`trans.app.dataset_collection_manager.match_collections(...)`
(`workflow/modules.py:597`, `tools/parameters/meta.py:259,391`,
`managers/collections.py:730`). Two parallel collection-matching surfaces;
the unused one lives on the parameter.

### Request-context leaks into parameter description

`BaseDataToolParameter.__init__` (`:1880`) takes a `trans` parameter that no
other `ToolParameter.__init__` takes — leaking request context into XML
parsing. The cached `self._acceptable_extensions_cache` (`:1950`) is
per-instance state mutated during `to_dict`, which means tool parameter
objects are not safely reusable across requests with different
`datatypes_registry` instances. This is a latent footgun for any caller that
treats `tool.inputs` as immutable shared state.

---

## 7. The Pydantic schism

`lib/galaxy/tool_util_models/parameters.py` and `lib/galaxy/tools/runtime.py`
implement the same parameter taxonomy in Pydantic, validated end-to-end at the
API boundary. They do not import `basic.py` (confirmed via
`rg -n "parameters\.basic" lib/galaxy/tool_util_models/ lib/galaxy/tools/runtime.py`
— no hits). `basic.py` does not import the Pydantic side either. They are two
implementations of the same concept, kept aligned by code review and by the
YAML-driven state-representation test suite (see
[[Component - Tool State Specification]]).

Consequences:

- **No shared validator.** A YAML tool defines its parameters once; basic.py
  parses an XML adapter view (`tool_util/parser/yaml.py:340–342` with
  `value_state_representation = "test_case_json"`), Pydantic parses the same
  source independently.
- **No shared codec.** `from_json` / `to_json` in basic.py and the
  `RequestToolState` validators are independent code paths.
- **The 30+ `isinstance` consumers are the load-bearing constraint** on any
  refactor: replacing concrete class identities (`DataToolParameter`,
  `SelectToolParameter`, etc.) would require rewriting every dispatch site.
  Delegating basic.py *down* to the Pydantic models, or wrapping basic.py
  *with* Pydantic adapters, are the two realistic directions. Continuing the
  parallel-by-convention stance is the third option and continues to widen
  the gap as YAML-era features land.

---

## 8. The hidden `HistoryItemRef` ADT

Five module-level helpers do the polymorphic dispatch over
`{HDA, HDCA, DCE, LDDA, CollectionAdapter}` that the class hierarchy refuses
to model:

- `src_id_to_item(sa_session, security, value) → ItemFromSrcAny` (`:2133–2170`)
- `src_id_to_item_collection(...) → ItemFromSrcCollection` (`:2171–2179`)
- `history_item_dict_to_python(value, app, name)` (`:3159–3171`)
- `history_item_to_json(value, app, use_security)` (`:3174–3198`)
- `raw_to_galaxy(app, history, value)` (`:3048–3133`)

They are called from at least four parameter classes
(`SelectToolParameter.to_json/to_python`,
`BaseDataToolParameter.to_json/to_python`, `DataToolParameter.from_json`,
`DataCollectionToolParameter.from_json`) and from `Tool.to_json`. The src
whitelist is duplicated at `:3162` and `:2151` — two sources of truth for
the same set.

Type aliases at `:2119–2130` spell out the union explicitly:

```python
ItemFromSrcAny = Union[DCE, HDA, HDCA, LDDA, CollectionAdapter]
ItemFromSrcCollection = Union[DCE, HDCA, CollectionAdapter]
```

These helpers want to be `HistoryItemRef` — a value object with
`{src, id, extra_params, encode/decode}` and an opt-in resolve method. The
absence of the value object is what forces every data-param method into
`isinstance` chains. Promoting it would also expose two distinct concerns
currently tangled in `raw_to_galaxy`: (a) parsing/encoding refs (pure), and
(b) materializing DB rows from defaults (side-effecting). The helper at the
bottom of the file is doing both.

`history_item_to_json` is, in particular, the lone bottleneck for the wire
format of persisted data values:

```python
def history_item_to_json(value, app, use_security):
    if isinstance(value, CollectionAdapter):
        return value.to_adapter_model().model_dump()
    if isinstance(value, MutableMapping) and "src" in value and "id" in value:
        return value
    elif isinstance(value, DatasetCollectionElement):          src = "dce"
    elif isinstance(value, HistoryDatasetCollectionAssociation): src = "hdca"
    elif isinstance(value, LibraryDatasetDatasetAssociation):    src = "ldda"
    elif isinstance(value, HistoryDatasetAssociation):           src = "hda"
    object_id = cached_id(value)
    return {"id": app.security.encode_id(object_id) if use_security else object_id,
            "src": src}
```

Whatever it doesn't emit, the persisted layer can't see. That is the structural
weakness behind [[Problem - YAML Tool Post-Hoc State Divergence]] and the
HID-trace fragility documented in [[Workflow Extraction Issues]] (#14423,
#21789, #21788, #9161 etc.), but the failure mode is more general: any new
collection-typed feature that lands on the Pydantic side and is not also
reflected in `history_item_to_json` is silently invisible to every post-hoc
consumer.

---

## 9. Identifier encoding bugs hiding in the codec

- `DataToolParameter.from_json` 16-char heuristic (`:2294–2298`) — if a value
  string is exactly 16 chars long, assume encoded id. A 16-digit integer ≥1e15
  fails this test. The code logs `"Encoded ID where unencoded ID expected"`
  and decodes anyway.
- `BaseDataToolParameter.to_python` `"dce:N"` / `"hdca:N"` parsers
  (`:2065–2068`) and the symmetric site in
  `DataCollectionToolParameter.from_json` (`:2787–2792`) call `int(value[N:])`
  *without* consulting `app.security`. Any pathway that produced an encoded id
  in this legacy format would fail to load.
- `DataToolParameter.from_json` plain-int fallback (`:2321`) calls
  `int(value)` directly — encoded id without digits would raise `ValueError`.
- `BaseDataToolParameter.to_python` (`:2063`) is itself branchy:
  `if not decoded_id.isdigit(): decoded_id = app.security.decode_id(decoded_id)`.

`use_security` toggles encoding on write but reads infer from shape. There is
no schema and no validation.

---

## 10. Downstream symptoms (one paragraph each)

These are *consequences*, not new problems — the underlying causes are §1–§9.

**Post-hoc state divergence (YAML tools).** PRs 20935 / 21828 / 21842
introduced a Pydantic-validated `Job.tool_state` for YAML tools, but
`Tool.get_param_values(job)` (`tools/__init__.py:2668–2674`) — used by rerun,
job display, workflow extraction, and history export — still routes through
`Job.raw_param_dict()` → `params_from_strings` → per-class `to_python` in
`basic.py`. Two parallel representations exist, only one is validated, nothing
reconciles them. Full treatment in
[[Problem - YAML Tool Post-Hoc State Divergence]].

**Workflow extraction crashes and miswires.** `extract.py:435–492`
(`__cleanup_param_values`) assumes recovered values are ORM objects with
`.hid`, but `to_python`'s six-shape acceptance and the legacy string formats
can leak dicts/envelopes through. This produces `AttributeError: 'dict'
object has no attribute 'hid'` (#14423). Separately, the `{src,id}` wire
shape drops parent-HDCA / element identifier / column metadata, which
contributes to the broader class of extraction failures catalogued in
[[Workflow Extraction Issues]]. These are *symptoms* — the extraction
subsystem also has independent fragilities (HID-based reconnection, copied-
dataset provenance walks) that would exist even with a better codec.

**Workflow editor coupling.** `workflow/modules.py` directly constructs
parameter classes with `tool=None` and a synthetic source at `:1005, 1021,
1159, 1173, 1225, 1289, 1356, 1366, 1388, 1419, 1451, 1459, 1474, 1483, 1493,
1502`. This tightly couples the editor to the basic.py class identities; any
refactor must preserve them or rewrite the editor.

**Job display.** `managers/jobs.py:2040` calls `input.value_to_display_text`
on each param — the *only* polymorphic point of use here. Everything else in
the display path duck-types on `input.type`, `input.test_param`, `input.label`.
A display-side fidelity gap exists for any structured value the codec can't
round-trip.

---

## 11. Vestigial / legacy / dead code inventory

In-source confessions and TODOs:

- `:429` `# why does Integer and Float subclass this :_(`
- `:1081–1085` `Version(profile) < "18.09"` workaround (8 years of carried legacy)
- `:1189, 1831` `# FIXME: Currently only translating values back to labels if they are not dynamic` (duplicate)
- `:1276, 1854` `# skip SelectToolParameter (the immediate parent) bc we need to get options in a different way here` (duplicate)
- `:1298–1302` `# Hack for unit tests, since we have no tool` — production branches on test context
- `:1322, 1440` `# Legacy style default value specification...` / `# Newer style...` parallel paths
- `:1862–1870` `_carried_state_label` emits UI text (`"deleted"`, `"hidden"`,
  `"not in current history"`) that downstream code prefixes onto names at
  `:2622, 2628`. UI strings in the model layer.
- `:1909` `# can be None if self.tool.app is a ValidationContext`
- `:1930` `# TODO: Enhance dynamic options for DataToolParameters...`
- `:1936` `# TODO: Abstract away XML handling here.`
- `:2047–2067` Four-way legacy string-format dispatch in `to_python`
- `:2181, 2189` named-developer TODOs (`# TODO, Nate: ...`)
- `:2291–2295` Encoded-vs-decoded id confusion with `log.warning` in the
  production data path
- `:2308–2314` `__collection_reduce__|` parser; same prefix at `:2057`
- `:2454` Multi-line `# HACK to get around current hardcoded limitation...
  this behavior needs to be entirely reworked (in a backwards compatible
  manner)`
- `:2699` `self.multiple = False  # Accessed on DataToolParameter a lot, may want in future`
- `:2703` `_parse_options(input_source)  # TODO: Review and test.`
- `:2937` `As with all hidden parameters, this is a HACK.`
- `:2950–2954` `hidden_data` requires `optional="true"` (cufflinks-only class)
- `:3069` `# TODO: Convert md5 -> MD5 during tool parsing.`
- `:3185–3186` `# hasattr 'id' fires a query on persistent objects after a
  flush so better to do the isinstance check. Not sure we need the hasattr
  check anymore - it'd be nice to drop it.`

### Other smells

- **Live SQLAlchemy mappings in a doctest.** `ColumnListParameter` (`:1417–1422`)
  constructs SQLA-mapped fixtures inline in its doctest — heavy fixture work
  entangled with the unit test.
- **File I/O in an option-builder.** `ColumnListParameter.get_options` opens
  the dataset file at `:1560` to read header rows.
- **Polymorphic `to_text` has zero external callers.** Consumers use
  `value_to_display_text` instead. The polymorphic-looking surface is dead at
  the base class.
- **`match_collections` and `match_multirun_collections`** on
  `DataCollectionToolParameter` (`:2721, 2737`) — zero external callers.
- **`_carried_state_label` emits UI prose from the model layer** (`:1862–1870`).

---

## 12. What would let `basic.py` shrink

In order of leverage, *all of which are orthogonal to any specific consumer
problem*:

1. **Promote the `HistoryItemRef` ADT.** Extract `src_id_to_item` /
   `history_item_dict_to_python` / `history_item_to_json` into a typed
   value-object module. Make every data-param method consume `HistoryItemRef`
   instead of dispatching on raw dicts. Keep `raw_to_galaxy` separate — it's
   a *materializer* (DB-side-effecting), not a codec.

2. **Define a `parse_persisted` boundary.** Funnel `to_python`'s six legacy
   input shapes through a single normalizer that returns either a
   `list[HistoryItemRef]` or raises a typed error. This collapses §9, makes
   the data-param post-hoc readers safe to type-narrow, and is a prerequisite
   for the structured-state work in
   [[Problem - YAML Tool Post-Hoc State Divergence]].

3. **Split parameter description from value codec.** The forward and
   backward roles (§1) have incompatible contracts. The forward side stays in
   `basic.py` (or moves into a Pydantic-paired description module). The
   backward side becomes a small set of codecs over `HistoryItemRef` and
   primitive types, callable without a `Tool` instance.

4. **Split the data-param god classes.** A `DataParameterOptionsProvider`
   (or similar) takes a parameter spec, a history, and a matcher, and
   produces the form option dict. `DataToolParameter` shrinks to "what the
   parameter is." `_classify_hdca`'s `"direct"`/`"multirun"` flavours become
   explicit match types. The recent `tool_form_options` extraction is a
   first step.

5. **Decommission legacy string formats.** `__collection_reduce__|`,
   `dce:`, `hdca:`, comma-separated ids: deprecate, audit production DBs
   for remaining rows, migrate.

6. **Fix the inheritance smells with the lowest behavioural risk.** Move
   `IntegerToolParameter` and `FloatToolParameter` out from under
   `TextToolParameter`. Detach `BaseURLToolParameter` from
   `HiddenToolParameter`. Declare `HiddenDataToolParameter` MRO as
   `(DataToolParameter, HiddenToolParameter)` to match what `__init__`
   already does. Move `ColumnListParameter`'s file I/O out of `get_options`.

7. **Pick a Pydantic delegation direction.** Either basic.py delegates to
   `tool_util_models/parameters.py`, or the Pydantic models extend/wrap
   basic.py, or the parallel-by-convention stance is formally accepted with
   a cross-validation test that runs on every CI build. Today there is no
   such validation.

---

## Methodology note

This dossier was produced by four parallel subagents on 2026-05-21, each
covering a distinct angle: internal structural / code smells, callsite / API
surface map, state-representation divergence, and data/collection parameters'
interaction with workflow extraction. Two of the four prompts leaned into
extraction-specific concerns; revision 2 of this note rebalanced toward
file-internal problems and demoted extraction to one of several downstream
symptoms (§10). Findings were synthesized into this note; the four source
reports are not preserved as separate artifacts but the citations carry the
receipts.

---

## Unresolved questions

- How much production data still encodes data values as
  `"__collection_reduce__|..."`, `"dce:N"`, or comma-int-strings? A read-only
  scan of `JobParameter.value` patterns would tell us whether the legacy
  decode branches can be deleted.
- Does any in-tree caller depend on `extra_params` keys being passed through
  `history_item_to_json` on the input-dict short-circuit (`:3178–3179`)? Or
  is the input-dict path effectively dead for fresh API submissions?
- Is there a path to making `Tool.to_json(job=…)` (the rerun pre-fill) use
  `ToolRequest.request` when present, independent of any basic.py refactor?
- For `HiddenDataToolParameter`: any callers depending on the declared
  Hidden-first MRO ordering, or is the `DataToolParameter.__init__` direct
  call sufficient evidence that nobody does?
- Is the per-instance `_acceptable_extensions_cache` (`:1950`) actually
  observed to cause issues with multi-tenant `datatypes_registry` swaps, or
  is it latent only?
- Does the `match_collections` / `match_multirun_collections` zero-caller
  surface predate the `dataset_collection_manager` alternative, and can it
  simply be deleted?
