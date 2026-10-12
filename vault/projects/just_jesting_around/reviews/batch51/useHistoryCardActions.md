Driver final gates: integrated client14cases + own ToolShed4cases pass, corrected full client vue-tsc and own ToolShed types/lint/format/hooks pass. Final typing corrections independently approved; scope unchanged.

# useHistoryCardActions — readability batch 51

Implemented the focused rewrite and retained every existing behavior check. No production, helper, supporting-test, or documentation edits were needed. Independent review is owned by the batch driver.

- Origin: `client/src/components/History/useHistoryCardActions.test.ts`.
- Pinned worker base: `3fea81e4cd891cb7956898210def1d9bd50a7285`.
- The same single case still checks share/access-management, delete, and purge visibility both before and after the owner user loads: all six original checks remain.
- Existing `getFakeHistorySummary` and `getFakeRegisteredUser` factories replace unchecked partial-payload casts. The history adds the scenario-specific owner username and explicitly satisfies the composable's input through `ref<AnyHistoryEntry>`.
- A required action lookup throws with the missing action ID; visibility assertions cannot silently accept an absent action.
- An explicitly owned real Pinia gives the test the actual reactive user store and is disposed on test completion. `runInTestScope` owns composable computed effects and stops them even after assertion failure.
- The confirmation composable stays mocked because this scenario does not invoke destructive actions. The unused refresh callback is a spy; no speculative interaction cases were added.

## Validation

Baseline and final each passed one test in one suite, shuffled with seed `510101` and `--maxWorkers=1`, under the pinned Node version. Neither run reported failures or unhandled errors.

Paired V8 JSON coverage comparison normalizes the worker prefix and compares each covered statement location, function location, and branch-arm location. Both reports contain 143 source files. Covered source locations increased from 400 to 406; **zero previously covered source locations were lost**. The target composable still covers 8 statements, 3 functions, and 6 branch arms. Evidence: `/private/tmp/readability51-history-coverage-comparison.txt`; JSON reports in `/private/tmp/readability51-history-{baseline,final}/coverage-final.json`.

Full client `pnpm type-check` passed (exit 0). ESLint and `git diff --check` passed. Canonical pre-commit checks passed, including Prettier and client ESLint. The installed hook's checkout-relative config path does not exist in the disposable worktree; the same canonical `.pre-commit-config.yaml.sample` was run explicitly, followed by a hook-disabled commit to avoid rerunning the broken path. Logs: `/private/tmp/readability51-history-{baseline,final,typecheck,hooks}.log`.

## Guidance

Existing README guidance already covers domain factory reuse, required queries, scoped composables, and isolation. There is no evidenced guidance gap and no marginal advice to accumulate.
