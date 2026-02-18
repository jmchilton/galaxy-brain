---
type: research
subtype: component
tags:
  - research/component
  - galaxy/tools/testing
  - galaxy/tools/collections
status: draft
created: 2026-02-18
revised: 2026-02-18
revision: 1
ai_generated: true
---

# Collections in Tool XML Tests

How to specify collection inputs and validate collection outputs in `<test>` blocks.

---

## Test Inputs

### Basic Collection Input

Nest a `<collection>` inside the `<param>` referencing a `data_collection` parameter:

```xml
<param name="input1">
    <collection type="list">
        <element name="e1" value="simple_line.txt"/>
        <element name="e2" value="simple_line_alternative.txt"/>
    </collection>
</param>
```

Each `<element>` has a `name` (element identifier) and `value` (test data filename).

### Paired Collection Input

```xml
<param name="input1">
    <collection type="paired">
        <element name="forward" value="1.fasta" ftype="fasta"/>
        <element name="reverse" value="1.fasta" ftype="fasta"/>
    </collection>
</param>
```

Standard paired element names are `forward` and `reverse`.

### Nested Collections (e.g. list:paired)

Nest `<collection>` elements inside outer `<element>` tags:

```xml
<param name="input1">
    <collection type="list:paired">
        <element name="sample1">
            <collection type="paired">
                <element name="forward" value="1.fasta"/>
                <element name="reverse" value="1.fasta"/>
            </collection>
        </element>
        <element name="sample2">
            <collection type="paired">
                <element name="forward" value="1.fasta"/>
                <element name="reverse" value="1.fasta"/>
            </collection>
        </element>
    </collection>
</param>
```

### Record Collections

Use `<fields>` to define the record schema as JSON. Field names/types must match the tool's input definition:

```xml
<param name="f1">
    <collection type="record">
        <fields>[{"name": "parent", "type": "File"}, {"name": "child", "type": "File"}]</fields>
        <element name="parent" value="1.bed"/>
        <element name="child" value="2.bed"/>
    </collection>
</param>
```

### paired_or_unpaired Collections

Can be tested as paired, unpaired (single element), or explicit paired_or_unpaired:

```xml
<!-- As paired -->
<param name="f1">
    <collection type="paired">
        <element name="forward" value="1.fasta"/>
        <element name="reverse" value="1.fasta"/>
    </collection>
</param>

<!-- As unpaired / single element -->
<param name="f1">
    <collection type="paired_or_unpaired">
        <element name="forward" value="1.fasta"/>
    </collection>
</param>
```

### Optional Collection (no input)

If a collection param has `optional="true"`, simply omit it from the test to test the empty case:

```xml
<!-- With collection -->
<test><param name="f1"><collection type="paired">...</collection></param></test>
<!-- Without collection -->
<test><!-- f1 omitted, optional --></test>
```

### Collections Inside Conditionals

Two equivalent syntaxes:

**Pipe notation:**

```xml
<param name="cond|select" value="paired"/>
<param name="cond|input1">
    <collection type="paired">
        <element name="forward" value="1.fasta"/>
        <element name="reverse" value="1.fasta"/>
    </collection>
</param>
```

**Nested conditional (equivalent, more verbose):**

```xml
<conditional name="cond">
    <param name="select" value="paired"/>
    <param name="input1">
        <collection type="paired">
            <element name="forward" value="1.fasta"/>
            <element name="reverse" value="1.fasta"/>
        </collection>
    </param>
</conditional>
```

### Element Tags

Elements can be tagged via the `tags` attribute (comma-separated):

```xml
<element name="e1" value="file1.txt" tags="group:treatment"/>
```

### Element ftype

Specify format per element:

```xml
<element name="e1" value="file1.txt" ftype="tabular"/>
```

### Collection Name

Collections can have a `name` attribute accessible in commands via `$param.name`:

```xml
<param name="input1">
    <collection type="paired" name="my_sample">
        <element name="forward" value="1.fasta"/>
        <element name="reverse" value="1.fasta"/>
    </collection>
</param>
```

### Element Metadata

Set metadata on collection elements via `dbkey` shorthand or `<metadata>` children:

```xml
<element name="e1" value="file1.txt" dbkey="hg19"/>

<!-- Or with explicit metadata tag -->
<element name="e1" value="file1.txt">
    <metadata name="dbkey" value="hg19"/>
</element>
```

### Remote Elements (v23.1+)

Elements can reference remote URLs via `location`:

```xml
<element name="e1" location="https://example.com/data/file.txt"/>
```

---

## Test Outputs

### output_collection Basics

