No refactoring of the base branch was performed.

The existing history already puts the independent baseline first: `bcf36e0efac` (`Baseline tests for FAQ storage refresh, workflow tags and display links`) adds browser coverage of behavior present on `origin/release_26.2`. The coordinator verified those tests passed before the helper extraction. This commit remains unchanged and first.

The remaining uncommitted implementation is itself the intended refactor: shared navigation helpers replace inline test operations, consumers retain their behavior assertions, and display-application hooks replace structural selectors. Observable waits replace changed profile sleeps, and stable screenshots document the exercised surfaces. No user-visible feature or bug fix follows that would benefit from another preparatory baseline commit.

A further history split would separate helper definitions from their consumers or stable hooks from the navigation targets that use them, without isolating an independently useful prerequisite. Retain the planned second commit for this cohesive helper/consumer extraction and its supporting hooks. No commit, rebase, file edit in the Galaxy worktree, or coordination with the running formatter was needed for this evaluation.
