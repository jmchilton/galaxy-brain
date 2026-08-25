# Test Plan: Null Propagation Chains (Q4) & Subworkflow Mapping Combination (Q10)

## Q4: Null Propagation Through Multiple Steps

### Core Question

When a skipped step produces expression.json null output, and that output flows through downstream steps that have NO when expression, what happens at each step?

Key distinction to test: **data inputs** receive the literal expression.json file, while **parameter inputs** deserialize the JSON value.

### Test 4a: Three-Step Data Chain

**File:** `null_propagation_three_step_chain.gxwf.yml`

**What it proves:** Whether null expression.json datasets propagate "skip" through data-input steps or are processed as literal files.

```yaml
class: GalaxyWorkflow
doc: |
  Chain of 3 cat steps where the first is conditionally skipped.
  Discovers whether null expression.json propagates skip through
  all downstream data-input steps.
inputs:
  input_file:
    type: data
  should_run:
    type: boolean
outputs:
  out_step1:
    outputSource: step1_cat/out_file1
  out_step2:
    outputSource: step2_cat/out_file1
  out_step3:
    outputSource: step3_cat/out_file1
steps:
  step1_cat:
    tool_id: cat
    in:
      input1:
        source: input_file
      should_run:
        source: should_run
    when: $(inputs.should_run)
  step2_cat:
    tool_id: cat
    in:
      input1:
        source: step1_cat/out_file1
  step3_cat:
    tool_id: cat
    in:
      input1:
        source: step2_cat/out_file1
```

**Tests (hypothesis: skip propagates through data inputs):**

```yaml
- doc: |
    When should_run=false, step1 is skipped -> expression.json null.
    If skip propagates: all three outputs are expression.json null.
    If skip does NOT propagate: out_step1 is null, out_step2/3 contain "null" text.
    Asserting skip-propagation hypothesis first.
  job:
    input_file:
      type: File
      value: 1.fasta
    should_run:
      type: raw
      value: false
  outputs:
    out_step1:
      class: File
      ftype: expression.json
      asserts:
      - that: has_text
        text: "null"
    out_step2:
      class: File
      ftype: expression.json
      asserts:
      - that: has_text
        text: "null"
    out_step3:
      class: File
      ftype: expression.json
      asserts:
      - that: has_text
        text: "null"
- doc: |
    Control: when should_run=true, all steps run normally.
  job:
    input_file:
      type: File
      value: 1.fasta
    should_run:
      type: raw
      value: true
  outputs:
    out_step1:
      class: File
      asserts:
      - that: has_size
        min: 1
    out_step2:
      class: File
      asserts:
      - that: has_size
        min: 1
    out_step3:
      class: File
      asserts:
      - that: has_size
        min: 1
```

**This is a discovery test.** If the ftype assertions on out_step2/3 fail, the actual behavior is that cat processes the expression.json file literally. Adjust assertions based on results.

### Test 4b: Data Chain Into Pick Value

**File:** `null_propagation_data_chain_pick_value.gxwf.yml`

**What it proves:** Whether a cat tool that receives null expression.json as data produces output that pick_value treats as "real" (not null) vs producing a null that pick_value filters.

```yaml
class: GalaxyWorkflow
doc: |
  Skipped step -> cat (data input) -> pick_value with fallback.
  Tests whether pick_value sees the intermediate cat output as real or null.
inputs:
  input_file:
    type: data
  fallback_file:
    type: data
  should_run:
    type: boolean
outputs:
  pick_out:
    outputSource: pick_value/data_param
steps:
  conditional_cat:
    tool_id: cat
    in:
      input1:
        source: input_file
      should_run:
        source: should_run
    when: $(inputs.should_run)
  pass_through_cat:
    tool_id: cat
    in:
      input1:
        source: conditional_cat/out_file1
  pick_value:
    tool_id: pick_value
    tool_state:
      style_cond:
        pick_style: first
        type_cond:
          param_type: data
          pick_from:
          - value:
              __class__: RuntimeValue
          - value:
              __class__: RuntimeValue
    in:
      style_cond|type_cond|pick_from_0|value:
        source: pass_through_cat/out_file1
      style_cond|type_cond|pick_from_1|value:
        source: fallback_file
```

**Tests:**

