# Readability batch 24

First batched iteration: four originators drawn with seed `2610924` from 221 eligible entries, one implementer committing one test per commit, then one review of the commit range. [Manifest](readability_batch_24.yml).

The draw skipped `client/src/components/Workflow/Run/WorkflowStorageConfiguration.test.js`, converted upstream to `.ts`. Nine other ledger entries also no longer exist at their paths; the inventory is retained as a historical record, as with DefaultBox in batch 16: FolderDetails, Markdown CellButton, StatelessTags, ToolForm, CompositeBox, DefaultBox, RulesInput, UploadModal, RoleForm.

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| GalaxyAI.newchat | Adopts the new GalaxyAI chat harness; each "length, then index" pair becomes one `toEqual` over the whole conversation. [Review](reviews/batch24/GalaxyAI.newchat.md). | 6 → 6 |
| InstallationSettings | Split into a dialog-header case and a dependency-defaults case. Three `wrapper.vm.install*` checks now read the rendered checkboxes by label, and the mount waits for the `created()` request. [Review](reviews/batch24/InstallationSettings.md). | 1 → 2 |
| History `model/states` | One case per job state, plus 9 new cases for `HIERARCHICAL_COLLECTION_DATASET_STATES`. Its source lists are cast `string[]`, so the compiler can't catch a value missing from `STATES`. [Review](reviews/batch24/states.md). | 1 → 16 |
| usePopper | Elements are created in the mount helper. A vacuous check, `const { visible } = wrapper.vm` copied before the click, now re-reads `visible` after the click and fails under `trigger: "click"`. [Review](reviews/batch24/usePopper.md). | 3 → 3 |

## Reuse and follow-through

[GalaxyAI chat harness](reviews/batch24/GalaxyAI-test-utils.md) (`client/src/components/GalaxyAI/test-utils.ts`) owns the hoisted stubs, 11 module mocks, mount, `messageTexts`, `sendMessage`, `chatReply` and a typed deferred response. Before, these were duplicated across newchat and supporting routesync (3 → 3, counter unchanged). Each suite keeps its own `vue-router` mock and `beforeEach`. `vi.mock` in an imported helper follows `ObjectStore/mockServices.ts`; suites must import GalaxyAI only through the harness. Dead `scrollTo` and `@/app` mocks are removed.

Guidance: none.

## Validation and review

30 cases across 5 suites pass: 27 selected, 3 supporting. The selected baseline was 11. Each commit's tests pass at that commit, shuffled with seed `240101`. Full client vue-tsc passes at the tip; ESLint, Prettier and source commit hooks pass. [Independent review](reviews/batch24/review.md) approved all five commits.

Commits: `884b7b2e936` (harness + routesync), `048c143fe98` (newchat), `d2ceb371a1b` (InstallationSettings), `d6919cd1089` (states), `93d683a17c2` (usePopper).
