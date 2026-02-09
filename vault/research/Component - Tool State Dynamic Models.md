---
type: research
subtype: component
tags:
  - research/component
  - galaxy/tools/yaml
  - galaxy/tools
status: draft
created: 2026-02-08
revised: 2026-02-08
revision: 1
ai_generated: true
component: tool_state_dynamic_models
galaxy_areas:
  - tools
---

# Galaxy Tool State: Dynamic Pydantic Models

How Galaxy uses Pydantic v2's dynamic model features to validate tool parameter state
across 12+ state representations at runtime.

## Architecture Overview

Galaxy tools have parameters (text, integer, data, conditional, repeat, etc.). Each parameter
type needs validation rules that differ by context -- an API request, a workflow step, a job
runtime payload, a test case, etc. Rather than writing 12 static Pydantic models per parameter
type, Galaxy:

1. Defines **parameter model classes** (e.g. `TextParameterModel`, `DataParameterModel`) that
   describe the parameter's schema (optional, default, validators, etc.)
2. Each parameter model has a `pydantic_template()` method that returns a `DynamicModelInformation`
   tuple for a given `StateRepresentationT`
3. A factory function (`create_field_model`) collects these tuples and calls `create_model()` to
   build a single Pydantic model whose fields correspond to the tool's parameters
4. The resulting model is used for validation via `model(**state_dict)`

The 12 state representations are defined as:

```python
# parameters.py:82-95
StateRepresentationT = Literal[
    "relaxed_request", "request", "request_internal",
    "request_internal_dereferenced", "landing_request",
    "landing_request_internal", "job_runtime", "job_internal",
    "test_case_xml", "test_case_json", "workflow_step", "workflow_step_linked",
]
```

## Key Files

| File | Role |
|------|------|
| `lib/galaxy/tool_util_models/parameters.py` | Parameter model classes, `create_model` calls, discriminated unions, type helpers |
| `lib/galaxy/tool_util_models/_types.py` | `union_type()`, `optional()`, `list_type()`, `expand_annotation()` helpers |
| `lib/galaxy/tool_util_models/_base.py` | `ToolSourceBaseModel` with `ConfigDict` |
| `lib/galaxy/tool_util/parameters/factory.py` | Builds `ToolParameterBundleModel` from XML/CWL tool sources |
| `lib/galaxy/tool_util/parameters/json.py` | JSON Schema generation via `CustomGenerateJsonSchema` |
| `lib/galaxy/tool_util/parameters/state.py` | `ToolState` subclasses that wrap `create_*_model` factories |
| `lib/galaxy/tool_util/parameters/model_validation.py` | `validate_against_model()`, validation factory functions |
| `lib/galaxy/tool_util/parameters/convert.py` | State conversion (decode/encode/runtimeify) using dynamic models |
| `test/unit/tool_util/test_parameter_specification.py` | Data-driven tests exercising all state representations |

---

## Pattern 1: `DynamicModelInformation` -- The Building Block

Every parameter's `pydantic_template()` returns a `DynamicModelInformation` NamedTuple:

```python
# parameters.py:105-108
class DynamicModelInformation(NamedTuple):
    name: str                    # field name in the generated model
    definition: tuple            # (Type, FieldInfo_or_default) -- passed to create_model as **kwd
    validators: ValidatorDictT   # dict of {name: classmethod} validators
```

The `definition` tuple follows Pydantic's `create_model` field syntax: `(type_annotation, default_or_FieldInfo)`.

Example from `dynamic_model_information_from_py_type()`:

```python
# parameters.py:165-181
def dynamic_model_information_from_py_type(param_model, py_type, requires_value=None, validators=None):
    name = safe_field_name(param_model.name)
    initialize = ... if requires_value else None   # Ellipsis = required, None = optional
    # ...
    return DynamicModelInformation(
        name,
        (py_type, Field(initialize, alias=param_model.name if param_model.name != name else None)),
        validators,
    )
```

---

## Pattern 2: `create_model_strict` and `create_field_model`

### `create_model_strict` -- The Core Wrapper

```python
# parameters.py:2091-2095
def create_model_strict(*args, **kwd) -> Type[BaseModel]:
    model_config = ConfigDict(extra="forbid", protected_namespaces=())
    return create_model(*args, __config__=model_config, **kwd)
```

- `extra="forbid"` rejects unknown fields (strict validation)
- `protected_namespaces=()` allows tool parameters named `model_*` without warnings

