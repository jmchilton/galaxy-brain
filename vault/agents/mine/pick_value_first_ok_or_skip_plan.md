# Plan — `first_ok_or_skip` mode for `pick_value`

Feature layered on the readiness and runtime-null fixes in
`jmchilton:pick_value_input_readiness`.

The prerequisite branch establishes two independent rules:

1. `pick_value` waits until every connected input is settled before inspecting it.
2. A terminal failed dataset is not a scheduling failure and is not null. Existing modes
   preserve it as a selectable value, allowing downstream failure-aware tools to handle it.

The new feature adds an explicit selection policy that treats failed values as absent. It
does not add a different scheduling policy.

## Intended semantics

| input | existing `first_or_skip` | `first_ok_or_skip` |
|---|---|---|
| pending or paused | delay | delay |
| runtime null or skipped | ignore | ignore |
| failed | select/propagate as non-null | ignore |
| successful or otherwise usable | select | select |
| no selectable values | produce skipped output | produce skipped output |

The first selectable value still wins, preserving connection order. In particular, an
earlier failed value wins in `first_or_skip`, while `first_ok_or_skip` advances to the next
usable value.

## Why this is a separate mode

- CWL v1.2 `PickValueMethod` has exactly three symbols: `first_non_null`,
  `the_only_non_null`, and `all_non_null`.
- In CWL, a skipped step produces null. A failed step produces `permanentFail`, never null.
- CWL structurally prevents `pickValue` from seeing a failure: a step becomes runnable
  only after its sources have succeeded or skipped.
- Galaxy already separates null filtering from failure filtering at the tool level:
  `FilterNullTool` requires OK datasets, while `FilterFailedDatasetsTool` accepts failures
  so it can remove them.
- The prerequisite regression proves the same distinction for `pick_value`: a failed job
  is forwarded without failing workflow scheduling, and `__FILTER_FAILED_DATASETS__` can
  subsequently remove it.

Therefore existing modes continue to regard failure as non-null. Failure tolerance is an
opt-in Galaxy extension with its own name.

## Settled state taxonomy

The prerequisite implementation already provides the required readiness behavior:

| states | readiness treatment | selection classification |
|---|---|---|
| NEW, UPLOAD, QUEUED, RUNNING, SETTING_METADATA, PAUSED | delay | not inspected yet |
| OK, DEFERRED, EMPTY | settled | usable |
| ERROR, FAILED_METADATA, DISCARDED | settled | failed, but still non-null |

This follows Galaxy's existing `Dataset.valid_input_states` distinction: ERROR,
FAILED_METADATA, and DISCARDED are the invalid states. DEFERRED and EMPTY must not be
dropped merely because `DatasetInstance.is_ok` is false.

A successful `expression.json` dataset must be read because it can contain a runtime JSON
`null`. A non-OK `expression.json` dataset must not be read; existing modes preserve it,
while `first_ok_or_skip` classifies it using its dataset state.

## Readiness API: no additional state needed

Do not promote `require_ready: bool` to an enum for this feature. The current combination
of `is_data` and `require_ready` already expresses the three behaviors:

```
data + require_ready=False   # ordinary data connection; job ordering handles readiness
parameter connection        # wait and require OK, preserving existing parameter behavior
data + require_ready=True    # wait until settled; return any terminal dataset state
```

Every `pick_value` mode uses the third behavior. The difference between modes belongs in
candidate selection after readiness, not in `WorkflowProgress`.

## Implementation

### Backend

- Add `first_ok_or_skip` to `PickValueModule.MODES`.
- Keep `_ensure_inputs_ready` unchanged: all modes require settled data inputs.
- Keep `_is_null_or_skipped` as the first classification step. This includes successful
  expression outputs whose serialized runtime value is JSON `null`.
- Add a failure predicate for HDA values in ERROR, FAILED_METADATA, or DISCARDED. Do not
  use `not value.is_ok`, because that would incorrectly reject DEFERRED and EMPTY.
- Make candidate filtering mode-aware:
  - every mode removes null/skipped values;
  - only `first_ok_or_skip` additionally removes failed values.
- Give `first_ok_or_skip` the same empty-candidate behavior as `first_or_skip`: create a
  skipped placeholder HDA.
- Apply the same predicate in the mapped path, where selection happens per collection
  element.
- Generalize `_create_skipped_output`'s docstring so it is not specific to one mode.

### UI

- Add `first_ok_or_skip` to `FormPickValue.vue` with a label and help text that says failed
  values are ignored and all-failed/all-null inputs produce a skipped output.

### Serialization

gxformat2 needs no change. It enumerates the workflow step type, while the mode remains in
opaque `tool_state`.

## Tests

### Preserve prerequisite regressions

- A real expression tool produces runtime JSON `null`; `first_non_null` waits and chooses
  the fallback.
- A paused input leaves the pick step unscheduled until the input is resumed.
- `first_or_skip` receives a failed HDA, propagates it without a scheduling failure, and a
  downstream `__FILTER_FAILED_DATASETS__` step successfully removes it.

### New API coverage

- `first_ok_or_skip` with failed first and OK second selects the OK value.
- `first_ok_or_skip` with every input failed creates a skipped placeholder.
- `first_ok_or_skip` with every input null/skipped creates a skipped placeholder.
- `first_ok_or_skip` ignores both runtime null and failure before selecting an OK fallback.
- Mapped `first_ok_or_skip` drops failed values per element rather than rejecting the
  entire collection.

Tests should use real framework jobs (`exit_code_from_file` and the expression tools) so
they exercise runtime state transitions rather than constructing synthetic HDAs.

## Non-goals

- Do not change `first_non_null`, `first_or_skip`, `the_only_non_null`, or `all_non_null`
  failure semantics.
- Do not make failures equivalent to null globally.
- Do not add tolerant siblings for the other selection modes until there is a concrete
  use case.
- Do not refactor the readiness boolean solely for this feature.
