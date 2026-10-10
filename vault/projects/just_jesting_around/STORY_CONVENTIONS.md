# Story conventions

#### Stories Are Scenarios

Place `Component.stories.ts` beside the component, with a title that mirrors its
path, collapsing a repeated folder (`ScrollList`, not `ScrollList/ScrollList`). For
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
beside their feature (`ObjectStore/test_fixtures.ts`).

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
`attributes("size")` becomes `props("size")` on the child component.

Pass extra `global` options to `mountStory`; they add to the defaults rather than
replace them. Pass `router` for a test that needs real routes, `pinia` to stub
actions, `instrumentLocalization` for `toBeLocalizationOf`, and `props` for a value
no story needs (`clearInputAfterExport`). To spy on a function prop the story
provides (`loader`), wrap it in a test-local `vi.fn` and pass that as a prop.
Listeners (`on*`) don't reach a composed story's args, so assert what they cause
instead, or `getComponent(Component).emitted()`. With a `render` story the wrapper
root is the story, so `wrapper.emitted()` is always empty. Module-level `vi.mock`
and the global mocks in `tests/vitest/setup.ts` still apply to story mounts;
Storybook runs the real modules.

Don't call `setProps` on a composed story, because that remounts it. Change state
through the harness instead. A check that a story can't express, such as a prop
toggled on a live mount, stays as a plain mount in the test; never drop it. The
plain mount can be the stories file's harness or the component with a story's
`args` (`ScrollList.test.ts`); unmount it yourself, since `useStoryMount` only
cleans up its own mounts.

Storybook passes `reactive(args)`, which unwraps refs inside an object arg, while
the unit mount doesn't; `markRaw` an arg object that holds refs (a task monitor).
Compute time-relative fixtures when the story renders, not at module load. Story
code can't import `vitest`, so keep shared fakes vitest-free under
`tests/test-data/`. Seed browser storage in a decorator and remove only your own
keys. Put non-prop story inputs in `parameters`, set through a typed helper so a
typo fails type-check.

A component that reads the config store when it's created needs the config set
before it mounts: a decorator that calls `setConfiguration()`, plus a matching
`configuration` handler (`InstallationSettings.stories.ts`). Storybook gives each
story a fresh pinia.

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
requests, such as opening a dialog, that story adds handlers for them. Clicking a
`FilesInput` opens FilesDialog, so type into it with focus and the keyboard.

`GButton` disables with `aria-disabled` only, so `toBeEnabled()` always passes on
it. Assert `toHaveAttribute("aria-disabled", "true")` and that clicking it calls
nothing. `GTooltip` stays in the DOM and hides with `sr-only`, so `toBeVisible()`
passes either way; check the `sr-only` class, the one class check allowed. Wrap
hover-delayed or re-rendered results in `waitFor`. `toHaveAccessibleDescription`
picks up a native `title`.

A harness that forwards listeners through `attrs` needs `compatConfig: { MODE: 3 }`,
or compat mode drops them (`GButton.stories.ts`'s `ClickableRow`).
