# issue_23695_testing_docs_site_down — implementation debrief

Branch `jmchilton:issue_23695_testing_docs_site_down` (`56d9d6f16bb`), on dev `253a4cb0b9c`. One commit, docs only. Fixes #23695.

## Why
#23695 ("Update Galaxy Testing Docs", for #23685): #23685 added `skip_if_quay_down`, `skip_if_galaxy_depot_down`, `skip_if_dockstore_down` and spread the skip-when-down decorators, but `doc/source/dev/writing_tests.md` never mentioned the mechanism.

## What
- New `### Skipping Tests When a Remote Service Is Down` (`{#remote_service_down}`) under "Avoiding External Dependencies in Tests":
  - table of the per-service decorators and `skip_if_site_down(url)`;
  - where `skip_if_toolshed_down` lives; stacking example;
  - `is_site_up` + `SkipTest` from setup code (`uses_shed.py`);
  - probe limits, `unavailable_pattern`, `skip_on_network_error`.
- Cross-links from the mulled "Slow 'Unit' Tests" section and "Handling Flaky Tests".

## Verification
- Standalone Sphinx + MyST render (conf.py's extension list) of the page: no new warnings; `#remote-service-down` and `#transient-failures` links resolve.
- All claims checked against `lib/galaxy/util/unittest_utils/__init__.py` and real usages (review subagent confirmed).

## Review
Subagent review: no significant issues. Applied: probe wording (any URL, any non-200), WorkflowHub "down or blocking", `is_site_up` setup-code note, `self`-less example, flaky-section paragraph break, anchor renamed to a topic name, "depot.galaxyproject.org" spelled out.

Not applied: rewording the Flaky Tests intro to drop "external dependencies" as a cause. Non-outage external flakiness (rate limits, slow APIs) still belongs under `@transient_failure`, so the existing sentence stays; the new note sits beside it as its own paragraph.

## Notes
- Committed with `--no-verify`: the opt-in prettier hook (`.pre-commit-config.yaml.sample`) rewrites the whole pre-existing non-prettier file. No CI prettier check on `doc/`.
- No fork CI expected to matter (docs only).
