# CWL SchemaDefRequirement Research

## 1. What SchemaDefRequirement Is (CWL Spec)

From the CWL v1.2 specification (`Process.yml`):

> This field consists of an array of type definitions which must be used when
> interpreting the `inputs` and `outputs` fields. When a `type` field
> contains a IRI, the implementation must check if the type is defined in
> `schemaDefs` and use that definition. If the type is not found in
> `schemaDefs`, it is an error. The entries in `schemaDefs` must be
> processed in the order listed such that later schema definitions may refer
> to earlier schema definitions.
>
> - **Type definitions are allowed for `enum` and `record` types only.**
> - Type definitions may be shared by defining them in a file and then `$include`-ing them in the `types` field.
> - A file can contain a list of type definitions

The `types` field is an array of `CommandInputSchema` (which is `InputRecordSchema | InputEnumSchema | InputArraySchema`).

**Key points:**
- SchemaDefRequirement lets CWL tools define named record/enum types
- These named types can be referenced by name in input/output type declarations
- Types can be imported from external YAML files via `$import`
- Types can reference each other (later types can refer to earlier ones)

## 2. How Schema-Salad Resolves These Types (The Namespacing Mechanism)

### 2.1 The Resolution Pipeline

When cwltool loads a CWL document, schema-salad performs several transformations:

1. **URL resolution**: Local type references like `#Stage` or `person` are resolved to full URIs like `file:///absolute/path/to/tool.cwl#Stage`

2. **avroize_type()** (`cwltool/process.py:429`): Converts `File` -> `org.w3id.cwl.cwl.File`, `Directory` -> `org.w3id.cwl.cwl.Directory`, and ensures anonymous record/enum types get UUID-based names.

3. **make_valid_avro()** (`schema_salad/schema.py:524`): Converts schema-salad URLs to Avro-safe dotted names via `avro_type_name()`.

### 2.2 The avro_type_name() Function

The critical function is `schema_salad/validate.py:70`:

```python
def avro_type_name(url: str) -> str:
    """Turn a URL into an Avro-safe name."""
    if url in primitives:
        return primitives[url]
    u = urlsplit(url)
    joined = filter(
        lambda x: x,
        list(reversed(u.netloc.split(".")))
        + u.path.split("/")
        + u.fragment.split("/"),
    )
    return ".".join(joined)
```

This converts:
- `file:///Users/jxc755/.../tmap-tool.cwl#Stage` -> `Users.jxc755.projects.worktrees.galaxy.branch.cwl_tool_state.test.functional.tools.cwl_tools.v1.2.tests.tmap-tool.cwl.Stage`
- `file:///Users/jxc755/.../nested_types.cwl#name` -> `Users.jxc755...nested_types.cwl.name`
- `file:///Users/jxc755/.../schemadef_types_with_import_readgroup.yml#readgroup_meta` -> `Users.jxc755...schemadef_types_with_import_readgroup.yml.readgroup_meta`

These dotted names are machine-path-dependent. Running the same tool on a different machine produces different namespaced strings.

### 2.3 How schemaDefs Are Built in cwltool

In `cwltool/process.py:600-615` (Process.__init__):

```python
self.schemaDefs = {}
sd, _ = self.get_requirement("SchemaDefRequirement")
if sd is not None:
    sdtypes = copy.deepcopy(sd["types"])
    avroize_type(sdtypes)
    av = make_valid_avro(
        sdtypes,
        {t["name"]: t for t in sdtypes},  # alltypes dict
        set(),                              # found set
        vocab=INPUT_OBJ_VOCAB,
    )
    for i in av:
        self.schemaDefs[i["name"]] = i
```

Key detail: `make_valid_avro` is called with `alltypes` containing the type definitions keyed by their pre-avro names. This allows cross-references between types to be resolved. However, the `found` set prevents infinite recursion -- once a named type has been fully expanded, subsequent references return just the name string.

### 2.4 How inputs_record_schema Is Built

In `cwltool/process.py:629-655`:

```python
for key in ("inputs", "outputs"):
    for i in self.tool[key]:
        c = copy.deepcopy(i)
        c["name"] = shortname(c["id"])
        c["type"] = avroize_type(c["type"], c["name"])
        # ... appended to inputs_record_schema["fields"]

self.inputs_record_schema = make_valid_avro(
    self.inputs_record_schema, {}, set()  # NOTE: empty alltypes!
)
```

