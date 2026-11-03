# Normal review: issue_24648_shed_field_border

Acted on nothing in code. The review found no blockers. Its "dead focus rule" finding is wrong: `.shed-main input.g-form-input:focus` is (0,3,1) (two classes plus :focus, plus a type selector), which beats GFormInput's scoped `:focus` at (0,3,0), so the brand focus border does apply.

Not acted on:
- Dead focus rule: specificity was miscounted (see above).
- Unused textarea selector: harmless, and it keeps the rule ready for a future textarea; out of scope.
- RevisionSelect pill borders: decorative and pre-existing; out of scope.
- Quasar global input reset: left to the screenshots step to verify in a browser.

## Findings

1. No blocking problems. The border still renders: `:where(.g-form-input) { border: 1px solid }` sets width and style, and the scoped `.g-form-input[data-v-*] { border-color: grey-500 }` (0,2,0) now applies because shed.css no longer sets a border at (0,2,1). grey-500 (#63656d) on white is about 5.9:1, comfortably over 3:1.
2. Dead rule (it was already dead before this branch): `.shed-main input.g-form-input:focus { border-color: galaxy-primary }` is (0,2,2), and it loses to GFormInput's scoped `.g-form-input:focus[data-v-*]` (0,3,0), which keeps grey-500. The focus indicator is GFormInput's `:focus-visible` outline, which works. Suggest deleting the shed focus rule, or at least fixing the "brand focus border" wording in the section comment, which is inaccurate.
3. `.shed-main textarea.g-form-input` matches nothing. galaxy-ui has no textarea component carrying `g-form-input`, and the shed frontend has no `<textarea>`. If one were added, it would get the `:where` 1px solid border with no colour set (currentColor = shed heading colour, which is high contrast), not grey-500, because the scoped colour applies only to GFormInput's own `<input>`. That is harmless, but the new comment ("GFormInput's grey-500 ...") is only true for the input. Consider dropping the textarea selector or mentioning this in the comment.
4. Hover feedback is gone on inputs. That is acceptable: GFormInput has no hover rule, and WCAG does not require one. On Quasar selects, shed's `::before` rule (0,3,1) also outranks Quasar's `:hover` border-colour rule, so selects have no hover darkening either. That was already the case before this branch.
5. valid/invalid: the scoped `.g-form-input.g-valid` / `.g-invalid` rules now apply (shed had overridden them before), so this is an improvement.
6. Quasar focus: `.q-field--focused` box-shadow and `::before` primary border-colour still apply. Primary #25537b is high contrast.
7. Leftover low-contrast borders: none on form fields. The grey-200/300 and ebony-clay-100 borders on cards, lists and dividers (RevisionsTab, ResetMetadataTab, ToolHistoryTab, ComponentShowcase, `--shed-border`) are decorative containers that 1.4.11 does not cover. RevisionSelect's pill borders use green-300 and orange-300; check them only if those pills are meant to convey state.
8. Not verified: I did not render the page. Quasar's dist CSS was not installed in the worktree, so I could not grep it for a global `input`/`textarea` border reset that would beat the zero-specificity `:where` rule. A quick browser check of computed `border` on a shed input would confirm.

## Details

The diff touches only lib/tool_shed/webapp/frontend/src/styles/shed.css. It removes `border: 1px solid ebony-clay-200` from the input/textarea block, removes the ebony-clay-400 hover rule, and sets the Quasar control `::before` border to grey-500. Specificity notes are in the findings above. Contrast: ebony-clay-200 #bbc0d2 was about 1.8:1; grey-500 is about 5.9:1. The comments are accurate for `<input>`. The input section header still says "brand focus border" (pre-existing), and that border never shows (finding 2). No security concerns.
