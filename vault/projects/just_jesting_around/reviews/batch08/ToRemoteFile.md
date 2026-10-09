# ToRemoteFile review

Selected originator: `client/src/components/HistoryExport/ToRemoteFile.test.js`.

Kept the original remote export happy path: history `hist1235`, destination `gxfiles://`, filename `export.tar.gz`, response job `job123789`, successful job state, and success alert. The test now emits the real `ExportForm` child's `export` event instead of directly calling the parent method, so event wiring is covered. Setup, action, and assertions live in one case; a local request spy replaces mutable cross-test request state, and `mockResolvedValue` replaces a hand-built immediately resolved promise.

The request assertion checks the exact body and one request, and a new exact assertion verifies that the returned job ID reaches `waitOnJob`. The original success variant assertion remains. The parent method does not return its request promise, so the existing `flushPromises` approach is retained. The subject remains shallow-mounted, with automatic unmount.

Reuse: existing local Vue and server helpers. A one-case arrangement does not justify a shared factory or mount abstraction. No supporting edits.

Cases: 1 → 1. Included in the passing shuffled 25-case client run (seed 80143), scoped ESLint, and Prettier. Root performs full typing and independent review.

Guidance: no evidence of a missing rule; these changes apply existing event, asynchronous operation, and scenario guidance. No README/marginal addition proposed.