**Critical observation**: The `make_valid_avro` call for `inputs_record_schema` passes `{}` as `alltypes`. This means string type references in inputs are NOT expanded to their definitions -- they're just converted to Avro-safe dotted names via `avro_type_name()`. The resolution from name to definition is expected to happen at a higher level (via schemaDefs lookup).

## 3. What the schema_salad_field Data Looks Like for Each Failing Tool

### 3.1 tmap-tool.cwl (v1.0, v1.1, v1.2)

**Original CWL** (the `stages` input):
```json
{
    "id": "stages",
    "type": {"type": "array", "items": "#Stage"}
}
```

**After schema-salad processing**, `inputs_record_schema` field for `stages`:
```python
{
    "name": "stages",
    "type": {
        "type": "array",
        "items": "Users.jxc755...tmap-tool.cwl.Stage"  # namespaced string!
    },
    "inputBinding": {"position": 1}
}
```

**schemaDefs** contains (among others):
```python
{
    "Users.jxc755...tmap-tool.cwl.Stage": {
        "type": "record",
        "name": "Users.jxc755...tmap-tool.cwl.Stage",
        "fields": [
            {"name": "stageId", "type": ["null", "int"], ...},
            {"name": "stageOption1", "type": ["null", "boolean"], ...},
            {
                "name": "algos",
                "type": {
                    "type": "array",
                    "items": [
                        "Users.jxc755...tmap-tool.cwl.Map1",  # also namespaced!
                        "Users.jxc755...tmap-tool.cwl.Map2",
                        "Users.jxc755...tmap-tool.cwl.Map3",
                        "Users.jxc755...tmap-tool.cwl.Map4"
                    ]
                },
                ...
            }
        ]
    }
}
```

**Why it fails**: Galaxy's `input_fields()` sees the type is a dict (`{"type": "array", ...}`), so it skips schemaDef resolution (line 289-291). The factory code then processes the array and calls `_simple_cwl_type_to_model("Users.jxc755...tmap-tool.cwl.Stage")` for the items string, which hits `NotImplementedError`.

### 3.2 nested_types.cwl (v1.2)

**Original CWL**:
```yaml
requirements:
  SchemaDefRequirement:
    types:
      - name: name
        type: record
        fields:
          - name: first
            type: string
          - name: last
            type: string
      - name: person
        type: record
        fields:
          - name: name
            type: name    # references the 'name' record type
          - name: age
            type: int
inputs:
  my_person: person
```

**After schema-salad processing**, `inputs_record_schema` field for `my_person`:
```python
{
    "name": "my_person",
    "type": "Users.jxc755...nested_types.cwl.person"  # namespaced string
}
```

Galaxy's `input_fields()` resolves this via schemaDefs to:
```python
{
    "name": "my_person",
    "type": {
        "type": "record",
        "name": "Users.jxc755...nested_types.cwl.person",
        "fields": [
            {
                "name": "name",
                "type": "Users.jxc755...nested_types.cwl.name"  # STILL a namespaced string!
            },
            {"name": "age", "type": "int"}
        ]
    }
}
```

