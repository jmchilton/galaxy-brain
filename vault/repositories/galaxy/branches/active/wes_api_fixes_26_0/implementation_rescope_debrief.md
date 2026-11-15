Run via Claude Opus 5.5 at high effort.

# Re-scope debrief: wes_api_fixes_26_0

The first hardening pass ran test challenges, performance, Codex, thermo-nuclear and baseline refactor. Its scope evaluation ([earlier_drafts/1/scope_evaluation.md](earlier_drafts/1/scope_evaluation.md)) then recommended a modest expansion on `release_26.0`. Following gx_workhorse "Handling a Re-Scope", the branch as it stood was saved as `wes_api_fixes_26_0_alt_original_scope` (`0bbc3e55ae8`, pushed to jmchilton; [alts/original_scope.md](alts/original_scope.md)), and the working branch was expanded.

## What was added

All four items the evaluation listed were taken, the two core items and both optional riders.

1. **`NoReplacement` is reported as `null` natively.** `WorkflowInvocation.to_dict` maps a stored `{"__class__": "NoReplacement"}` output value to `None`, so `GET /api/invocations/{id}` now returns `null` too. WES's run log reads `to_dict`, so the WES-only mapping and `NO_REPLACEMENT_VALUE` are gone. Storage, model-store export and workflow recovery read the model directly and keep the marker. The commit replaced the old WES-only one: "Report omitted optional parameters as null in invocation output values". New native test `TestWorkflowsApi::test_workflow_omitted_optional_parameter_output_is_null`.
2. **Empty `next_page_token`.** `list_runs` and `get_run_tasks` return `""` on the last page, as the WES spec and Galaxy's own schema describe. An incoming `""` token already decodes as "no cursor", so a client that echoes it gets the first page. New commit, with assertions in the two pagination tests and a docs update.
3. **One anonymous guard.** `_require_user(trans, message)` replaces three ad-hoc checks (`submit_run`, `list_runs`, `_get_invocation`), and `list_runs` now checks auth before decoding the page token. `_get_invocation` and `get_run_task` error messages now show the encoded id instead of the database id. This was folded into the 403 commit.
4. **`auth_instructions_url`.** Service-info points at `<galaxy base URL>/user/api_key`, built with `trans.url_builder("/", qualified=True)` the way `services/notifications.py` builds its URL, instead of `"TODO"`. New commit, with a `test_wes_service_info` assertion and the "Known limitations" docs bullet removed.

## Review

The normal subagent review ([subagents/rescope_review.md](subagents/rescope_review.md)) found that `get_run_task`'s not-found message still showed a database id. It fixed that in the 403 commit and left the rest as it was:
- No shared constant for the marker, because `galaxy.model` can't import from `galaxy.tools` without inverting the package layering.
- The `assert trans.url_builder` stays, because the field is required.
- The native API change needs a release note.

## Behavior changes reviewers should see

- The native invocation API returns `null` for omitted optional parameter outputs instead of the marker dict. Nothing in `lib/` or `client/src` reads the marker from the API.
- WES lists end with `""` instead of `null`. A client that loops `while token is not None` would re-fetch page 1. The docs now say to stop on an empty token.
- An anonymous `GET /runs` with a malformed `page_token` now gets 403 instead of 400.

## Result

Head `5d05171e794`, eight commits on `release_26.0` (`9ae7ab9c1df`). All new tests failed without their fix and pass with it. The WES tests whose code paths changed pass, and lint and mypy are clean. The re-harden pass follows. Its debriefs replace the ones moved to `earlier_drafts/1/`.
