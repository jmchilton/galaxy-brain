# Component - GA4GH WES API

Cover the shipped GA4GH WES implementation as a component, not as PR #21335's history. Start from [[PR 21335 - GA4GH WES API]] and move the durable parts here, linking back for the history.

Cover:

- **Layers.** Generated models, the FastAPI router (`lib/galaxy/webapps/galaxy/api/wes.py`), and `WesService` (`lib/galaxy/webapps/galaxy/services/wes.py`) over `WorkflowsService.invoke_workflow`.
- **submit_run.** Workflow loading (URL, attachment, `gxworkflow://`), parameter parsing and validation order, history selection, engine parameters (`use_cached_job`, `preferred_object_store_id`, `history_id`), and what is created before invocation is validated and how a rejected submission is cleaned up.
- **Auth and errors.** Anonymous handling per endpoint (`AuthenticationRequired` is 403, the spec says 401), ownership checks in `_get_invocation`, and which errors become 400, 404 and 500.
- **Run state and log.** `GALAXY_TO_WES_STATE`, terminal states, cancel semantics, outputs and DRS decoration, `NoReplacement` mapped to null, task listing and keyset pagination.
- **Config and docs.** `doc/source/dev/ga4gh_wes.md`, service-info, CORS and `allowed_origin_hostnames`.
- **Tests.** `lib/galaxy_test/api/test_wes.py` and what it does not cover.
- **Release differences** between `release_26.0`, `release_26.1` and `dev`.

Leave out DRS internals (see [[Component - DRS Support]]) and the TES and Pulsar runner side, which live in the `ga4gh_wes_tes` project.

## Why

Two stacked WES fix branches and the follow-up bug list (`ga4gh_wes_tes`) all change `services/wes.py`, and more WES work is likely. The only note is the PR note, which orders facts by commit history and has a changing "Unresolved Questions" list rather than a stable description of the component.

## Requested by

- vault/repositories/galaxy/branches/active/wes_api_fixes_26_0/brain_research.md: needed a component-level description of submit_run ordering, auth responses, state mapping and cleanup; only the PR-history note exists.
