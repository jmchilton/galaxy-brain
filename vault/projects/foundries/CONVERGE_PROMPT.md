
Read ./DEVELOPMENT_LAYOUT.md relative to this file for context about foundries.

BEFORE surveying anything: in each repository named there, `git fetch origin` and fast-forward
to origin/main (skip any repo on a feature branch or with a dirty tree, and say which you
skipped). A survey run against a stale checkout measures divergence that has already been
fixed — the flagship was 39 commits behind on the first attempt, including its astro 7 upgrade.

Develop a plan for converging existing foundries along some particular axis. If not given extra context - figure out some potential axes and present to the user before digging into a particular axis. 

The instructions (never run before) for standing up new foundries using the Astro pattern is in /Users/jxc755/projects/repositories/foundry-pattern/content/pattern/standing-up-a-foundry.instructions.txt. In addition to reducing duplication between existing foundries - convergence should either result in this document being simplified or the result of running it being a foundry that covers more of the merged structure out of the box.


