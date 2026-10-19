# Test challenges review — galaxy#24261

- Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md)
- Model: claude-opus-5-5, effort: medium
- Reviewed commit: `4d7934dc99c31b83d7c165be76a2187e2fde5a29`
- Details: [test_challenges_debrief.md](test_challenges_debrief.md)

The new tests are sound. Each one fails without the change it covers: dropping `INSTANCE_LISTENERS: false` fails the listener test, and dropping the `state: null` default fails the state and size tests. The `tokensContract` update is required and correct. No P1/P2. The CSS changes can't be usefully tested in happy-dom, and an E2E test isn't warranted for styling.

### P3 1: Assert the newly wired `:state` on an existing consumer

`UserDeletion.vue` and `CopyModal.vue` already bind `:state` on `GFormInput`. Before this PR it fell through as an inert `state` HTML attribute; now it drives `aria-invalid` and the state border. `UserDeletion.test.ts` "shows validation state after input blur" checks only the label's feedback text. Add `expect(input.attributes("aria-invalid")).toBe("true")` there so the prop is covered on a real consumer path, not only in isolation.

### P3 2: Split the four-case state test into named cases

"marks an invalid state with aria-invalid and a state class" mounts absent, `false`, `true` and `null` in one `it`. An `it.each` table (`state` → expected `aria-invalid`, classes) names each case, and a failure points at the one that broke. The absent case matters most: it guards the `withDefaults` boolean-cast comment.

### P3 3: Share the size/state mapping with GSelect and test it once

GSelect and GFormInput each map `size`/`state` to `g-<size>`, `g-valid`/`g-invalid` and `aria-invalid`, written two different ways, and their tests repeat each other. They have already drifted: GSelect defaults to `g-medium`, while GFormInput emits no size class. A small helper in `componentVariants.ts` would get one direct test and keep the next field component consistent. Optional.
