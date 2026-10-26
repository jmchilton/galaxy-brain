# John's Galaxy Brain Factory

Most of the Galaxy pull requests and reviews John posts start with coding agents. The agents follow written processes that live in this repository, and John reads and approves the result before anything reaches GitHub. These pages describe those processes for the people on the other side of a PR: what the agents did, what the checks mean, and where a human made the call.

There are two factories:

- **[Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/)**: how an issue becomes a pull request. Issues are triaged, a workhorse agent implements and hardens a branch, and a branch manager polishes it and opens the PR once John approves it.
- **[Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/)**: how a review of someone else's pull request is produced. Several reviewer profiles run in parallel, a verifier reproduces and filters their findings, and John edits the response before it's posted.

Both share **[Differential Review](https://jmchilton.github.io/galaxy-brain/factory/differential-review/)**: agents snapshot each branch after every phase, so John checks work off once and later reads only what changed, across rebases and force-pushes.

> [!TIP]
> **💭 Workflow Rule:** agents draft; John decides. A PR opens only after John has read and approved the branch, and a review is posted only after John has edited it and picked an action. Approval is pinned to a commit SHA, so any change other than a clean rebase sends the branch back for another read.

> [!NOTE]
> Galaxy is an old, well-established codebase. Both factories push hard on reusing existing abstractions and leaving behind reusable ones, rather than adding code that only serves one PR.
