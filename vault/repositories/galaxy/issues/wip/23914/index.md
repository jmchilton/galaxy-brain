# galaxy#23914 — Notebook cards can hide "Share and Publish" when the current user loads after the card mounts

[Issue](https://github.com/galaxyproject/galaxy/issues/23914) · [proposal](proposal.md) · [debrief](debrief.md)

`PageCard.vue` builds its action lists as plain arrays at setup, so a notebook card (history/invocation notebooks list) that mounts before the current user loads keeps owner-only "Share and Publish" hidden while the computed "Owned by" badge updates; reproduced in vitest only, the browser race is probably rare; follow-up to [#23909](https://github.com/galaxyproject/galaxy/pull/23909)'s review; next: make `primaryActions`/`secondaryActions` computed plus a user-loads-after-mount test (adapt to dev's Vue 3 harness).
