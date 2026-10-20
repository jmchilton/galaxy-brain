Current Galaxy version to review is 26.2 - calling it GX_VERSION below. The checklist is
`./faqs_26_2.yaml`, described by [FAQS_YAML_SCHEMA.md](FAQS_YAML_SCHEMA.md). Galaxy is the
`galaxy_ui_driver` branch, based on `release_26.2`.

## Pick a FAQ

You will be supplied a GTN FAQ from `./faqs_26_2.yaml`. If you're not supplied one, then just pick the first relevant `pending` one. If picking a translation - make sure the base (same file name under `faqs/galaxy/`) has been reviewed first.

Record `gtn_commit` (and `galaxy_commit` for UI runs) on the entry before you start.

## Does it need UI work?

Decide if the FAQ should be reviewed in isolation or the UI exercised, and set `mode`. Translations probably shouldn't have a separate UI test. Just review the source please and make sure the English variant has a UI test if needed.

## If it doesn't need UI verification

Just review the FAQ directly based on the source for correctness and clarity. Don't flag marginal stuff - we're looking for real breakage or substantial improvement opportunities on these passes currently. Set `status: reviewed`.

## If it needs UI verification

Your job is to exercise the FAQ against Galaxy GX_VERSION using the skill and ideas described by:
- GALAXY_UI_SKILL_LOOP.md
- GALAXY_UI_SKILL_RUNS.md

Your job in the process is three-fold - all of equal importance.

- Are there bugs in the FAQ? How should they be updated for the latest release of Galaxy.
- Answer - is there test coverage for the FAQ in Galaxy? How can that be made more explicit and higher level?
- Are there abstractions we can add to gxui, the skill, or navigation.yml to improve:
	- the next run of gxui against that FAQ
	- improve the galaxy test coverage

Once the FAQ passes, save the `gxui` commands that carried it as a replay script (see Reporting) and re-run the script once against a fresh history (or a fresh logged-out session for account FAQs) to confirm it works on its own. Set `status: ui_verified`, or `blocked` with a `note` if it couldn't be finished.

## Reporting

Findings files mirror the FAQ's GTN path under `./training_findings/26.2/`. For `faqs/galaxy/datasets_upload.md`:

- `training_findings/26.2/faqs/galaxy/datasets_upload.md` - GTN suggestions and other findings. Be brief.
- `training_findings/26.2/faqs/galaxy/datasets_upload.gxui.sh` - UI runs only: the replay script, one `gxui ...` command per line, with a `gxui note` per FAQ step. No playwright-cli or REST lines - if a step needed one, that's a `gx_findings` entry.

Summarize the findings in `./faqs_26_2.yaml` - adding a `faq_findings` field to the entry (optionally add a `gx_findings` if there are skill, navigation, test findings coming from this run).

If there are Galaxy bugs, please fix them in the target branch and register them using vault/agents/_shared/GX_QUEUING_ISSUE_CREATION.md.

If there is test coverage missing in Galaxy - please implement them in `galaxy_ui_driver`.

If there are abstractions needed - add them to the `galaxy_ui_driver` branch. If they aren't test coverage but expanded test coverage could be used to justify them - please implement the tests.
