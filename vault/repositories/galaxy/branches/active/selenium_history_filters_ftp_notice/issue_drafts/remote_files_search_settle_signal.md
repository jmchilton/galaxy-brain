# Selenium: let `_search_remote_files` wait on a "search applied" signal instead of sleeping

Target: `dev`. Follow-up to #24458 (dannon's review).

`_search_remote_files` in the upload test helpers sleeps past `DataDialogSearch`'s 500ms debounce on every search, then waits for the listing and swallows the timeout (Invenio-style sources ignore the query). Every staged file pays the sleep, and a search that never applies goes unnoticed.

Proposal:
- Client: expose when the dialog's applied filter matches the typed query (e.g. a `data-search-applied` attribute or a busy flag on the listing).
- Helper: wait on that signal, drop the fixed sleep; fail on timeout unless the source is known not to support search.
