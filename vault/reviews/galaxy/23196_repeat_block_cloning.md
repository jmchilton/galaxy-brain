# PR 23196 — Added cloning option to repeats form field blocks on Tool Form page

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23196 |
| **Author** | hujambo-dunia |
| **Base branch** | `dev` (head `hujambo-dunia:enhance-repeats-clone`) |
| **Head reviewed** | `a608b1f9f2` (merge-base `fdf016e6f90f68924b7dc9d2d5d193a52ed923de`) |
| **Size** | 5 files, +90 / -3 (3 commits) |
| **State** | OPEN, not a draft, 0 reviews; opened 2026-07-28, last pushed 2026-08-18 |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23196` |
| **Addresses** | #23082 (lldelisle, "Add a 'duplicate' option for repeat blocks in tool forms") |
| **CI** | 34/34 green at head, including the `Selenium tests` workflow (run 31026782832) and `Integration Selenium` (31026782675) |
| **Verdict** | **Approve with comments.** The implementation is small, correct, and reuses the existing repeat plumbing almost exactly as it should — I verified the clone semantics empirically (deep copy, middle insertion, nested repeats, conditionals, max guard, server round-trip) and found no defects. My comments are all about test *level* and *breadth*, one dead line, and one adjacent pre-existing bug that the clone button now makes visibly inconsistent inside a single form. Nothing here blocks merge. |

---

## What it does

Adds a copy button to each repeat block's header operations bar on the tool form, inserting a
deep copy of that block immediately after it.

- `FormListElementOperations.vue` gains a fourth `GButton` (`:61-67`) between "move down" and
  "delete", plus four props (`cloneButtonId`, `canClone`, `cloneTooltip`) and a `clone` emit.
- `FormRepeat.vue` wires it: a `cloneTooltip` computed (`:46-50`), an `onClone(index)` emitter
  (`:86-88`), `getButtonId` widened to accept `"clone"` (`:117`), and the bindings at `:147-154`.
  `:can-clone="!maxRepeats"` reuses the same `maxRepeats` computed (`:26-28`) that already gates
  the Insert button.
- `FormInputs.vue` adds the handler (`:217-224`):

```js
repeatClone(input, cacheId) {
    const clonedInputs = structuredClone(input.cache[cacheId]);

    set(input, "cache", input.cache ?? []);
    input.cache.splice(cacheId + 1, 0, clonedInputs);

    this.onChangeForm();
},
```

- `navigation.yml:774` adds `repeat_clone: '#${parameter}_clone'`.
- `lib/galaxy_test/selenium/test_tool_form.py:157-201` adds `test_repeat_cloning` (decorators at 157-158, `def` at 159).

**Does it address #23082?** Yes, on all three points the reporter made. They asked for
duplication of *any* block, not just the last (`splice(cacheId + 1, ...)` satisfies this — the
reporter's stated pain was "put the second one to bottom, duplicate and then put it back"), and
said no case should be excluded (no type-based exclusion exists). The one thing the PR does not
do is match the reporter's vocabulary — see P3-3.

**Abstraction reuse — the good part.** `repeatClone` is structurally the same as the existing
`repeatInsert` (`FormInputs.vue:205-212`), uses the same `structuredClone`, the same `set()` +
`splice` mutation style, and the same `this.onChangeForm()` terminator as insert/delete/swap. The
new emit threads through the identical `FormInputs → FormRepeat → FormListElementOperations` path
as `delete`. `FormCard :key="keyObject(cache)"` (`FormRepeat.vue:136`) already documents that
"a cloned object will not have the same id as the object it was cloned from"
(`composables/keyedObjects.ts:13`), so the keying was already correct for this feature before it
existed. Nothing here reinvents anything in the tree.

---

## Verification

`client/node_modules` does not exist in this worktree. Rather than install, I symlinked
`node_modules` from the `pr/23252` worktree — its `client/package.json` and `client/pnpm-lock.yaml`
are byte-identical to this branch's (`diff -q` on both). Node 22.20.0 from the scratchpad build.
The symlink and all scratch files were removed afterwards; `git status --porcelain` in the worktree
is empty and HEAD is back on `pr-23196` at `a608b1f9f2`.

**Baseline** — existing suite at PR head:

```
node node_modules/vitest/vitest.mjs run src/components/Form/FormDisplay.test.js
→ Test Files 1 passed (1) / Tests 5 passed (5)
```

**Clone probe (scratch, not committed).** I wrote a five-test Vitest suite against `FormDisplay`
to check the claims I would otherwise have had to assert on faith. Saved at
`/private/tmp/claude-503/.../scratchpad/23196_ScratchClone.test.js`. All five pass; the properties
they cover:

| Probe | Result |
|---|---|
| Clone the middle of 3 text blocks → 4 blocks, values `A, B, B, C` | pass |
| Edit the clone, then the source — independent in both directions | pass (no shared reference) |
| Emitted `onChange` formData has exactly the 4 re-keyed names | pass |
| Clone a block containing a **conditional** — selected case + value carried, independent | pass |
| Clone a block containing a **nested repeat** (two inner blocks) — `repeat_block_1\|inner_0\|t` etc. re-key correctly, independent | pass |
| Clone button `aria-disabled="true"` at `max`, and clicking it is a no-op | pass |
| Clone survives a simulated server `inputs` round-trip (`setProps` → `syncServerAttributes`) without losing values | pass |

```
node node_modules/vitest/vitest.mjs run src/components/Form/ScratchClone.test.js \
                                       src/components/Form/FormDisplay.test.js
