# Batch 54 — EmailReportForm

Originator: `client/src/components/Common/EmailReportForm.test.ts`.
Base: `e1eecdf4f1a92feeeb2d590cfc6aba6bd8c64674`.

The original single scenario and all three checks remain: submitting the report produces sanitizer input with the `links` profile; that input contains the expected issue href and `_blank` target; the rendered alert's anchor text equals `issue #1`. Real GButton, FormElement, and GAlert children still render, and the real submit button is clicked. Required queries now use `get`; assertion input and expected values are unchanged.

Native `props` and `global` replace compatibility options and remove the object cast. `withPlugins` installs the owned testing Pinia without replacing shared setup; `onTestFinished` disposes it after mounted components unmount. `enableAutoUnmount(afterEach)` is registered after the sanitizer cleanup hook, so reverse-order hook execution unmounts first. The shared pass-through `sanitizeHtml` implementation is never changed, reset, or restored: only call history clears before and after the case. No setup helper or exports are added for this single-use mount.

## Validation

Baseline completed before edits; baseline and final shuffled Vitest runs passed one case using Node 22.20.0, one worker, and seed 540101:

```
VITE_CONFIG_NATIVE_IGNORE_WARNING=true npm_config_use_node_version=$(cat .node_version) pnpm exec vitest run src/components/Common/EmailReportForm.test.ts --maxWorkers=1 --sequence.shuffle --sequence.seed=540101 --coverage --coverage.reporter=json --coverage.reportsDirectory=/private/tmp/readability54-email-before
```

The final invocation substitutes `readability54-email-after`. Logs: `/private/tmp/readability54-email-before.log`, `/private/tmp/readability54-email-after.log`; artifacts: `/private/tmp/readability54-email-before/coverage-final.json`, `/private/tmp/readability54-email-after/coverage-final.json`.

Exact comparison normalizes source paths from `/client/` and compares covered statement locations, function locations, and individual branch-arm locations. Both runs have 345 source files and the exact same 864 covered locations: zero losses or additions. EmailReportForm.vue retains 23 covered statements, 7 functions, and 15 branch arms. Default source coverage excludes external shared UI package files reached through the existing node_modules symlink; child rendering and its assertions are unchanged.

ESLint and Prettier passed: `/private/tmp/readability54-email-lint.log`, `/private/tmp/readability54-email-format.log`. Full client type and explicit canonical pre-commit gates passed (exit 0), recorded in `/private/tmp/readability54-email-types.log` and `/private/tmp/readability54-email-hooks.log`. All gates completed before committing. The hook command uses `/Users/jxc755/.local/share/uv/tools/pre-commit/bin/python -m pre_commit run --config /Users/jxc755/projects/repositories/galaxy/.pre-commit-config.yaml.sample --files client/src/components/Common/EmailReportForm.test.ts` with the pinned Node environment.

No production, helpers, supporting tests, dependency, inventory, or README changes. Existing guidance covers native setup, ownership, required queries, and retaining shared mock implementations; no evidenced advice gap is proposed. Driver owns independent review, integration, ledger updates, and publication.

## Actual shared UI coverage follow-up

The original EmailReportForm test remains unchanged in `/private/tmp/galaxy-readability54-wizard` (zero diff against the pinned base for this file). Ran that original and the final email-worker test with `--coverage.allowExternal`, and two explicit `--coverage.include` arguments selecting the canonical actual package components:

- `/Users/jxc755/projects/worktrees/galaxy/branch/vitest_readability/client/packages/ui/src/components/GButton.vue`
- `/Users/jxc755/projects/worktrees/galaxy/branch/vitest_readability/client/packages/ui/src/components/GAlert.vue`

Both runs passed one case. Baseline/final artifacts are `/private/tmp/readability54-email-ui-before/coverage-final.json` and `/private/tmp/readability54-email-ui-after/coverage-final.json`; logs use the corresponding `readability54-email-ui-before.log` and `readability54-email-ui-after.log` paths. Exact normalized covered statement/function/branch-arm location sets match: two actual UI source files, 124 locations, zero loss or addition. GAlert retains 35 covered statements / 10 functions / 27 branch arms; GButton retains 25 / 9 / 21. No coverage exception is needed. This is supplemental validation, not an independent review of my own rewrite.
