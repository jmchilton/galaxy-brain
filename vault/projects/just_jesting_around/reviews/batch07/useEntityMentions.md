# Entity mentions review — iteration 07

Selected originator: `client/src/composables/useEntityMentions.test.ts`. Baseline and final: 27 cases.

The mention trigger, parser, context builder, and resolver run directly because they need no component lifecycle. Hoisted mocks now explicitly describe the small history summary and mention-dataset shapes used by the resolver; the history lookup is a typed Vitest function reset in scenario setup instead of a mutable function with asserted return values. These fixtures intentionally model the mocked boundary rather than constructing full history stores or unrelated dataset API fields.

Both multiple-mention parser assertions now compare exact ordered arrays, retaining length, identifier, and entity-type evidence while also checking every parsed identifier and character range. The remaining trigger cases, including cursor positions, whitespace, mid-word rejection, multiple at-signs, and case-insensitive types, remain intact. Context cases retain their original dataset/history references, empty-array checks, and grouping. Resolver scenarios retain both dataset fixtures, missing-HID fallback, name-fragment lookup, current history, another history, and missing history, including all original length and field checks.

Reuse search found no concrete second consumer of this small mocked store arrangement. Existing full-model test factories would obscure the few fields these pure functions inspect, so no shared helper or supporting-suite edit is needed. Existing README guidance covers direct composable invocation, readable scenarios, and fixture reuse; no nonobvious missing guidance or deferred advice emerged.

Validation: 27 cases pass alongside LastQueue and redirect in a shuffled 71-case run, seed 70117 (`/private/tmp/batch07_entity_queue_redirect_results.json`). Scoped current-config ESLint and Prettier pass. Root performs full typechecking and independent review.
