### P3 1: Tool Shed fields now show two focus rings (implementation verified)

`shed.css` draws its own focus ring on Tool Shed fields with `.shed-main input.g-form-input:focus { box-shadow: 0 0 0 1px #25537b }`. Before this PR, `GFormInput` set `outline: none`, so that was the only ring. Now `GFormInput` also draws a 2px outline, offset by 2px, and `shed.css` never turns it off. A focused field on the login, register or repository filter page now shows a 1px navy ring, a 1px gap, and then the 2px navy outline. The PR description says the `shed.css` overrides still win for padding, font and border, which is true, but the focus ring changed.

<details><summary>Details</summary>

- Shed's `:focus` rule has specificity (0,3,1). That beats GFormInput's scoped `.g-form-input:focus-visible[data-v-…]` at (0,3,0), so shed's 1px `box-shadow` replaces the package's background-gap shadow.
- The package `outline` still applies because shed never sets `outline`.
- Both rings are the same colour: `--color-blue-600` and `--color-galaxy-primary` are both `#25537b`.

</details>

Drop the `box-shadow` ring from `shed.css` and keep its border colour, so Tool Shed fields use the package's outline, which also survives forced-colors mode. Also update the Tool Shed sentence in the PR description.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort, and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: The `:focus` glow rules never render, and mouse focus gets the new ring too (implementation verified)

Browsers match `:focus-visible` on every focus of a text-entry input, including focus from a mouse click. Every type `GFormInput` is used with (text, password, email, search, number) is text-entry, and the `:focus-visible` rule comes later at the same specificity. So the `:focus` glow `box-shadow` and its `g-valid` and `g-invalid` variants never show. About 11 lines are dead. The second effect is visible: the PR describes and screenshots a "keyboard focus ring", but clicking into a field shows the same 2px navy outline. That is arguably better, but it changes what every user sees, and the description should say so.

Remove the three glow `box-shadow` declarations and the `box-shadow` that the state `:focus-visible` blocks repeat only to override them. The state blocks then set just `border-color` and `outline-color`. Mention mouse focus in the description.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: GFormInput and GSelect still disagree on field chrome and state mapping

The new `--field-*` tokens give the two side-by-side fields the same height, padding and medium radius. The rest still differs:

- Border: `GFormInput` uses `grey-400`, about 3.14:1 on white, which is just over the 3:1 minimum. `GSelect` uses `grey-500`, with a comment citing WCAG 1.4.11.
- Disabled styling differs.
- The `size`/`state` to `g-<size>`/`g-valid`/`g-invalid`/`aria-invalid` mapping is written twice, and it has already drifted: `GSelect` always emits `g-medium`, while `GFormInput` emits no size class.

The review branch aligns the border on `grey-500`. Beyond that, field-chrome tokens next to the `--field-*` geometry tokens (border, focus ring, disabled background) and a shared size/state class helper in `componentVariants.ts` would make the two fields one abstraction instead of two copies. That fits a follow-up, since the PR deliberately leaves `GSelect`'s output unchanged.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort, and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort.

</details>

### P3 4: Cover the newly wired `state` prop on an existing consumer (implementation verified)

`UserDeletion.vue` already binds `:state` on `GFormInput`. Before this PR that binding fell through as an inert HTML attribute; now it drives `aria-invalid` and the invalid border. The test "shows validation state after input blur" only checks the feedback text. Add `expect(input.attributes("aria-invalid")).toBe("true")` there.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
