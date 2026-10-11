# CollectionProgress

Selected originator: `client/src/components/History/Content/Collection/CollectionProgress.test.ts`. Baseline **4 tests** → final **5 tests**.

The four cases each built a `{ job_state_summary, populated_state }` object, wrapped it in `JobStateSummary`, and checked one bar at a time with `wrapper.find(".progress").find(".bg-…").attributes("aria-valuenow")`. Now `mountWithJobs(jobStates)` and `summaryOf(jobStates)` take just the job counts, and `renderedBars(wrapper)` returns every rendered bar as `{ variant: aria-valuenow }`. The three static cases are one `it.each` table of job counts → expected bars. The update case mounts, then `setProps` a fresh summary with literal counts. Before, it mutated the shared `dsc` object between steps. The unneeded `flushPromises` went (nothing async runs; `mount` renders the real BProgress synchronously), and `enableAutoUnmount(afterEach)` unmounts the wrappers.

Every original assertion survives. Running 3 → warning `3`. Running 3 / failed 1 / ok 1 → warning `3`, success `1`, danger `1`. Queued 3 → secondary `3`. Update → warning `3`, then warning `1` and success `2`. Strengthened: each check is now the exact set of bars, so an extra or missing bar fails too. For example, the update case asserts no success bar while `ok` is 0. New case: all jobs terminal (`ok: 2` of 2) hides the progress bar, which covers the `!summary.isTerminal` guard. All inputs, including `populated_state: {}`, are as in the original.

Reuse: none fits. `getFakeCollectionSummary` builds a full HDCA and is not needed for a summary-only prop. The helpers are local to this file.

Validation: 5 tests pass shuffled (seed `450101`, `NODE_OPTIONS=--no-webstorage`). Per-file coverage: nothing lost, and the new terminal case is the first to reach the hidden-bar branch (CollectionProgress.vue 2/2 lines, 5/5 branches; JobStateSummary.js 19/34 lines, 20/33 branches). ESLint (`--max-warnings 0`), Prettier and full client vue-tsc pass.

Notes: `populated_state: {}` is not a real value (HDCA `populated_state` is a string such as `"ok"`). It was kept unchanged. A truthy non-`"new"` value is what makes the summary non-new, so `"ok"` would behave the same. A sibling `CollectionProgress.test.js` is an older copy of the same four cases. Upstream `dev` has both files: the 2024 TypeScript port added the `.ts` and never removed the `.js`. It was left alone.

Guidance: none.
