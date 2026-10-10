# Story conventions

#### Stories Are Scenarios

Place `Component.stories.ts` beside the component, with a title that mirrors its
path. Each story is a state worth looking at, named for that state
(`DownloadOnly`, `WithZenodo`). Shared props go in the meta `args`.

Answer API requests in `parameters.msw.handlers` with the typed `http` handlers
from `@/api/client/__mocks__/http`. Give each handler a name
(`handlers: { templates: ... }`). Named handlers merge with `appHandlers`, which
answer the requests every page makes, and a story replaces one by using its name.
A list of handlers replaces the defaults. An `/api/` request with no handler fails
the story, as it does in unit tests. Wrap a repeated handler in a small named
function (`fileSources(plugins)`). Reuse existing test-data factories and handlers
before writing payloads inline.

If the component needs a parent, such as one driving v-model, add a small harness
component to the stories file (`FormDataWithModel`).

#### Tests Build on Stories

The story owns the setup, and the test owns the assertions. Mount with
`composeStories` and `useStoryMount()`. Each mount gets the same handlers Storybook
uses, plus a fresh testing pinia whose actions run, so the test sees what the story
shows. A test should read as: pick a scenario, act, assert. Type a helper that takes
any story as `StoryOf<typeof stories>`.

Pass extra `global` options to `mountStory`; they add to the defaults rather than
replace them. Pass `router` for a test that needs real routes, and `pinia` to stub
actions.

Don't call `setProps` on a composed story, because that remounts it. Change state
through the harness instead. Edge cases that nobody would want to look at stay as
plain mounts in the test.

Stores, composables, utilities and API clients don't get stories.

#### Play Functions

A `play` function is a test that runs in the browser and replays in Storybook's
Interactions panel. Use it for things a user does and sees. Query by role, label or
text, not CSS classes. Assert on `fn()` args instead of emitted events. Name each
step so the panel reads like a script.

Put a play on its own story named for what it does (`ExportsDirectDownload`), so
the base stories still show the initial state. If an interaction makes more
requests, such as opening a dialog, that story adds handlers for them.
