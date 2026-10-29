---
upstream_base_branch: master
pr: 1772
---
# Time out Tool Shed repository installs that never return

- [View PR #1772](https://github.com/galaxyproject/planemo/pull/1772)
- [View on GitHub](https://github.com/jmchilton/planemo/tree/shed_install_timeout)

## Status

Branch `shed_install_timeout` on `jmchilton` at `6afeda61`, from `origin/master` `cd2c1944`.

PR #1772 open (not draft), mergeable, opened 2026-10-29 with title "Time out Tool Shed repository installs that never return" at John's request.

Upstream CI running on `6afeda61`.

## Notes

- Issue: [#1768](https://github.com/galaxyproject/planemo/issues/1768), record [issues/wip/1768](../../../issues/wip/1768/index.md).
- [Implementation debrief](implementation_debrief.md), [normal review](subagents/normal_review.md), [Codex review](codex_review.md), [thermo-nuclear review](thermo_nuclear_review.md), [polish debrief](polish_debrief.md) (holds the open scope questions).
- [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md).
- Local gate: `make lint` passes. `tests/test_galaxy_config.py` has 3 failures that fail identically on base: the dev machine's `/usr/bin/python3` lacks `python3-venv`, so the Galaxy bootstrap can't create a venv.
