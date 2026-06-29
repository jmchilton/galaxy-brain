# Issue: Auto-push notebook to Galaxy on change (revisit local-wins clobber policy)

> Local tracking note (galaxyproject/loom). Follow-up to [LOOM_PLAN.md](LOOM_PLAN.md)
> §2.4 / Decision #2. Drafted 2026-06-22.

## Summary

Revisit the deferred decision to **not** auto-push the notebook to Galaxy on every
Markdown change. Today the embedded Galaxy view only refreshes after a manual
`/sync push`. We want push-on-change so the server-side render tracks local edits,
but it was deliberately deferred for a data-safety reason (below). **For the MVP,
accept that risk and ship the naive auto-push** — this note tracks the safer
designs we'd add afterward.

## Background

`LOOM_PLAN` Decision #2 ("Refresh: build both, default manual") shipped only the
manual path. The reason auto-push was held back is policy, not difficulty:

- `pushNotebookToGalaxy()` is unconditional **local-wins**
  (`extensions/loom/galaxy-pages-sync.ts`). Every auto-push silently clobbers any
  edit made on the Galaxy server side since the last sync — no merge, no prompt.
- `last_synced_revision` is already stored in the `loom-galaxy-page` binding but is
  "stored, not enforced."

Upstream has done nothing here as of `dbb535e`. Closest existing precedent:
auto-commit-to-local-git on every notebook write (`loom.managed=true` →
`commitFile` in `state.ts`) — same "fire on every write" shape, different target.

## MVP decision (blow past the policy concern)

Ship the straightforward debounced auto-push on notebook change, **accepting the
local-wins clobber risk** for now. Do **not** gate it on the safety mechanisms
below — those are follow-ups.

## Safer designs to revisit (post-MVP)

1. **Revision/previous-hash precondition (optimistic concurrency).** Only auto-push
   when the server is still at our `last_synced_revision` (i.e. the content we're
   overwriting matches the previous hash/revision we last synced); if the server
   has diverged, skip and warn instead of clobbering. The binding already carries
   `last_synced_revision`, so the plumbing is mostly there.
2. **Last-writer-was-Orbit gate.** Only auto-push when the most recent notebook
   write originated from Orbit/the agent, not an external Galaxy edit — if we were
   the last writer, there's nothing external to clobber.

Either (or both) turns auto-push from "silently clobbers" into "safe by
construction." MVP can land without them; this note tracks adding them.

## Engineering notes for the MVP

Infra mostly exists; mirror the `embed-token-bridge.ts` / `embed-token-manager.ts`
pattern (subscribe to `onNotebookChange`, gate on bound + connected, debounce +
abort/coalesce in-flight). Three traps:

- **Feedback loop (sharp).** A successful push re-writes `notebook.md` itself
  (bumps `last_synced_revision` in the binding block), which re-fires the watcher →
  re-push → new revision → loop. Fix: dedup on the *body* with housekeeping blocks
  stripped (`stripHousekeepingBlocks`, already in `ui-bridge.ts`) — a self-push
  changes only the binding, so the stripped body is unchanged → no re-push.
- **Debounce + revision spam.** The notebook is written by the agent in bursts;
  each push is a network round-trip + a new Galaxy `page_revision` row. Debounce
  (trailing) + coalesce while in-flight.
- **Gating + error containment.** Bound + connected only
  (`isGalaxyEffectivelyConnected()`); no-op silently when unbound/disconnected/
  offline.

Should also be opt-in (off by default) per Decision #2 — needs a preference surface
(none exists yet).
