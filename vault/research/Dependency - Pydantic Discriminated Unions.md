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

# Pydantic 2.x Discriminated Unions Research

## Overview

Discriminated unions in Pydantic 2.x allow efficient validation of union types by routing to the correct model based on a discriminator field, rather than trying each variant sequentially.

## Key Components

### 1. `Discriminator(callable)`

Takes a function that receives input data and returns a tag string:

```python
from typing import Annotated, Union, Any
from pydantic import Discriminator, Tag

def get_type_tag(v: Any) -> str:
    if isinstance(v, dict):
        return v.get('type', 'unknown')
    return getattr(v, 'type', 'unknown')

MyUnion = Annotated[
    Union[
        Annotated[TypeA, Tag('a')],
        Annotated[TypeB, Tag('b')],
    ],
    Discriminator(get_type_tag)
]
```

### 2. `Tag('name')`

Labels each union member. The discriminator function returns this string to route validation:

```python
Annotated[MyModel, Tag('my_tag')]
```

### 3. Callable Discriminator Requirements

The callable must handle both:
- `dict` input (during validation)
- Model instance (during serialization)

```python
def discriminator(v: Any) -> str:
    if isinstance(v, dict):
        return v.get('discriminator_field', '')
    return getattr(v, 'discriminator_field', '')
```

## Patterns

### Pattern 1: Simple Literal Discriminator

When the discriminator field has a fixed set of values, use `Literal` types:

```python
from typing import Literal

class Dog(BaseModel):
    pet_type: Literal['dog']
    bark_volume: int

class Cat(BaseModel):
    pet_type: Literal['cat']
    meow_pitch: float

Pet = Annotated[
    Union[Dog, Cat],
    Discriminator('pet_type')  # String field name works for Literal
]
```

### Pattern 2: Callable Discriminator for Complex Routing

When routing logic is more complex than exact string matching:

```python
def pet_discriminator(v: Any) -> str:
    if isinstance(v, dict):
        pet_type = v.get('pet_type', '')
    else:
        pet_type = getattr(v, 'pet_type', '')

    # Complex routing logic
    if pet_type.startswith('dog'):
        return 'canine'
    elif pet_type.startswith('cat'):
        return 'feline'
    return 'unknown'

Pet = Annotated[
    Union[
        Annotated[CanineModel, Tag('canine')],
        Annotated[FelineModel, Tag('feline')],
        Annotated[UnknownPetModel, Tag('unknown')],
    ],
    Discriminator(pet_discriminator)
]
```

### Pattern 3: Literal Types + Validators for Hybrid Matching

Combine `Literal` for simple cases and validators for complex patterns:

```python
class SimpleList(BaseModel):
    collection_type: Literal["list"]
    elements: List[Item]

class NestedList(BaseModel):
    collection_type: str  # Accepts any string

    @field_validator('collection_type')
    @classmethod
    def must_contain_colon(cls, v: str) -> str:
        if ':' not in v:
            raise ValueError(f'Must contain ":", got "{v}"')
        return v

    elements: List[NestedItem]
```

### Pattern 4: Fallback with Left-to-Right Union Mode

Handle unknown types with a fallback model:

```python
# Inner discriminated union for known types
KnownTypes = Annotated[
    Union[
        Annotated[TypeA, Tag('a')],
        Annotated[TypeB, Tag('b')],
    ],
    Discriminator(known_type_discriminator)
]

# Outer union with left-to-right fallback
WithFallback = Annotated[
    Union[KnownTypes, GenericFallback],
    Field(union_mode="left_to_right")
]
```

### Pattern 5: Nested Discriminated Unions

For recursive structures, use forward references and `model_rebuild()`:

```python
class Container(BaseModel):
    items: List["ItemUnion"]

class ItemA(BaseModel):
    type: Literal["a"]
    value: str

class ItemB(BaseModel):
    type: Literal["b"]
    nested: "Container"  # Forward reference

ItemUnion = Annotated[
    Union[
        Annotated[ItemA, Tag('a')],
        Annotated[ItemB, Tag('b')],
    ],
    Discriminator('type')
]

# Rebuild after all definitions
Container.model_rebuild()
ItemB.model_rebuild()
```

## Performance

Discriminated unions are faster than regular unions because:
1. Pydantic extracts the discriminator value first
2. Routes directly to the matching model
3. No need to try each variant sequentially

The discriminator callable is implemented efficiently and runs in Rust when possible.

## Common Pitfalls

### 1. Forgetting to handle both dict and model instance

```python
# Wrong - only handles dict
def bad_discriminator(v: dict) -> str:
    return v['type']

# Correct - handles both
def good_discriminator(v: Any) -> str:
    if isinstance(v, dict):
        return v.get('type', '')
    return getattr(v, 'type', '')
```

### 2. Missing `model_rebuild()` for forward references

```python
class A(BaseModel):
    items: List["B"]

class B(BaseModel):
    parent: Optional["A"]

# Must call after all definitions
A.model_rebuild()
B.model_rebuild()
```

### 3. Tag mismatch

The string returned by discriminator must exactly match a `Tag()`:

```python
# Discriminator returns 'type_a'
# But Tag is 'a' - won't match!
Annotated[TypeA, Tag('a')]  # Wrong

Annotated[TypeA, Tag('type_a')]  # Correct
```

## Use Case: Collection Type Discrimination

For Galaxy collection types where `collection_type` can be:
- Simple: `"list"`, `"paired"`, `"record"`
- Nested: `"list:paired"`, `"sample_sheet:record"`

```python
def collection_discriminator(v: Any) -> str:
    if isinstance(v, dict):
        ct = v.get('collection_type', '')
    else:
        ct = getattr(v, 'collection_type', '')

    # Simple types - exact match
    if ct in ('list', 'paired', 'record', 'paired_or_unpaired', 'sample_sheet'):
        return ct

    # Nested types - route by outer structure
    if ':' in ct:
        first_segment = ct.split(':')[0]
        if first_segment in ('list', 'sample_sheet'):
            return 'nested_list'
        else:
            return 'nested_record'

    return 'list'  # fallback

CollectionUnion = Annotated[
    Union[
        Annotated[ListRuntime, Tag('list')],
        Annotated[PairedRuntime, Tag('paired')],
        Annotated[RecordRuntime, Tag('record')],
        Annotated[NestedListRuntime, Tag('nested_list')],
        Annotated[NestedRecordRuntime, Tag('nested_record')],
    ],
    Discriminator(collection_discriminator)
]
```

## Sources

- [Pydantic 2.x Unions Documentation](https://docs.pydantic.dev/latest/concepts/unions/)
- [Pydantic Validators Documentation](https://docs.pydantic.dev/latest/concepts/validators/)
- [Pydantic v2 Discriminated Unions + Fallbacks](https://www.lowlevelmanager.com/2025/05/pydantic-v2-discriminated-unions.html)
- [Pydantic Discussion: Tagged Unions with Inheritance](https://github.com/pydantic/pydantic/discussions/8789)
