---
type: research
subtype: component
component: DatasetCollectionWrapper
tags:
  - research/component
  - galaxy/tools/collections
  - galaxy/tools
status: draft
created: 2026-02-18
revised: 2026-02-18
revision: 1
ai_generated: true
---

# Collections in Tool XML Command Blocks (Cheetah)

How to work with collections in Cheetah `<command>` templates. All collection parameters are wrapped as `DatasetCollectionWrapper` objects.

---

## Accessing Paired Collections

Paired collections have two elements with fixed identifiers `forward` and `reverse`:

```cheetah
## Attribute-style access
cat '$input1.forward' '$input1.reverse' > '$output'

## Dictionary-style access (equivalent)
cat '${input1["forward"]}' '${input1["reverse"]}' > '$output'

## Index-based access
cat '${input1[0]}' '${input1[1]}' > '$output'
```

Each element resolves to its dataset file path (via `DatasetFilenameWrapper.__str__`).

---

## Iterating Over List Collections

### Simple iteration (element = dataset path)

```cheetah
#for $item in $input1
    cat '$item' >> '$output'
#end for
```

### Iteration with keys

```cheetah
#for $key in $input1.keys()
    cat '${input1[$key]}' >> '$output'
#end for
```

### Getting element identifiers

```cheetah
#for $item in $input1
    echo '${item.element_identifier}: $item' >> '$output'
#end for
```

---

## Nested Collections (list:paired, list:list, etc.)

### list:paired

```cheetah
#for $sample in $input1
    ## $sample is a DatasetCollectionWrapper (inner paired collection)
    cat '$sample.forward' '$sample.reverse' >> '$output'
#end for
```

### list:list

```cheetah
#for $outer in $input1
    #for $inner in $outer
        cat '$inner' >> '$output'
    #end for
#end for
```

### Using keys() for nested iteration

```cheetah
#for $list_key in $output_collection.keys()
    #for $pair_key in $output_collection[$list_key].keys()
        cp '${input1[$list_key][$pair_key]}' '${output_collection[$list_key][$pair_key]}'
    #end for
#end for
```

---

## Checking Collection Properties

### is_collection

Distinguish between dataset elements and nested collection elements:

```cheetah
#for $element in $input1
    #if $element.is_collection
        ## $element is a nested collection, iterate again
        #for $inner in $element
            cat '$inner' >> '$output'
        #end for
    #else
        ## $element is a dataset
        cat '$element' >> '$output'
    #end if
#end for
```

Useful when the input accepts multiple collection types (e.g. `collection_type="list,list:list"`).

### has_single_item / single_item

For `paired_or_unpaired` collections:

```cheetah
#if $input1.has_single_item
    cat '$input1.single_item' > '$output'
#else
    cat '$input1.forward' '$input1.reverse' > '$output'
#end if
```

### Boolean truth

Collections are falsy when not supplied or empty (useful with `optional="true"`):

```cheetah
#if $input1
    cat '$input1.forward' '$input1.reverse' > '$output'
#else
    echo "no collection provided" > '$output'
#end if
```

### is_input_supplied

More explicit check for optional collections — distinguishes "not provided" from "provided but empty":

```cheetah
#if $input1.is_input_supplied
    ## Collection was provided (may still be empty)
    #for $item in $input1
        cat '$item' >> '$output'
    #end for
#else
    ## Collection parameter was not provided at all
    echo "no collection" > '$output'
#end if
```

---

## Record Collections

Access record fields by name:

```cheetah
## Attribute-style
cat '$input1.parent' '$input1.child' > '$output'

## Dictionary-style
cat '${input1["parent"]}' '${input1["child"]}' > '$output'
```

---

## Output Collections in Commands

### Structured-like outputs

When output uses `structured_like="input1"`, iterate over the output collection's keys to write files:

```cheetah
#for $key in $list_output.keys()
    cp '${input1[$key]}' '${list_output[$key]}'
#end for
```

### Paired output references

When creating a paired output with explicit `<data>` elements:

```cheetah
head -1 '$input1' > '$paired_output.forward'
tail -1 '$input1' > '$paired_output.reverse'
```

### Nested output iteration

```cheetah
#for $list_key in $list_output.keys()
    #for $pair_key in $list_output[$list_key].keys()
        cp '${input1[$list_key][$pair_key]}' '${list_output[$list_key][$pair_key]}'
    #end for
#end for
```

---

## Utility Methods

### all_paths / paths_as_file

Write all dataset paths to a file (useful for tools that take a file-of-filenames):

```cheetah
## In-memory list of paths
#for $path in $input1.all_paths
    echo '$path'
#end for

## Write paths to temp file with newline separator (default)
cat '${input1.paths_as_file}' | xargs cat > '$output'

## Custom separator (e.g. comma)
cat '${input1.paths_as_file(sep=",")}' | xargs cat > '$output'
```

### get_datasets_for_group(tag)

Filter collection datasets by group tag:

```cheetah
#for $dataset in $input1.get_datasets_for_group($group)
    cat '$dataset' >> '$output'
#end for
```

Used with `<param type="group_tag" data_ref="input1"/>` parameters.

### element_identifiers_extensions_paths_and_metadata_files

Access comprehensive element metadata. Returns a list of 4-tuples:
- `identifiers` — list of strings (one per nesting level, e.g. `['sample1', 'forward']` for list:paired)
- `ext` — file extension string
- `path` — dataset file path
- `meta` — list of metadata file paths

```cheetah
#for $identifiers, $ext, $path, $meta in $input1.element_identifiers_extensions_paths_and_metadata_files
    echo "$identifiers $ext $path"
#end for
```

---

## Collection Inspection

### Nested collection type

Only valid when `$element.is_collection` is true:

```cheetah
#if $element.is_collection
    #if $element.collection.collection_type == "list"
        ## handle list
    #end if
#end if
```

### Element count

Check via iteration or `keys()`:

```cheetah
#set $count = len($input1.keys())
```

---

## Quick Reference

| Operation | Syntax |
|-----------|--------|
| Access paired forward | `$coll.forward` |
| Access paired reverse | `$coll.reverse` |
| Access by name | `$coll.element_name` or `$coll['element_name']` |
| Access by index | `$coll[0]` |
| Iterate elements | `#for $item in $coll` |
| Get element keys | `$coll.keys()` |
| Element identifier | `$item.element_identifier` |
| Check if collection | `$item.is_collection` |
| Check if single item | `$coll.has_single_item` |
| Get single item | `$coll.single_item` |
| Check if supplied (bool) | `#if $coll` |
| Check if supplied (explicit) | `$coll.is_input_supplied` |
| All paths | `$coll.all_paths` |
| Paths as file | `$coll.paths_as_file` or `$coll.paths_as_file(sep=",")` |
| Filter by tag | `$coll.get_datasets_for_group($tag)` |
| Nested type | `$element.collection.collection_type` (guard with `is_collection`) |
