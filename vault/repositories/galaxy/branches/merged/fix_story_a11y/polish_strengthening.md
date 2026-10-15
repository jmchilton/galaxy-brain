# One strengthening round

A fresh subagent reviewed the description, source diff, and validation evidence. It requested one bounded task: pin the harness comparison and document executable setup commands, then smoke-check a fresh detached checkout. It requested no production development, permanent CI harness, or wider accessibility program.

## Applied

`validation/sync-harness.py` now compares the exact audit and production SHAs, requires explicit source/target paths, checks source cleanliness and the target audit HEAD, preserves frozen stories/helpers, and removes deleted production sources. The README includes clone/checkout, overlay, patch copy, dependency install, selector patch, strict audit/server, and probe commands.

Fresh checkout `/private/tmp/fix_story_a11y-polish-repro`: copied 54 files, removed the obsolete multiselect helper, changed all 121 audit declarations to strict mode, and applied the saved selector patch cleanly. Every overlaid file matches production bytes. Dependency installation and story-patch inspection are recorded in the polish debrief.

No production SHA changed, so the original audit and keyboard results remain evidence for the branch. This strengthens reproducibility rather than claiming a new full browser run. No second strengthening round is needed.

## Predicted misreadings

- Audience: this only benefits Storybook developers. The highlighted audience sentence says the production repairs serve users of Galaxy's existing UI and run independently of Storybook.
- Scope: 236 passes establish complete accessibility. The highlighted bounded-repair sentence explicitly limits the claim and excludes manual screen-reader verification.
- Scope: this adds Storybook/axe CI. The validation details explicitly say no dependencies or permanent axe CI are added.
- Workflow scope: execution or saved definitions change. The validation details and checklist state they retain their behavior; only controls, announcements, and markup change.

All four predicted misunderstandings are answered by highlighted sentences above the details fold. The explicit CI and workflow limits share a third highlighted sentence and also remain in the body.
