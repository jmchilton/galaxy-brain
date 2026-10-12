Fix the Tool Shed install monitor and the short-term-storage download button, which keep polling after they unmount if a request is in flight at that moment.

Both components clear their poll timer on unmount, but a request already in flight resolves afterwards and arms a new timer that nothing clears:

| Component unmounts while a request is in flight | `dev` | This PR |
| --- | --- | --- |
| Tool Shed "Currently installing" monitor | polls `/api/tool_shed_repositories` every 5 s for the rest of the page's life 😬 | stops |
| `StsDownloadButton`, during a `/ready` poll | polls every 200 ms until ready, then `window.location.assign`s the download from whatever page you're on now 😬 | stops, no navigation |
| `StsDownloadButton`, during the prepare POST | starts polling after it's gone 😬 | never starts |

***Leaving the page was already meant to cancel the download poll (`dev` clears the timer on unmount). This makes that reliable instead of depending on whether a request happened to be in flight.***

Rather than adding a stop flag to each component, both move onto the polling composables Galaxy already has:

- The install monitor uses `useResourceWatcher`, as its sibling `Toolshed/RepositoryDetails/Index.vue` already does. The watcher drops responses from superseded requests. The monitor disposes it on unmount, and on an error, so polling still stops for good after a failure. Polling now also pauses while the tab is hidden (`enableBackgroundPolling: false`, as in the sibling).
- `StsDownloadButton` uses `useShortTermStorageMonitor` and `useShortTermStorage().downloadObjectByRequestId` in place of its own axios/`getAppRoot()` loop.

For the second to fix anything, `useGenericMonitor` (under every task monitor) needed the same guarantee: `stopWaitingForTask` now also drops an in-flight response, and a monitor created inside a component or effect scope stops itself when that scope is disposed.

***Outside a component or effect scope nothing stops a monitor automatically; the only change there is that `stopWaitingForTask` also drops a response already in flight. Inside one, polling ends with its owner. Components that never stopped their monitor only lose polls whose results nothing was left to read.***

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Builds on 🔀 #23779, which converted both components to `<script setup>`. Reviewing it turned up this leak, which predates that PR.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The same red alert in the install monitor (and polling stops), and the same "Failed to generate download" toast on the button. For a failed `/ready` poll it now carries the API's error message instead of a stringified `AxiosError`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They count real requests after unmount and check `window.location.assign` isn't called, without inspecting timers or private state.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

Each lifecycle test holds a request open, unmounts (or stops the effect scope), releases the request, advances time, and asserts no further requests and no navigation. All 7 new lifecycle tests fail on `dev`'s component and composable sources at those assertions (extra calls, `window.location.assign` called) and pass here.

- `Toolshed/InstalledList/Monitor.test.js`: unmount during an in-flight poll. A further test checks that polling stops after a failed request and stays stopped when the tab is hidden and shown again. It passes on `dev` too and guards that behaviour across the move to `useResourceWatcher`, whose visibility listener would otherwise restart polling. The existing render test now unmounts its wrapper so its listener doesn't leak into later tests.
- `StsDownloadButton.test.js`: unmount during a ready and a not-ready `/ready` response; unmount during the prepare POST.
- `composables/shortTermStorageMonitor.test.ts`: `stopWaitingForTask` and effect-scope disposal while a status request is in flight; `waitForTask` after disposal never polls.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
