# Test challenges debrief — PR #24610 (e085821c3565)

- Unit tests kept: no mocks, behavior-level (expanded volume string), Docker + Singularity, positive + negative cases. Not implementation-mirroring.
- Higher layer: not warranted; API/integration would need a container runtime for a one-char string fix.
- E2E: not applicable.
- Test plan suggestion (optional): extract the strip block into a pure helper and test it directly (see P3 1 in test_challenges_review.md).
- Tests not executed (no `.venv` in worktree).
