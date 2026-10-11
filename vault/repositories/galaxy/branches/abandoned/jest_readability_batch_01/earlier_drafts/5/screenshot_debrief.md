screenshots not relevant for this change

Audited the working-tree `git diff --name-status`, `git diff --stat`, and `git status --short` against baseline `c35feb587eb8738a2d94cfb91769d0fbd14839bf`. The complete changed-source list is:

- `client/README.md`
- `client/src/api/client/serverMock.test.ts`
- `client/src/components/Visualizations/VisualizationExamples.test.js`
- `client/src/composables/markdown.test.js`
- `client/src/stores/pageEditorStore.test.ts`
- `client/src/utils/parseBool.test.ts`

Read the screenshot workflow and the E2E writing guide, including screenshot capture requirements. None of the changes modifies production Vue components, styles, navigation selectors, E2E test files, image fixtures, or browser screenshot/snapshot capture. The component and markdown tests exercise existing UI/rendering behavior in unit tests; their refactors do not change the shipped UI.

There are no new or modified E2E screenshots to record. No E2E test modification or screenshot run is warranted for this branch, and no screenshot artifacts were created. No screenshot blocker was encountered.
