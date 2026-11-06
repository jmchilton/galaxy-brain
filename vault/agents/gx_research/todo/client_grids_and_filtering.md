# Component - Client Grids and Filtering

Cover the generic client grid framework: `client/src/components/Grid/GridList.vue`, the `GridConfig` and `FieldEntry` contract in `configs/types.ts`, how `getData` receives `search`, and how `GridList` derives and gates on filters using `client/src/utils/filtering.ts`. Explain the `Filtering` constructor modes (`quoteStrings`, `autoFilterKey`), how each mode tokenizes, and `validFilters` with `menuItem`. Include the column filter extension point from galaxyproject/galaxy#24708 (`FieldEntry.filter`, `FieldFilter`, `FilterOption`, `GridColumnFilter`), marked as proposed if the PR hasn't merged, using the invocation grid's name-to-id resolution as the worked example. Leave out per-grid field listings, `FilterMenu` styling, and the history panel's own filter use beyond how it shares `Filtering`.

## Why

Reviewing the invocation list filters needed the grid and `Filtering` contract, and no note in `vault/research/` mentions `GridList`, `GridConfig` or `utils/filtering`. Many grids share this code, so later grid work will touch it again.

## Requested by

- vault/repositories/galaxy/reviews/active/24708: `learning_galaxy` review needed the grid framework baseline and the new `FieldEntry.filter` extension point
