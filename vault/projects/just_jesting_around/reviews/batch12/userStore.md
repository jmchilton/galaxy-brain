# userStore: accepted

Originator: `client/src/stores/userStore.test.ts`. Cases: **3 → 5**, all passing, no skips.

The combined empty-ID, front insertion, and deduplication case is split into three readable scenarios. Reusing `setupTestPinia()` replaces duplicate real Pinia creation. The existing `$reset()` cleanup remains because recent tools are backed by user storage, so fresh Pinia alone is not sufficient isolation.

Every original observation remains: an empty ID leaves no recent tools; adding `tool_a`, `tool_b`, `tool_c` produces the exact reverse order; adding `tool_a` again moves it to the front without duplication; filling ten entries preserves length ten, newest `tool_9` first, and oldest `tool_0` last; the next addition retains length ten, puts `tool_new` first, and removes `tool_0`; clearing two entries leaves an empty list. The deduplication case retains the exact pre-action order. Limit and clearing transitions stay together.

Reuse: the existing real-store helper is sufficient. Three simple string IDs and a ten-entry loop do not justify a shared recent-tools factory or harness. No supporting edits or new best-practice advice proposed.

Validation: baseline 3 passing in `/private/tmp/jest_readability_batch12_baseline.json`; final 5 passing in `/private/tmp/jest_readability_batch12_composables_final.json` (all five assigned suites 74 passing, shuffled seed `120059`, no skips). Scoped current ESLint and Prettier pass. No production changes.
