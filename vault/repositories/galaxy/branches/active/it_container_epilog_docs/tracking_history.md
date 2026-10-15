# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `it_container_epilog_docs` (`f0811cce6a4`, off dev) — Description: Docs-only: InteractiveTools admin docs gain a Slurm epilog that kills IT containers left running after their job (#13511); blockers: John's read-through (fork Build docs green on `f0811cce6a4`); generic `drmaa` runner cleanup race unverified (see polish debrief); [description](pr_description.md), [titles](pr_titles.md), [polish debrief](polish_debrief.md). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:it_container_epilog_docs?expand=1).
- 2026-10-14: head `28d78493d29` — doc now links usegalaxy.org's pinned `epilog.sh` (infrastructure-playbook `8e96583`) and says the doc's script is adapted from it. Checked: script unchanged since `632b0e2` (2024-12-12); `Epilog:` is set cluster-wide on JS2 Slurm (all partitions, ITs on `gxit`). usegalaxy.eu has no equivalent (HTCondor; only a VGCN weekly stop-containers-older-than-a-month cron), so it isn't mentioned.
