Run via claude-opus-5-5 at medium effort.

# Polish debrief: invocation_graph_output_previews

Polished at `90cdc7089d9` with no code changes: only the description, titles, tags and checklist are new. The branch is in `branches_ready_for_final_review`.

```text
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/invocation_graph_output_previews/differential-review/snapshots/20261103T174203Z-polishing-90cdc7089d9c.json
  polishing @ 90cdc7089d9c vs origin/dev (merge-base 66760b892698)
  since 20261103T165246Z-hardening-90cdc7089d9c:
    commits: 4 same, 0 rebased, 0 changed, 0 new, 0 dropped
    hunks:   20 carried, 0 changed, 0 new, 0 dropped
```

## Steps

| Step | Outcome |
|---|---|
| 1. CI | First pass pending. Recheck at hand-off: 9 of 11 runs passed. The reds are unrelated: both macOS startup jobs were cancelled, and Test Galaxy packages failed on mypy errors in `galaxy/queue_worker`, `galaxy/queues` and similar modules (`kombu.Queue`), none of which the branch touches. That job also fails on 1 of the last 3 `dev` runs. |
| 2–3. Checklist | GENERAL plus WORKFLOW_RELATED ([pr_checklist.md](pr_checklist.md), claude-opus-5-5 at medium effort). On the first pass, the item "Who hits this in practice?" failed because no issue was filed and no prior-art search was done. Polishing stopped there. John then accepted his requirements draft and the spike screenshots as the evidence, without an issue, so the item now passes (John, 2026-11-03). |
| 4. Description | [pr_description.md](pr_description.md). Leads with the four hover screenshots and presents the change as a maintainer-proposed first stage. The Risks section names the dropped mapped-over step state bug. |
| 5–6. Strengthening | One round (claude-opus-5-5 at medium effort). Applied, all to the description: the `Node.vue` change is now described as a tag plus a terminal-lookup helper, not "one line"; the test and selector count is about 550 lines (was 520); the untested "HTML/PDF previews" claim is gone; two new highlighted sentences say the Outputs tab, step cards and history are unchanged, and that the editor is unaffected. The branch didn't change, so the checklist wasn't rerun. |
| 7. Check Galaxy | `make format` made no changes. `cd lib && mypy` on the changed Python file reports one error, in `galaxy/managers/notification.py`, which the branch doesn't touch. `vue-tsc` and eslint were clean at hardening, and the code hasn't changed since. |
| 8. Titles | [pr_titles.md](pr_titles.md). The target is `dev`, so there's no version prefix. |
| 9. Tags | [pr_tags.md](pr_tags.md): `kind/feature`, `area/UI-UX`, `area/workflows`. I dropped the labeler's `area/client` and `area/testing`. |

## Left over

- **Not-ready screenshot (strengthening task 4, not done).** No screenshot shows the "This output isn't ready yet" placeholder. Capturing one means holding a step in a non-terminal state, for example with a sleep tool. The screenshot brief ruled that out, so I left it. If John wants that frame, a slow test tool would make it possible.
- **Scope decisions are recorded in [index.md](index.md):**
  - The mapped-over step state fix was dropped by John.
  - Keyboard access, whole-node hover, large-collection bounds and a lighter step-details payload stay out of scope. The open questions in the [implementation debrief](implementation_debrief.md) still apply.
- **`check_ci.sh` bugs.** Line 40's `tr -c 'A-Za-z0-9._-\n' _` fails ("reverse collating sequence"); the hyphen needs to go last. The script also finds `check_ci.json` only next to itself or in the current directory. I ran a patched scratchpad copy and didn't fix the shared script.
