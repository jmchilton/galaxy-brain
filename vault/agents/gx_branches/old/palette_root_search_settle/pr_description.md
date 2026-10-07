Follow-up to 🔀 #23473 - the unscoped command palette search no longer sends a round of backend searches for every keystroke.

Backend requests a signed-in user sends by typing `fastqc` into the palette with no scope, by gap between keystrokes:

| Gap between keystrokes | `dev` | This PR |
| --- | --- | --- |
| 100 ms (faster than the debounce) | 6 | 6 |
| 300 ms (ordinary typing) | 29 😬 | 6 |
| 500 ms (hunting for keys) | 29 | 29 |

😬 = every prefix from `fa` on sends the shared and published history searches, the shared and published workflow searches and the published reports search, plus the tool search from `fas`. Counts follow from the debounce and settle timings, not from a recorded session.

Since #23473 an unscoped search fans out to five listing searches and the tool search once the input has paused for the 150 ms debounce. Ordinary typing pauses longer than that between keys, so nearly every keystroke sent the whole round, and a superseded answer was only dropped once it came back. Logged-out visitors send the three published searches the same way.

This PR makes those backend searches wait another 250 ms (`PALETTE_LIMITS.backendSettle`), and every keystroke aborts the running search's signal. A search whose input changes before it has waited out the debounce and the settle (400 ms in all) never sends its requests.

***Raising the 150 ms debounce instead would also slow the cached sections and local tool matches, which answer every debounce without a request; the settle delays only the backend searches.*** 250 ms on top of the debounce covers the pause between ordinary keystrokes, so usually only the query typed last reaches the backend.

***The trade is latency: backend rows for the final query now arrive about 250 ms later (400 ms after the last keystroke instead of 150 ms).*** Cached rows from the datasets, invocations, visualizations, actions and navigation providers answer as fast as before.

***Scoped searches (`t:`, `h:`, `w:` and a picked category) never wait. Requests already sent aren't cancelled; they finish and are dropped as before.***

<details><summary>How it works</summary>

- `usePaletteSearch` keeps an `AbortController`. A synchronous watch on the input text aborts it and retires the running search's results on every keystroke; `runSearch` and `clearResults` do the same. The signal is passed through `PaletteSearchOptions` to each provider's unscoped `search`.
- `backendSettled(signal)` (in `CommandPalette/utilities.ts`) resolves `true` after `backendSettle` ms, or `false` as soon as the signal aborts. With no signal it resolves `true` immediately.
- `rootListItems` (histories, workflows, reports) awaits it before its listing searches, and the tools provider before `fetchTools`. The one-off hydration of each own list is not gated.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). The settle is one constant in `providers/limits.ts`.

<details><summary>Risk Details</summary>

- The first backend rows for a root query arrive 250 ms later than on `dev`.
- Cached own histories, workflows and reports are merged with their listing results in `rootListItems`, so they also show 250 ms later. They already waited for the backend round trip on `dev`.
- A slow typist (pauses over 400 ms) sends as many requests as on `dev`.

</details>

## Context

Follows up the review of 🔀 #23473 (command palette configuration options, anonymous access and a navigation scope), which raised the per-keystroke root search volume and suggested aborting superseded searches or a longer debounce for the backend part.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing new. A superseded search returns no backend rows, and its results are dropped as before. A failing backend search still degrades to an empty section.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. A palette test types `fastq`, waits an ordinary 300 ms, types `fastqc`, and checks only `fastqc` reaches the tool search; it fails if the settle or the per-keystroke abort is removed. Fake-timer tests check listings aren't searched before the settle or after an abort.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `CommandPalette.test.ts`: `never sends the tool search of a keystroke typed over before it settled`, with a 300 ms gap between keystrokes. The existing tests wait out the settle and assert the signal is passed.
- `providers/storeFirst.test.ts`: listings wait for the settle, and aren't searched once the signal aborts.
- `providers/tools.test.ts`: an aborted search sends no backend request.
- `vitest run src/components/CommandPalette`: 329/329; `vue-tsc` clean.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