→ Test Files 2 passed (2) / Tests 10 passed (10) / Duration 4.42s
```

**Reasoning checks, not run:**

- The index scheme cannot collide. Names are derived at visit time from array position
  (`utilities.js:43` → `${name}_${j}`; `FormRepeat.vue:91` → `${props.input.name}_${index}`),
  never stored, so a middle insertion simply re-derives every downstream name. The server-side
  `__index__` marker is absent from the client repeat cache (`grep __index__ client/src` hits only
  three test fixtures), so there is no stored index to duplicate.
- `structuredClone` on this tree is already proven by `repeatInsert`; Vue 2.7's `__ob__` is
  non-enumerable so it is not serialized.
- `syncInputsStructural` (`useFormState.ts:152-160`) matches repeat cache entries positionally and
  skips missing ones, so a stale server response cannot corrupt a fresh clone — confirmed by the
  round-trip probe.
- `lib/galaxy/navigation/navigation.yml` is a symlink to the client file, so the Selenium selector
  resolves without a build step.
- The Selenium test's selector `#the_repeat_1_clone` matches `getButtonId(1, "clone")` for a repeat
  named `the_repeat` at the top level.

---

## P2-1 — the test covers the one parameter type the issue *didn't* ask about

`test_repeat_cloning` drives `text_repeat` (`test/functional/tools/text_repeat.xml`), a repeat
containing a single `type="text"` param. The reporter's motivating case is pyGenomeTracks, and they
were explicit about the contents:

> The items inside are both free text, float, bool, select.

plus the screenshot's "Track file(s) bedgraph format" — a `data` param. Deep-copying a `data`
param's value (`{values: [{id, src}]}`) and a `select`'s `options` snapshot is where clone bugs
would actually live; text is the one case where `structuredClone` obviously cannot be wrong.

The fixtures already exist: `test/functional/tools/parameters/gx_repeat_data.xml`,
`gx_repeat_select_dynamic.xml`, `gx_repeat_boolean.xml`, and `multi_data_repeat.xml`. My probe
covers conditionals and nested repeats at the component level, but nothing in this PR or in my
verification exercises a cloned `data` parameter.

## P2-2 — Selenium is the wrong level for this, and the cheaper harness already existed

