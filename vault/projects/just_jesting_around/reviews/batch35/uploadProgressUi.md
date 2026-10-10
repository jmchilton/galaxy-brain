# uploadProgressUi

Selected originator: `client/src/components/Panels/Upload/uploadProgressUi.test.ts`. Baseline **3 tests** → final **4 tests**.

The paste-links and remote-files table now states each input URL and the literal expected `sourceUrl`. The original expectation, `"url" in item ? item.url : undefined`, computed the answer from the input, so it restated whatever URL the item carried. The URLs are the fixtures' original defaults, now passed explicitly. The local `withState` wrapper is replaced by the shared [`withUploadState`](withUploadState.md).

Added case: data-library uploads carry an API `url` but must not expose it. The local-file case alone can't catch a missing upload-mode filter, because local files have no `url`. A probe that dropped the mode check from `getUploadItemSourceUrl` failed only the new case; production code was restored, and the worktree was clean afterwards.

Preserved: both URL-exposing modes and the local-file omission, with their original fixtures and assertions (the URL checks are now literal).

Reuse: existing `make*Item` factories, plus `withUploadState`, extended in `uploadFixtures.ts` for this suite and `UploadFileRow.test.ts`.

Validation: 4/4 pass, and 84 tests across the 7 fixture consumers pass shuffled (seed `350101`). ESLint, Prettier and full `vue-tsc --noEmit` pass.

Guidance: none. The README already covers factories and visible scenario inputs.
