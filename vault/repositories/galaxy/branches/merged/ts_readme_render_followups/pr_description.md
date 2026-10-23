Follow-up to 🔀 #24053 — show a Tool Shed repository’s historical README and images when opening a revision permalink.

A revision link should show the documentation that shipped with that revision. Today, opening the link can leave out the README entirely; if the README was unchanged in that upload, the backend can also miss it, and relative images resolve against current repository files.

***This fixes README display on Tool Shed repository pages, including direct links to older revisions.***

| Older revision | Latest revision |
| --- | --- |
| ![Old revision with its original README and 16px logo](screenshots/repository_old_revision_readme.png) | ![Latest revision with its new README and 24px logo](screenshots/repository_latest_revision_readme.png) |

The browser regression opens the middle of three revisions, where the README and image were unchanged, and checks that its image decodes at 16px. It then opens the latest revision and checks the new README and 24px image. API tests independently compare the returned image bytes with each revision’s fixture.

***Historical READMEs pin their images to the requested changeset; the latest downloadable revision keeps its existing on-disk image behavior.***

<details><summary>Implementation</summary>

Load READMEs when the repository page first opens, read historical README text and images from that revision’s hg manifest, and share README post-processing across historical and latest revisions. The image endpoint gains an optional `changeset_revision` query parameter, with matching generated client typing. Unused Galaxy-mode handling and the unused `tool_path` parameter are removed from the Tool Shed README helper.

</details>

## Risks

The optional `changeset_revision` image query adds a public API behavior that clients may depend on.

<details><summary>Risk Details</summary>

- Revision-pinned requests return image bytes from hg; missing files and unknown revisions return 404.
- Lookup prefers an exact repository path, then falls back to the filename. Same-named files can remain ambiguous when only a filename is available.
- Historical responses do not add cache headers. Unversioned requests retain the existing disk lookup.

</details>

<details><summary>Risk Review Advice</summary>

Review the optional query contract and the manifest lookup fallback. Check the old-revision browser test’s unchanged-middle-revision fixture and image decode assertion, plus the API byte comparisons and failure cases.

</details>

## Context

Builds on 🔀 #24053, now merged and forward-merged into `dev`. This branch contains the dev follow-ups; the earlier README rendering fix is already in the base.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>The initial review kept the README cleanup together; the image route was added afterward at John’s request.</summary>

The scope evaluation predates the revision-aware image implementation. The later implementation and test-challenge debriefs cover that addition; the earlier recommendation to split it out is historical.

</details>

### ✅ [Cursor’s Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The initial cleanup review removed unreachable image-rewrite error handling.</summary>

The review predates the image route. It also identified the old/current image mismatch, subsequently addressed by revision-pinned image requests and byte-level tests.

</details>

### ✅ [John’s Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Mutation checks caught wrong-revision images and missing initial README loading.</summary>

The manifest test distinguishes exact paths, fallback names, deleted files and unknown revisions. The API test was strengthened to reject non-image files on the revision-pinned path. The existing fast frontend test is retained alongside the browser regression.

</details>

### ✅ Second Frontier Model Review

<details><summary>The earlier review reproduced old READMEs serving current image bytes.</summary>

That review preceded the image route; the mismatch it recorded is now covered by revision-specific API byte comparisons and browser image dimensions.

</details>

## John’s Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Missing images return 404; unreadable READMEs are omitted and logged; request failures trigger the frontend notification.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes: real repository histories, rendered HTML and revision-specific image bytes.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc. - what purpose do they serve? N/A.

## How to test the changes?

- [x] I’ve included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Regression coverage</summary>

Tool Shed unit tests cover README rendering and hg manifests. Image-route API tests check historical bytes, content types and 404s. `RepositoryPage.test.ts` checks initial permalink loading, and `test_old_revision_readme_renders_with_its_images` exercises the full browser-to-image path.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
