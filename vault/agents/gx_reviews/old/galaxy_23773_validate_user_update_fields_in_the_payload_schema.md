# galaxy#23773 - Validate user update fields in the payload schema

- PR: https://github.com/galaxyproject/galaxy/pull/23773 (mvdbeek, base `dev`, +419/-100)
- Head SHA: `8a98534f193ec91406c8515dceebbf28b9fea2f1`
- Merge-base with `origin/dev`: `6edae065876df8689cbe2dd860a00250f058ca60`
- Worktree: `~/projects/worktrees/galaxy/pr/23773`
- Follow-up to #23303. Sibling of #23772 (review: [[galaxy_23772_tighten_email_and_account_checks_on_user_updates]]). No PR comments or reviews yet.

## Verdict

Approve, with small suggestions. The split is right: rules that depend only on the value go in
`galaxy.util.user_input`, pydantic types (`EmailAddress`, `DisplayName`) wrap them for the API, and
rules that depend on config or the DB stay in the managers. The managers still call the same
functions, so non-API callers (legacy `information/inputs`, OIDC sync) get the same rule.
`OmittableNotNull` is a small reusable type with a guard for misuse. The category-based display
name check is a real improvement on the hand-listed regex. Nothing blocks merge. The findings are
two Unicode edge cases, an OpenAPI wrinkle, and the extraction being only half done.

Scope note: **username gets no new validation** here. It is only `OmittableNotNull[str]`, and
`validate_publicname` stays in the manager. So legacy usernames can't drift. Only email and display
name move into the schema.

## What was checked

- Unit tests pass locally (`~/projects/repositories/galaxy/.venv`, `PYTHONPATH=lib`):
  `test_validate_user_input.py`, `test_schema.py` and `test_UserManager.py` give **133 passed**.
- Red-to-green (each hunk reverted, then restored):
  - Drop `new_email = canonicalize_email(new_email)` (`managers/users.py:211`): `test_update_email_strips_whitespace` fails.
  - Drop the `EmailAddress` `AfterValidator`: 3 `test_user_email_fields` cases fail.
  - Drop NFC from `canonicalize_display_name`: 2 fail (canonicalize test and `test_update_display_name`).
  - Make `_NotNull` a passthrough: 3 `test_user_update_payload_rejects_null` cases fail.
  - Remove the `DisplayName` Before/AfterValidators **and** `extra="forbid"` together: **all 133 unit tests still pass**. These two only have API-test coverage (`test_users.py` padded-255, bidi, `is_admin`/`password`/typo). That's acceptable, see finding 5.
- Error shape: `validation_message_wrapper` turns the `RequestParameterInvalidException` into a
  `PydanticCustomError("message_exception")`, and `validation_error_to_message_exception`
  (`exceptions/utils.py:26`) returns the original exception. Clients still get **400** with
  `USER_REQUEST_INVALID_PARAMETER` and the Galaxy message, not a FastAPI 422. For the
  `UserCreationPayload | RemoteUserCreationPayload` union, the message_exception wins over the other
  branch's "missing" errors, because the loop returns as soon as it finds one.
- Client schema: I dumped `UserUpdatePayload.model_json_schema()`. `active`/`email`/`username` lose
  `anyOf null`, and `display_name` keeps `maxLength` + null. The `schema.ts` diff (three `| null`
  removals) matches that. The only client caller (`Grid/configs/adminUsers.ts:127`) sends `{active: true}`.
- Importers of the moved names: all in-tree users updated (`tools/errors.py`, `workflow/errors.py`,
  `controllers/user.py`, `managers/users.py`, `security/validate_user_input.py`). The Tool Shed
  imports only `validate_email`/`validate_password`/`validate_publicname`, which stay put. Packaging
  is fine: `galaxy-schema` already depends on `galaxy-util`, and `packages/util/src/galaxy/util`
  symlinks the whole directory.
- Imports are top-level everywhere. Comments explain *why* (extra=forbid, field order, Unicode
  rationale), not what.

## Findings (ranked)

### 1. `Cn` rejection makes display-name validity depend on the server's Python version (low-medium)

