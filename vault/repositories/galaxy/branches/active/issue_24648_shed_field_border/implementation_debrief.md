# Implementation debrief

**STATUS: READY.** Scope as re-scoped (Scope B). The second scope evaluation recommends no further change.

```
exists /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/issue_24648_shed_field_border/differential-review/snapshots/20261103T124117Z-hardening-85ca630bac61.json
  hardening @ 85ca630bac61 vs origin/dev (merge-base 5ab3087a5662)
  since 20261103T123314Z-implementation-132b1ec8a9c8:
    commits: 0 same, 1 rebased, 0 changed, 3 new, 0 dropped
    hunks:   1 carried, 0 changed, 2 new, 1 dropped
    new     bd349efd5665 Drop unused textarea selector from Tool Shed field styles
    new     143d2074d6ac Darken Tool Shed field borders on hover
    new     85ca630bac61 Keep Tool Shed select borders on hover in every state
```

## Final implementation (4 commits on `dev`, CSS-only, `lib/tool_shed/webapp/frontend/src/styles/shed.css`)
1. `bd349efd566`: baseline refactor. Drops the `textarea.g-form-input` selector, which matched nothing.
2. `6b80449fe91`: drops the `#bbc0d2` input border override so GFormInput's grey-500 applies. Quasar selects also get grey-500.
3. `143d2074d6a`: grey-700 hover border shared by inputs and selects. Focused and valid/invalid/error fields skip it.
4. `85ca630bac6`: limits the select hover to outlined and filled fields, and keeps the primary border on a focused, hovered select, which Quasar otherwise clears.

Verified in a browser (`screenshot_debrief.md`):

| State | Colour |
|---|---|
| Rest | grey-500 `#63656d`, 5.8:1 (was 1.8:1) |
| Hover | grey-700 |
| Focus | primary `#25537b` |

Before this branch, a focused select lost its border entirely when hovered.

## Choices
- **Target `dev`:** `release_26.2` lacks #24569's grey-500 GFormInput border. A backport would need its own patch.
- **The brand focus rule stays:** it does apply (0,3,1 > 0,3,0). The first review's dead rule finding was a specificity miscount.
- **No tests:** CSS-only change. The before/after screenshots and computed colours are the evidence.
- **Follow-ups, not done here:** the undefined `--color-ebony-clay-*` tokens, the decorative borders across the shed, and the 26.2 backport.

## Reviews
- `subagents/normal_review.md` and `subagents/rescope_review.md`: all findings acted on, or refuted with reasons.
- `codex_review.md`: no findings. The Codex sandbox can't run shell commands, so the diff was included in the prompt.
- `baseline_refactor.md`, `scope_evaluation.md`, `implementation_rescope_debrief.md`, and `earlier_drafts/1/` for the first hardening pass.
- Check branch: no Python changed. Prettier passes on the CSS.

## Open item
The baseline refactor rewrote the local history; the tree is identical to the pushed head `50e41129faa`. A force-push to `jmchilton/issue_24648_shed_field_border` was denied by the permission classifier, so the fork still has the 3-commit version. John needs to approve or run: `git push --force-with-lease=issue_24648_shed_field_border:50e41129faa jmchilton issue_24648_shed_field_border`. Delete the local backup branch `issue_24648_shed_field_border_pre_baseline` afterwards.
