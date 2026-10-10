# Story conventions

#### Stories Are Scenarios

Place `Component.stories.ts` beside the component, with a title that mirrors its
path, collapsing a repeated folder (`ScrollList`, not `ScrollList/ScrollList`). For
a `generic="T"` component, type the meta from its props instead of `typeof Component`
(`ScrollList.stories.ts`). Each story is a state worth looking at, named for that state
(`DownloadOnly`, `WithZenodo`). Shared props go in the meta `args`.

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
item" button) rather than an exposed method.

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
no story needs (`clearInputAfterExport`). To spy on a function the story provides,
wrap it in a test-local `vi.fn` and pass that as a prop. Module-level `vi.mock`
still applies to story mounts.

Don't call `setProps` on a composed story, because that remounts it. Change state
through the harness instead. A check that a story can't express, such as a prop
toggled on a live mount, stays as a plain mount in the test; never drop it.

Stores, composables, utilities and API clients don't get stories.

#### Play Functions

A `play` function is a test that runs in the browser and replays in Storybook's
Interactions panel. Use it for things a user does and sees. Query by role, label or
text, not CSS classes. Assert on `fn()` args instead of emitted events. Name each
step so the panel reads like a script.

Put a play on its own story named for what it does (`ExportsDirectDownload`), so
the base stories still show the initial state. If an interaction makes more
requests, such as opening a dialog, that story adds handlers for them.