`lib/galaxy/util/user_input.py:40`. `unicodedata` reflects the interpreter's Unicode version, and
Galaxy supports `requires-python >=3.10`. On CPython 3.10 (Unicode 13.0),
`unicodedata.category("\U0001FAE0")` (melting face) and `"\U0001F979"` are `Cn`, so
`"Ada 🫠"` is rejected there and accepted on 3.13 (Unicode 15.1). I checked this with the uv 3.10
interpreter. Unassigned code points aren't really an impersonation vector: they render as tofu,
not as other text. Suggest dropping `Cn` from the rejected set, or accepting it outside the tag
block. Noncharacters (U+FFFE/FFFF, U+xFFFE/F) could be rejected explicitly if wanted, since those
are stable.

### 2. Subdivision flag emoji regress (low)

Tag characters U+E0020–E007F are `Cf`, so 🏴󠁧󠁢󠁥󠁮󠁧󠁿 (England, Scotland, Wales:
`U+1F3F4` + tags + `U+E007F`) is now rejected. Checked:
`UserUpdatePayload.model_validate({"display_name": "\U0001F3F4\U000E0067..."})` raises. The old
regex allowed it. The test file deliberately rejects isolated tag characters (`language tag`,
`tag latin capital letter a`, `cancel tag`), which is right in general. Allowing a tag run only
right after U+1F3F4 and ending in U+E007F would work the same way as the ZWJ exception. Niche, but
it's a regression the PR description doesn't list.

### 3. `OmittableNotNull` fields advertise `"default": null` with a non-null type (low, API schema)

`lib/galaxy/schema/types.py:44-58`. The JSON schema for `active`/`email`/`username` is now
`{"type": "string", "default": null}`. The default contradicts the type, and strict OpenAPI
validators/generators can flag that. `openapi-typescript` doesn't care, which is why `schema.ts`
looks clean. Two options: have `_NotNull` (or the field) drop the default from the JSON schema,
e.g. `Field(json_schema_extra=...)` popping `default`, or a `WithJsonSchema` override. Or note it
in the `OmittableNotNull` comment as a known wart until `MISSING` is usable.

	### 4. The extraction is half done: publicname/password rules stay in `galaxy.security` (low, reuse)
	
	The module docstring (`util/user_input.py:2`) promises "Rules for user account fields that depend
	on nothing but the value", but `validate_publicname_str`, `VALID_PUBLICNAME_RE`,
	`PUBLICNAME_MAX_LEN` and `validate_password_str` (`security/validate_user_input.py:50-74`) are
	value-only too and weren't moved. So there are now two homes for value rules, split by whether
	the schema happened to need them. Either move them now (the Tool Shed and `buildapp.py`
	imports would follow) and give `username` a matching schema type, or narrow the docstring and
	leave a follow-up. I'd take the follow-up: typing `username` would change error behaviour for
	legacy usernames that don't match the regex, and that deserves its own PR.
	
	The removed names (`validate_email_str`, `is_valid_email_str`, `VALID_EMAIL_RE`, `EMAIL_MAX_LEN`,
	`validate_display_name_str`, `INVALID_DISPLAY_NAME_RE`) also aren't re-exported from
	`galaxy.security.validate_user_input`. In-tree is fine. Out-of-tree auth plugins importing
	`validate_email_str` from there would break. A one-line re-export is cheap if we care.

### 5. `DisplayName` and `extra="forbid"` only have API-test coverage (low, tests)

As noted above, reverting both leaves every unit test green. The API tests in
`lib/galaxy_test/api/test_users.py` do cover them (padded 255 accepted, 256 spaces clears, bidi
400, `is_admin`/`password`/typo 400), so this isn't a gap in CI. Two parametrized cases in
`test/unit/schema/test_schema.py` next to `test_user_email_fields` would catch a regression
without a server. Optional.

### 6. Small nits

- `schema.py:268-316`: the `_canonicalize_*_input` / `_check_*` pairs are the same shape twice.
  A tiny `validated_str(canonicalize, validate)` helper would make a third field (username, later)
  a one-liner. Optional.
- The length is checked twice: `Field(max_length=...)` on the inner `str` fails first with
  pydantic's "String should have at most 255 characters", so `validate_*_str`'s Galaxy message for
  length is unreachable via the API. Harmless, since the code is the same 400. It exists for the JSON schema.
- `util/user_input.py:95,97`: the same message string appears twice. Pull it into a constant.
- `RemoteUserCreationPayload.remote_user_email` is now format-checked, but the header-login path
  (`webapp.py:633` into `get_or_create_remote_user`) isn't. Admin pre-provisioning is now stricter
  than login. Probably fine, since the middleware already guards the header, but worth a sentence
  in the description's "API behaviour changes".

## Overlap with #23772

