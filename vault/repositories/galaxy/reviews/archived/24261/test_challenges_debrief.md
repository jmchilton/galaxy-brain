# Test challenges debrief — galaxy#24261

- Profile: gx_test_challenger
- Model: claude-opus-5-5, effort: medium
- Reviewed commit: `4d7934dc99c31b83d7c165be76a2187e2fde5a29` (diffed against `git merge-base origin/dev HEAD`)

## Tests in the PR

| Test | Verdict |
|---|---|
| `GFormInput.test.ts` "passes undeclared listeners through to the input" | Keep. Red-checked: dropping `INSTANCE_LISTENERS: false` fails it (`onClick` called 0 times). Unit test is the right layer; no consumer uses undeclared listeners yet (grepped client + Tool Shed), so nothing at E2E would cover it. |
| "renders a text input by default and lets a type attribute override it" | Keep. Small but guards a public default (`type="text"`) and the attr override consumers depend on (`type="password"`, `type="email"`). |
| "maps size to a size class instead of the native size attribute" | Keep; mirrors GSelect's test. Could fold into a table (below). |
| "marks an invalid state with aria-invalid and a state class" | Keep the coverage, restructure. Red-checked: removing `withDefaults({ state: null })` fails it (absent prop cast to `false` → `aria-invalid="true"`), so the comment-justified default is guarded. Four cases in one `it` read poorly; an `it.each` table over `state` → `aria-invalid` / class would name each case. |
| `tokensContract.test.ts` `NON_PALETTE_TOKENS` additions | Required update — the test asserts the exact non-palette set. Correct; contract test also confirms client and package values match. |

All 7 `GFormInput.test.ts` tests pass (node 22.20.0). Consumer tests `UserDeletion.test.ts` (5) and `CopyModal.test.ts` (8) pass unchanged.

Probe (reverted): parent `onKeydown`/`onBlur` with `INSTANCE_LISTENERS: false` fire exactly once — declared emits aren't duplicated through fallthrough. Not worth a permanent test; noted only to rule out double-firing.

## Gaps

- **Consumers already passing `:state` are silently fixed and untested.** `UserDeletion.vue` and `CopyModal.vue` bind `:state` on `GFormInput`. Before this PR it fell through as a meaningless `state="false"` HTML attribute; now it sets `aria-invalid` and the red border. `UserDeletion.test.ts` "shows validation state after input blur" only checks the `GFormLabel` feedback text. Adding `expect(input.attributes("aria-invalid")).toBe("true")` there tests the new prop on a real consumer path.
- **Duplicated size/state → class/aria logic.** GSelect (`:class="[prefix(size), { 'g-invalid': state === false, 'g-valid': state === true }]"`, `:aria-invalid=...`) and GFormInput (`sizeClass`/`stateClass` computeds) implement the same mapping two ways, and their tests duplicate each other. A shared helper in `componentVariants.ts` (e.g. `fieldStateClass(state)` / `fieldAriaInvalid(state)`) would let one small test cover the mapping and keep the next field component (textarea, etc.) consistent. Note the components also differ: GSelect defaults `size: "medium"` and emits `g-medium`; GFormInput emits no size class when unset.
- **CSS behaviour is untested** (full width, `:where()` zero specificity so consumer classes win, input-group sizing/radius joins, focus-visible outline). Happy-dom computes no layout, so vitest can't meaningfully assert it. Not proposing an E2E: Galaxy's Selenium/Playwright suites don't assert computed styles, and existing E2E coverage of consumers (rename/copy modals, admin forms) would catch gross breakage like an unusable input. Visual check by the author/reviewer is the practical gate.

## Not tests, noted in passing (not hunted)

- Tool Shed `shed.css` restyles `.shed-main input.g-form-input:focus` with its own box-shadow ring at higher specificity than the package's scoped `:focus-visible`; with this PR a keyboard-focused Tool Shed field may show the shed ring plus the new 2px outline. Worth a visual check in the Tool Shed; no test proposed.

## Test plan (recommendations)

1. P3: strengthen `UserDeletion.test.ts` blur test with an `aria-invalid="true"` assertion on `#name-input`.
2. P3: restructure the GFormInput state test as `it.each` cases (absent, `null`, `true`, `false`).
3. P3 (optional refactor): extract the size/state mapping shared by GSelect and GFormInput into `componentVariants.ts`, test it once, and thin both component tests.
