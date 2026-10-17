# Galaxy PR #24222 — Add a tool tag filter to tool discovery

**Latest status — 2026-10-17:** Initial technical and correctness review complete: **one P2 finding; changes requested in the unposted draft**. Nothing posted to GitHub.

- PR: https://github.com/galaxyproject/galaxy/pull/24222
- Review head: `afd897e4d4a93e2a0f1eefcf9a8dcf009d8adb1c`
- [Technical review and validation](review.md)
- [Unposted review draft](draft-review.md)
- [Reproduction patch](regression-test.patch)
- Validation: 147 focused/existing tests passed; two supplemental cases reproduce keyword/favorites search loss on tag selection. Worktree clean after removing probes.
- Risk: reversible UI/store change; primary correctness risk is silent search-condition loss.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24222`
- User instruction: scope and branch target are accepted; review technical correctness only.