### `create_field_model` -- The Assembly Function

```python
# parameters.py:2120-2142
def create_field_model(
    tool_parameter_models, name, state_representation,
    extra_kwd=None, extra_validators=None,
) -> Type[BaseModel]:
    kwd: Dict[str, tuple] = {}
    if extra_kwd:
        kwd.update(extra_kwd)
    model_validators = (extra_validators or {}).copy()

    for input_model in tool_parameter_models:
        input_model = to_simple_model(input_model)
        pydantic_request_template = input_model.pydantic_template(state_representation)
        input_name = pydantic_request_template.name
        kwd[input_name] = pydantic_request_template.definition
        for validator_name, validator_callable in input_validators.items():
            model_validators[f"{input_name}_{validator_name}"] = validator_callable

    pydantic_model = create_model_strict(name, __validators__=model_validators, **kwd)
    return pydantic_model
```

This iterates all parameters, collects their `(type, default)` tuples and validators,
then calls `create_model` once. The `__validators__` keyword passes dynamic `field_validator`
callables into the generated model class.

### Factory Functions

```python
# parameters.py:2098-2117
def create_model_factory(state_representation):
    def create_method(tool, name=None):
        return create_field_model(tool.parameters, name or DEFAULT_MODEL_NAME, state_representation)
    return create_method

create_request_model = create_model_factory("request")
create_job_runtime_model = create_model_factory("job_runtime")
create_test_case_model = create_model_factory("test_case_xml")
# ... 12 total factories
```

---

## Pattern 3: Dynamic `Union` Construction via `_types.py`

The `_types.py` module provides runtime type construction helpers:

```python
# _types.py:37-38
def union_type(args: List[Type]) -> Type:
    return Union[tuple(args)]   # e.g. Union[StrictInt, StrictFloat]

# _types.py:41-42
def list_type(arg: Type) -> Type:
    return List[arg]

# _types.py:25-27
def optional(type: Type) -> Type:
    return Optional[type]       # equivalent to Union[type, None]
```

These are used extensively to build types dynamically based on parameter attributes:

```python
# parameters.py:350-352 (FloatParameterModel.py_type)
def py_type(self) -> Type:
    return optional_if_needed(union_type([StrictInt, StrictFloat]), self.optional)
```

---

## Pattern 4: String-Based Discriminated Unions (Field discriminator)

Simple discriminated unions use a `Literal` field as the discriminator string:

```python
# parameters.py:513-516
_DataRequest = Annotated[
    Union[DataRequestHda, DataRequestLdda, DataRequestLd, DataRequestUri],
    Field(discriminator="src")
]
```

Each member has a `src: Literal["hda"]`, `src: Literal["ldda"]`, etc. Pydantic selects the
correct branch by matching the `src` value.

Other examples:

```python
# parameters.py:968-973 -- discriminated by adapter_type
AdaptedDataCollectionRequest = Annotated[
    Union[
        AdaptedDataCollectionPromoteDatasetToCollectionRequest,
        AdaptedDataCollectionPromoteDatasetsToCollectionRequest,
    ],
    Field(discriminator="adapter_type"),
]

# parameters.py:478-483 -- recursive discriminated union on class_
elements: List[
    Annotated[
        Union["CollectionElementCollectionRequestUri", CollectionElementDataRequestUri],
        Field(discriminator="class_"),
    ]
]
```

---

## Pattern 5: Callable `Discriminator` + `Tag` Pattern

When union members don't share a uniform discriminator field, Galaxy uses callable discriminators:

### `multi_data_discriminator`

```python
# parameters.py:536-550
def multi_data_discriminator(v: Any) -> str:
    if isinstance(v, dict):
        src = v.get("src", None)
        clazz = v.get("class", None)
        if clazz == "Collection":
            return "data_request_collection_uri"
        elif src == "hda":
            return "data_request_hda"
        # ...
    return ""
```

The `tag()` helper wraps types with `Annotated[field, Tag(tag_str)]`:

```python
# parameters.py:553-554
def tag(field: Type, tag: str) -> Type:
    return Annotated[field, Tag(tag)]

# parameters.py:557-572
MultiDataInstanceDiscriminator = Discriminator(multi_data_discriminator)
MultiDataInstance: Type = cast(
    Type,
    Annotated[
        union_type([
            tag(DataRequestHda, "data_request_hda"),
            tag(DataRequestLdda, "data_request_ldda"),
            tag(DataRequestHdca, "data_request_hdca"),
            tag(DataRequestUri, "data_request_uri"),
            tag(DataRequestCollectionUri, "data_request_collection_uri"),
        ]),
        Field(discriminator=MultiDataInstanceDiscriminator),
    ],
)
```

