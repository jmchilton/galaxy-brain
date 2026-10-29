# Review branch `pr_24513_review_0`

Branch `pr_24513_review_0` on `jmchilton/galaxy`, based on the reviewed commit `30b80862`, adds two tests to `client/src/components/Panels/Upload/methods/RemoteFilesUpload.test.ts`. One covers client-side paging and search, the path sources without server support now depend on since the watchers were removed. The other covers the root reload `startUpload()` now does itself. The `useFileSources` mock becomes switchable through a `vi.hoisted` flag, with server-side as the default. No component code changes. The spec passes 7/7, and each new test was checked red against a mutation of the code it covers.

- `c96e9789f17` Test client-side paging and search in RemoteFilesUpload: with server capabilities off, goes to page 2 and searches, asserting the rendered rows and a single listing of the source (P2 1).
- `5b29620b352` Test RemoteFilesUpload reloads file sources after startUpload: calls the exposed `startUpload()` from inside a folder and asserts one `fetchFileSources` call with the root listing shown (P3 1).