dannon asked for coverage and got the most expensive kind. `FormDisplay.test.js:144-155` is already
a mounted-form repeat test that clicks `[data-description='repeat insert']` in a loop — the exact
harness this feature needs, four lines from the clone case. My scratch suite proves the point: five
clone assertions (including nested repeats, conditionals, the max guard, and a server round-trip —
none of which the Selenium test touches) ran alongside the existing file in **4.42s**.

The Selenium test is not worthless — its `_get_dataset_tool_parameters` assertion checks the *job's*
recorded parameters, which is a genuine end-to-end property a component test can't reach, and it is
correctly gated `@selenium_only`. But the ratio is wrong: the expensive test carries the cheap
assertions and the cheap tests don't exist.

## P2-3 — the new test is a near-verbatim copy of its neighbour

`test_repeat_cloning` (`:157-201`) duplicates `test_repeat_reordering` (`:120-155`) almost line for
line: same `self.home()` / `self.tool_open("text_repeat")`, the same three insert-then-set-value
blocks, and a second private copy of the `assert_input_order` helper (the only difference is
renaming the loop variable `input` → `input_value`, which is an improvement). Two identical
five-line setups and two identical helpers in one class is the moment to hoist a
`_setup_three_text_repeats()` and a shared `assert_repeat_values()` onto `TestToolForm`, especially
since a third repeat-operation test is the obvious next one to be written.

To be clear on what the test *does* get right: it asserts cloned **values**, not just that a block
appeared, and it checks independence in both directions after the clone. That is exactly the
assertion I would have asked for.

## P2-4 — `FormListElementOperations` still isn't a shared abstraction

The clone operation was added to the component whose name promises reuse, which is the right
instinct. But that component has exactly one consumer — `FormRepeat.vue:11` — and now carries nine
props, four of them clone-specific. Meanwhile two components in the tree hand-roll the same
operations bar and say so in comments:

- `Workflow/Editor/Forms/FormColumnDefinitions.vue:88` — `<!-- code modelled after FormRepeat -->`,
  followed by an open-coded `b-button-group` with its own `getButtonId(index, "up" | "down")`,
  `swap()`, and `deleteTooltip` (`:48-51`, `:88-133`).
- `Workflow/Editor/Forms/FormRecordFieldDefinitions.vue:88` — the same comment, the same duplication.

Both also carry `// the FormRepeat version does cool highlighting - probably worth implementing on
next pass` (`:54` and `:52`). This PR doesn't make that worse, but it's the second feature to land
in `FormListElementOperations` without those two adopting it, and "duplicate this column
definition" is a request that will arrive eventually. Migrating them to
`FormListElementOperations` is the change that would turn this component into the abstraction its
name claims — and it's a natural follow-up, not something to hold this PR for.

## P3-1 — dead line in `repeatClone`

```js
const clonedInputs = structuredClone(input.cache[cacheId]);   // FormInputs.vue:218
set(input, "cache", input.cache ?? []);                        // :220
```

Line 218 already dereferences `input.cache`; if it were undefined the method would have thrown a
`TypeError` before line 220 ran. The `set()` is meaningful in `repeatInsert` (`:208`), where `cache`
genuinely may not exist yet, and was copy-pasted here where it cannot be. Delete it.

## P3-2 — `cloneTooltip` reinvents `GButton`'s `disabledTitle`

`FormRepeat.vue:46-50` computes a different tooltip string for the disabled state. `GButton` already
has a `disabledTitle` prop for precisely this — "Alternative title to be displayed in a disabled
state" (`BaseComponents/GButton.vue:33`), resolved by `useCurrentTitle`
(`BaseComponents/composables/currentTitle.ts:12-19`). The clone button could be:

```vue
:title="localize(`Click to clone ${title} fields`)"
:disabled-title="localize(`Maximum number of ${title} fields reached`)"
```

