# Debrief: workflow_static_restriction_default_not_preselected

Prepared 2026-10-07. Source: `workflow_static_restriction_default_not_preselected.md`. Proposal: `proposed_workflow_static_restriction_default_not_preselected.md`.

## Research

- Module repro rerun twice on dev `02a2e659909` (scratch worktrees). Went past the source: built the input the way the run form does and serialized via `to_dict` → default `b` sends `value: 'a'`; multiple default `[b, c]` sends `None`; no option marked selected.
- Client read (no browser): `WorkflowRunFormSimple` uses payload `value` as is; nothing in `Workflow/Run` applies the default elsewhere; `FormSelection` ignores per-option `selected`; `FormSelect` fills a required select with first option on mount → both cases most likely show `a`.
- History: #13242 still open (related); #13293 fixed a comment on it, making per-option flags follow the default on the connection path. Top-level `selected` kwarg is dead.
- #21015 has no PR; fork branch link resolves publicly. No duplicate.

## Rewrite

- One-sentence opener; value/options table with "Run form shows (per client code)" column; run-form-path repro in details.
- Context cites 🎯 #21015, 🌿 branch, #13242, #13293. Proposed Approach: mark options selected from default in `staticRestrictions` branch (share helper with `restrict_options`), drop dead kwarg. Alternatives included.

## Leftover

- UI effect unconfirmed in a browser; expert run form and many-options select view only skimmed. A quick Playwright/manual check before posting would harden it.
- Swap branch link for PR when 21015 PR opens. Assign John (his branch work).
