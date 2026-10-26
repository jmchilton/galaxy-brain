Checklist passes at `96b94dd2697` against the recorded release base `d9647406cf6`; no code changes requested. The human-read item remains unchecked. Workflow checklist does not apply to Tool Shed metadata generation and repository API tests.

<details><summary>Checklist review</summary>

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? Reset can advertise a sample-only tool or lose historical tool metadata despite completing; the API regressions assert those outcomes. Validation errors retain existing metadata reporting.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Public upload/reset/metadata APIs check IDs, versions, and changeset rows, without mocks or temporary-path assertions.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A; no baseline-only tests. Preparatory refactor is the leading commit.
- [x] Are the comments free of excess archeology? Yes; the added comment explains enduring sample/repository separation.
- [x] If comments contain previous implementation descriptions, what purpose do they serve? N/A.

Only two non-generated files change. Whitespace check passes. Recorded hardening evidence: 40 API tests passed, 99 unit tests passed with 12 skipped; both regressions fail at metadata assertions with the release-base generator. Tests reviewed, not rerun for this review.

</details>