```xml
<output_collection name="output1" type="list">
    <element name="e1">
        <assert_contents>
            <has_text text="expected content"/>
        </assert_contents>
    </element>
    <element name="e2" file="expected_e2.txt"/>
</output_collection>
```

**Attributes on `<output_collection>`:**
- `name` (required): matches the `<collection>` output name
- `type`: expected collection type (`list`, `paired`, `list:paired`, etc.)
- `count`: exact number of elements expected
- `min` / `max` (v26.0+): min/max element count range

### Element Assertions

Each `<element>` inside `<output_collection>` supports the same assertion attributes as `<output>`:
- `file="expected.txt"` - compare against expected file
- `ftype="tabular"` - check format
- `<assert_contents>` child - inline assertions
- `checksum` / `md5` / etc.

### Nested Output Collections

For `list:paired`, `list:list`, etc., nest elements:

```xml
<output_collection name="output1" type="list:paired">
    <element name="sample1">
        <element name="forward">
            <assert_contents><has_text text="..."/></assert_contents>
        </element>
        <element name="reverse">
            <assert_contents><has_text text="..."/></assert_contents>
        </element>
    </element>
</output_collection>
```

### Element Ordering (profile >= 20.09)

For tools with profile 20.09+, Galaxy verifies that elements specified in `<output_collection>` appear in the actual output in the same order. You may omit elements from the test, but those specified must maintain their relative order. When profile < 20.09, element order is not validated.

### Element Metadata Validation

Verify metadata on output collection elements:

```xml
<output_collection name="output1" type="list">
    <element name="e1" file="expected.txt">
        <metadata name="dbkey" value="hg19"/>
    </element>
</output_collection>
```

### Discovered / Dynamic Collections

Test output for collections built via `<discover_datasets>`:

```xml
<!-- Tool output uses discover_datasets -->
<collection name="output1" type="list">
    <discover_datasets pattern="__name_and_ext__" directory="outputs"/>
</collection>

<!-- Test verifies discovered elements by name -->
<output_collection name="output1" type="list">
    <element name="fileA" file="expected_A.txt"/>
    <element name="fileB" file="expected_B.txt"/>
</output_collection>
```

For dynamic nested collections with regex identifier groups:

```xml
<!-- Tool output -->
<collection name="output1" type="list:paired">
    <discover_datasets pattern="(?P&lt;identifier_0&gt;[^_]+)_(?P&lt;identifier_1&gt;[^_]+)\.fq"/>
</collection>

<!-- Test -->
<output_collection name="output1" type="list:paired">
    <element name="samp1">
        <element name="forward"><assert_contents>...</assert_contents></element>
        <element name="reverse"><assert_contents>...</assert_contents></element>
    </element>
</output_collection>
```

### Using count Instead of Enumerating Elements

```xml
<output_collection name="output1" type="list" count="5"/>
```

### Expecting Tool Failure with Collections

```xml
<test expect_exit_code="1" expect_failure="true">
    <param name="input1">
        <collection type="list">...</collection>
    </param>
</test>
```

---

## Collection Types Reference

| Type | Description |
|------|-------------|
| `list` | Ordered list of datasets |
| `paired` | Exactly two elements: `forward` and `reverse` |
| `paired_or_unpaired` | Either paired or single element |
| `record` | Named fields defined by JSON schema |
| `list:paired` | List of paired collections |
| `list:list` | List of lists |
| `list:list:list` | 3-level nested list |

Multiple accepted types on input params use comma separation: `collection_type="list,paired,list:paired"`

---

## Quick Reference: Test XML Patterns

| Scenario | Pattern |
|----------|---------|
| List input | `<collection type="list"><element name="..." value="..."/>` |
| Paired input | `<collection type="paired"><element name="forward" ...><element name="reverse" ...>` |
| Nested input | Outer `<element>` wraps inner `<collection>` |
| Record input | `<fields>[JSON]</fields>` + `<element>` tags |
| Verify output element | `<output_collection><element name="..." file="..."/>` |
| Verify element content | `<element name="..."><assert_contents>...</assert_contents></element>` |
| Verify count | `<output_collection count="N"/>` |
| Verify nested output | Nested `<element>` tags matching nesting depth |
| Conditional collection | `<param name="cond\|input">` with nested `<collection>` |
| Optional empty | Omit param from test |
| Collection with name | `<collection type="list" name="...">` |
| Element metadata | `<element name="..." dbkey="hg19"/>` or `<metadata>` child |
| Output element metadata | `<element name="..."><metadata name="key" value="val"/></element>` |
| Remote element (v23.1+) | `<element name="e1" location="https://..."/>` |
| Count range (v26.0+) | `<output_collection min="2" max="5"/>` |
