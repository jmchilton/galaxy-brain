When reviewing external pull requests or local feature/fix branches - weight reviews toward:

- Clarity of review.
- Reuse of existing abstractions.
- Whether the change leaves behind a reusable abstraction, or just accretes.
- Python imports at module top level, not buried in functions (unless commented why).
- Test coverage, and whether tests were weakened rather than the implementation fixed.
- Can unit tests be replaced with integration tests?
- Are we avoiding silly, trivial unit tests.
- Are we avoiding obvious comments.
