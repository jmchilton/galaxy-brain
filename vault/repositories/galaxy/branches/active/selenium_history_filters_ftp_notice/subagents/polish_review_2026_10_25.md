# Polish checklist and strengthening review — 2026-10-25

The checklist passes after moving admin authentication into driver setup and fixing FilesDialog's import order. One strengthening round clarified the PR description; it requested no additional development or scope changes. Fresh runtime and static results are recorded in `../polish_debrief.md`.

## Checklist

- [ ] Did a human read every test and every comment? Reserved for John.
- [x] What does the user see when it fails? The FTP notice is informational; an unset server omits the log-in sentence; long names wrap within the Name column. Browser assertions check layout, upload content, and history state.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The Vitests assert rendered text.
- [x] Are baseline tests in their own leading commits? Yes. FilesDialog, history hide/undelete, and remote-subfolder baseline commits precede the client fixes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments describe previous implementation or bugs, what purpose do they serve? N/A.

GENERAL applies; the branch does not change workflow behavior.

## Findings acted on

- Removing `ensure_registered` without moving login left `@managed_history` running anonymously. Both admin upload classes now authenticate in `setup_with_driver()`, before history creation, and their test bodies and fixture helper no longer log in again.
- Client CI identified import ordering in `FilesDialog.vue`; only the import move was retained from ESLint autofix.
- The branch's new missing annotations were corrected during static verification. The checklist was rechecked after the setup fix, import move, and annotation cleanup; no runtime logic or assertions changed in the latter two.

## Strengthening

- The highlight distinguishes upload regression infrastructure from history baseline coverage, preserving the demonstrated base-client failures and the empty-site Vitest evidence.
- `FtpUploadHelp.vue` is described as a new shared component; its notice text existed inline in FilesDialog.
- The description records admin login before `@managed_history`.

No scope expansion recommended. The human-read item remains unchecked.
