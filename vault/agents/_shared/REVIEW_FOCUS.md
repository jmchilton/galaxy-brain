When reviewing external pull requests or local feature/fix branches - weight reviews toward:

- Clarity of review.
- Reuse of existing abstractions.
- Consistency with sibling paths: when a change special-cases one source of a value, check how the same situation is handled from the other sources (e.g. what a tool author can declare explicitly), and flag any behavior that now diverges.
- Whether the change leaves behind a reusable abstraction, or just accretes.
- Python imports at module top level, not buried in functions (unless commented why).
- Test coverage, and whether tests were weakened rather than the implementation fixed.
- Can unit tests be replaced with integration tests?
- Are we avoiding silly, trivial unit tests?
- Are we avoiding obvious comments?
- Would narrow typing or typing abstractions improve this work?
