# Workflow card actions — batch 58 author review

Originator: `client/src/components/Workflow/List/useWorkflowCardActions.test.ts`.

Both original cases and all 14 assertions remain unchanged. The ownership case constructs the composable before loading the owner and checks all four visibility values before and after that transition. The layout case still loads the owner, constructs list then editor actions, and checks the exact ordered arrays including duplicate external-link IDs. It does not weaken ordering into membership checks or seed ownership before the transition scenario.

The existing workflow factory remains. The existing registered-user factory replaces the incomplete user cast while preserving explicit id, email, and owner username. Each scenario explicitly owns a real Pinia, creates its user store against that instance, and registers disposal. Composable calls use shared runInTestScope so computed effects stop on test completion even after failures. No production, shared helper, or supporting-test edits.

Validation: shuffled seed 580101 passes two cases; pristine/final V8 coverage has 147 files and 451 covered statement/function/branch-arm locations with zero lost or added. Full client vue-tsc, file ESLint/Prettier, and explicit absolute-config repository pre-commit gates pass. Logs and coverage evidence are `/private/tmp/readability58-actions-*`.

Existing Pinia, composable-scope, and fixture-factory guidance covers the changes; no new README or marginal advice proposed.
