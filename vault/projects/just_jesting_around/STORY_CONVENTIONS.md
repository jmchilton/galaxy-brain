# Story conventions

#### Stories Are Scenarios

Place `Component.stories.ts` beside the component, with a title that mirrors its
path, collapsing a repeated folder (`ScrollList`, not `ScrollList/ScrollList`) unless
another component in that folder has stories, since a title can't also be a group. For
a `generic="T"` component, type the meta from its props instead of `typeof Component`
(`ScrollList.stories.ts`). Each story is a state worth looking at, named for that state
(`DownloadOnly`, `WithZenodo`). Shared props go in the meta `args`. Stories for a
`packages/ui` component sit beside its client re-export (`GButton.stories.ts`).

Answer API requests in `parameters.msw.handlers` with the typed `http` handlers
from `@/api/client/__mocks__/http`. Give each handler a name
(`handlers: { templates: ... }`). Named handlers merge with `appHandlers`, which
answer the requests every page makes, and a story replaces one by using its name.
A list of handlers replaces the defaults. An `/api/` request with no handler fails
the story, as it does in unit tests. Wrap a repeated handler in a small named
function (`fileSources(plugins)`). Reuse existing test-data factories and handlers
before writing payloads inline. A fixture and handler that several tests share sit
beside their feature (`ObjectStore/test_fixtures.ts`). A stories file exports only
stories, so data the test also needs goes in `test_fixtures.ts` too, or the test
repeats the literal it asserts on.

The no-handler guard covers only `/api/`; a request elsewhere (`/user/change_password`)
silently reaches the network, so give it a named handler. Give a search picker its
search handler even when no test searches, or a viewer typing in it fails the story.
Error stories answer with Galaxy's real error bodies (`err_code` and `err_msg`), each
distinct, so a test mounting the wrong story fails. Handlers that refuse or save
echo the request's fields rather than a fixed value.

If the component needs a parent, such as one driving v-model, add a small harness
component to the stories file (`FormDataWithModel`). When the parent's state change
is worth seeing, give the harness a visible control (`ScrollListWithStore`'s "Add
item" button) rather than an exposed method. List an exported harness in the meta's
`excludeStories`, or it renders as a story. Slot content can come from an extra arg
that the story's `render` passes into the slot (`GButton.stories.ts`'s `label`).

#### Tests Build on Stories

The story owns the setup, and the test owns the assertions. Mount with
`composeStories` and `useStoryMount()`. Each mount gets the same handlers Storybook
uses, plus a fresh testing pinia whose actions run, so the test sees what the story
shows. A test should read as: pick a scenario, act, assert. Type a helper that takes
any story as `StoryOf<typeof stories>`.

A story mount renders children, so a `shallowMount` stub check like
`attributes("size")` becomes `props("size")` on the child component. A functional
child (`BNavItem`) has no `props()`; check what it renders instead.

A test that `vi.mock`s a store to count action calls can count on the testing
pinia's pass-through spies instead. Where the real store fetches on its own, preload
it in a decorator so the original counts stay exact
(`WorkflowInvocationState.stories.ts`). A state the real store can't produce stays
as a plain mount with overridden getters.

Pass extra `global` options to `mountStory`; they add to the defaults rather than
replace them. Pass `router` for a test that needs real routes, `pinia` to stub
actions, `instrumentLocalization` for `toBeLocalizationOf`, and `props` for a value
no story needs (`clearInputAfterExport`). To spy on a function prop the story
provides (`loader`), wrap it in a test-local `vi.fn` and pass that as a prop.
Listeners (`on*`) don't reach a composed story's args, so assert what they cause
instead, or `getComponent(Component).emitted()`. With a `render` story the wrapper
root is the story, so `wrapper.emitted()` is always empty. Module-level `vi.mock`
and the global mocks in `tests/vitest/setup.ts` still apply to story mounts;
Storybook runs the real modules. `vi.mock(path, { spy: true })` keeps call and
payload assertions while the request still reaches the story's handler; reset it
with `mockReset`, which also drops queued one-off results. To watch a story's
requests, call `useServerMock()` beside `useStoryMount()` and add a pass-through
handler after mounting (`UserDeletion.test.ts`).

Don't call `setProps` on a composed story, because that remounts it. Change state
through the harness instead. A check that a story can't express, such as a prop
toggled on a live mount, stays as a plain mount in the test; never drop it. The
plain mount can be the stories file's harness or the component with a story's
`args` (`ScrollList.test.ts`); unmount it yourself, since `useStoryMount` only
cleans up its own mounts.

