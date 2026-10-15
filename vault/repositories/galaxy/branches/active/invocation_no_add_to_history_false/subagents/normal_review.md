Accepted the review with no code changes: it found no correctness or clarity issues. The completed green API run passed all three cases. No recommendations were declined.

<details>
<summary>Full normal review</summary>

# Normal review

No correctness or clarity findings in the final API regression and production diff. Verified the production change is exactly the intended one-line value check at lib/galaxy/workflow/run_request.py:336; the only other change is the 24-line API regression.

The schema defaults no_add_to_history to false; exclude_unset=True preserves explicitly submitted false. Reading its value restores equivalence between omission and false while preserving true. Existing input copying paths remain in use.

The regression uses real histories and an HDA, submits JSON through the public invocation API, and inspects target-history contents. Separate source/target histories exercise copying. Omission, false, and true protect all boolean states without mocks or private-helper assertions.

Reviewer ran git diff --check successfully on the final implementation and test diff. Coordinator reported the red run passed the omitted case and failed the explicit false case with zero target items versus one expected, demonstrating the intended regression. The green run remains owned by the parent coordinator; this review does not claim its outcome.

</details>
