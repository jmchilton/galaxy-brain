# CopyModal review — iteration 05

Selected originator: `client/src/components/History/Modals/CopyModal.test.ts`.

Baseline and final: 8 cases, 8 assertion statements, unchanged. Retains modal title, initial copy name, prop-driven input update, empty-name prohibition, owner same-name prohibition, non-owner same-name permission, exact copyHistory arguments including copyAll=false, and update:show-modal=false after completion.

This suite already keeps scenarios short, uses typed history/user factories, `emittedArg`, `withPlugins`, and shallow child boundaries appropriately. The focused changes make localVue fresh per mount and automatically unmount wrappers; restore copyHistory spies instead of globally clearing every mock before each case. Preserves child component event dispatch and awaited completion. Immutable named owner/non-owner fixtures remain visible because ownership distinguishes two cases.

Reuse search: existing factories and emitted-event helper already serve the adjacent modal/navigation suites. Each modal has a different event boundary, so no generic modal wrapper was extracted. No supporting migration, README addition or worthwhile unresolved idea.

Validation: all 8 cases pass in the affected 11-suite/63-case run; scoped ESLint passes. Root performs final combined checks and type checking.