Weak finding, and I'd accept a "no" — `buttonTooltip` (`:34-38`) and `deleteTooltip` (`:40-44`) both
predate `disabledTitle` and do it the old way, so the new code is at least locally consistent. But
the max-reached string is now written out three times in one file (`:36`, `:48`, and the
`buttonTooltip`/`cloneTooltip` pair are character-identical), which is the usual sign.

Note also that all three tooltips interpolate into `localize()` at runtime, so none of them can be
extracted into a translation catalogue. Pre-existing and out of scope, but the new string inherits
it.

## P3-3 — three words for one feature

The issue asks for **duplicate**. The code and tooltip say **clone**. The icon is `faCopy`. The
reporter will look for "Duplicate" and see a copy glyph with a "Click to clone" tooltip. I'd pick
one — "duplicate" matches the issue, the reporter's vocabulary, and the more common UI convention;
"copy" matches the icon. Internal identifiers can stay `clone` if you prefer, but the user-visible
string should match what was asked for. (Only worth changing if the tooltip is being touched anyway
for P3-2.)

## P3-4 — `navigation/schema.ts` not regenerated

`client/navigation_to_schema.mjs` generates `client/src/utils/navigation/schema.ts` from
`navigation.yml`, and the checked-in `schema.ts` is stale: `Roottool_form` (`:362-373`) has
`repeat_insert` but not `repeat_move_up`, `repeat_move_down`, or the new `repeat_clone`. So this PR
follows existing practice — `repeat_move_up`/`down` were added by `c52dba0c3a` without regenerating
either. There is no `package.json` script and no CI drift check, and the Python Selenium side reads
`navigation.yml` directly through the symlink, so nothing breaks; the only cost is that a future
client-side test can't reach `ROOT_COMPONENT.tool_form.repeat_clone` in a typed way. Mentioning it
because P2-2 argues for exactly such a test.

---

## Adjacent: a pre-existing bug this feature makes visibly inconsistent

**Not caused by this PR, and not a reason to block it** — but the clone button is the first thing to
expose it inside a single form, so it's worth knowing before merge.

A repeat block added by clicking **Insert** silently swallows server-side validation errors; a
repeat block that arrived in the server's `cache` displays them. Verified on the *merge-base*
(`fdf016e6f9`, on a scratch branch with the three client files checked out at base, since deleted):

```
BASE_INSERTED_ERRORS=[]           # error never renders
BASE_SERVER_CACHE_ERRORS=[boom]   # error renders
```

The mechanism: `cloneInputs` makes `error`/`warning` reactive by walking `visitAllInputs`
(`useFormState.ts:92-95`), but that walker's `repeat` case descends into `node.cache` only, never
`node.inputs` (`utilities.js:81-87`). So the pristine template `repeatInsert` clones has no
`error` key, the block spliced into the array has none for Vue 2.7 to observe, and `setError`'s
stated assumption — *"Plain assignment: error property exists from cloneInputs initialization"*
(`useFormState.ts:204-206`) — is false for it.

What the clone button adds is a form where the two behaviours sit next to each other. Insert a
block, type a value, clone it, then have the server reject both:

```
CLONE_OF_INSERTED=[boom1]         # only the clone shows its error; the source stays silent
```

The clone renders correctly by accident: `resetErrors()` has by then written a non-reactive
`error = null` onto the source, `structuredClone` serializes that key, and `splice` into the
reactive array makes it reactive on the copy.

The fix is one line, and it sits exactly where P2-4's abstraction argument points — both
`repeatInsert` and `repeatClone` should produce a block through one shared "materialize a new repeat
instance" helper that runs the `set(input, "error", null)` walk. Either that, or add the `inputs`
branch to `visitAllInputs`'s `repeat` case. I'd raise it as a separate issue rather than grow this
PR.

---

## Verdict