**Why the `name` field type is a string**: When `make_valid_avro` processes the schemaDefs, it processes the `name` record type first (it's first in the list). It fully expands it and adds it to the `found` set. When it then processes the `person` record type and encounters the `name` field referencing the `name` type, it finds `name` already in `found` and returns just the string name. This is standard Avro behavior to prevent infinite recursion.

**Why it fails**: The factory processes the record and encounters field `name` with type string `"Users.jxc755...nested_types.cwl.name"`, calls `_simple_cwl_type_to_model()`, which doesn't recognize it.

### 3.3 schemadef_types_with_import-tool.cwl (v1.2)

**Original CWL**:
```yaml
requirements:
  - class: SchemaDefRequirement
    types:
      - $import: schemadef_types_with_import_readgroup.yml
inputs:
    - id: message
      type: "schemadef_types_with_import_readgroup.yml#readgroups_bam_file"
```

**Imported file** (`schemadef_types_with_import_readgroup.yml`):
```yaml
- name: readgroup_meta
  type: record
  fields:
    - {name: CN, type: string}
    - {name: DT, type: string}
    - {name: ID, type: string}
    - {name: LB, type: string}
    - {name: PI, type: string}
    - {name: PL, type: string}
    - {name: SM, type: string}

- name: readgroups_bam_file
  type: record
  fields:
    - name: bam
      type: File
    - name: readgroup_meta_list
      type:
        type: array
        items: readgroup_meta
```

**After schema-salad processing**, `inputs_record_schema` field for `message`:
```python
{
    "name": "message",
    "type": "Users.jxc755...schemadef_types_with_import_readgroup.yml.readgroups_bam_file"
}
```

Galaxy's `input_fields()` resolves this via schemaDefs to the `readgroups_bam_file` record. Inside that record, `readgroup_meta_list` has type `{"type": "array", "items": "Users.jxc755...readgroup_meta"}`.

**Why it fails**: The factory encounters the namespaced string `"...readgroup_meta"` as the array items type and fails in `_simple_cwl_type_to_model()`.

## 4. How cwltool Handles These Resolved Types

### 4.1 Builder.bind_input()

cwltool's `Builder` class (`cwltool/builder.py:315-316`) resolves schemaDefs at runtime during input binding:

```python
if schema["type"] in self.schemaDefs:
    schema = self.schemaDefs[cast(str, schema["type"])]
```

This resolves the namespaced string back to the full type definition during job execution. It does this on-demand as it walks the input data.

### 4.2 realize_input_schema()

cwltool's `main.py:263-320` provides `realize_input_schema()` specifically for template generation:

```python
def realize_input_schema(input_types, schema_defs):
    """Replace references to named typed with the actual types."""
    for index, entry in enumerate(input_types):
        if isinstance(entry, str):
            if "#" in entry:
                _, input_type_name = entry.split("#")
            else:
                input_type_name = entry
            if input_type_name in schema_defs:
                entry = input_types[index] = schema_defs[input_type_name]
        if isinstance(entry, MutableMapping):
            if isinstance(entry["type"], str) and "#" in entry["type"]:
                _, input_type_name = entry["type"].split("#")
                if input_type_name in schema_defs:
                    entry["type"] = realize_input_schema(
                        schema_defs[input_type_name], schema_defs
                    )
            if isinstance(entry["type"], MutableSequence):
                entry["type"] = realize_input_schema(entry["type"], schema_defs)
            if isinstance(entry["type"], Mapping):
                entry["type"] = realize_input_schema([entry["type"]], schema_defs)
            if entry["type"] == "array":
                items = entry["items"] if not isinstance(entry["items"], str) else [entry["items"]]
                entry["items"] = realize_input_schema(items, schema_defs)
            if entry["type"] == "record":
                entry["fields"] = realize_input_schema(entry["fields"], schema_defs)
    return input_types
```

This function recursively walks the type structure and replaces all namespaced string references with their full definitions from `schema_defs`. It handles:
- Top-level string type references
- Type references inside dict types (e.g., array items, record fields)
- Nested structures recursively

**Important**: This function uses `"#"` splitting to extract the local name from the full URL. But in the avro-ized forms that Galaxy sees, the separator is `.` not `#`. Galaxy's code would need an avro-ized name-aware version of this resolution.

## 5. How Galaxy's Parser Currently Handles (or Doesn't Handle) These

### 5.1 Galaxy's input_fields() Resolution

`lib/galaxy/tool_util/cwl/parser.py:278-297` (CommandLineToolProxy.input_fields):

```python
def input_fields(self) -> list:
    input_records_schema = self._eval_schema(self._tool.inputs_record_schema)
    rval = []
    for input in input_records_schema["fields"]:
        input_copy = copy.deepcopy(input)
        input_type = input.get("type")
        if isinstance(input_type, list) or isinstance(input_type, dict):
            rval.append(input_copy)
            continue  # <-- PROBLEM 1: skips dict/list types entirely
        if input_type in self._tool.schemaDefs:
            input_copy["type"] = self._tool.schemaDefs[input_type]
        rval.append(input_copy)
    return rval
```

**Three resolution gaps:**

1. **Dict types with nested references are skipped** (line 289-291): When `type` is a dict (e.g., `{"type": "array", "items": "...Stage"}`), the code skips schemaDef resolution entirely. The inner string references remain unresolved.

2. **No recursive resolution**: Even when a top-level string type is resolved (line 293-294), the resolved definition may contain inner references to other schemaDef types. These nested references are not resolved.

3. **List types with nested references are skipped** (line 289): Union types (`[null, "...SomeType"]`) are also skipped.

### 5.2 Galaxy's Factory Code

`lib/galaxy/tool_util/parameters/factory.py` has no awareness of schemaDefs. It receives the resolved (or partially-resolved) field dicts from `input_fields()` and processes them. When it encounters a namespaced string that isn't a known CWL primitive type, it throws `NotImplementedError`.

The factory code handles:
- Primitive types: `int`, `float`, `string`, `boolean`, `null`, `long`, `double`
- Well-known types: `org.w3id.cwl.cwl.File`, `org.w3id.cwl.cwl.Directory`, `org.w3id.cwl.salad.Any`
- Complex types: `{"type": "enum"}`, `{"type": "array"}`, `{"type": "record"}`
- Union types: `["null", "int"]`

It does NOT handle:
- Namespaced strings like `Users.jxc755...tmap-tool.cwl.Stage`
- Any type string that isn't in the hardcoded set

## 6. Concrete Failure Traces Per Tool

### 6.1 tmap-tool.cwl

```
Input 'stages':
  field["type"] = {"type": "array", "items": "Users.jxc755...tmap-tool.cwl.Stage"}

  input_fields() -> isinstance(type, dict) -> continue (no resolution)

  _from_input_source_cwl() -> isinstance(type, dict) -> _complex_cwl_type_to_model()
  _complex_cwl_type_to_model() -> inner_type == "array"
  items_type = "Users.jxc755...tmap-tool.cwl.Stage"  (a string)
  _simple_cwl_type_to_model("Users.jxc755...tmap-tool.cwl.Stage")
  -> NotImplementedError("unknown type Users.jxc755...tmap-tool.cwl.Stage")
```

### 6.2 nested_types.cwl

```
Input 'my_person':
  field["type"] = "Users.jxc755...nested_types.cwl.person"  (string)

  input_fields() -> in schemaDefs -> resolved to person record definition
  field["type"] = {
      "type": "record",
      "name": "Users.jxc755...nested_types.cwl.person",
      "fields": [
          {"name": "name", "type": "Users.jxc755...nested_types.cwl.name"},  # STILL string!
          {"name": "age", "type": "int"}
      ]
  }

  _from_input_source_cwl() -> isinstance(type, dict) -> _complex_cwl_type_to_model()
  _complex_cwl_type_to_model() -> inner_type == "record"
  Processing field "name": field_type = "Users.jxc755...nested_types.cwl.name" (string)
  _simple_cwl_type_to_model("Users.jxc755...nested_types.cwl.name")
  -> NotImplementedError("unknown type ...nested_types.cwl.name")
```

### 6.3 schemadef_types_with_import-tool.cwl

```
Input 'message':
  field["type"] = "Users.jxc755...readgroups_bam_file"  (string)

  input_fields() -> in schemaDefs -> resolved to readgroups_bam_file record
  field["type"] = {
      "type": "record",
      "fields": [
          {"name": "bam", "type": "org.w3id.cwl.cwl.File"},
          {
              "name": "readgroup_meta_list",
              "type": {
                  "type": "array",
                  "items": "Users.jxc755...readgroup_meta"  # namespaced string!
              }
          }
      ]
  }

  Processing field "readgroup_meta_list": type is a dict -> _complex_cwl_type_to_model()
  inner_type == "array", items = "Users.jxc755...readgroup_meta" (string)
  _simple_cwl_type_to_model("Users.jxc755...readgroup_meta")
  -> NotImplementedError("unknown type ...readgroup_meta")
```

## 7. Implications for Galaxy Parameter Models

### 7.1 The Core Problem

Galaxy needs to recursively resolve all namespaced string references to their full type definitions before passing fields to the parameter model factory. The current `input_fields()` only does one level of resolution and only for top-level string types.

### 7.2 Solution Approaches

**Approach A: Deep resolve in input_fields() (Galaxy's parser layer)**

Modify `CommandLineToolProxy.input_fields()` to recursively resolve schemaDef references throughout the entire type structure. This is analogous to cwltool's `realize_input_schema()` but working with avro-ized names.

```python
def _resolve_schema_defs(self, type_val):
    """Recursively resolve schemaDef references in a type structure."""
    if isinstance(type_val, str):
        if type_val in self._tool.schemaDefs:
            resolved = copy.deepcopy(self._tool.schemaDefs[type_val])
            # Recursively resolve within the resolved definition
            return self._resolve_schema_defs(resolved)
        return type_val
    elif isinstance(type_val, dict):
        result = copy.deepcopy(type_val)
        if "type" in result:
            result["type"] = self._resolve_schema_defs(result["type"])
        if "items" in result:
            result["items"] = self._resolve_schema_defs(result["items"])
        if "fields" in result:
            result["fields"] = [self._resolve_schema_defs(f) for f in result["fields"]]
        return result
    elif isinstance(type_val, list):
        return [self._resolve_schema_defs(t) for t in type_val]
    return type_val
```

**Caution**: Must handle circular references (a type referring to itself). The `found` set in `make_valid_avro` creates these back-references intentionally. For parameter models, we may want to detect cycles and stop recursion (or represent them specially).

**Approach B: Pass schemaDefs to the factory**

Pass `self._tool.schemaDefs` alongside the field data to the factory code, so `_simple_cwl_type_to_model` can look up namespaced strings itself.

Pros: Simpler change, less duplication
Cons: Leaks cwltool details into the factory layer

**Approach C: Resolve in the factory layer**

Add a lookup function to `_simple_cwl_type_to_model` that checks if a string is a schemaDef reference and resolves it to a `_complex_cwl_type_to_model` call.

### 7.3 Recommended Approach

Approach A is cleanest -- resolve everything in the parser layer (`input_fields()`) so the factory code never sees namespaced strings. This maintains the separation of concerns: the parser resolves CWL-specific type references, the factory maps resolved types to Galaxy parameter models.

The key additions to `input_fields()`:
1. For dict types: recurse into `items` (for arrays) and `fields` (for records)
2. For list types: recurse into each element
3. For string types: resolve and then recurse into the resolved definition
4. Track visited types to prevent infinite loops from circular references

### 7.4 What Parameter Models Would Be Generated

After resolution, each SchemaDefRequirement type becomes a nested `CwlRecordParameterModel` or `CwlEnumParameterModel`:

- **tmap-tool.cwl `stages`**: `CwlArrayParameterModel(item_type=CwlRecordParameterModel(fields=[stageId, stageOption1, algos]))` where `algos` is a `CwlArrayParameterModel(item_type=CwlUnionParameterModel([Map1Record, Map2Record, Map3Record, Map4Record]))`

- **nested_types.cwl `my_person`**: `CwlRecordParameterModel(fields=[CwlRecordParameterModel(name="name", fields=[first:string, last:string]), CwlIntegerParameterModel(name="age")])`

- **schemadef_types_with_import `message`**: `CwlRecordParameterModel(fields=[CwlFileParameterModel(name="bam"), CwlArrayParameterModel(name="readgroup_meta_list", item_type=CwlRecordParameterModel(fields=[CN, DT, ID, LB, PI, PL, SM]))])`

## 8. Edge Cases and Complications

### 8.1 Nested Type References

The `nested_types.cwl` case demonstrates this: `person.name` has type `name`, which is itself a SchemaDefRequirement record type. Resolution must be recursive.

### 8.2 Imported Schema Files ($import)

The `schemadef_types_with_import-tool.cwl` case uses `$import: schemadef_types_with_import_readgroup.yml`. Schema-salad resolves this import before cwltool sees it, so by the time Galaxy's parser gets the data, the imported types are already in the SchemaDefRequirement's `types` array and in `schemaDefs`. No special import handling is needed.

### 8.3 Union Types Containing SchemaDef References

The tmap-tool.cwl `algos` field has type `{"type": "array", "items": ["#Map1", "#Map2", "#Map3", "#Map4"]}`. After processing, `items` becomes a list of namespaced strings. Each string must be resolved via schemaDefs. The factory code would need to handle `items` being a list (currently it only handles string or dict).

The factory at line 428-436 handles `items_type` as string or dict, but not list:
```python
if isinstance(items_type, str):
    item_model = _simple_cwl_type_to_model(items_type, input_source)
elif isinstance(items_type, dict):
    item_model = _complex_cwl_type_to_model(items_type, input_source)
else:
    raise NotImplementedError(...)
```

After resolution, the items list would become a list of record dicts, which would need to be modeled as a union: `CwlUnionParameterModel([Map1Record, Map2Record, Map3Record, Map4Record])`.

### 8.4 Circular/Self-Referencing Types

CWL allows record types that reference themselves (e.g., a tree structure). Avro handles this by using name references after the first definition. If Galaxy encounters such a type, the recursive resolution must detect cycles (track visited type names) and either:
- Stop recursion and represent the back-reference as a special marker
- Limit recursion depth
- Raise an error for unsupported circular types

In practice, CWL conformance tests don't appear to include circular types, so this may be a theoretical concern.

### 8.5 Namespaced Strings Are Machine-Path-Dependent

The avro-type names like `Users.jxc755...tmap-tool.cwl.Stage` depend on the absolute filesystem path where the CWL file lives. This means:
- These strings are NOT portable -- they differ between machines
- They should NEVER be serialized or stored persistently
- Resolution must happen at parse time, not at deserialization time

This is already handled correctly because `schemaDefs` and `inputs_record_schema` are both derived from the same absolute path, so the keys match.

### 8.6 Enum Symbols Are Also Namespaced

In tmap-tool.cwl, the enum types (JustMap1, JustMap2, etc.) have symbols that may also be avro-ized. For example, `["map1"]` might become `["Users.jxc755...tmap-tool.cwl.JustMap1.map1"]`. The factory code that extracts `symbols` from enum dicts should check for this.

Looking at `make_valid_avro` line 572-573:
```python
if "symbols" in avro:
    avro["symbols"] = [avro_field_name(sym) for sym in avro["symbols"]]
```

`avro_field_name` extracts just the fragment part (last component after `/` in the URL fragment), so symbols would remain relatively clean (e.g., `map1` not the full path). But this depends on how schema-salad resolves the symbol names.

### 8.7 items as List in Array Types

As noted in 8.3, the factory's `_complex_cwl_type_to_model` for `array` types doesn't handle `items` being a list. After deep resolution, items that were a list of namespaced strings become a list of record/enum dicts. The factory needs a new code path:

```python
elif isinstance(items_type, list):
    # Union of item types
    params = []
    for t in items_type:
        if isinstance(t, str):
            params.append(_simple_cwl_type_to_model(t, input_source))
        elif isinstance(t, dict):
            params.append(_complex_cwl_type_to_model(t, input_source))
    item_model = CwlUnionParameterModel(name=input_source.parse_name(), parameters=params)
```

## Step 0 (TODO): Evaluate cwl-utils as Alternative to cwltool for Document Parsing

Before further investment in cwltool-based parsing, review whether `cwl-utils` could serve as a better foundation for CWL document parsing in Galaxy. cwl-utils provides typed Python dataclasses for CWL documents (v1.0, v1.1, v1.2) and may offer cleaner type resolution without the avro-ized naming indirection that cwltool/schema-salad introduces. Key questions:
- Does cwl-utils resolve SchemaDefRequirement types inline?
- Does it avoid the machine-path-dependent avro naming?
- Could it replace or supplement cwltool for the parsing layer while keeping cwltool for execution?
- What's the migration cost vs benefit?

## Summary of Changes — DONE

All 5 SchemaDefRequirement failures fixed. Test results: 446 pass / 18 fail (remaining are unsupported requirements + intentionally invalid CWL).

### Changes Made

1. **`lib/galaxy/tool_util/cwl/parser.py`** — Added `_resolve_schema_defs()` module-level function for recursive schemaDef resolution. Updated `input_fields()` to use it instead of the shallow one-level resolution. Handles:
   - String type references → lookup in schemaDefs, recurse into resolved definition
   - Dict types → recurse into `type`, `items`, and `fields` keys
   - List types (unions) → recurse into each element
   - Cycle detection via `_seen` set to prevent infinite recursion on self-referencing types

2. **`lib/galaxy/tool_util/parameters/factory.py`** — Added list handling for array `items` in `_complex_cwl_type_to_model()`. When items is a list (union of item types, e.g., tmap-tool's Map1/Map2/Map3/Map4), wraps them in `CwlUnionParameterModel`.

### Verified Against All Three Failing Tools
- **tmap-tool.cwl** (v1.0/v1.1/v1.2) — array of records with union item types ✓
- **nested_types.cwl** (v1.2) — nested record types referencing each other ✓
- **schemadef_types_with_import-tool.cwl** (v1.2) — imported schema files with cross-referencing types ✓