```yaml
- doc: |
    When should_run=false, conditional_cat skipped -> expression.json null.
    If skip propagates to pass_through_cat: pick_value gets null first input,
    picks fallback_file (1.bed content).
    If cat runs on null file: pick_value gets real dataset containing "null" text,
    picks that instead of fallback.
  job:
    input_file:
      type: File
      value: 1.fasta
    fallback_file:
      type: File
      value: 1.bed
    should_run:
      type: raw
      value: false
  outputs:
    pick_out:
      class: File
      asserts:
      - that: has_text
        text: "null"
- doc: |
    Control: should_run=true, everything runs normally.
  job:
    input_file:
      type: File
      value: 1.fasta
    fallback_file:
      type: File
      value: 1.bed
    should_run:
      type: raw
      value: true
  outputs:
    pick_out:
      class: File
      asserts:
      - that: has_size
        min: 1
```

**Note:** The skip=false assertion depends on 4a results. If skip propagates, pick_value fallback fires. If not, pick_value picks the "null" text dataset.

### Test 4c: Parameter Chain (Expression Tools)

**File:** `null_propagation_param_chain.gxwf.yml`

**What it proves:** Null propagates indefinitely through expression tool parameter chains.

This test depends on `expression_null_handling_text` tool existing and accepting a text param that can receive expression.json datasets. Check `test/functional/tools/expression_null_handling_text.xml` before implementing. If unavailable, use `param_value_from_file` as a bridge.

### Open Questions These Tests Answer

| Test | Primary Question | Secondary |
|------|-----------------|-----------|
| 4a | Does skip propagate through data inputs? | How many hops? |
| 4b | Does pick_value see post-cat output as null or real? | Data chain + pick_value interaction |
| 4c | Does null propagate through param chains? | Param vs data path difference |

---

## Q10: Subworkflow Mapping Combination

### Core Question

Can a parent workflow map over a collection into a subworkflow, AND the subworkflow itself map over a different collection internally? Do the two mapping axes combine to produce nested output?

### Test 10a: Parent Maps + Subworkflow Maps

**File:** `subworkflow_mapping_combination.gxwf.yml`

```yaml
class: GalaxyWorkflow
doc: |
  Parent maps list_a over subworkflow (single_from_parent is data input,
  receives one element per invocation). Subworkflow also receives list_b
  as a collection and maps cat over it internally. Tests whether output
  becomes list:list (outer=list_a, inner=list_b).
inputs:
  list_a:
    type: collection
    collection_type: list
  list_b:
    type: collection
    collection_type: list
outputs:
  combined_out:
    outputSource: sub/sub_out
steps:
  sub:
    run:
      class: GalaxyWorkflow
      inputs:
        single_from_parent: data
        collection_to_map:
          type: collection
          collection_type: list
      outputs:
        sub_out:
          outputSource: the_cat/out_file1
      steps:
        the_cat:
          tool_id: cat
          in:
            input1:
              source: collection_to_map
    in:
      single_from_parent: list_a
      collection_to_map: list_b
```

**Tests:**

```yaml
- doc: |
    Parent sends list_a=[X,Y] into subworkflow's data input, triggering
    parent-level map-over (2 invocations). Each invocation also receives
    list_b=[P,Q] which triggers internal map-over of cat.
    Expected: list:list where outer=list_a identifiers, inner=list_b identifiers.
    Each leaf contains content from list_b (cat only processes collection_to_map).
  job:
    list_a:
      type: collection
      collection_type: list
      elements:
        - identifier: X
          content: "X"
        - identifier: Y
          content: "Y"
    list_b:
      type: collection
      collection_type: list
      elements:
        - identifier: P
          content: "P"
        - identifier: Q
          content: "Q"
  outputs:
    combined_out:
      class: Collection
      collection_type: list:list
      elements:
        X:
          elements:
            P:
              asserts:
              - that: has_text
                text: "P"
            Q:
              asserts:
              - that: has_text
                text: "Q"
        Y:
          elements:
            P:
              asserts:
              - that: has_text
                text: "P"
            Q:
              asserts:
              - that: has_text
                text: "Q"
```

### Open Concerns

1. **Unused subworkflow input:** `single_from_parent` triggers parent mapping but isn't wired to any step inside the subworkflow. Galaxy may not map over it if it's unused. If so, add a dummy step that consumes it.
2. **Collection passthrough:** `list_b` is the same for every parent-mapped invocation. This is by design — isolates the mapping combination question from data variation.
3. **Output nesting:** If Galaxy doesn't support dual mapping, the test may fail with a type error or produce flat output instead of list:list.

### Implementation Order

1. **4a first** — its three output assertions definitively answer whether skip propagates through data inputs
2. **4b second** — depends on 4a results for correct assertions
3. **10a** — independent, can run in parallel with Q4 tests
4. **4c last** — may need tool availability check first
