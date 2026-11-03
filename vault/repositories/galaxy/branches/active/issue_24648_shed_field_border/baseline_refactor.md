Run via Claude Opus 5.5 at high effort.

One behaviour-neutral refactor commit now sits on `origin/dev` ahead of the fix. It drops the `.shed-main textarea.g-form-input` selector, which matches nothing.

## Details

- **New base commit** `bd349efd566`, "Drop unused textarea selector from Tool Shed field styles". Before this, the change was folded into the hover commit (`91906239662`). No Tool Shed `.vue` file renders a `textarea` with `g-form-input`, so removing the selector changes nothing on screen.
- **Fix commits replayed on top:** `6b80449fe91` (3:1 border), `143d2074d6a` (hover; its message no longer mentions the textarea), and `85ca630bac6` (select hover in every state).
- **Checks:** the final tree is byte-identical to the old head `50e41129faa`. The old head is kept as the local branch `issue_24648_shed_field_border_pre_baseline`. The branch now sits on origin/dev at `5ab3087a566`, the same merge-base as before. Nothing was pushed.
- **Left in place:** everything else is the fix itself, or is tied to it: the border colours, the hover rules, the focus-hover `::before` rule, and the comments explaining them. None of it can be applied without changing behaviour.
