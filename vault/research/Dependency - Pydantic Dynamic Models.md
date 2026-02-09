---
type: research
subtype: dependency
tags:
  - research/dependency
status: draft
created: 2026-02-08
revised: 2026-02-08
revision: 1
ai_generated: true
---

# Pydantic v2 Dynamic Models Reference

Reference document covering Pydantic v2 dynamic model features used in Galaxy's tool state system
and related patterns.

## 1. `create_model()` API

Dynamically creates a `BaseModel` subclass at runtime.

```python
from pydantic import BaseModel, Field, create_model

# Signature
create_model(
    __model_name: str,
    *,
    __config__: ConfigDict | None = None,
    __doc__: str | None = None,
    __base__: type[BaseModel] | tuple[type[BaseModel], ...] | None = None,
    __module__: str = __name__,
    __validators__: dict[str, classmethod] | None = None,
    __cls_kwargs__: dict[str, Any] | None = None,
    __qualname__: str | None = None,
    **field_definitions,    # field_name=(type, default) or field_name=type
) -> type[BaseModel]
```

### Field Definition Syntax

Fields are passed as keyword arguments. Three forms:

```python
# Form 1: Bare type (required field, no default)
M = create_model('M', name=str)

# Form 2: Tuple of (type, default_value)
M = create_model('M', name=(str, "default"))

# Form 3: Tuple of (type, FieldInfo)
M = create_model('M', name=(str, Field(description="Name field")))

# Form 4: Annotated type with FieldInfo default
M = create_model('M', name=(Annotated[str, Field(gt=0)], ...))
```

The `...` (Ellipsis) as default means the field is required:
```python
M = create_model('M',
    required_field=(int, ...),     # required
    optional_field=(int, None),    # optional, defaults to None
    defaulted_field=(int, 42),     # optional, defaults to 42
)
```

### Base Class Inheritance

```python
class MyBase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    common_field: str = "shared"

DerivedModel = create_model(
    'DerivedModel',
    __base__=MyBase,
    extra_field=(int, ...),
)
# DerivedModel inherits MyBase's config, validators, and fields
```

Multiple bases:
```python
DerivedModel = create_model('D', __base__=(Base1, Base2), ...)
```

### Config with `__config__`

```python
from pydantic import ConfigDict, create_model

model_config = ConfigDict(
    extra="forbid",             # reject unknown fields
    protected_namespaces=(),    # allow model_* field names
    populate_by_name=True,      # allow field name or alias
)
M = create_model('M', __config__=model_config, name=(str, ...))
```

If `__base__` is also provided, the `__config__` merges with/overrides the base config.

### Validators with `__validators__`

```python
from pydantic import create_model, field_validator

def check_positive(cls, v):
    assert v > 0, "must be positive"
    return v

M = create_model(
    'M',
    __validators__={
        "check_value": field_validator("value")(check_positive),
    },
    value=(int, ...),
)
```

Validator keys must be unique across the model. When assembling from multiple parameters,
namespace them: `f"{field_name}_{validator_name}"`.

---

## 2. Discriminated Unions

### String Discriminator (Simple)

All union members share a field with `Literal` values:

```python
from typing import Literal, Union
from pydantic import BaseModel, Field

class Cat(BaseModel):
    pet_type: Literal['cat']
    meows: int

class Dog(BaseModel):
    pet_type: Literal['dog']
    barks: float

class Model(BaseModel):
    pet: Union[Cat, Dog] = Field(discriminator='pet_type')
```

Pydantic reads `pet_type` from the input dict and routes validation to the matching model.
Fast O(1) dispatch. Clear error messages.

### Callable Discriminator with `Tag`

When union members have different field structures (no shared discriminator field):

```python
from typing import Annotated, Any, Union
from pydantic import BaseModel, Discriminator, Tag

class Apple(BaseModel):
    fruit: str

class Pumpkin(BaseModel):
    filling: str

def pie_discriminator(v: Any) -> str:
    if isinstance(v, dict):
        if 'fruit' in v:
            return 'apple'
        if 'filling' in v:
            return 'pumpkin'
    # Handle model instances too (used during serialization)
    if hasattr(v, 'fruit'):
        return 'apple'
    return 'pumpkin'

Pie = Annotated[
    Union[
        Annotated[Apple, Tag('apple')],
        Annotated[Pumpkin, Tag('pumpkin')],
    ],
    Discriminator(pie_discriminator),
]
```

Key points:
- The callable receives raw `dict` during validation and model instances during serialization
- Always handle both cases (`isinstance(v, dict)` and `getattr`)
- Return value must match one of the `Tag(...)` strings
- Returning a non-matching string or `None` causes a `ValidationError`

### Custom Error Messages

```python
Discriminator(
    my_discriminator_func,
    custom_error_type='invalid_union_member',
    custom_error_message='Input does not match any expected type',
    custom_error_context={'discriminator': 'type_field'},
)
```

### Nested Discriminators

Stack discriminators for hierarchical type selection:

