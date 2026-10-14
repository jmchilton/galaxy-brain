Follow-up to 🔀 #24104 — add browser regression coverage for copying an API key and share clipboard capture across Galaxy E2E tests.

Clicking the API-key copy button should copy that exact key and show “Key was copied to clipboard.” The new regression creates a key, clicks the rendered button, verifies the copied value against Galaxy's API, and waits for that toast.

***This follow-up adds regression coverage for the fix in #24104; the clipboard behavior fix has already merged.***

```text
Create API key → click Copy → captured text equals API key → success toast
```

***The tests observe writes to a replacement browser clipboard; they do not verify operating-system clipboard permissions or contents.*** The shared capture helper works through the existing Selenium and Playwright script interface. The custom-tool documentation copy test now uses it instead of an inline recorder and fixed sleep; the data-source redirect test uses the same shared toast selector.

## Risks

This is a two-way door: changes are limited to browser-test support, regression coverage and a selector attribute on the API-key button. The recorder resolves clipboard writes successfully, so clipboard permission failures remain outside its coverage.

## Context

Builds on merged 🔀 #24104, which fixes the Vue 3 clipboard regression reported in #24102. This branch targets `dev`.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A broken copy leaves the clipboard unchanged; the regression checks the copied value and success toast.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Browser coverage clicks the real button and checks the copied API key.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc. — what purpose do they serve? N/A.

## Validation

The API-key copy regression, existing API-key test and custom-tool documentation test pass under both Playwright and Selenium/Chrome (three tests per backend). Five clipboard component tests, Python lint/formatting and changed client-file formatting checks pass. Fork CI for `042902f139e` is pending; the data-source browser suite was not run.

## How to test the changes?

- [x] Instructions for manual testing are as follows:

<details><summary>API-key copy browser regression</summary>

Run `test_personal_information.py::TestManageInformation::test_copy_api_key` against a running Galaxy instance using either browser backend. Also run `test_api_key` and `test_custom_tools.py::TestCustomTools::test_authoring_documentation_interactions` to cover the shared setup and migrated clipboard consumer.

</details>

## License

- [x] I agree to license my contributions under the MIT License.