**Approve with comments.** The feature does what #23082 asked for, the implementation is the
smallest correct one, and it reuses `structuredClone`, `maxRepeats`, `keyObject`, the emit chain,
and the `onChangeForm` contract rather than reinventing any of them. I could not break the clone
semantics: deep copy holds in both directions, middle-block insertion re-keys correctly, nested
repeats and conditionals clone cleanly, the `max` guard works, and the value survives a server
round-trip.

The comments worth acting on before merge are P3-1 (delete the dead `set()`) and P2-1 (point the
test at a repeat with a `data` or `select` param — the fixtures already exist). P2-2 and P2-3 are
about where the test lives and how much it duplicates; I'd take a small `FormDisplay.test.js`
addition over growing the Selenium suite, but I wouldn't hold the PR for it. P2-4 and the adjacent
error-reactivity bug are both follow-up issues, not this PR's job.

---

## Not verified

- **No `data` or `data_collection` parameter was cloned**, in Selenium or in my probes — the
  component-level harness needs Pinia stores that `FormDisplay.test.js` doesn't set up. This is the
  gap P2-1 describes, and I did not close it myself.
- **The Selenium test was not executed locally**, but it did run and pass in CI — checked the
  shard log directly: `Selenium tests` run 31026782832, shard `Test (3.10, 2)`, job 92377894991,
  `lib/galaxy_test/selenium/test_tool_form.py::TestToolForm::test_repeat_cloning PASSED [ 47%]`
  at 2026-08-05T17:22:59Z. So it is neither skipped nor silently retried away. Selectors were
  otherwise checked by reading them against `navigation.yml` and `getButtonId`.
- **No `pnpm install` in this worktree** — all client tests ran against `pr/23252`'s `node_modules`
  via a symlink, justified only by identical `package.json` + `pnpm-lock.yaml`. Not a substitute for
  a real install if something subtle is suspected.
- **No lint/typecheck run** (`eslint`, `vue-tsc`, `prettier`) on the changed client files.
- **Selector robustness for nested repeats not checked.** `getButtonId` for a repeat nested inside a
  repeat yields an id containing `|` (e.g. `r_0|inner_0_clone`), which `navigation.yml`'s
  `'#${parameter}_clone'` template would produce as an invalid CSS id selector. Pre-existing for
  `repeat_move_up`/`down`; I did not test whether any Selenium test hits it.
- **Whether cloning a block with a `refresh_on_change` param behaves sanely against a live server** —
  my round-trip probe simulated the server response rather than making one.
- Nothing was posted to GitHub.

---

## Follow-up branch 2026-08-21 — `jmchilton:review-nits`

PR merged as-is by the user; the non-blocking items moved to the standing nits branch
(`f507b6cfce`), pushed, no PR opened.

**Done:**
- **P3-1** — the dead `set(input, "cache", input.cache ?? [])` in `repeatClone` is gone.
- **P2-2** — the six component-level clone tests the review argued for now exist in
  `FormDisplay.test.js`: copy lands after its source, independence both directions, form data
  re-keys after a middle-block clone, conditional and nested-repeat blocks clone, `max` blocks it,
  and the values survive a server round-trip. Ported from the review probe. 184 tests green across
  `src/components/Form` and `src/components/Login`. They need `flushPromises()` after every insert
  and clone click — without it the blocks have not rendered and `find()` returns empty.

**Deliberately not done:**
- **P2-1** (drive the test with a `data` or `select` param) — that is the Selenium test, which
  cannot be run here, and the component harness lacks the Pinia stores a `data` param needs.
- **P3-2** (`GButton`\s `disabledTitle`) — would leave the clone tooltip inconsistent with the
  insert and delete tooltips beside it unless all three convert. Review already graded it weak.
- **P3-3** (clone / duplicate / copy) — user-visible vocabulary, the author's and dannon's call.
- **P2-4** (migrate `FormColumnDefinitions` / `FormRecordFieldDefinitions` onto
  `FormListElementOperations`) and the pre-existing repeat error-reactivity bug — both are their
  own change, not cleanup.
