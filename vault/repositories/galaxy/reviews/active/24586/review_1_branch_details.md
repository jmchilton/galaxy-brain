# Review branch `pr_24586_review_1`

Built on the PR head `c889c700361`. Same as `pr_24586_review_0` minus the P3 3 test commit (trimmed by John); the three kept commits are unchanged, so the branch head is `1f5ec4d1163`. The branch makes GProgress check for stacked content on every render, so a conditional default slot updates the track's group role and label. It moves the track's default height into a zero-specificity `:where()` rule, so a consumer's height class wins whatever the stylesheet order. It also adds tests for prop and context reactivity.

- `2426aa7ff6c` Re-check GProgress's stacked slot on every render: replaces the `useSlots()` computed with `$slots.default` in the template, and adds a test that toggles a `<template v-if>` default slot (P3 1).
- `0060c3d2cc0` Let consumers' classes set GProgress's height: moves `height: 1rem` into a scoped `:where(.g-progress)` rule (P3 2).
- `1f5ec4d1163` Test that GProgress bars follow changing values and parent options: adds `setProps` and ref-driven tests for the value, the parent `max` and `show-progress` (P2 1).
