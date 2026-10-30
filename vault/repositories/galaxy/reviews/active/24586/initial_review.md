# Initial review — PR #24586 (GProgress / GProgressBar)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: claude-opus-5-5, effort: low
- Reviewed commit: `c889c700361` (base `dev`)

## Summary

A small, well-scoped addition: two components plus a provide/inject context, following the
package's existing `*Context.ts` pattern (`dropdownContext`, `checkboxGroupContext`) and reusing
`prefix()` / `ColorVariant` from `componentVariants`. I walked the 9 `BProgress` call sites on dev
(`ProgressBar.vue`, `CollectionProgress.vue`, `DatasetProgress.vue`,
`StorageOperationOutcomeProgress.vue`, `SelectionChangeWarning.vue`, `FormNumber.vue`,
`CustomBuilds.vue`, `QuotaUsageBar.vue`, `QuotaMeter.vue`), and the API covers them: single-bar
`variant` / `animated` / `show-progress` reach the inner bar through the provided context,
`v-if` bars inside a stack work, and attributes such as `v-g-tooltip` / `aria-label` fall through to
the bar.

I recomputed the contrast claims from `tokens.css` (WCAG relative luminance, stripes alpha-blended
over the fill). All of them hold:

| variant | fill/track | stripe/track | text/fill | text/stripe |
| --- | --- | --- | --- | --- |
| primary | 6.20 | 7.45 | 8.07 | 9.71 |
| secondary | 4.46 | 5.63 | 5.81 | 7.33 |
| success | 4.76 | 6.01 | 6.20 | 7.82 |
| danger | 3.64 | 4.75 | 4.74 | 6.18 |
| warning | 5.24 | 6.48 | 6.82 | 8.43 |
| info | 3.32 | 3.06 | 4.52 | 4.90 |
| dark | 11.60 | 7.15 | 15.11 | 9.30 |

I did not run the vitest file: the worktree has no `node_modules`.

No P1 or P2 findings.

## Findings

### P3 1: `stacked` reads `useSlots()` inside a `computed`, which isn't reactive

`GProgress.vue`: `const stacked = computed(() => Boolean(slots.default));`. The `slots` object is not
reactive, so the computed caches its first answer. If a consumer's slot content turns on or off
(for example, a `<template v-if>` default slot), the track keeps its old `role="group"` / `aria-label`
decision. Since GProgress's own template re-renders whenever its slots change, the check can just
go inline in the template (`$slots.default`) or be a plain function, at no cost.

### P3 2: The track's default height ties in specificity with consumers' scoped height classes

The default `height: 1rem` sits in a scoped `.g-progress[data-v-…]` rule, specificity (0,2,0).
`StorageOperationOutcomeProgress.vue` sets the height with a scoped class on the root
(`.storage-operation-progress-sm { height: 0.6rem }`, via `:class="props.heightClass"`), which is
also (0,2,0) once scoped. Today that class beats Bootstrap's global `.progress` (0,1,0). After the
swap, which rule wins depends on stylesheet order, so the bar could silently go back to 1rem. One of
these would fix it: put the default height in `:where(.g-progress)`, expose it as a custom property
(`height: var(--g-progress-height, 1rem)`), or have the follow-up use the `height` prop. If the
README's public-class table is meant to cover classes consumers restyle, `g-progress` /
`g-progress-bar` are candidates. The Selenium selector `usage_progress`
(`.quota-usage-bar .progress` in `client/src/utils/navigation/navigation.yml`) also keys on the
Bootstrap class and will need updating in the QuotaUsageBar swap.

### P3 3: Tests skip the variant, stripe and height paths

`GProgress.test.ts` covers value, range, labels, text and `max` / `showProgress` inheritance well.
It never checks the colour, stripe or height paths:
- A single-bar `GProgress` passing `variant` to its inner bar through the context. This is the
  `SelectionChangeWarning` / `QuotaMeter`-style path, where `variant` sits on the outer component.
- `striped` / `animated` classes, including `animated` implying `striped`, and a bar's
  `:striped="false"` overriding an inherited `true`.
- The `height` prop reaching the track style.
- `g-progress-bar-empty` on zero-width bars, which the seam rule depends on.

A few assertions in the existing mount-based style would cover these.

### P3 4: Numeric-string `value` / `max` / `precision` keep BootstrapVue's loose API alive

The props accept `number | string`, and `toNumber` uses `parseFloat`, so `"10px"` → 10 is accepted
without complaint. On dev, the only string use is `max="100"` in `QuotaUsageBar.vue`. Every call site
is rewritten in the follow-up swaps anyway, so typing these as `number` (`:max="100"`) would let
`vue-tsc` catch bad input and drop the parsing. This is optional, since the PR states numeric
strings as a goal.