The callable receives raw dict input, inspects `src` and `class` keys, returns a tag string
that maps to the `Tag(...)` annotation on the matching union member.

### `collection_runtime_discriminator`

```python
# parameters.py:724-768
def collection_runtime_discriminator(v: Any) -> str:
    if isinstance(v, dict):
        ct = v.get('collection_type', '')
    else:
        ct = getattr(v, 'collection_type', '')
    if ct == 'list': return 'list'
    elif ct == 'paired': return 'paired'
    # ... exact matches for known types ...
    elif ':' in ct:
        first_segment = ct.split(':')[0]
        if first_segment in ('list', 'sample_sheet'):
            return 'nested_list'
        else:
            return 'nested_record'
    else:
        return 'list'

CollectionRuntimeDiscriminated: Type = Annotated[
    Union[
        Annotated[DataCollectionListRuntime, Tag('list')],
        Annotated[DataCollectionSampleSheetRuntime, Tag('sample_sheet')],
        Annotated[DataCollectionPairedRuntime, Tag('paired')],
        Annotated[DataCollectionRecordRuntime, Tag('record')],
        Annotated[DataCollectionPairedOrUnpairedRuntime, Tag('paired_or_unpaired')],
        Annotated[DataCollectionNestedListRuntime, Tag('nested_list')],
        Annotated[DataCollectionNestedRecordRuntime, Tag('nested_record')],
    ],
    Discriminator(collection_runtime_discriminator)
]
```

### Conditional Parameter: Dynamic Discriminator per Instance

The most complex usage is in `ConditionalParameterModel.pydantic_template()` (parameters.py:1685-1778).
It creates a **per-conditional discriminator function** at runtime:

```python
# parameters.py:1734-1748
def model_x_discriminator(v: Any) -> Optional[str]:
    if not isinstance(v, dict):
        return None
    if test_param_name not in v:
        return "__absent__"
    else:
        test_param_val = v[test_param_name]
        if test_param_val is True:
            return "true"
        elif test_param_val is False:
            return "false"
        else:
            return str(test_param_val)
```

Each `when` branch becomes a tagged union member:

```python
# parameters.py:1705-1719
for when in self.whens:
    tag = str(discriminator) if not is_boolean else str(discriminator).lower()
    extra_kwd = {test_param_name: (Literal[when.discriminator], initialize_test)}
    when_types.append(
        cast(
            Type[BaseModel],
            Annotated[
                create_field_model(parameters, f"When_{test_param_name}_{discriminator}", ...),
                Tag(tag),
            ],
        )
    )
```

Then wrapped in a `RootModel` with the discriminator:

```python
# parameters.py:1755-1756
class ConditionalType(RootModel):
    root: cond_type = Field(..., discriminator=Discriminator(model_x_discriminator))
```

---

## Pattern 6: Dynamic `Literal` Values

Select parameters build `Literal` types from their option values at runtime:

```python
# parameters.py:1328-1331 (SelectParameterModel.py_type_if_required)
if self.options is not None:
    if len(self.options) > 0:
        literal_options = [cast_as_type(Literal[o.value]) for o in self.options]
        py_type = union_type(literal_options)   # Union[Literal["opt1"], Literal["opt2"], ...]
```

This means a select with options `["a", "b", "c"]` produces `Union[Literal["a"], Literal["b"], Literal["c"]]`.

---

## Pattern 7: `model_rebuild()` for Forward References

Forward references arise in recursive/self-referencing models. Galaxy calls `model_rebuild()` in
two contexts:

### Data Request Models (Module-level)

```python
# parameters.py:521-527
DataRequestHda.model_rebuild()
DataRequestLd.model_rebuild()
DataRequestLdda.model_rebuild()
DataRequestUri.model_rebuild()
DataRequestHdca.model_rebuild()
DataRequestCollectionUri.model_rebuild()
```

`DataRequestCollectionUri` references itself via `CollectionElementCollectionRequestUri` which has
`elements: List[Union["CollectionElementCollectionRequestUri", ...]]`.

### Recursive Parameter Types

