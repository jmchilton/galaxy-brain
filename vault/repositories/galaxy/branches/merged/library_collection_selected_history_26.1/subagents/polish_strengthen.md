# Polish: strengthen pass

## Verdict
Nothing to add as development tasks (one optional test). Wording fixes below.

## Claims checked against diff
- No API change: true; client + selenium helpers/tests only.
- Callers keeping current-history fallback: `SampleSheetGrid.vue:565` calls `useCollectionCreation()` with no getter - true. Workflow-run form (`FormDataWorkflowRunTabs.vue:121,140`) passes `currentHistoryId` - unchanged, so "workflow runs untouched" holds.
- Upload `DefaultBox.vue:589-590` passes its `historyId` (upload target) into `CollectionCreatorIndex` - claim true, but no test covers it.
- `SelectionOperations.vue:148` passes `history.id` - "Build Dataset List" from viewed history claim true.
- Library dialog `setCurrentHistory` only on picked-existing path; create-new path relies on existing behaviour - consistent with description.
- `ListWizard` uses store `historyId`, falls back to current if empty - matches.

## Optional task (in scope)
- Upload builder is the one advertised behavior change with no test. Either add a small vitest on `useCollectionCreator` asserting `createPayload(...).history_id === props.historyId` (cheap, covers upload + library + selection plumbing in one), or soften the upload sentence to say it follows from the same prop forwarding. Note: a creator vitest was dropped as duplicate of the ListWizard E2E, so prefer the wording option unless John wants upload pinned.

## Misreadings vs bold-italic coverage
- "Changes where all collections go" - answered (2nd bold-italic lists creators + upload; SampleSheet/tool/workflow excluded).
- "API change" - answered.
- "Why a release branch" - NOT answered in bold-italic. Context only says bug exists on 25.1/26.0. Add: ***Targets `release_26.1` because the builder already shows "From history: <picked>" and then writes elsewhere - a silent wrong-history write users hit today.*** (or whatever the real reason is).
- "Library dialog now hijacks my current history" - only in Risk Details. Fold into a bold-italic: the switch matches the create-new and "as Datasets" paths.

## Wording fixes
- "bug fix for collection creation only" conflicts with the library dialog now changing the current history. Suggest: "***Client-only fix to which history collections are created in - no API change; "as Datasets", tool forms and workflow runs are untouched.***"
- Name SampleSheet and workflow-run form as the current-history callers in Risk Details (currently only SampleSheet; workflow form passes `currentHistoryId` explicitly).
