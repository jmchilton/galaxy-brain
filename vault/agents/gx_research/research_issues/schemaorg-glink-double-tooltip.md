# SchemaOrg viewers put both v-g-tooltip and the `tooltip` prop on one GLink

- Area: client / SchemaOrg viewers
- Found while: [[Component - Galaxy UI Buttons and Tooltips]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

Four GLinks use both tooltip mechanisms: `<GLink v-g-tooltip.hover tooltip title="…" …>`.

- `client/src/components/SchemaOrg/OrganizationViewer.vue:23`
- `client/src/components/SchemaOrg/PersonViewer.vue:26`
- `client/src/components/SchemaOrg/PersonViewer.vue:36`
- `client/src/components/SchemaOrg/GrantViewer.vue:14`

With `tooltip` set, GLink renders no `title` attribute (`client/packages/ui/src/components/GLink.vue:87`), so the directive's `getContent()` (`vGTooltip.ts:149-164`) finds no text and never shows. The directive is dead weight, but it still writes `aria-describedby="g-tooltip-N"` on the anchor in `mounted` (`vGTooltip.ts:421-423`). GTooltip writes its own `aria-describedby` on the same element (`GTooltip.vue:36-49`), and only the last write survives. If the directive's write is the one that survives, the description points at a balloon that is only in the DOM while it is showing, which here is never.

## Evidence / repro

Code reading only. The order of the two `aria-describedby` writes depends on Vue's flush timing and wasn't checked in a browser.

## Suggested fix

Remove `v-g-tooltip.hover` from these four GLinks. Optionally, have the directive warn in dev mode when its host already has an `aria-describedby` it didn't set.

## Related

- [[Component - Galaxy UI Buttons and Tooltips]]
