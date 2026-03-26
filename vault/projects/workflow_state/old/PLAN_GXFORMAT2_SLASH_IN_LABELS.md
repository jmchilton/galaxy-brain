# Plan: Fix `/` in Step Labels Breaking Source Reference Parsing

GitHub issue: https://github.com/galaxyproject/gxformat2/issues/145

## Problem

`BaseConversionContext.step_output()` splits source references on `/` to separate `step_label` from `output_name`. When a step label contains `/` (e.g., `Host/Contaminant Reference Genome`), the split produces garbage. Since the label fragment isn't in `self.labels`, it falls through to `int()` and crashes.

3 of 112 IWC workflows hit this: `host-or-contamination-removal-on-short-reads.ga`, `fragment-based-docking-scoring.ga`, `iwc-clinicalmp-database-generation.ga`.

## The Format

Source references in format2 use `/` as the separator between step label and output name:

```yaml
in:
  input1: some_step/output_name    # step "some_step", output "output_name"
  input2: some_step                # step "some_step", output "output" (implicit)
outputs:
  result:
    outputSource: some_step/out    # same convention
```

When a label IS `Host/Contaminant Reference Genome` and the output IS `output` (implicit), the export side produces:

```yaml
reference_genome|index:
  source: Host/Contaminant Reference Genome   # no /output suffix — elided
```

The reimport sees `Host/Contaminant Reference Genome`, splits on first `/`, gets `("Host", "Contaminant Reference Genome")`, tries `step_id("Host")` → `int("Host")` → crash.

## Affected Code Paths

### 1. `BaseConversionContext.step_output()` — converter.py:586

```python
def step_output(self, value):
    value_parts = str(value).split("/")
    if len(value_parts) == 1:
        value_parts.append("output")
    id = self.step_id(value_parts[0])
    return id, value_parts[1]
```

Called from:
- Output source resolution (converter.py:225): `id, output_name = conversion_context.step_output(source)`
- Input connection population (converter.py:702): `step_id, output_name = context.step_output(source)`
- When condition source (converter.py:473): `step_id, output_name = context.step_output(step["when"]["source"])`

**Fix strategy**: `self.labels` contains all registered step labels at call time. Try matching known labels before falling back to split.

### 2. `normalize.py` — lines 152, 176, 183

```python
output_source.split("/", 1)
```

No `ConversionContext` available in normalize — needs its own label set built from the workflow dict.

**Fix strategy**: Build a label set from `inputs` + `steps` keys at the top of the normalize function, then use a shared `_parse_source_reference(value, known_labels)` helper.

### 3. `_to_source()` — export.py:370 (NOT affected)

Builds source strings by concatenation — `f"{output_label}/{output_name}"`. If label contains `/`, the produced string is ambiguous, but the export direction doesn't parse it. The reimport is what breaks.

**Note**: The export producing `Host/Contaminant Reference Genome/mapping_stats` is inherently ambiguous. This is fine as long as the parser can resolve it using known labels, which it can.

## Implementation

### Step 1: Add `_resolve_source_reference()` helper

```python
def _resolve_source_reference(value: str, known_labels) -> tuple[str, str]:
    """Parse a source reference into (step_label_or_id, output_name).

    Tries matching known labels first to handle labels containing '/'.
    Falls back to split on '/' for numeric step IDs.
    """
    # Try known labels (longest match first to handle nested ambiguity)
    for label in sorted(known_labels, key=len, reverse=True):
        if value == label:
            return label, "output"
        if value.startswith(label + "/"):
            return label, value[len(label) + 1:]
    # Fallback: split on first '/'
    if "/" in value:
        parts = value.split("/", 1)
        return parts[0], parts[1]
    return value, "output"
```

Sorting by length descending handles edge cases where one label is a prefix of another (unlikely but defensive).

### Step 2: Update `BaseConversionContext.step_output()`

```python
def step_output(self, value):
    label_or_id, output_name = _resolve_source_reference(str(value), self.labels)
    return self.step_id(label_or_id), output_name
```

### Step 3: Update `normalize.py`

Build a label set at the start of normalize functions, pass to `_resolve_source_reference`:

```python
known_labels = set()
for step_label, _ in walk_id_list_or_dict(workflow_dict.get("steps", {})):
    known_labels.add(str(step_label))
for input_label, _ in walk_id_list_or_dict(workflow_dict.get("inputs", {})):
    known_labels.add(str(input_label))
```

Replace `output_source.split("/", 1)` calls with `_resolve_source_reference(output_source, known_labels)`.

### Step 4: Tests

1. **Round-trip test with `/` in input label**: Create a minimal workflow with an input labeled `Host/Contaminant Genome`, a tool step connected to it, verify round-trip preserves connections.

2. **Round-trip test with `/` in label AND non-default output**: Ensure `some/label/custom_output` correctly parses as `("some/label", "custom_output")` when `some/label` is a known label.

3. **Round-trip test with `/` in label referencing implicit output**: `some/label` (no output suffix) → `("some/label", "output")`.

4. **Normalize test**: Verify `outputSource: "Host/Contaminant Genome/mapping_stats"` resolves correctly.

5. **Regression test**: Existing tests still pass — labels without `/` should be unaffected.

### Step 5: Verify IWC workflows

Run the three previously-ERROR workflows through round-trip and confirm they now produce OK or MISMATCH (not ERROR).

## Where to Put the Helper

`_resolve_source_reference` should live in `model.py` (alongside `clean_connection` and other source-handling utilities) and be importable by both `converter.py` and `normalize.py`.

## Edge Cases

- **Label is a numeric string** (e.g., `"0"`): Already handled — `step_id` does `self.labels[label_or_id]` first, falls through to `int()` only if not in labels. This is existing behavior.
- **Label contains multiple `/`** (e.g., `A/B/C`): Longest-match against known labels handles this. If `A/B/C` is a label, it matches before `A/B` or `A`.
- **Label is a prefix of another label** (e.g., `A/B` and `A/B/C` both exist): Longest-match-first ordering handles this — `A/B/C` is tried before `A/B`.
- **Two labels where one + `/output` looks like the other** (e.g., label `foo` and label `foo/output`): Ambiguous. Longest match resolves it to `foo/output` with implicit `output`. This is a pathological case unlikely in practice.

## Unresolved Questions

- Should `_to_source()` on the export side escape or quote labels containing `/`? This would eliminate ambiguity at the source, but would change the format2 representation and require a corresponding unescape on reimport. Probably not worth it — the label-aware parser handles it without format changes.
