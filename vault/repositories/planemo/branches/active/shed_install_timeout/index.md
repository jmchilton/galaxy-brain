---
upstream_base_branch: master
---
# Time out Tool Shed repository installs that never return

- [Open PR](https://github.com/galaxyproject/planemo/compare/master...jmchilton:planemo:shed_install_timeout?expand=1)
- [View on GitHub](https://github.com/jmchilton/planemo/tree/shed_install_timeout)

## Status

Polished and waiting for John's final review; branch `shed_install_timeout` on `jmchilton` at `6afeda61`, from `origin/master` `cd2c1944`.

No PR yet.

Fork CI queued on `6afeda61`.

## Notes

- Issue: [#1768](https://github.com/galaxyproject/planemo/issues/1768), record [issues/wip/1768](../../../issues/wip/1768/index.md).
- [Implementation debrief](implementation_debrief.md), [normal review](subagents/normal_review.md), [Codex review](codex_review.md), [thermo-nuclear review](thermo_nuclear_review.md), [polish debrief](polish_debrief.md) (holds the open scope questions).
- [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md).
- Local gate: `make lint` passes. `tests/test_galaxy_config.py` has 3 failures that fail identically on base: the dev machine's `/usr/bin/python3` lacks `python3-venv`, so the Galaxy bootstrap can't create a venv.
