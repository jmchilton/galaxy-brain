Run via Claude Opus 5.5 at low effort.

**Verdict: needs one fix.** Range checks are right in shape, but a digit-string `contains_steps` entry that equals a step label is now rejected, while conversion (`_ConversionContext.step_id`) resolves it to the label. Regression vs base.

Acted on: fixed the digit-label regression (labels resolve before the index range check) with fixture `synthetic-frame-digit-label.gxwf.yml`, and replaced the positional checks tuple with a `_FrameRefCheck` NamedTuple carrying its own noun, in `baaac08`.

Not acted on:
- Subworkflow nesting and dict-form `contains_steps` not checked at low effort.

<details>

## Bug

**P2 1 — digit-string label now errors.** `unresolved_frame_references` treats an all-digit string as an index before checking `known_labels`. `step_id` checks labels first. Repro (worktree venv): step labeled `"7"`, `contains_steps: ["7", 1]` → lint "out-of-range step index '7'" and `to_native` raises; on base it passed and mapped to the label's id. Fix: in the str branch, `if ref in labels: continue` before the index path (i.e. label wins, then digit-index range check, else unknown label). Add a fixture/test with a digit-string label.

## Checked, fine

- Index space: inputs then steps matches native id assignment; native→format2 (`_build_format2_comments`) maps every existing id to a label via `label_map`, so only dangling ids survive as ints — flagging them is correct and roundtrips stay clean.
- Negatives, bools (excluded), ints for comments, conversion maps valid ints unchanged (`ref` passed through).
- Tests: `tests/test_comments.py` + `tests/test_interop_tests.py` 537 pass. New fixture tests exact messages/pointers; red on base (base passed all ints through).

## Nits

- 6-tuple `checks` with a positional comment is getting hard to read; a small NamedTuple would be clearer (optional).
- `kind.split()[0]` to derive "step" from "step or input" is clever; an explicit index-noun field is plainer.
- Comment digit strings stay labels (`digits_index=False`) — consistent with conversion's `comment_label_map`, fine.

</details>