```python
Cat = Annotated[
    Union[Annotated[BlackCat, Tag('black')], Annotated[WhiteCat, Tag('white')]],
    Discriminator(color_discriminator),
]

Pet = Annotated[
    Union[Annotated[Cat, Tag('cat')], Annotated[Dog, Tag('dog')]],
    Discriminator(species_discriminator),
]
```

### Dynamic Discriminated Union Construction

Build unions at runtime (Galaxy's primary pattern):

```python
from pydantic import Discriminator, Tag, create_model
from typing import Annotated, Union

def build_discriminated_union(branches: dict[str, type]) -> type:
    """branches maps tag_string -> model_class"""
    tagged = [Annotated[model, Tag(tag)] for tag, model in branches.items()]

    def discriminate(v):
        if isinstance(v, dict):
            return v.get('type', '')
        return getattr(v, 'type', '')

    return Annotated[Union[tuple(tagged)], Discriminator(discriminate)]
```

---

## 3. `model_rebuild()` for Forward References

### When It's Needed

Pydantic resolves type annotations when the model class is created. If a model references
a type that isn't defined yet (forward reference), schema generation is deferred. Call
`model_rebuild()` after all referenced types are defined.

```python
from __future__ import annotations  # makes all annotations strings (forward refs)
from pydantic import BaseModel

class Node(BaseModel):
    value: int
    children: list[Node]  # self-reference

Node.model_rebuild()  # resolve the forward reference to Node
```

### API

```python
@classmethod
def model_rebuild(
    cls,
    *,
    force: bool = False,          # rebuild even if already complete
    raise_errors: bool = True,    # raise on resolution failure
    _parent_namespace_depth: int = 2,
    _types_namespace: MappingNamespace | None = None,  # custom namespace for resolution
) -> bool | None
```

Returns:
- `None` if schema was already complete and `force=False`
- `True` if rebuild succeeded
- `False` if rebuild failed and `raise_errors=False`

### Mutual References

```python
class Parent(BaseModel):
    children: list['Child']

class Child(BaseModel):
    parent: 'Parent'

# Must rebuild after BOTH are defined
Parent.model_rebuild()
Child.model_rebuild()
```

### Cascading Rebuilds

Rebuilding a model may cascade to rebuild its dependencies. If those dependencies
have unresolved references, errors can occur. Define all types before calling `model_rebuild()`.

### Module-Level Pattern

Standard pattern -- define all models, then rebuild at module level:

```python
class A(BaseModel):
    b: Optional['B'] = None

class B(BaseModel):
    a: Optional['A'] = None

# After all definitions
A.model_rebuild()
B.model_rebuild()
```

---

## 4. JSON Schema Generation

### `model_json_schema()`

```python
schema = MyModel.model_json_schema(
    mode='validation',                    # or 'serialization'
    schema_generator=GenerateJsonSchema,  # custom generator class
    ref_template='#/$defs/{model}',       # reference template
)
```

### Custom Schema Generator

```python
from pydantic.json_schema import GenerateJsonSchema

class CustomSchema(GenerateJsonSchema):
    def generate(self, schema, mode='validation'):
        json_schema = super().generate(schema, mode=mode)
        json_schema['$schema'] = self.schema_dialect  # add $schema field
        return json_schema

schema = Model.model_json_schema(schema_generator=CustomSchema)
```

### Dynamic Models and JSON Schema

Dynamic models created via `create_model()` support `model_json_schema()` just like static models.
Discriminated unions produce `oneOf` with `discriminator` metadata in the schema.

### `TypeAdapter` for Non-Model Types

```python
from pydantic import TypeAdapter

adapter = TypeAdapter(Union[Cat, Dog])
schema = adapter.json_schema(mode='validation')
```

---

## 5. `__get_pydantic_core_schema__` Custom Types

### On the Type Itself

```python
from pydantic_core import CoreSchema, core_schema
from pydantic import GetCoreSchemaHandler

class PositiveInt(int):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: type, handler: GetCoreSchemaHandler
    ) -> CoreSchema:
        return core_schema.int_schema(gt=0)
```

### As Annotation Metadata

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Uppercase:
    def __get_pydantic_core_schema__(self, source_type, handler):
        schema = handler(source_type)
        return core_schema.no_info_after_validator_function(
            lambda v: v.upper(), schema
        )

# Usage: Annotated[str, Uppercase()]
```

### Handler Methods

- `handler(type)` -- call next in chain or Pydantic's default for `type`
- `handler.generate_schema(type)` -- generate schema for an unrelated type
- `handler.field_name` -- access current field name (v2.4+)

### Common `core_schema` Functions

```python
core_schema.str_schema()
core_schema.int_schema(gt=0)
core_schema.no_info_after_validator_function(fn, inner_schema)
core_schema.to_string_ser_schema()
core_schema.union_schema([schema1, schema2])
core_schema.tagged_union_schema(discriminator, choices)
```

---

## 6. `RootModel` for Single-Value Models

```python
from pydantic import RootModel, Field, Discriminator

class MyUnion(RootModel):
    root: Union[Cat, Dog] = Field(discriminator='type')
```

Useful for:
- Wrapping discriminated unions as standalone models
- Creating list/container models: `root: List[SomeType]`
- Using as field types in `create_model` (the root value is unwrapped on access)

---

## 7. `TypeAdapter` for Non-Model Validation

```python
from pydantic import TypeAdapter

# Validate complex union types without a model wrapper
adapter = TypeAdapter(Annotated[Union[A, B], Field(discriminator='src')])
result = adapter.validate_python({'src': 'a', 'value': 1})
```

Module-level `TypeAdapter` instances are created once and reused (no `lru_cache` needed).

---

## 8. Caching Patterns for Dynamic Models

### Problem

`create_model()` is relatively expensive -- it generates pydantic-core schemas, compiles
validators, and creates a new class. Calling it per-request is wasteful.

### `lru_cache` on Factory Functions

```python
from functools import lru_cache

@lru_cache(maxsize=256)
def get_model_for_tool(tool_id: str, state_repr: str) -> type[BaseModel]:
    bundle = load_tool_parameters(tool_id)
    return create_field_model(bundle.parameters, f"Model_{tool_id}", state_repr)
```

Requirements for caching:
- Arguments must be hashable (strings, tuples, frozensets -- not lists or dicts)
- The tool parameter definition must be immutable for the cache to be valid
- Consider `maxsize` based on number of unique tools x state representations

### Galaxy's Approach

Galaxy currently does NOT cache dynamic models. Models are created fresh on each validation
call. This is acceptable because:
- Tool definitions are read at startup and rarely change
- Validation calls are relatively infrequent (per-job, not per-request in hot paths)
- The model creation overhead is small compared to actual job execution

If caching were needed, the natural cache key would be
`(tool_id, tool_version, state_representation)`.

---

## 9. Common Pitfalls

### 1. Forgetting `model_rebuild()` for Forward References

Symptom: `PydanticUndefinedAnnotation` at validation time.
Fix: Call `model_rebuild()` after all referenced types are defined.

### 2. Callable Discriminator Not Handling Model Instances

Pydantic calls the discriminator function during serialization too, where `v` is a model instance
not a dict:

```python
# WRONG
def discriminate(v):
    return v.get('type')  # fails on model instances

# CORRECT
def discriminate(v):
    if isinstance(v, dict):
        return v.get('type', '')
    return getattr(v, 'type', '')
```

### 3. Non-Unique `__validators__` Keys

All validator keys must be unique within a model. When combining validators from multiple
parameters, namespace them:

```python
# WRONG
validators = {"check": field_validator("a")(fn), "check": field_validator("b")(fn)}

# CORRECT
validators = {"a_check": field_validator("a")(fn), "b_check": field_validator("b")(fn)}
```

### 4. `extra="forbid"` with Aliases

When using `extra="forbid"`, fields accessed by alias will reject the non-alias name and
vice versa unless `populate_by_name=True` is set:

```python
ConfigDict(extra="forbid", populate_by_name=True)
```

### 5. Dynamic `Literal` with Empty Options

`Union[()]` (empty tuple) is invalid. Handle the zero-options case:

```python
if len(options) > 0:
    py_type = union_type([Literal[o] for o in options])
else:
    py_type = type(None)  # no valid options -> only None accepted
```

### 6. `protected_namespaces` Warning

Pydantic warns if fields start with `model_`. Suppress with:

```python
ConfigDict(protected_namespaces=())
```

### 7. Mutating Types After Model Creation

`create_model()` captures types at call time. Mutating the type objects after creation
has no effect on already-created models.

---

## 10. Performance Notes

- `create_model()` cost is dominated by pydantic-core schema compilation
- Pydantic v2 internally caches some schema generation results
- Discriminated unions with string discriminators are faster than callable discriminators
  (direct dict lookup vs function call)
- `TypeAdapter` instances should be created once at module level, not per-call
- For dynamic models that are created frequently with the same structure, `lru_cache`
  on the factory function provides significant speedup
- `model_rebuild()` triggers a full schema recompilation; avoid calling it more than once
  per model unless `force=True` is needed

---

## References

- [Pydantic Dynamic Models](https://docs.pydantic.dev/latest/examples/dynamic_models/)
- [Pydantic Models](https://docs.pydantic.dev/latest/concepts/models/)
- [Pydantic Unions / Discriminated Unions](https://docs.pydantic.dev/latest/concepts/unions/)
- [Pydantic Custom Types](https://docs.pydantic.dev/latest/concepts/types/)
- [Pydantic Forward Annotations](https://docs.pydantic.dev/latest/concepts/forward_annotations/)
- [Pydantic JSON Schema](https://docs.pydantic.dev/latest/concepts/json_schema/)
- [Pydantic BaseModel API (create_model, model_rebuild)](https://docs.pydantic.dev/latest/api/base_model/)
- [pydantic_core.core_schema API](https://docs.pydantic.dev/latest/api/pydantic_core_schema/)
- [Pydantic Configuration](https://docs.pydantic.dev/latest/api/config/)
