# Polish debrief — `issue_292_frame_labels`

Run via Claude Opus 5.5 at low effort.

- Wrote [pr_description.md](pr_description.md). One strengthening round returned no development tasks. It did produce two wording fixes, both applied:
  - The risk sentence now covers `int()`-accepted junk such as `"-1"`.
  - The list-form `id`-vs-`label` change moved out of the collapsed block.
- The `#TS_PR` placeholders get filled once the TS PR opens.
- Scope question left for John: should a range check on integer or digit `contains_steps` entries be a follow-up issue? Out-of-range entries still produce a dangling `child_steps`.
- Head `2601790`: three commits (implementation, thermo dedupe, restored non-frame `contains_comments` error). Two Codex fix commits were dropped from the branch; [codex_review.md](codex_review.md) says why.