- **Textual:** `git merge-tree HEAD 0521cf89` (23772 head) shows `managers/users.py`,
  `validate_user_input.py` and `api/test_users.py` auto-merge. The only conflict is
  `test/unit/app/managers/test_UserManager.py`, where both add tests next to the activation test,
  and the fix is to keep both. That matches the PR description's claim.
- **Merged `update_email`** (checked in the merge-tree result): `canonicalize_email` → `validate_email`
  (format/ban/dup/domain) → early return if unchanged → 23772's non-admin policy (config refusal,
  admin-address refusal) → write. Canonicalizing first is a small win for 23772, because
  `_is_admin_email` and the unchanged-email early return now see the stripped address.
- **Does schema validation bypass 23772's policy?** No. `EmailAddress` checks format and length
  only. Dup, ban, domain, config refusal and admin-address all stay in the manager, and every write
  path still goes through `update_email`.
- **Error codes / existence oracle:** on refused configs (`use_remote_user`/`disable_local_accounts`)
  a malformed email was already a 400 from the manager's `validate_email` before 23772's 403. Now
  the 400 comes earlier, from the schema. The status and code are the same, and it only reveals
  format validity, not whether an account exists. 23773 **neither introduces nor fixes** the
  dup-before-refusal oracle (our 23772 finding 2). If 23772 moves the refusal above
  `validate_email`, the schema format check still runs first, which is harmless.
- **23772's payload-field partition test** (`test/unit/webapps/api/test_users.py`) iterates
  `UserUpdatePayload.model_fields`. The field set is unchanged here, so it keeps passing, and a
  future field still has to be classified.
- **Order:** either order works. Slight preference for **#23772 first**: it's the security fix,
  and #23773 carries the larger client-visible change (unknown fields and null now 400), so
  23773 should take the rebase. The conflict is trivial either way.
- **Coherence:** together they leave one place per kind of rule. Value rules live in
  `galaxy.util.user_input` (used by both the schema and the managers). Config and DB email rules
  live in `validate_email`, and the account policy lives in `UserManager.update_email`. The one
  leftover is finding 4 (publicname/password still in `galaxy.security`).

## Draft GitHub review comment

```
*Posted by Claude (AI assistant) on behalf of jmchilton - not personally authored.*

Thanks - the layering works well: rules that depend only on the value live in `galaxy.util.user_input`,
`EmailAddress`/`DisplayName` wrap them for the payloads, and the managers still call the same
functions for the legacy route and OIDC sync. Errors still come back as 400 with the Galaxy
message via `validation_message_wrapper`. `OmittableNotNull` is a nice small type. The three unit
test files pass locally, and reverting the canonicalization, the email validator, NFC or
`_NotNull` turns them red.

I checked against #23772: the only textual conflict is the adjacent tests in `test_UserManager.py`.
Semantically they compose fine. The schema does format only, so the manager's config and
admin-address policy isn't bypassed, and canonicalizing first means that policy sees the stripped
address.

A few small things, none blocking:

1. **`Cn` depends on the interpreter's Unicode version.** On Python 3.10 (Unicode 13),
   `"Ada 🫠"` is rejected because U+1FAE0 is unassigned there, while 3.13 accepts it. Unassigned
   code points render as tofu rather than as other text, so maybe drop `Cn` (and reject
   noncharacters explicitly if wanted)?
2. **Subdivision flags** (🏴 + tag characters + U+E007F, e.g. England/Scotland/Wales) are now
   rejected because tag characters are `Cf`. They were accepted before. An exception like the ZWJ one
   (tags only after U+1F3F4, ending in the cancel tag) would keep them. Or list it under behaviour changes.
3. **OpenAPI:** the `OmittableNotNull` fields now show `{"type": "string", "default": null}`, where the
   default contradicts the type. `openapi-typescript` doesn't mind, but strict validators might.
   Could the default be dropped from the JSON schema?
4. **Only half the value-only rules moved.** `validate_publicname_str`/`VALID_PUBLICNAME_RE`/
   `validate_password_str` are value-only too but stay in `galaxy.security.validate_user_input`, so
   the new module docstring overstates things a bit. Fine as a follow-up (typing `username` would
   change errors for legacy names). A re-export of the moved names from `validate_user_input`
   would also keep any out-of-tree importers working.
5. Optional: `DisplayName` and `extra="forbid"` are covered only by the API tests. Two cases in
   `test_schema.py` would catch a regression without a server.
```
