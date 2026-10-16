# Independent polish checklist — 2026-10-14

Reviewed `origin/dev..042902f139e62194204c36cd6b404eae4fe2518e`: seven changed files and surrounding driver/UI code. No required fixes.

Workflow checklist does not apply: workflow button changes belong to merged prerequisite #24104, outside this branch diff.

- [ ] Did a human read every test and every comment? (Requires John.)
- [x] What does the user see when it fails? A broken copy leaves the clipboard unchanged; the test catches that and checks the success toast.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? The browser test clicks the real API-key button and checks the exact copied key and toast.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc. — what purpose do they serve? N/A.

The expected key comes from Galaxy's API. The recorder replaces only `navigator.clipboard`, retaining the real component, click handler, clipboard helper and notification. OS clipboard permissions and writes remain outside its scope. `wait_on` accepts empty strings and times out explicitly when no write occurs. The context manager removes the override after assertion failures. Migrated custom-tool coverage preserves its content assertion while removing duplicated interception and a fixed sleep; the data-source toast selector is unchanged. Comments explain cleanup and headless constraints. `git diff --check` passes.
