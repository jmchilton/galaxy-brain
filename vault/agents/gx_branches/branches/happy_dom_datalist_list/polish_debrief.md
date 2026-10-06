# happy_dom_datalist_list polish debrief (2026-10-06)

Started at `9131822c82b` and ended at `eaa30bb7c86`.

## CI
Fork CI on `9131822c82b` was all queued when polishing started.

## Checklist (GENERAL.md)
Items 2-6 passed, but the review found the fix was a no-op for real tool forms. `TextToolParameter.to_dict` always sends `datalist: []`, which is truthy in JS, so `list` stayed bound on every tool text input. The `FormDisplay` tests went green only because their fixtures leave `datalist` out.
- `eaa30bb7c86` switches `FormText.vue` to `datalist?.length` for both `:list` and the `<datalist v-if>`.
- It adds the test "should not point at a datalist without options": a piped id, with `undefined` and with `[]`. It was red under 20.14.5 with the selector error, and is green now.
- Form, Tool and Workflow Run: 72 files, 383 tests pass on node 22.20.0.

John decided (via AskUserQuestion) to leave piped datalist ids that have real options as a noted limitation, with no `useUid` id and nothing filed upstream for now.

## Strengthening (one round, which also re-checked the new commit against the checklist)
No more development needed. Description fixes:
- Opener: tool text inputs, not every form input.
- Pasted the real `DOMException` text.
- Table: added the no-`datalist` row (workflow-mode selects) and reworded the legend. The `[]` row isn't dangling, just a selector that happy-dom can't parse.
- Softened the browser line to "no suggestions change".
- `FormDisplay` reds named.
- The lockfile has two importers, and both moved to 20.14.5.

Verified by the subagent:
- the red claim (HEAD's test against HEAD~1's `FormText`);
- the 3 `FormDisplay` reds with `dev`'s `FormText` under 20.14.5;
- the 20.8.8/20.8.9 advisories;
- the #22913 pin origin;
- #22915 is CONFLICTING and red.

The full client suite (4196) wasn't rerun after the last commit.

## Left over
- Whether Chrome shows a hover arrow for `input[list]` with an empty datalist (a possible small UI change) wasn't checked.
- Upstream happy-dom issue not filed.
