Independent review approved the scoped InlineUpload timeout repair without changes. No assertions were removed or weakened.

Details: comparing original `57f3d5a911a` with folded commit `ba1ad92fa97` changes only `{ timeout: 5000 }` on pasted-editor and return-to-computer `findByRole` waits plus formatting. Queries, interactions, visibility and negative checks, story setup and unit tests are identical. No production changes are included. Browser gates under parallel load exposed the pasted editor's original one-second wait; all later runs passed this file.
