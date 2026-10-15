# Initial implementation

Restore CI filters on tracked source paths after merged PR [#23999](https://github.com/galaxyproject/galaxy/pull/23999). Base: `8b729ff0050c32573ad0fa999e5e1b4d015dca8c` (`origin/dev`). Branch: `ci_tracked_source_filters`. Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/ci_tracked_source_filters`.

Package source directories are tracked symlinks into `lib/`; edits through them still produce `lib/...` Git diff paths. Restore all removed `lib/...` event filters alongside the package aliases: narrow inclusion filters in eight workflows and Selenium exclusions in seventeen broad workflows. Requirements reads, workspace setup, job bodies and package metadata triggers remain unchanged. Metadata-image source inclusion is restored for pull requests; push triggers remain unchanged.

Verification will compare actual parsed workflow lists against tracked representative paths, check former Selenium-only exclusions, prove job bodies are unchanged and inspect YAML/diff validity. No repository tests are added: this patch only changes declarative event filters, and API/browser tests cannot exercise GitHub scheduling. Independent normal, code-quality and scope reviews are required. There are no UI changes or screenshots.
