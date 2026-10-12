# Tool Shed utility test — batch 55

Origin: `lib/tool_shed/webapp/frontend/src/util.test.ts`.
Worker commit: `e3830a402ce`.

The suite now uses an explicit hoisted toast mock with a static import. Toast call history resets once before each scenario. Shared teardown restores console spies, browser globals, and real timers after every case, so the error-toast scenario no longer leaves its console spy behind when shuffled after the download scenario. Only the error-toast case suppresses its expected debug output. The cookie cases expire their three owned cookie names after each case, preserving the malformed-percent-encoding scenario while eliminating document-cookie leakage.

All seven cases and all 13 original assertions remain verbatim. The clipboard success/failure checks, notification durations, missing-cookie and invalid-encoding branches, downloaded filename/URL, and delayed revocation timing are unchanged. No product, helper, dependency manifest, or supporting test changed.

Validation with Node 22.20.0 and the Tool Shed's own Vitest 3.2.7:

- Baseline and final shuffled single-worker runs, seed 550101: seven cases pass.
- V8 JSON coverage of `src/util.ts`: one file, 81 covered statement/function/individual branch-arm locations before and after, zero lost or added. Comparator: `/private/tmp/readability53-compare.py`; snapshots: `/private/tmp/readability55-util-{before,after}/coverage-final.json`.
- Whole Tool Shed frontend typecheck passes before and after (`/private/tmp/readability55-util-types-{before,after}.log`).
- Tool Shed ESLint and Prettier checks pass. Explicit canonical pre-commit config passes for the changed file.

The Tool Shed dependencies lacked a coverage provider. A matching `@vitest/coverage-v8@3.2.7` was installed only in `/private/tmp/readability55-toolshed-coverage` and exposed through a removable, untracked `node_modules/@vitest/coverage-v8` symlink in the canonical Tool Shed dependency directory. No tracked dependency files changed. The temp worker links canonical Tool Shed node_modules, as other workers link canonical client dependencies.

Advice: the existing README's explicit lifecycle/isolation guidance covers the fixes. No new shared abstraction or README change is warranted for this small utility suite; importing the Galaxy client mount helpers into the separate Tool Shed frontend would add unrelated plugin dependencies.
