Driver final scope: LibraryEditField became storified in concurrent later-lane work and is EXCLUDED from the final batch. Only WorkflowHelpDisplay and NodeInvocationText cleanup is retained. Library validation below records exploratory evidence; its final diff against the recorded published base is zero.

# Sanitizer lifecycle follow-through — readability batch 49

These supporting suites reuse the sanitizer restoration and VTU auto-unmount pattern from originating `TrsTool.test.ts`. All were checked eligible by the driver; no supporting counters advance.

## Scope and commits

- `WorkflowHelpDisplay.test.ts`: `0f50600870f324142550b470b9ce53f75df0b1cb`.
- `NodeInvocationText.test.ts`: `78a7f9a07c49b2fe36890b02350b31fc8b87a24f`.
- `LibraryEditField.test.js`: fixup `c34a4cad218991737334225cdf77b8611e873af8`, targeting existing readability origin `2796b93bb83`. Driver owns folding onto pinned dev `9ac3cd2eb304f2860c0daf3afea0cc777f9e5cd6` and remote lease `e1f3ed5dce2da8ccd93324fd6b536db3269a8810`.

Help and Node introductions belong to upstream dev (no readability origin existed), so their lifecycle changes are separate supporting commits. Every commit contains its Test-File, Readability-Iteration 49, and Co-Authored-By trailers together. No production, shared helpers, fixtures, other supporting tests, or ledger files changed.

## Behavior and assertion audit

Help and Node now capture the globally mocked sanitizer's original implementation, clear calls and install the marker implementation before each test, unmount wrappers automatically, then restore the original implementation and reset calls after each test even when assertions fail. Full Help mounting and shallow Node mounting remain unchanged; conversion of their legacy mount options would expand this supporting lifecycle scope.

Library already preserved the sanitizer implementation and auto-unmounted wrappers. Its restore hook was nested inside the suite while auto-unmount lived at root scope, so the nested hook restored the sanitizer before root unmount. Both cleanup hooks now share root scope, with auto-unmount registered last. Vitest's reverse afterEach ordering therefore unmounts first and restores second. No new thin helper is introduced; existing mock and VTU APIs suffice.

All assertion bodies and case counts remain unchanged: Help's eight checks covering sanitizer inputs/profiles and rendered readme/help, Node's two checks covering default-profile invocation and rendered marker, and Library's complete sanitization call matrices, link/markup/rendered text, title, collapsed/expanded state, toggle labels, and emitted events. Supporting cleanup adds no synthetic lifecycle assertions.

## Validation

Each consumer was run separately at its unchanged baseline and rewritten version with pinned node, `--maxWorkers=1`, shuffled seed 490101, and V8 JSON coverage:

| Consumer | Cases before/after | Source files before/after | Covered component statements/functions/branches before → after |
| --- | --- | --- | --- |
| WorkflowHelpDisplay | 1 / 1 | 16 / 16 | 5/1/9 → 5/1/9 |
| NodeInvocationText | 1 / 1 | 170 / 170 | 5/2/6 → 5/2/6 |
| LibraryEditField | 5 / 5 | 15 / 15 | 8/5/18 → 8/5/18 |

All six isolated runs passed without skips, and every previously covered statement/function/branch location remains covered. A combined shuffled run of the three rewritten suites also passed all seven cases. ESLint, Prettier, final explicit canonical pre-commit hooks, and whitespace checks passed. The first Help hook run trimmed whitespace; its clean rerun passed.

Isolated logs and coverage directories: `/private/tmp/readability49-sanitizer-{help,node,library}-{baseline,final}` followed by `.log` or `-coverage`. Per-consumer coverage comparison: `/private/tmp/readability49-sanitizer-support-isolated-coverage-comparison.json`. Combined final log: `/private/tmp/readability49-sanitizer-support-final.log`.

## Guidance conclusion

The originating test exposed a recurring omission in existing consumers: generic mock cleanup advice does not explain preserving the global sanitizer mock implementation or keeping unmount and restoration in the same hook scope with the correct reverse ordering. The three consumers now demonstrate the reusable lifecycle through existing APIs. The driver can record this concrete advice with the originating TRS evidence; no additional helper, supporting counter changes, or production work is needed.

No security findings. No push performed by this worker.
