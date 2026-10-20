My agent labeled these as P3s but P3 1 and P3 2 seem like potential blockers? Can you review and dispute if I'm wrong? P3 3 and P3 4 look like really optional - P3 4 is a pretty small, useful assertion though I would think. -John 

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at medium effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this is a styling and prop addition to the internal `GFormInput` wrapper and doesn't lock Galaxy into difficult to change choices (a two-way door). The one mildly sticky piece is the new public `--field-*` token names and the `size`/`state` props on the published `@galaxyproject/galaxy-ui` package, which external consumers could start depending on.

<details><summary>Risk Details</summary>

- New `--field-height-*`, `--field-padding-*`, `--field-radius-*` tokens become part of galaxy-ui's token contract (mirrored in `custom_theme_variables.scss`, pinned by `tokensContract.test.ts`); renaming them later is a breaking change for package consumers.
- `size` and `state` props mirror bootstrap-vue's `b-form-input` API; that shape is now the expected one for future G* fields.
- Unscoped `:where(.g-form-input)` / `.input-group > .g-form-input` rules change the box (full width, block, height) of every existing `GFormInput` usage across the client; layouts that relied on the old inline sizing may shift visibly.
- `INSTANCE_LISTENERS: false` under `@vue/compat` changes how undeclared listeners reach the `<input>`; existing callers using `@click`/`@keyup` now get them on the input.
- Adding a default `type="text"` relies on fallthrough attrs to let callers override it (e.g. `type="password"`, `type="range"`).

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should spot-check the existing `GFormInput` call sites (RenameModal, CopyModal, WorkflowExtractionForm, QuotaForm, VaultSecret, DelayedInput, workflow editor) for layout regressions from the new full-width block box, especially inside input groups and inline forms. Also confirm the `--field-*` token names are ones the team is happy to keep in galaxy-ui's public contract.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch</summary>

# Review branch [`pr_24261_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24261_review_0)

Branched from the reviewed head [`4d7934dc99c`](https://github.com/jmchilton/galaxy/commit/4d7934dc99c). The branch removes the Tool Shed's second focus ring so shed fields show only GFormInput's outline. It also deletes the `:focus` glow rules, which never render because `:focus-visible` always wins on text inputs, and gives GFormInput the same grey-500 border as GSelect. Finally, it adds an assertion that `UserDeletion`'s invalid email marks its `GFormInput` `aria-invalid`.

- [`2dfa33fce80`](https://github.com/jmchilton/galaxy/commit/2dfa33fce80) Drop shed's box-shadow focus ring so fields show one ring: removes the 1px `box-shadow` from `.shed-main input.g-form-input:focus` and keeps the navy border (P3 1).
- [`ac69aadfae9`](https://github.com/jmchilton/galaxy/commit/ac69aadfae9) Assert UserDeletion's invalid email marks the input aria-invalid: one assertion in `UserDeletion.test.ts`. It fails against the pre-PR `GFormInput` and passes on the PR (P3 4).
- [`1c044e2bcae`](https://github.com/jmchilton/galaxy/commit/1c044e2bcae) Drop GFormInput's :focus glow, which :focus-visible always overrides: removes 11 dead lines, including the valid/invalid glow variants and the repeated gap shadow (P3 2).
- [`3fb28dbb73d`](https://github.com/jmchilton/galaxy/commit/3fb28dbb73d) Give GFormInput GSelect's grey-500 field border: changes both border declarations from grey-400 to grey-500 (P3 3, border part only).

</details>

### P3 1: Tool Shed fields now show two focus rings (implementation verified)

`shed.css` draws its own focus ring on Tool Shed fields with `.shed-main input.g-form-input:focus { box-shadow: 0 0 0 1px #25537b }`. Before this PR, `GFormInput` set `outline: none`, so that was the only ring. Now `GFormInput` also draws a 2px outline, offset by 2px, and `shed.css` never turns it off. A focused field on the login, register or repository filter page now shows a 1px navy ring, a 1px gap, and then the 2px navy outline. The PR description says the `shed.css` overrides still win for padding, font and border, which is true, but the focus ring changed.

<details><summary>Details</summary>

- Shed's `:focus` rule has specificity (0,3,1). That beats GFormInput's scoped `.g-form-input:focus-visible[data-v-…]` at (0,3,0), so shed's 1px `box-shadow` replaces the package's background-gap shadow.
- The package `outline` still applies because shed never sets `outline`.
- Both rings are the same colour: `--color-blue-600` and `--color-galaxy-primary` are both `#25537b`.

</details>

Drop the `box-shadow` ring from `shed.css` and keep its border colour, so Tool Shed fields use the package's outline, which also survives forced-colors mode. Also update the Tool Shed sentence in the PR description. Fixed in [`2dfa33fce80`](https://github.com/jmchilton/galaxy/commit/2dfa33fce80).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort, and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: The `:focus` glow rules never render, and mouse focus gets the new ring too (implementation verified)

Browsers match `:focus-visible` on every focus of a text-entry input, including focus from a mouse click. Every type `GFormInput` is used with (text, password, email, search, number) is text-entry, and the `:focus-visible` rule comes later at the same specificity. So the `:focus` glow `box-shadow` and its `g-valid` and `g-invalid` variants never show. About 11 lines are dead. The second effect is visible: the PR describes and screenshots a "keyboard focus ring", but clicking into a field shows the same 2px navy outline. That is arguably better, but it changes what every user sees, and the description should say so.

Remove the three glow `box-shadow` declarations and the `box-shadow` that the state `:focus-visible` blocks repeat only to override them. The state blocks then set just `border-color` and `outline-color`. Mention mouse focus in the description. Fixed in [`1c044e2bcae`](https://github.com/jmchilton/galaxy/commit/1c044e2bcae).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: GFormInput and GSelect still disagree on field chrome and state mapping

The new `--field-*` tokens give the two side-by-side fields the same height, padding and medium radius. The rest still differs:

- Border: `GFormInput` uses `grey-400`, about 3.14:1 on white, which is just over the 3:1 minimum. `GSelect` uses `grey-500`, with a comment citing WCAG 1.4.11.
- Disabled styling differs.
- The `size`/`state` to `g-<size>`/`g-valid`/`g-invalid`/`aria-invalid` mapping is written twice, and it has already drifted: `GSelect` always emits `g-medium`, while `GFormInput` emits no size class.

The review branch aligns the border on `grey-500`. Beyond that, field-chrome tokens next to the `--field-*` geometry tokens (border, focus ring, disabled background) and a shared size/state class helper in `componentVariants.ts` would make the two fields one abstraction instead of two copies. That fits a follow-up, since the PR deliberately leaves `GSelect`'s output unchanged. Border aligned in [`3fb28dbb73d`](https://github.com/jmchilton/galaxy/commit/3fb28dbb73d).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort, and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort.

</details>

### P3 4: Cover the newly wired `state` prop on an existing consumer (implementation verified)

`UserDeletion.vue` already binds `:state` on `GFormInput`. Before this PR that binding fell through as an inert HTML attribute; now it drives `aria-invalid` and the invalid border. The test "shows validation state after input blur" only checks the feedback text. Add `expect(input.attributes("aria-invalid")).toBe("true")` there. Added in [`ac69aadfae9`](https://github.com/jmchilton/galaxy/commit/ac69aadfae9).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