```python
# parameters.py:2063-2066
ConditionalWhen.model_rebuild()        # references ToolParameterT (which includes ConditionalParameterModel)
ConditionalParameterModel.model_rebuild()
RepeatParameterModel.model_rebuild()   # references ToolParameterT
CwlUnionParameterModel.model_rebuild() # references CwlParameterT
```

### Nested Collection Runtime Models

```python
# parameters.py:720-721
DataCollectionNestedListRuntime.model_rebuild()
DataCollectionNestedRecordRuntime.model_rebuild()
```

These reference each other and other runtime types in their `elements` fields.

---

## Pattern 8: `RootModel` for Wrapper Types

Galaxy uses `RootModel` to create models with a single validated root value, used for:

### Parameter Type Discrimination

```python
# parameters.py:2055-2060
class ToolParameterModel(RootModel):
    root: ToolParameterT = Field(..., discriminator="parameter_type")

class GalaxyToolParameterModel(RootModel):
    root: GalaxyParameterT = Field(..., discriminator="type")
```

### Repeat Container

```python
# parameters.py:1812-1813
class RepeatType(RootModel):
    root: List[instance_class] = Field(initialize_repeat, min_length=min_length, max_length=max_length)
```

### Conditional Container

```python
# parameters.py:1755-1756
class ConditionalType(RootModel):
    root: cond_type = Field(..., discriminator=Discriminator(model_x_discriminator))
```

---

## Pattern 9: `ConfigDict` Usage

### `StrictModel` Base Class

```python
# parameters.py:111-112
class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")
```

Used as base for all data request models, ensuring no extra fields.

### `ToolSourceBaseModel`

```python
# _base.py:9-10
class ToolSourceBaseModel(BaseModel):
    model_config = ConfigDict(field_title_generator=lambda field_name, field_info: field_name.lower())
```

### `BaseDataRequest` with Multiple Config Options

```python
# parameters.py:432
model_config = ConfigDict(extra="forbid", populate_by_name=True)
```

### Dynamic Model Config via `create_model_strict`

```python
# parameters.py:2092-2093
model_config = ConfigDict(extra="forbid", protected_namespaces=())
return create_model(*args, __config__=model_config, **kwd)
```

---

## Pattern 10: `TypeAdapter` for Standalone Type Validation

```python
# parameters.py:528
DataOrCollectionRequestAdapter: TypeAdapter[DataOrCollectionRequest] = TypeAdapter(DataOrCollectionRequest)

# parameters.py:974
AdaptedDataCollectionRequestTypeAdapter = TypeAdapter(AdaptedDataCollectionRequest)

# parameters.py:1012
AdaptedDataCollectionRequestInternalTypeAdapter = TypeAdapter(AdaptedDataCollectionRequestInternal)
```

These validate complex union types without needing a wrapping model class.

---

## Pattern 11: Dynamic `py_type_*` Properties

Parameter models expose multiple `py_type_*` properties that return different types depending on
the state representation context:

```python
# parameters.py:833-876 (DataParameterModel)
@property
def py_type(self) -> Type:              # API request: DataRequest or MultiDataRequest
    ...
@property
def py_type_internal_json(self) -> Type: # Job runtime: DataInternalJson
    ...
@property
def py_type_internal(self) -> Type:      # Internal request: DataRequestInternal
    ...
@property
def py_type_internal_dereferenced(self) -> Type: # Dereferenced: DataRequestInternalDereferenced
    ...
@property
def py_type_test_case(self) -> Type:     # Test case: JsonTestDatasetDefDict
    ...
```

`DataCollectionParameterModel.py_type_internal_json` (parameters.py:1063-1101) is the most complex,
building discriminated union subsets at runtime based on the `collection_type` attribute:

```python
# parameters.py:1069-1092
if "," in self.collection_type:
    types = [t.strip() for t in self.collection_type.split(",")]
    tagged_types = []
    for t in types:
        model, tag_str = self._runtime_model_for_collection_type(t)
        if model and tag_str not in tags_seen:
            tagged_types.append(Annotated[model, Tag(tag_str)])
    if len(tagged_types) > 1:
        subset_union = Annotated[Union[tuple(tagged_types)], Discriminator(collection_runtime_discriminator)]
```

---

## Pattern 12: `expand_annotation` for Composing Validators

```python
# _types.py:69-75
def expand_annotation(field: Type, new_annotations: List[Any]) -> Type:
    is_annotation = get_origin(field) is Annotated
    if is_annotation:
        args = get_args(field)
        return Annotated[(args[0], *args[1:], *new_annotations)]
    else:
        return Annotated[(field, *new_annotations)]
```