Storybook passes `reactive(args)`, which unwraps refs inside an object arg, while
the unit mount doesn't; `markRaw` an arg object that holds refs (a task monitor).
Compute time-relative fixtures when the story renders, not at module load; the
browser project runs in UTC. Story
code can't import `vitest`, so keep shared fakes vitest-free under
`tests/test-data/`. Seed browser storage in a decorator and remove only your own
keys. Put non-prop story inputs in `parameters`, set through a typed helper so a
typo fails type-check. Storybook deep-merges object parameters, so a meta default
merges into a story's value; keep the default in the decorator instead. When the
component loads store data asynchronously, the decorator renders the story only once
it has loaded, or a "renders nothing" check can pass before the data arrives
(`WorkflowInvocationShare.stories.ts`).

A component that reads the config store when it's created needs the config set
before it mounts: a decorator that calls `setConfiguration()`, plus a matching
`configuration` handler (`InstallationSettings.stories.ts`). One that reads it
through `useConfig` computeds needs only the handler; the test waits on
`useConfigStore().isLoaded`. If its template reads the config before it loads, a
decorator renders the story once `isLoaded` is true (`ToolCard.stories.ts`). Set
the signed-in user with `withCurrentUser` from `tests/test-data/currentUser.ts`. Storybook gives each story a fresh pinia. A component
opened through shared state (the command palette) gets a decorator that opens it on
mount and closes it on unmount (`CommandPalette.stories.ts`).

Stores, composables, utilities and API clients don't get stories.

#### Play Functions

A `play` function is a test that runs in the browser and replays in Storybook's
Interactions panel. Use it for things a user does and sees. Query by role, label or
text, not CSS classes; `emphasis` and `paragraph` roles work, and an element with
no role (`<b>`) can be checked by `tagName`. `toHaveTextContent("…")` matches a
substring, so use an anchored regex for exact text. Assert on `fn()` args instead of
emitted events. Name each step so the panel reads like a script.

Put a play on its own story named for what it does (`ExportsDirectDownload`), so
the base stories still show the initial state. If an interaction makes more
requests, such as opening a dialog, that story adds handlers for them. To check a
pending state, hold the request on a promise the play releases
(`WorkflowMissingToolsRequest.stories.ts`), not `delay("infinite")`, which slows
every later story in the file. `GModal` keeps its body in the DOM while closed, so
check `queryByRole("dialog")`, not text, and any "X is gone" check inside a closed
dialog passes either way; reopen it to check. It reports closing on the native
`close` event a moment after it hides, so wait for that before reopening.

`toBeVisible()` passes while an element fades out; before checking an animated
dialog stays open, wait for its `getAnimations()` to finish (`CommandPalette`).
`userEvent.type` sends one key at a time, so input that converts on a key (a
`t:` scope token) differs from a value set whole; `paste` what the unit test set
whole. The browser project renders at 414px wide, so content hidden below a
breakpoint stays in vitest.

A play's first wait on data a decorator loads gets a longer timeout
(`{ timeout: 5000 }`); the 1s default flakes when the whole project runs.
`vue-multiselect` has no `combobox` role and renders its control only after its
options load, so wait for it and find it by label.

A negative check needs something visible to wait on first. A decorator may render
context from the same loaded data, such as a heading naming the item
(`WorkflowInvocationShare.stories.ts`). A box the play just clicked is ticked by the
browser, so check one that follows the app's state (select-all).
Storybook runs real side effects: a successful delete in `UserDeletion` logs out and
navigates the top window, so a play stops before it. Clicking a
`FilesInput` opens FilesDialog, so type into it with focus and the keyboard.

`GButton` disables with `aria-disabled` only, so `toBeEnabled()` always passes on
it. Assert `toHaveAttribute("aria-disabled", "true")` and that clicking it calls
nothing. `GTooltip` stays in the DOM and hides with `sr-only`, so `toBeVisible()`
passes either way; check the `sr-only` class, the one class check allowed. A role
can't tell a `GAlert`'s info from success or danger from warning, so variant checks
stay in vitest. Wrap
hover-delayed or re-rendered results in `waitFor`. `toHaveAccessibleDescription`
picks up a native `title`. A play's `console.log` doesn't reach vitest's output;
to read rendered text while debugging, use a failing `expect`.

Composables the unit test mocks run for real in a play (`useInfiniteScroll` loads
until the list can scroll), so count relative to what loaded and leave fixed counts
under the mock in vitest. Global CSS sets smooth scrolling; scroll with
`scrollTo({ behavior: "instant" })`. A generic SFC's `Args` takes listeners by their
kebab name (`"onLoad-more"`).

A harness that forwards listeners through `attrs` needs `compatConfig: { MODE: 3 }`,
or compat mode drops them (`GButton.stories.ts`'s `ClickableRow`).
