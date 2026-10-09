# galaxy#23874 — Tool installation request follow-ups: sanitize workflow name, tighten tests

- Author: mvdbeek · base `dev` · +100/-46 · 6 commits · reviewed at `07b1fb3a225`
- Follows up [#22259](https://github.com/galaxyproject/galaxy/pull/22259) (merged 2026-10-02), specifically arash77's pre-merge review comment [5664492492](https://github.com/galaxyproject/galaxy/pull/22259#issuecomment-5664492492).
- Worktree: `~/projects/worktrees/galaxy/pr/23874` (branched off current `origin/dev`; parent is the #22259 merge commit).

## Summary

1. `stamp_content` switches from `model_construct` to `model_validate`, and `StoredToolInstallationRequestContent` gets a `workflow_name` `field_validator` using the existing `_sanitize_single_line`. Closes the plain-text email line-injection arash77 flagged.
2. Drops the unused `NotificationRequestManager.user_allowed_categories`. No remaining references in `lib`, `client/src` or `test`.
3. New tests: tool-request HTML email escaping, message HTML email (Markdown rendered, subject escaped), failed confirmation copy doesn't fail the request (mock unit test), workflow name stamped on one line.
4. Strengthened tests: the integration email test now references a real workflow and asserts its name is in the plain-text body (replacing a removed echo-only test). The rate-limit test now checks that a second user still gets a 200.

## Verdict

**Approve.** Small, focused, and it does what it says. The sanitizer is reused, not reinvented. The tests are stronger, and the one removed test is justified. Nothing blocks.

## Mapping to the #22259 review comment

| arash77 point | Status |
|---|---|
| `stamp_content` `model_construct` skips `_sanitize_single_line` on `workflow_name` | **Addressed** here |
| Custom `templates_dir` copies of `message-email.html` / `activation-email.html` taken before #22259 lack `\| safe`, so after upgrade they render escaped HTML source. Release note, or loader leaves custom copies alone? | **Not addressed** (no release-note or loader change found; no reply on #22259) |
| `workflow_name` is server-only, so the notification card shows the encoded workflow id (`NotificationCard.vue:284-288`) | **Not addressed** (still shows `content.workflow_id`) |
| Button shows with notifications off, version regex, confirmation isolation, orphaned comment | arash77 said they'd fix these. Confirmation isolation is in `services/notifications.py:97-102` on dev, and this PR adds its test |

Neither open item has to land in this PR. Still, a PR titled "follow-ups" is a natural place to at least say where they're tracked.

## Findings (ranked)

### Low

1. **The removed integration test carried the only end-to-end multi-tool assertion.** `test_workflow_id_is_resolved_to_the_stored_workflow` (removed, `test/integration/test_tool_installation_request_form.py` old ~96-118) also asserted `len(content["tools"]) == 2`. Every remaining test, unit and integration, submits a single tool. The removal rationale (it got back the id it sent) is correct. The other things it checked are still covered: `workflow_name` not public (line 94) and canonical id (`test_NotificationRequestManager.py:187`). Only the two-tool round trip is gone. Cheap fix: put two tools in the payload of the strengthened email test (`:139-141`) and assert both labels appear in the body.
2. **The comment in `stamp_content` overstates why validation matters** (`lib/galaxy/managers/notification_requests.py:134-135`). The email builder already re-validates stored content at render time (`ToolInstallationRequestEmailNotificationTemplateBuilder.get_content`, `lib/galaxy/managers/notification.py` ~`model_validate(self.notification.content)`). So the new `field_validator` alone sanitizes the email, and also covers notifications stored before this fix. What the `model_validate` switch adds is a clean persisted copy. That's still worth doing. I verified it: dropping only the validator makes `test_workflow_name_is_stamped_on_a_single_line` fail. The comment just reads as if this were the only path to the plain-text email. Optional rewording: "so the persisted workflow name is single-line like the form fields".

### Nit

3. **Mock-only service test** (`test/unit/webapps/galaxy/services/test_notifications_service.py`). Fault injection is hard to do in an integration test, so a unit test is reasonable here. `MagicMock(spec=NotificationManager)` / `spec=NotificationRequestManager` would make it fail loudly if the collaborator API drifts. The `is admin_response` assertion already gives some protection.
4. **`workflow_name` has no `max_length`**, unlike every other stored string field. It comes from the DB (TEXT) and isn't used in the subject, so it's harmless. Mentioned only for consistency. Not worth a change.

## Checked and fine

- **Reuse / layer**: reuses `_sanitize_single_line`, the same helper and `mode="before"` pattern as `RequestedTool` / `workflow_id` (`lib/galaxy/schema/notifications.py:233-238, 292-295`). `galaxy.util.sanitize_html`/`sanitize_text` handle HTML character mapping, not line breaks, so they don't fit here. HTML escaping stays on output (`autoescape_html = True`). Plain-text line collapse happens at input, matching how the form fields are handled. The layering is consistent.
- `model_validate` on `{**dict(content), ...}` passes `RequestedTool` instances. Pydantic's default `revalidate_instances='never'` means the nested tools aren't re-validated, and all sanitizers are idempotent anyway. `Model` config (`schema/schema.py:348`) doesn't change that.
- The `_send_stored_request` helper switches to `model_validate({...})`, which is needed because the new test overrides `tools`/`workflow_name`. With constructor kwargs those would be duplicate-keyword `TypeError`s.
- Escape-test assertions are two-sided (escaped form present, raw form absent). Good.
- Imports are at module top level in all touched files. No trivial tests. Comments aren't obvious.

## Verification

- **Ran**: the new and touched unit tests (`test_notifications_service.py`, the `test_NotificationRequestManager.py` / `test_NotificationManager.py` subsets), using the existing `~/projects/repositories/galaxy/.venv` with `PYTHONPATH=lib` (no new venv). Result: 20 passed.
- **Red checks (ran, then reverted)**: removing the `workflow_name` validator makes `test_workflow_name_is_stamped_on_a_single_line` fail. Setting `autoescape_html = False` on the tool request builder makes `test_admin_html_email_escapes_request_fields` fail.
- **Not run**: integration tests (email dispatcher, rate limit). Assessed by reading only.

## CI (at `07b1fb3a225`)

54 success, 2 skipped, 5 still in progress or queued (Test shards 0-3, build 3.10). No failures so far.

## Draft PR comment (unposted)

> *Posted by Claude (AI assistant) on behalf of jmchilton. Not personally authored.*
>
> Looks good to me. The sanitizer is reused rather than reinvented, and the tests are clearly stronger. I ran the new unit tests locally and red-checked two of them: dropping the `workflow_name` validator, or turning off `autoescape_html` on the tool request builder, each makes its test fail.
>
> A few small things, none blocking:
>
> 1. The removed `test_workflow_id_is_resolved_to_the_stored_workflow` was the only end-to-end test with more than one tool (`len(tools) == 2`). Putting two tools in the payload of the strengthened email test and asserting both appear in the body would keep that coverage.
> 2. The new comment in `stamp_content` says validation is what keeps the workflow name single-line before it reaches the plain-text email. `ToolInstallationRequestEmailNotificationTemplateBuilder.get_content` already re-validates the stored content at render time, so the new field validator alone covers the email, including notifications stored before this fix. The `model_validate` switch is still worth keeping because it makes the persisted copy clean. Maybe reword the comment to say that.
> 3. Nit: `MagicMock(spec=...)` in `test_notifications_service.py` would catch collaborator API drift.
>
> Two of the questions in the #22259 review comment don't seem resolved yet: custom `templates_dir` copies of `message-email.html`/`activation-email.html` without `| safe` (release note vs loader), and the notification card showing the encoded workflow id instead of the name. Fine to leave them out of this PR, but is there an issue tracking them?