Used by `decorate_type_with_validators_if_needed()` to attach `AfterValidator` to types:

```python
# parameters.py:245-251
def decorate_type_with_validators_if_needed(py_type, static_validator_models):
    pydantic_validator = pydantic_validator_for(static_validator_models)
    if pydantic_validator:
        return expand_annotation(py_type, [pydantic_validator])
    else:
        return py_type
```

---

## Pattern 13: `allow_connected_value` / `allow_batching` -- Type Wrapping

### Connected Values (Workflow Step)

```python
# parameters.py:119-120
def allow_connected_value(type: Type):
    return union_type([type, ConnectedValue])
```

In workflow contexts, any parameter can be a `ConnectedValue` (linked to another step's output)
instead of its normal type.

### Batching (API Requests)

```python
# parameters.py:123-139
def allow_batching(job_template, batch_type=None):
    job_py_type = job_template.definition[0]
    class BatchRequest(StrictModel):
        meta_class: Literal["Batch"] = Field(..., alias="__class__")
        values: List[batch_type]
        linked: Optional[bool] = None
    request_type = union_type([job_py_type, BatchRequest])
    return DynamicModelInformation(job_template.name, (request_type, default_value), {})
```

This dynamically creates a `BatchRequest` class with the appropriate `values` list type,
then unions it with the normal type.

---

## Pattern 14: JSON Schema Generation

```python
# json.py:14-19
class CustomGenerateJsonSchema(GenerateJsonSchema):
    def generate(self, schema, mode=DEFAULT_JSON_SCHEMA_MODE):
        json_schema = super().generate(schema, mode=mode)
        json_schema["$schema"] = self.schema_dialect
        return json_schema

def to_json_schema(model, mode=DEFAULT_JSON_SCHEMA_MODE):
    return model.model_json_schema(schema_generator=CustomGenerateJsonSchema, mode=mode)
```

And OpenAPI-compatible schema from `convert.py`:

```python
# convert.py:81-96
def cwl_runtime_model(input_models):
    model = create_job_runtime_model(input_models)
    schemas = model.model_json_schema(mode="serialization", ref_template=OPENAPI_REF_TEMPLATE)
```

---

## Pattern 15: `__get_pydantic_core_schema__` (Related but Outside parameters.py)

Galaxy uses this in two places outside tool_util_models:

### `GenericModel` in schema/generics.py

```python
# schema/generics.py:30-33
class GenericModel(BaseModel):
    @classmethod
    def __get_pydantic_core_schema__(cls, *args, **kwargs):
        result = super().__get_pydantic_core_schema__(*args, **kwargs)
        ref_to_name[result["ref"]] = cls.__name__
        return result
```

Intercepts schema generation to capture ref-to-name mappings for OpenAPI schema customization.

### `SanitizedString` in schema/schema.py

```python
# schema/schema.py:4179-4184
class SanitizedString(str):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        return core_schema.no_info_after_validator_function(
            cls.validate, core_schema.str_schema(),
            serialization=core_schema.to_string_ser_schema(),
        )
```

Defines how `SanitizedString` validates and serializes at the pydantic-core level.

---

## Validation Flow Summary

```
Tool XML/YAML
    |
    v
factory.py: input_models_for_tool_source() -> ToolParameterBundleModel
    |
    v
parameters.py: create_request_model(bundle) -> Type[BaseModel]
    internally: create_field_model() -> create_model_strict() -> pydantic.create_model()
    |
    v
model_validation.py: validate_against_model(model_class, state_dict)
    internally: model_class(**state_dict)  -- raises ValidationError on bad input
```

Each state representation follows this flow with its own factory:
- `create_request_model` for API requests
- `create_job_runtime_model` for runtime job execution
- `create_test_case_model` for test case validation
- etc.

---

## Data-Driven Testing

`test/unit/tool_util/test_parameter_specification.py` loads YAML specification files that define
valid/invalid examples for each state representation per parameter type. The test runner:

1. Loads the parameter bundle from a YAML tool definition
2. For each state representation (request_valid, request_invalid, job_runtime_valid, etc.):
   - Builds the dynamic model via the appropriate factory
   - Validates each example dict against the model
   - Asserts valid examples pass and invalid examples raise `RequestParameterInvalidException`
