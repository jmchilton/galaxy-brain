Run via Claude Fable 5.2 at medium effort.

**Recommendation: keep the scope, all seven commits as one PR, with one small change inside commit 5: put back the two `type="password"` assertions on secret fields.** The series reads as one follow-up to #24801, and its parts lean on each other: commit 5's deletions rely on the Selenium tests in commits 3 and 4, and commit 7's claim that the filter inputs only hold text is exercised by the range test in commit 2. The tests alone (commits 1 to 4) would also stand as a PR, but that leaves the Vitest checks they replace in place and strands commit 7. The one thing I'd change is that commit 5 treats secret masking as a pass-through attribute; it is the caller's decision, and after the commit nothing checks it for the vault secret or the credentials secret. No wider expansion is worth making here: the two candidates (trimming the same assertions from the 25 other specs on `dev`, typing `Filtering` so `FilterMenu` enforces the narrowed prop) are each their own piece of work.

# Scope evaluation

The branch is 17 files, +114 −167 against `origin/dev`, with no behavior change.

## Possible Decompositions

The commits are already ordered so these splits need no rewriting, except where noted.

1. **One PR (as is).** Commits 1 to 7, reviewed commit by commit.
2. **Tests, then cleanup.**
   - PR A: commits 1 to 4. Adds the helper, the three Selenium tests, their `data-description` hooks and `navigation.yml` selectors. Passes on `dev`.
   - PR B: commits 5 to 7, after A merges. Commit 5 deletes `APIKeyItem.test.ts` and the `d-block` assertion, which only makes sense once A's tests exist.
3. **Three PRs by kind.**
   - PR A: commits 1 to 4, as above.
   - PR B: commits 5 and 6, the Vitest spec changes. After A.
   - PR C: commit 7, the filter prop typing. Independent of A and B in code; it can land in any order, though the range test in A is its best evidence.
4. **Tests with the checks they replace.** Needs commit 5 split in two.
   - PR A: commits 1 to 4 plus the three removals Selenium now covers (`APIKeyItem.test.ts`, `d-block`, the duplicate blur test).
   - PR B: the rest of commit 5 (class and pass-through assertions), commit 6 and commit 7.

## Scopes considered

### 1. As implemented (commits 1 to 7)

Three Selenium tests for inputs #24801 swapped, a shared history panel setup helper, the #24801 specs trimmed of assertions on `GFormInput`'s own rendering, typed spec fixtures, and the filter menu text inputs' `filters` prop narrowed to `string | undefined` so the conversion wrappers #24801 added go away.

| Pros | Cons |
| --- | --- |
| <ul><li>One subject: what the unposted #24801 review would have asked for.</li><li>The parts justify each other (see details).</li><li>Leaves less behind than it found: no wrapper, no casts, one spec file fewer.</li></ul> | <ul><li>"PR our tests" becomes a PR that also deletes tests the #24801 author just wrote.</li><li>Commit 5 drops the only checks that secrets are masked.</li><li>Trims 7 of the 32 specs on `dev` that assert `g-form-input`.</li></ul> |

<details>

- Commit 5 removes `APIKeyItem.test.ts` and the `d-block` assertion because commits 3 and 4 cover them in a browser. Shipped apart, either the deletions come with no visible replacement or the checks exist twice.
- Commit 7 says a boolean never reaches `FilterMenuInput` or `FilterMenuRanged`. `FilterMenu.vue` does not enforce that by type (`Filtering<any>`), so the evidence is behavioral: commit 2's range test and the existing `test_advanced_search`.
- Commit 6 types the filter menu mount helpers with the components' props, so the specs are compiled against the prop commit 7 narrows.
- The 7-of-32 boundary is principled, not arbitrary: these are the specs #24801 wrote, and the branch is its follow-up. The PR description should say so, and say the same style remains in the specs from #24686 and #24718.

</details>

### 2. As implemented, keeping the secret masking assertions (recommended)

Scope 1, but commit 5 keeps `type="password"` on the credentials secret input (`CredentialsGroupForm.test.ts`) and on the stored vault secret (`VaultSecret.test.ts`, with its `disabled` and mask value). The class assertions still go.

| Pros | Cons |
| --- | --- |
| <ul><li>Everything in scope 1.</li><li>Removes the one deletion a reviewer has a real reason to refuse.</li><li>Draws the line the commit message already claims: drop what tests `GFormInput`, keep what tests its callers.</li></ul> | <ul><li>The line between "pass-through attribute" and "caller's decision" needs a sentence in the commit message.</li><li>`VaultSecret.test.ts` keeps a full `mount` beside its `shallowMount` tests.</li></ul> |

