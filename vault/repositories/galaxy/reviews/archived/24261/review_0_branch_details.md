# Review branch `pr_24261_review_0`

Branched from the reviewed head `4d7934dc99c`. The branch removes the Tool Shed's second focus ring so shed fields show only GFormInput's outline. It also deletes the `:focus` glow rules, which never render because `:focus-visible` always wins on text inputs, and gives GFormInput the same grey-500 border as GSelect. Finally, it adds an assertion that `UserDeletion`'s invalid email marks its `GFormInput` `aria-invalid`.

- `2dfa33fce80` Drop shed's box-shadow focus ring so fields show one ring: removes the 1px `box-shadow` from `.shed-main input.g-form-input:focus` and keeps the navy border (P3 1).
- `ac69aadfae9` Assert UserDeletion's invalid email marks the input aria-invalid: one assertion in `UserDeletion.test.ts`. It fails against the pre-PR `GFormInput` and passes on the PR (P3 4).
- `1c044e2bcae` Drop GFormInput's :focus glow, which :focus-visible always overrides: removes 11 dead lines, including the valid/invalid glow variants and the repeated gap shadow (P3 2).
- `3fb28dbb73d` Give GFormInput GSelect's grey-500 field border: changes both border declarations from grey-400 to grey-500 (P3 3, border part only).
