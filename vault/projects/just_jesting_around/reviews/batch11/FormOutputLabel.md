# Iteration11: FormOutputLabel

Originator: `client/src/components/Workflow/Editor/Forms/FormOutputLabel.test.js`.

Split title/showDetails presentation from the dependent two-editor label validation sequence. A local mountOutputLabels factory creates a fresh explicit Pinia and two named steps, copies each step’s output array and uses existing withPlugins to replace the getLocalVue default Pinia. enableAutoUnmount cleans up both real mounted FormElement trees.

Preserved initial Label text, detailed output-name title, both editors’ no-error checkpoints after new-label and other-label, exact duplicate-label warning only in the conflicting editor and retention of new-label mapped to output-name in the shared workflow store. The new-label → other-label → conflict transition stays in one test because the conflict depends on the accepted labels. Original output fixture fields/values are preserved; no workflow-store contracts changed.

Reuse: getLocalVue/withPlugins/enableAutoUnmount reuse existing setup. The short two-editor arrangement has no concrete second consumer, so no general workflow-step factory was introduced. Existing guidance already covers focused scenarios and visible dependent actions; no README or marginal advice proposed.

Validation: baseline 1 passed cases; final 2 passed cases in shuffled order (seed110047). The six-originator run increased from50 to74 passed cases with no skips/failures. Reports: `/private/tmp/jest_readability_batch11_components_baseline.json` and `/private/tmp/jest_readability_batch11_components_final.json`. Scoped ESLint and Prettier run on all six owned files; root driver supplies final aggregate typecheck evidence.

Supporting source files: none. Shared factories/helpers changed: none. README/inventory/Git changes: none by this reviewer.