<details>

- `type="password"` on a secret is chosen by `CredentialsGroupForm.vue` and `VaultSecret.vue`; `GFormInput` only renders what it is given. A later edit that drops the attribute shows a secret in clear text, and no test on the branch would notice. `required`, `autocomplete`, `list` and the classes are different: nothing user-visible breaks silently without them, or the base component owns them.
- The Codex review raised all three coverage losses and the debrief left the credentials one "for John". This is that decision.
- Alternative placement: assert the secret input's type in `test_credentials_group_name_error`, as commit 3 does for the API key. It fits the branch's direction, but the vault secret has no E2E test to extend, so the Vitest assertions are the consistent choice for both.
- The dropped datalist/disabled test in `FilterMenuInput.test.ts` can stay dropped. The datalist id is one template expression and nothing reads as broken without it.

</details>

### 3. Tests alone (commits 1 to 4)

The helper, the three Selenium tests, and the client hooks and selectors they need.

| Pros | Cons |
| --- | --- |
| <ul><li>The literal reading of "PR our tests".</li><li>Purely additive apart from the rewritten `test_api_key`; nothing to argue about.</li><li>First E2E coverage of the history panel's advanced filters and of the credentials dialog.</li></ul> | <ul><li>The show/hide button and the group-name error are then checked at both layers, the Vitest ones behind module mocks and a `d-block` class.</li><li>The review's other findings go unsent, and the remaining `GFormInput` swaps will copy the same spec style.</li><li>Commit 7 loses its vehicle.</li></ul> |

### 4. Tests plus Vitest cleanup, without the prop typing (commits 1 to 6)

Everything that is a test change, leaving `FilterMenuInput.vue` and `FilterMenuRanged.vue` as #24801 left them.

| Pros | Cons |
| --- | --- |
| <ul><li>Honest "tests only" label: no production code beyond `data-description` attributes.</li></ul> | <ul><li>Leaves two differently written conversions for a case that cannot occur, with a comment explaining a type that is simply wrong.</li><li>Commit 7 is the best abstraction result on the branch (−21 lines, no helper) and is small enough to review in a minute.</li></ul> |

### 5. Expand: trim the same assertions from every spec on `dev`

Apply commit 5's rule to the other 25 spec files that assert `g-form-input`, written for #24686, #24718 and other swaps.

| Pros | Cons |
| --- | --- |
| <ul><li>A convention applied everywhere, not to one PR's files.</li><li>Stops the pattern being copied into the remaining swaps.</li></ul> | <ul><li>Each file needs the judgment scope 2 describes, not a search and replace.</li><li>Rewrites tests across many features in a PR about three Selenium tests.</li><li>The convention has not been discussed with the people writing these specs; this PR is where that starts.</li></ul> |

<details>

Better as a follow-up once the 7-file version has been accepted, or as a note in the client testing guidance. If reviewers object to commit 5, the wider change would have been wasted.

</details>

### 6. Expand: type `Filtering` so `FilterMenu` enforces the text-only prop

Replace `Filtering<any>` in `FilterMenu.vue` with typing that makes passing a boolean filter to `FilterMenuInput` or `FilterMenuRanged` a compile error.

| Pros | Cons |
| --- | --- |
| <ul><li>Turns commit 7's doc comment into a checked guarantee.</li></ul> | <ul><li>`Filtering` is used by every list and grid filter in the client; this is a refactor of `utils/filtering.ts`, not a follow-up to an input swap.</li><li>`FilterMenuBoolean`, `FilterMenuDropdown` and the rest each keep a local value type; doing it properly means settling all of them.</li></ul> |

### 7. Expand: more E2E coverage of the credentials dialog

Extend `test_credentials_group_name_error`, or add a sibling, to fill in a group and save it, since the `credentials.service` component now exists.

| Pros | Cons |
| --- | --- |
| <ul><li>The dialog's only E2E test would cover its main path, not one error message.</li><li>Reuses the selectors commit 4 adds.</li></ul> | <ul><li>Not about the `GFormInput` swap; the save path needs its own selectors and may need vault configuration in the test server (not checked).</li><li>Belongs with credentials work, where the people who know the feature review it.</li></ul> |
