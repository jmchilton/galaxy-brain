# Polish debrief: use_config_drop_fetch_once

Polished 2026-10-09 at `6045fcb730d` (no branch changes during polish). Description: [pr_description.md](pr_description.md). Titles: [pr_titles.md](pr_titles.md).

- **CI:** fork CI on `6045fcb730d` was still queued when polish started; no failures. An earlier run on the pre-amend `8e68951968c` was cancelled. Recheck before opening.
- **Checklist (GENERAL.md):** all items pass; the human-read item is left for John. Client-only, so WORKFLOW_RELATED.md doesn't apply.
- **Strengthening round:** no branch development needed. Fixes applied to the description:
  - Caller counts: 60 `useConfig(` call sites in total (39 besides the 21 changed), not ~61/~82. Also corrected in `scope_evaluation.md` and `implementation_debrief.md`.
  - "`vue-tsc` rejects any argument" overclaimed: `checkJs: false`, and 3 of the 21 changed callers are plain-JS `<script>` blocks. Reworded to "rejects one in TypeScript components".
  - Only the 20 former `useConfig(true)` callers change behaviour; UserSharing's `useConfig(false)` already retried.
  - "Nobody saw a broken page" narrowed to when config loads; "why not fix the guard" now has its own bold-italic sentence.
- **Left over:**
  - Optional nit: merge the two comment lines at `config.ts:12-13`. Not worth amending for.
  - Out of scope: converting the 6 plain-JS `useConfig` callers to TypeScript so `vue-tsc` covers every caller.
  - "4333 tests pass" and eslint/prettier results come from the implementation session, not rerun during polish.
