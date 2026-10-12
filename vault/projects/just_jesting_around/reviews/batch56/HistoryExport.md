# History Export index — batch 56

Origin: `client/src/components/HistoryExport/Index.test.js`.

The case now names the condition that displays the tabs: loaded, writable file sources. Its file-source arrangement sits directly in the scenario rather than mutating the mock at module scope. Cleanup retains the mock's initial implementation, unmounts first, then resets/restores the mock. The test's own testing Pinia is installed through native `global: withPlugins(localVue, pinia)` and disposed after wrapper teardown, replacing the ignored top-level `pinia` mount option. Shared plugin/stub defaults and shallow rendering remain intact.

One original case and its one tab-existence assertion are preserved, including the same history ID and awaited `flushPromises` before checking the component. This remains a narrow render smoke test; no new product behavior or independent edge-case tests were added. No supporting test, shared helper, product, dependency, or documentation file changed.

Validation with Node 22.20.0:

- Baseline/final shuffled Vitest runs, seed 560101, one worker: one case passes.
- Exact covered-location comparison: 214 files, 344 statement/function/individual branch-arm locations before and after; zero lost or added. Snapshots: `/private/tmp/readability56-export-{before,after}/coverage-final.json`; comparator: `/private/tmp/readability53-compare.py`.
- Full client `vue-tsc --noEmit --pretty false` passes (exit 0), `/private/tmp/readability56-export-typecheck.log`.
- ESLint, Prettier check, whitespace check, and explicit canonical pre-commit gates pass.

Advice: existing README guidance already covers native mount plugin options and teardown ordering. No new shared abstraction or marginal advice is justified by one small scenario.
