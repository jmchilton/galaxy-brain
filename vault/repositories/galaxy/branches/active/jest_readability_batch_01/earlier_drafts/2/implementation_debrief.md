READY: the five-file readability batch is implemented, reviewed, and validated; fork CI remains to run.

Galaxy branch `jest_readability_batch_01` is based on dev commit `c35feb587eb8738a2d94cfb91769d0fbd14839bf`. A dedicated subagent handled each randomly selected component/composable/store/utility/API test. The reproducible sample and all five per-file reports are in [the project batch report](../../../../../../../projects/just_jesting_around/READABILITY_BATCH_01.md).

The changes replace opaque combined cases with descriptive independent scenarios, reuse existing helpers/factories, narrow store API mocks, and make revision fixtures schema-checked. The store retains all 71 scenarios and 150 assertions while removing 92 unsafe annotations/casts and 123 net lines. Markdown assertions now require actual heading/link output; boolean tables retain all 13 original input/result pairs. The component uses named examples, real dropdown clicks, fresh Pinia, and unmount cleanup. The API mocking tests install handlers per test rather than relying on file-level registration.

Client README guidance now covers readable scenarios, positive evidence alongside negative assertions, handler lifetime and type inference, direct context-free composables, and awaiting returned promises. Full migration of the README's existing Vue 2 examples is a follow-up.

Validation: baseline 88 cases passed; final combined run passed all five suites and 98 cases. The additional cases split existing expectations, rather than introducing new production behaviors. All modified tests and README pass Prettier; all five test files pass ESLint; full client `pnpm exec vue-tsc --noEmit` passes. Tests were run with `pnpm exec vitest run <five paths> --maxWorkers=2 --reporter=verbose`. The full client suite was not run because no production/shared-helper code changed.

Independent normal review found no blocking findings and checked exact store assertion preservation. Test challenge retains all baseline cases; shared page/revision factories and a pure upload-item-builder spy remain documented follow-ups. [Scope evaluation](scope_evaluation.md) recommends retaining five files plus the guide. [Screenshot audit](screenshot_debrief.md) found screenshots not relevant because no production or E2E source changed.

Shared typed page/revision factories have concrete consumers in store, API, and PageEditor tests, but migrating them is outside this batch. The existing upload module remains mocked for component-boundary isolation; its pure helper is separately tested. No PR was opened.

Galaxy commit: `95ec3e2a4752ee2b84e432163497678b899f0f16`. [Review the branch diff](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:jest_readability_batch_01).

README revision 01: removed the async-store-action and useMarkdown illustrative phrases at John's request. Separated mock-handler lifetime guidance from inferred-response typing and made the response.untyped snippet self-contained with beforeEach registration. Clarified that this bypasses a response shape for a known endpoint; paths missing from the schema are a different case. No tests or production code changed. README Prettier and whitespace checks pass; independent revision review found no findings. Earlier 98-case, lint, and type-check results remain applicable.
