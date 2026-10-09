# Add a failure-tolerant Pick Value mode

Stacked on #23433. That prerequisite makes `pick_value` wait for runtime inputs and
preserve terminal failed datasets without turning them into scheduling failures.

## Summary

This adds a Galaxy-specific `first_ok_or_skip` mode to the native Pick Value workflow
step. It selects the first non-null input whose dataset state is usable. Failed inputs are
ignored, and the step produces a skipped output when no usable input remains.

Existing modes are unchanged: failure remains distinct from null, so `first_or_skip` and
the CWL-derived modes continue to propagate a failed dataset as a non-null value. Users
must opt into the new mode when failure should behave like an unavailable branch.

## Details

- Add `first_ok_or_skip` to the backend mode validation and workflow-editor selection.
- Wait for all inputs using the readiness behavior introduced by #23433, then apply the
  failure policy during candidate selection rather than scheduling.
- Ignore `ERROR`, `FAILED_METADATA`, and `DISCARDED` datasets in the new mode.
- Keep `OK`, `DEFERRED`, and `EMPTY` datasets selectable; checking `not is_ok` would
  incorrectly discard the latter two states.
- Apply the same selection policy per element when Pick Value is mapped over collections.
- Reuse the existing skipped placeholder when every input is null, skipped, or failed.

## Why a separate mode?

Null/skipped and failed are different workflow outcomes. CWL PickValue methods operate on
null values and do not receive failed step outputs, while Galaxy can preserve failed HDAs
for downstream failure-aware operations such as `__FILTER_FAILED_DATASETS__`.

Changing `first_or_skip` to silently ignore failures would conflate those outcomes. An explicit mode makes failure tolerance intentional.

## Tests

Coverage uses real framework jobs rather than synthetic runtime values:

- a failed first input falls through to an OK second input;
- all failed inputs produce a skipped output;
- runtime JSON `null` and a failed input are both ignored before selecting an OK fallback;
- mapped selection proves the failed element aliases its corresponding fallback input;
- both skip-capable modes produce skipped outputs when every input is null/skipped;
- unit coverage classifies OK, DEFERRED, EMPTY, ERROR, FAILED_METADATA, and DISCARDED;
- the workflow-editor component preserves and emits the new mode.

Local validation:

- 20 Pick Value API tests passed.
- 86 workflow-module unit tests passed.
- 11 `FormPickValue` component tests passed.
