- `kind/bug` — opening a workflow and clicking Run/Exit before load finished raised a spurious unsaved-changes prompt; the selenium helpers were also broken.
- `area/workflows` (`area/workflows/editor` doesn't exist upstream)
- `area/testing/selenium`

The labeler also adds `area/testing` (redundant with `area/testing/selenium`) and probably `area/UI-UX` for `client/src/**`. Drop both: the client change is a 5-line editor state fix, not a UI change.
