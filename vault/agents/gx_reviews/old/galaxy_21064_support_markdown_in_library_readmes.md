# galaxy#21064 - Support Markdown in library readmes

- PR: https://github.com/galaxyproject/galaxy/pull/21064 (dannon, base `dev`)
- Reviewed head: `f5ca5c939b016999bab5acb6fe67d78861871abd`
- Merge-base with `origin/dev` (fetched 2026-10-06): `e1db1f01d35`
- Size: +523/-274, 7 files. Most of the line count is the `LibraryFolder.vue` template being re-indented into a flex container.

## Verdict

**Approve, with small follow-ups.** The rendering path reuses what Galaxy already has: the `useMarkdown` composable, then `v-sanitize-html:markdown`, the same pair used by tool help and Pages. davelopez's two substantive server findings (an access-control leak and matching on the wrong name) were fixed for real. Our red/green run confirms it: the new tests fail against the pre-feedback service and pass at head. What's left is client tidiness (#6 and #10 from his review), a still-generous payload per request (his #2, partly addressed), and one UX question about the default visibility.

## What the PR does

- `GET /api/folders/{id}/contents` gains `metadata.readme_raw: str | None`. Server side, it finds the first non-deleted dataset in the folder named `readme`, `readme.md`, `readme.markdown` or `readme.txt` (case-insensitive, matched on the LDDA name) with an extension of `txt` or `markdown`. The user must be able to access that dataset. The server reads at most 1,000,000 characters from it.
- The client renders it with `useMarkdown({ openLinksInNewPage, removeNewlinesAfterList })` and `v-sanitize-html:markdown`. The result goes in a side panel that wraps below the table on narrow screens. The panel is toggled by a README button in `FolderTopBar`, and the toggle state persists per user through `usePersistentToggle("library-folder-readme")`, which defaults to off.
- `library-folder-table.css` is deleted and its rules move into the component's scoped style.

## davelopez feedback status

Source: davelopez's review, submitted 2026-10-06T11:34Z against `571bbf1d13`. It was posted both as the review body and as a PR comment, and there were no inline comments. dannon didn't reply in the thread. He answered with three commits 6 to 11 minutes later: `f3fb59f44b` (tests, pushed first), `468762e84a` (server) and `f5ca5c939b` (styles).

**Tally: 6 addressed, 2 partially addressed, 2 unaddressed, 0 pushed back on.**

| # | Point | Status | Notes |
|---|---|---|---|
| 1 | README bypasses dataset access | **Addressed (real)** | `library_folder_contents.py:195-196` now skips the README unless `trans.user_is_admin` is set or `can_access_dataset(...)` passes, which matches the listing's own `security.is_admin` gate in `folders._get_contained_datasets_statement`. `test_index_readme_permissions` covers a private README, a second user, and access granted later. **Red/green confirmed:** with the service reverted to `571bbf1d13`, the test fails with `assert '# Secret\n' is None`. |
| 2 | Unbounded read on every contents request | **Partially addressed** | The read is capped (`README_MAX_CHARS = 1_000_000`, `:42`, `:199`). It still runs, and still ships up to ~1M characters (a few MB of UTF-8), on every page, sort, search and refresh, even when the panel is closed. He also suggested reading only when `offset == 0` or moving the README to its own endpoint, and neither was taken. The cap counts characters after `open(get_file_name())`, so with a caching object store the whole file is still pulled into the cache first. A size check through `ldda.get_size()`, which he suggested, would avoid that. |
| 3 | Matched on `LibraryDataset._name`, not the LDDA name | **Addressed (real)** | The query now joins the LDDA and filters on `func.lower(func.trim(ldda.name))` (`:181-187`). `test_index_readme_follows_rename` renames a dataset into and out of `README.md`. **Red/green confirmed:** it fails on the old code at `test_folder_contents.py:357`. |
| 4 | Description column always clamped to 200px | **Addressed** | The clamp is now scoped to `.library-main-content.with-readme` (`LibraryFolder.vue:805`), and `with-readme` is set only when the panel is open *and* a README exists (`:25`). |
| 5 | `.limit(1)` without `ORDER BY` | **Addressed** | The query now has `.order_by(LibraryDataset.id)` and loops, so an inaccessible or non-text README falls through to the next candidate. He suggested ordering by preference (md > markdown > txt > bare), but oldest-wins is stable, which was the point. |
| 6 | Double render; `renderedReadme` should be computed | **Unaddressed** | The watcher on `folder_metadata.readme_raw` (`LibraryFolder.vue:420-422`), the direct `renderReadme()` call in `fetchFolderContents` (`:470`), the manual clear in `resetData` (`:443`), and `renderReadme()` itself (`:695-701`) are all still there. A README that changes is still parsed twice. |
| 7 | `"md"` isn't a Galaxy datatype; sets rebuilt on every call | **Partially addressed** | The sets are now module constants (`:39-40`), but `"md"` is still in `README_EXTENSIONS`. `datatypes_conf.xml.sample` defines only `markdown` and `txt`. |
| 8 | Hard-coded GitHub palette and fonts; `min-width: 400px` overflow | **Addressed** | The hex colors became `$gray-*` theme variables, the font and link overrides were dropped, and the row now wraps (`flex-wrap`, `flex: 1 1 22rem`, `min-width: 0`). One leftover: `border-left` / `padding-left` on `.readme-panel` (`:812-819`) still applies when the panel wraps *below* the table, where a top border would look right. The panel keeps some custom heading, `pre` and `blockquote` styling instead of shared markdown styles. That's acceptable. |
| 9 | Test didn't test what its comment claimed | **Partially addressed** | Mixed case (`ReadMe.md`), rename and access restriction are now covered, and the misleading comment is gone. The extension filter (a `README.txt` being picked up, or a `README.md` with a non-text extension being skipped) still has no test. |
| 10 | Confusing `showReadme` / `readmeVisible` props | **Unaddressed** | `FolderTopBar.vue:54-55` is unchanged. The parent still binds `:show-readme="!!renderedReadme"` beside `:readme-visible="showReadme.value"` (`LibraryFolder.vue:13-14`), where the parent's `showReadme` means "visible". |

## Our findings

Ranked by severity. Points davelopez raised that are still open (#2, #6, #7, #9, #10) are referenced above and not repeated here.

### Low: the README is hidden by default, so most visitors won't see it

`usePersistentToggle` defaults to `false`, and the state is global per user, not per folder (`LibraryFolder.vue:428-430`, `persistentToggle.ts`). A library admin who adds a README probably expects visitors to see it. As written, a visitor sees only an enabled README button in the toolbar. Meanwhile the server reads the file and sends it on every request regardless (his #2). Two options:

- Open by default when a README exists, and remember a "closed" choice.
- Keep the default as is, and fetch lazily when the panel opens. That would also settle most of #2.

This is a product question for the author, not a bug.

### Low: the sanitize profile is wider than this content needs

`v-sanitize-html:markdown` (`LibraryFolder.vue:275`) allows SVG/MathML, form controls (they aren't in its `FORBID_TAGS`), and the `gxhelp:` / `gxstatic:` / `gxdatasetasimage:` URI schemes. Those exist for KaTeX and the authoring help in Pages and tool help. `useMarkdown` builds `MarkdownIt()` with the default `html: false`, so raw HTML in the README is escaped before it reaches DOMPurify. That makes the extra allowances unreachable today, so this isn't a vulnerability. But the `links` profile (HTML plus `target` with `rel` enforcement) matches what this panel renders, and it would stay safe if someone later turns on `html` in the composable. This is optional hardening. It isn't blocking, because Pages already renders user-authored markdown through the same profile.

### Nit: `readme_raw` field name

The `_raw` suffix is left over from when the PR also sent a rendered field (removed in `bb8d9a29fd`). Once merged, the field name is API surface, so this is the cheap moment to rename it to `readme` if anyone cares. It's fine as is.

### Nit: `readme.txt` / bare `readme` render as Markdown

Plain-text READMEs go through `renderMarkdown`, so indentation and underscores may be interpreted as Markdown. That's usually harmless. Rendering them in a `<pre>` when the extension is `txt` would be more faithful. Optional.

### Reuse and abstraction (positive)

- The client reuses `useMarkdown` (galaxy-ui), the `v-sanitize-html` directive, `GButton`, and `usePersistentToggle`. It adds no new markdown or purify path. The earlier ad-hoc `purify.sanitize` commit (`a1442eeb02`) was replaced by the directive in `571bbf1d13`.
- Server: the lookup is a private `_get_readme_raw` on the service. Reading through `open(dataset.get_file_name())` matches common Galaxy practice for peeks. Only #2's size or lazy-fetch concern applies.
- The sqlalchemy imports are at module top (`:4-7`). The tests are integration-level API tests with no trivial unit tests, and the comments are purposeful.
- Typing: `str | None` throughout, and `current_user_roles: list[model.Role]`. Fine.

## Testing done

- `lib/galaxy_test/api/test_folder_contents.py -k readme`, run at head (borrowed `~/projects/repositories/galaxy/.venv`, since the worktree has no `.venv`): **3 passed**.
- Red check: `library_folder_contents.py` swapped to its `571bbf1d13` (pre-feedback) version, same tests: **2 failed**:
  - `follows_rename`: `assert None is not None` at `:357`
  - `permissions`: `assert '# Secret\n' is None`

  Reverted, and the worktree is clean.
- Client: no vitest coverage was added, and the worktree has no `node_modules`, so nothing was run. jmchilton's PR comment says E2E tests will follow in `dev`.
- XSS check by reading the code: `MarkdownIt()` uses `html: false`, markdown-it's `validateLink` rejects `javascript:` / `vbscript:` / `data:` (except images), and DOMPurify runs on the output. No exploitable path was found.

## Risks

Low risk. The only one-way piece is the new optional `readme_raw` field on the folder-contents API. It's additive, but once released its name and semantics are API surface.

<details><summary>Risk Details</summary>

- New public API field `LibraryFolderMetadata.readme_raw` (additive and optional). Renaming it later means a deprecation cycle.
- This establishes a convention for library admins: a dataset named `README[.md|.markdown|.txt]` in a folder becomes the folder's description panel. Users will start relying on the filename convention.
- Every folder-contents request does an extra query plus a file read of up to 1M characters, and sends the result even when the panel is closed (davelopez's #2, partly addressed).
- There's no data-model or migration change. Nothing is persisted, so the UI and server lookup are fully reversible.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether `readme_raw` on the paginated contents response is the long-term shape. Sending it on every page, versus a lazy `GET /api/folders/{id}/readme` fetched when the panel opens, is the one choice that gets harder to reverse after release. It also ties into the closed-by-default question. Everything else (styles, the toggle, the client render path) is a cheap two-way door.

</details>

## Draft GitHub review (unposted)

```markdown
*Posted by Claude (AI assistant) on behalf of jmchilton - not written by them personally.*

Looks good to me. It reuses `useMarkdown` + `v-sanitize-html:markdown` instead of adding another render path, and the two server fixes from the earlier agentic review hold up. I reverted `library_folder_contents.py` to `571bbf1d13`, and the new `follows_rename` and `permissions` API tests fail there and pass at head, so they really guard the fixes.

Still open from that review, none of it blocking:
- #2: the README (up to 1M chars) is still read and sent on every page, sort and search, even with the panel closed. Lazy-fetching it when the panel opens, or only when `offset == 0`, would fix that.
- #6: `renderedReadme` is still a data field plus a watcher plus a direct call, so it renders twice on change. A computed would be simpler.
- #7: `"md"` in `README_EXTENSIONS` can never match a Galaxy datatype.
- #9: nothing tests the extension filter (a `README.txt` picked up, a non-text `README.md` skipped).
- #10: `showReadme` / `readmeVisible` prop names on `FolderTopBar`.

A few small things of mine:
- The toggle defaults to closed and is global per user, so most visitors will never see a README a library admin went to the trouble of adding. Would it make sense to open it by default when one exists, and remember a "closed" choice?
- Since `MarkdownIt` runs with `html: false`, the `links` sanitize profile would cover this panel. The `markdown` profile's SVG/MathML, form controls and `gx*` URI schemes aren't needed here. Optional hardening, not a vulnerability.
- Nit: `readme_raw` -> `readme`? The `_raw` dates from when a rendered field was also sent. Easy to rename now, harder once released.
- Nit: when wrapped below the table, the panel's `border-left` looks a bit off. A top border in that layout might read better.
```
