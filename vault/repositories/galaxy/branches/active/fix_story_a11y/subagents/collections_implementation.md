# Collection, file selection, palette and scrolling accessibility repair

Dev worktree: /Users/jxc755/projects/worktrees/galaxy/branch/fix_story_a11y. Original migration/a11y worktrees untouched. No commits or staging performed by this agent.

Implemented:
- ClickToEdit defaults to a native, minimally styled edit button instead of a label with disallowed button role. Enter and Space open editing; stopping events prevents selection when renaming. Edited inputs receive per-instance Vue ids. Existing component overrides retained.
- ListDatasetCollectionElementView uses neutral editable/action row wrappers and sibling native selection/removal/edit buttons. Removing or renaming no longer also toggles selection. Read-only pairing choices without actions remain whole native buttons, retain the original accessible text, and expose pressed state. Regression test verifies no nested buttons.
- FormSelectMany has neutral option rows with native, roving selection buttons and sibling custom label controls. Existing mouse row selection, modifier highlighting, arrow navigation, selection order and datasets remain intact. Selection buttons and editable names have 24px minimum targets; instruction text uses gray-700 instead of low contrast gray-400-derived color. Search and clear button named. Existing tests adapted to select option-button; assertions preserved, plus custom-label separation test.
- SelectionDialog folders open with one native button rather than div role=button containing a link; navigation stops row selection. Search and its clear button named. Dev's existing GTable already uses native row semantics; no GTable edits needed.
- CommandPalette listbox now contains option groups only; hints remain alongside it and empty sections do not claim option-group semantics. Scrollable palette results have tabindex=0.
- ScrollList separates the focusable, named scrolling region from its item list. Listitem roles belong to item wrappers; empty/loading/all-loaded messages stay outside the list. Load More has explicit accessible name. ScrollToTopButton always has an accessible name and hidden state leaves the tab order.

New/adjusted regression tests: Collections/common/ClickToEdit.test.ts; Collections/ListDatasetCollectionElementView.test.ts; Collections/ListCollectionCreator.test.ts; Form/Elements/FormSelectMany/FormSelectMany.test.ts; SelectionDialog/SelectionDialog.test.js; CommandPalette/CommandPalette.test.ts; ScrollList/ScrollList.test.ts.

Validation:
- Eight suites passed, 51 tests: /tmp/fix_story_a11y-collections-unit-final3.log. Includes FormSelectMany, FilesDialog, SelectionDialog, List/PairCollectionCreator, ClickToEdit, dataset actions, ScrollList.
- CommandPalette: 77/77 pass, /tmp/fix_story_a11y-collections-command.log.
- Final read-only pairing choice regression plus independent-action regression: 2/2 pass, /tmp/fix_story_a11y-collections-pair-corrected.log. Adds one test beyond earlier eight-suite count.
- Prettier passes touched files. ESLint /tmp/fix_story_a11y-collections-lint.log has zero errors; warnings include intentional pointer selection on neutral row wrappers with sibling keyboard controls and pre-existing required-prop/default and emit declaration warnings for ScrollToTopButton.
- Root owns final aggregate strict axe/browser run, typecheck, review and integration.

Disposable validation harness adaptations (outside dev repository): Collections/ListCollectionCreator.stories.ts now selects the native option control by Select + dataset name while preserving all selection, order, refresh and reconciliation assertions. ScrollList.stories.ts scroll helper targets named scrolling region instead of the item-list role, preserving scroll-size and loading assertions. No axe exceptions added and no assertions weakened.

Review points: custom label rows have a separate 24px selection control beside the editable name, so compare visual spacing; shared ClickToEdit also serves History/DetailsLayout (component=h3 override preserved); neutral rows retain pointer-selection convenience while keyboard access belongs to native sibling controls. Automated checks do not replace screen-reader/manual keyboard review.
