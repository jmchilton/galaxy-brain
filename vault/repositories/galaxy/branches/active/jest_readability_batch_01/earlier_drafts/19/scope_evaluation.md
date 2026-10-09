Recommendation: retain the requested ten originators and the focused PageEditor fixture reuse; keep the discovered Vitessce invocation-parameter bug as a separate behavior fix.

## As implemented

The iteration reviews ten selected suites across pages, sidebar rendering, Vitessce config mapping, history graphs, object store creation, invocation providers, visualization creation, pick-value forms, and multiselect interactions. The PageEditor fixture source reuses an existing page factory for selected PageCard and unchanged supporting HistoryPageList consumers; HistoryPageList contributes 11 supporting validation cases. HistoryPageView uses the canonical factory independently. Only tests and their fixture source change; originator counters belong to the ten selected tests.

| Pros | Cons |
| --- | --- |
| Preserves the full selected behavior set while reducing repetitive setup and broad casts. | Leaves unrelated suites for later full review. |
| Follows a concrete shared factory into PageCard and validates its unchanged HistoryPageList consumer. | Requires checking fixture defaults for the consumed fields. |

## Contract the scope to ten test files

Leave the PageEditor fixture source unchanged and reuse the canonical factory only inside selected tests. This avoids changing defaults consumed by unchanged HistoryPageList, but retains duplicated fixture definitions shared with PageCard; validating the 11 supporting cases makes the current focused reuse reasonable.

| Pros | Cons |
| --- | --- |
| Smaller file count and no fixture changes affecting HistoryPageList. | Keeps duplicated fixture defaults shared with PageCard. |
| Supporting suite validation could be omitted if its fixtures remain unchanged. | Gives up concrete reuse authorized by LOOP_ITERATION; supporting validation never advances its counter. |

## Expand to fix Vitessce invocation forwarding

The review found a pre-existing string argument to an action requiring `{ id }`, which currently permits a request containing an unresolved invocation path placeholder. A production fix and an exact request-ID regression belong in a dedicated follow-up, where all invocation call sites and API behavior can be reviewed together.

| Pros | Cons |
| --- | --- |
| Repairs a concrete request forwarding bug. | Adds production behavior changes to an expressly readability-focused batch. |
| Makes the label resolution test prove the exact invocation ID. | Requires a different regression and implementation review scope. |

## Expand shared abstractions or documentation

The current suites reuse existing helpers and factories where useful. No reviewed duplication or missing principle justifies a new general teleport harness, config builder, or README addition.

| Pros | Cons |
| --- | --- |
| Could consolidate future recurring arrangements if concrete consumers emerge. | Adds indirection without demonstrated current benefit. |
| Could describe a genuinely missing pattern. | Existing mount, async, cleanup, and reuse guidance covers this iteration. |
