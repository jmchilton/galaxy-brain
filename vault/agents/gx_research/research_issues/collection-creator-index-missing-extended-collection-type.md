# SelectionOperations omits CollectionCreatorIndex's required extendedCollectionType prop

- Area: client / collection builders
- Found while: [[Component - History Panel Selection and Collection Builders]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`CollectionCreatorIndex.vue` declares `extendedCollectionType: ExtendedCollectionType` as required (`client/src/components/Collections/CollectionCreatorIndex.vue:33`). The history panel's Build Dataset List path mounts it without that prop (`client/src/components/History/CurrentHistory/HistoryOperations/SelectionOperations.vue:153-163`), which produces a Vue missing-required-prop warning in dev builds. The prop is only read by the `SampleSheetCollectionCreator` branch (`CollectionCreatorIndex.vue:307`), which the `list` type never reaches, so behavior isn't affected.

The library caller works around this by passing `:extended-collection-type="{}"` (`client/src/components/Libraries/LibraryFolder/TopToolbar/FolderTopBar.vue:463`). The 25.1 fix branch for #24469 stubbed `CollectionCreatorIndex` in Jest to avoid the warning.

Also on this component: `useBetaComponents` (`CollectionCreatorIndex.vue:42`) is declared, but no code reads or passes it.

## Evidence / repro

Code reading. `grep -rn "extended-collection-type" client/src` shows that only `FolderTopBar.vue` and `FormDataWorkflowRunTabs.vue` pass the prop.

## Suggested fix

Make `extendedCollectionType` optional, since it's only needed for sample sheets, or pass it from `SelectionOperations`. Remove the unused `useBetaComponents` prop.

## Related

- [[Component - History Panel Selection and Collection Builders]]
