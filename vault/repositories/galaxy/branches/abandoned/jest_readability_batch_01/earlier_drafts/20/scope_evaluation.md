Recommendation: retain the requested ten originators and the focused shared extended-history factory serving two of them plus its supporting API owner-history consumer; no production changes are needed.

## As implemented

The batch improves ten selected suites and follows the shared history factory into the supporting API ownership suite. Selected coverage spans form presentation, history links/content/refresh controls, Markdown directives, workflow upgrade messages, Tool Shed details/search, and upload state. SwitchToHistoryLink and HistoryCounter share a new typed extended-history factory composed from the existing brief-history defaults and actual owner/content fields; they also reuse existing user and plugin/SSE helpers. Upload state adopts the existing upload fixture module. All original unique scenarios remain, including the empty non-history item state before ContentItem expansion/selection; a duplicated public-history click scenario now tests the filters its old comment described.

| Pros | Cons |
| --- | --- |
| Makes distinct behaviors and domain inputs visible while preserving existing click, prop-transition, API, and lifecycle contracts. | The real child integration needed for tag controls, links, and dialog dismissal retains some setup complexity. |
| Extends the existing factory module for three concrete consumers without duplicating brief-history or owner/content defaults. | Other eligible suites still need their own complete review. |

## Contract the batch to cosmetic edits

Retain combined tests and their positional boolean helpers while only renaming tests and trimming comments. This reduces the diff, but leaves the long ContentItem interaction sequence, opaque history click scenarios, and upload fixture duplication that motivated the readability loop.

| Pros | Cons |
| --- | --- |
| Smaller review surface. | Leaves independent failures hidden inside combined cases. |
| Changes fewer fixture and mount arrangements. | Gives up demonstrated readability gains and existing helper reuse. |

## Contract to inline extended histories

Keep full extended-history objects local in both selected consumers. This avoids one new exported factory, but duplicates the required owner, size, and active-content defaults across two concrete users of the same domain.

| Pros | Cons |
| --- | --- |
| Keeps every default beside each mount. | Repeats the same extended schema construction and encourages sparse casts. |
| Changes only selected test files. | Misses a demonstrated shared abstraction authorized by the loop. |

## Expand shared abstractions across more suites

The new extended-history factory is justified by two selected consumers and now also replaces the duplicated local owner/content construction in `src/api/index.test.ts`. That supporting edit preserves all 14 existing cases and its counter stays unchanged. Further supporting migrations should have comparably concrete arrangements and validation. Existing upload factories, plugins, SSE setters, emitted-event helpers, and API infrastructure cover the remaining recurring setup; unrelated Tool Shed service shapes and small form fixtures do not justify a general harness.

| Pros | Cons |
| --- | --- |
| Future recurring domain setup could be centralized if concrete consumers emerge. | New indirection currently adds choices without reducing meaningful duplication. |
| Could address an established reuse follow-up within the same iteration. | The marginal-advice ledger has no unresolved reuse follow-up. |

## Expand production fixes or guidance

The selected reviews support changes to tests only and find no missing non-obvious best-practice rule. Keep the previously recorded MarkdownVitessce invocation-forwarding issue as its separate behavior follow-up; this batch's MarkdownGalaxy suite does not modify that production path.

| Pros | Cons |
| --- | --- |
| A dedicated regression and production review could fix the earlier concrete issue. | Folding it into this batch changes the requested readability scope. |
| New guidance could document a demonstrated gap in a later iteration. | Current factory, async, scenario, mount, and cleanup guidance already explains these changes. |
