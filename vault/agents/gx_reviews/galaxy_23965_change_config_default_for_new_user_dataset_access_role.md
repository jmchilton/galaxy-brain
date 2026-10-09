# galaxy #23965 - Change config default for new_user_dataset_access_role

- PR: https://github.com/galaxyproject/galaxy/pull/23965 (author cat-bro, base `dev`)
- Reviewed head: `34de076d569` (+182/-38, 27 files), diffed against `git merge-base HEAD origin/dev`
- Worktree: `~/projects/worktrees/galaxy/pr/23965`
- Labels: `area/admin`, `area/documentation`, `highlight/admin`
- Prior review: mvdbeek (COMMENTED on `33e1a53`) - in favour; opened cat-bro/galaxy#3 with bug fixes, now merged into this branch (`664de03`..`65b23fc`).

## Verdict

**Comment / approve once CI is green.** The default flip is well-motivated, docs/sample/schema
are consistent, and the follow-up fixes are real bugs the public default was hiding. One API
test is still red at head and needs the same treatment the other tests got. One small reuse
suggestion for the remote-user path.

## What changed

- `new_user_dataset_access_role_default_private` default `false` -> `true` in `config_schema.yml`,
  `galaxy.yml.sample`, `galaxy_options.rst`, and `MockAppConfig`.
- `UserManager.get_or_create_remote_user` now passes `default_access_private` from config (both new
  and legacy-no-defaults branches).
- `set_all_dataset_permissions(new=True)` skips `(action, role_id)` pairs the dataset already has;
  `Dataset.get_access_roles` / `get_manage_permissions_roles` dedupe via `_roles_for_action`
  (covers DBs that already hold duplicate rows).
- `discover.py`: discovered collection elements now get `set_default_hda_permissions` (previously
  none, so always public).
- `markdown_util`: inline embed directives skip `invocation_id` as the object id unless the
  container is `invocation_time` (previously `output=...` embeds resolved HDA id == invocation id).
- Tests: ~15 API/selenium tests add `make_dataset_public` / `remove_restrictions` where they
  genuinely test public/cross-user access; new regression tests for idempotent make_private,
  fetched list element permissions, inline report labels, remote user defaults, duplicate rows.
  `test_default_permissions.py` base-class expectation flipped 200 -> 403 (asserts the new default).

## Findings

1. **CI red at head: `TestToolsApi::test_guess_derived_permissions_collections`** (API tests
   `Test (3.10, 0)`, run 37757449840, 1 failed / 876 passed). Deterministic consequence of the
   `discover.py` fix: the fetched list's elements are now private, so the "public" output derived
   from them is private and `assert _dataset_accessible(public_element_id)` fails. The fix is the
   same as the sibling `test_guess_derived_permissions` adjustment - make the input collection's
   elements public before the first run (all elements, since derived permissions are guessed from
   every input dataset). Not a weakened test; the test's intent (public in -> public out,
   private in -> private out) is preserved.

2. **Reuse: remote-user path re-implements `create_user_role`.** `GalaxyRBACAgent.create_user_role(user, app)`
   (`lib/galaxy/model/security.py:723`) already does "ensure private role; if no default_permissions,
   set them from `new_user_dataset_access_role_default_private`", and it is what
   `UserManager.create` (`users.py:196`) and `handle_user_login` (`webapp.py:868`) use. The new
   branch in `get_or_create_remote_user` (`create_private_user_role` + `user_set_default_permissions(..., default_access_private=config...)`)
   could just call `create_user_role(user, self.app)`, so the config is read in exactly one place.
   This bug existed precisely because the remote path had its own copy. The `hasattr(app.config, ...)`
   fallback in `create_user_role` is effectively dead for Galaxy configs and could go too.

3. **Legacy remote-user branch retroactively privatizes data.** The existing-user branch
   (users without `default_permissions`, the pre-2009 remote-user bug) now calls
   `user_set_default_permissions(..., history=True, dataset=True, default_access_private=True)`.
   With `dataset=True` that rewrites permissions on existing datasets in the user's active
   histories, so they become private - contradicting the new doc text "existing users and data are
   unchanged". Population is tiny, but `dataset=True` isn't needed to fix the reported bug;
   switching to `create_user_role` (finding 2) would drop it. Worth a one-line decision either way.

4. **Upgrade impact is real and correctly labelled.** Every server that doesn't set the option
   changes on upgrade, with a mixed population (old users public, new users private). Library
   uploads use the uploader's user defaults (`upload_common.py:228-229`), so a newly created
   admin populating a shared data library will produce datasets only they can read. History
   sharing/publishing will hit the "change permissions" dialog much more often (the selenium test
   change shows this). `highlight/admin` is set; the release-note blurb should explicitly mention
   data libraries and say how to restore old behaviour (`new_user_dataset_access_role_default_private: false`).

5. **Minor.** `markdown_util` fix special-cases `container != "invocation_time"` by name; a rule of
   "prefer any non-`invocation_id` id, fall back to `invocation_id`" would not need updating if
   another invocation-scoped embed is added. Optional. `user_set_default_permissions(default_access_private=False)`
   keyword default now disagrees with the config default; all current callers pass it explicitly
   or pass explicit permissions, so not a bug.

Ran locally (Galaxy venv, `PYTHONPATH=lib`): the 5 new unit tests in `test_security.py` and
`test_UserManager.py` pass. Did not run API/integration/selenium suites.

Test assessment: test edits add explicit `make_dataset_public` where tests exercise anonymous,
DRS, cross-user or library access - these are setup changes, not weakened assertions. The new
regression tests are integration/API level where it matters (fetch elements, make_private
idempotence, report labels); unit tests are reserved for the security-agent dedupe and remote user
path, which is appropriate.

## Risks

Flipping this default is a one-way door for admins and users: new accounts on every upgraded server that hasn't pinned the option will create private data (including data-library uploads by new admins), and once users and workflows build around private-by-default it can't quietly be flipped back.

<details><summary>Risk Details</summary>

- Servers that don't set `new_user_dataset_access_role_default_private` change behaviour on upgrade; users created afterwards default to private, existing users keep public defaults (mixed population).
- Data-library uploads take the uploader's default permissions, so libraries populated by newly created admins become readable only by that admin until restrictions are removed.
- Sharing/publishing histories, pages and workflow reports from new users will prompt for permission changes or show inaccessible datasets to viewers.
- Anonymous/DRS/display-URL consumers of new users' datasets will get 403 unless data is made public.
- Legacy remote users with no default permissions get existing active-history datasets made private on next remote login.
- `set_all_dataset_permissions(new=True)` now silently skips duplicates; behaviour change for any caller that relied on adding duplicate rows (none found).
- Discovered collection elements now carry derived/history permissions instead of none - correct, but changes accessibility of tool outputs for all users, not just new ones.

</details>

<details><summary>Risk Review Advice</summary>

Humans should mainly decide whether the release notes adequately warn admins: the data-library interaction and the one-line revert (`new_user_dataset_access_role_default_private: false`) are the things operators of shared/teaching servers need to see before upgrading. The default flip itself is easy to revert in code, but users' expectations and the data created under it are not.

The `discover.py` change affects every job that discovers collection elements, regardless of this setting - worth a second look that derived permissions (from inputs, falling back to history defaults) are what we want for those elements, and that existing private-input workflows behave as expected.

</details>

## Draft review body

```
*Posted by Claude (AI assistant) on behalf of jmchilton.*

Thanks - +1 on the new default, and the follow-up fixes from cat-bro/galaxy#3 look right to me (the duplicate-permission rows and the discovered collection elements getting no permissions were both real bugs hiding behind the public default).

A few things:

1. **CI is still red on `TestToolsApi::test_guess_derived_permissions_collections`.** Now that fetched list elements get default permissions, the "public" input collection is private, so the first output is private too and `_dataset_accessible(public_element_id)` fails. Making the input collection's elements public before the first run (like the `test_guess_derived_permissions` change in this PR) should fix it without changing what the test checks.

2. **Remote user path could reuse `create_user_role`.** `GalaxyRBACAgent.create_user_role(user, app)` already does "ensure private role, then set default permissions from `new_user_dataset_access_role_default_private` if the user has none", and it's what `UserManager.create` and `handle_user_login` use. Calling it from both branches of `get_or_create_remote_user` would keep the config read in one place - the remote-user bug happened because that path had its own copy.

3. **Existing remote users with no default permissions.** The legacy branch now calls `user_set_default_permissions(..., history=True, dataset=True, default_access_private=...)`. With `dataset=True` that rewrites permissions on datasets already in their active histories, making existing data private, which doesn't match "existing users and data are unchanged". It only affects very old accounts, but switching to `create_user_role` (point 2) avoids it.

4. **Release notes.** Thanks for the `highlight/admin` label. The release-note text should mention data libraries explicitly (library uploads use the uploader's default permissions, so a newly created admin's library uploads are private to them) and give the one-line opt-out (`new_user_dataset_access_role_default_private: false`).

Minor, optional: in `markdown_util`, preferring any non-`invocation_id` id and falling back to `invocation_id` would avoid naming `invocation_time` specifically.

## Risks

Flipping this default is a one-way door for admins and users: new accounts on every upgraded server that hasn't pinned the option will create private data (including data-library uploads by new admins), and once users and workflows build around private-by-default it can't quietly be flipped back.

<details><summary>Risk Details</summary>

- Servers that don't set `new_user_dataset_access_role_default_private` change behaviour on upgrade; users created afterwards default to private, existing users keep public defaults.
- Data-library uploads take the uploader's default permissions, so libraries populated by newly created admins become readable only by that admin until restrictions are removed.
- Sharing/publishing histories, pages and workflow reports from new users will prompt for permission changes or show inaccessible datasets to viewers.
- Anonymous/DRS/display-URL consumers of new users' datasets will get 403 unless data is made public.
- Legacy remote users with no default permissions get existing active-history datasets made private on next login.
- Discovered collection elements now carry derived/history permissions instead of none, which changes accessibility of tool outputs for all users, not only new ones.

</details>

<details><summary>Risk Review Advice</summary>

The main question is whether the release notes warn admins well enough: the data-library interaction and the one-line opt-out are what operators of shared/teaching servers need before upgrading. Reverting the default in code is easy; users' expectations and the data created under it are not.

The `discover.py` change applies to every job that discovers collection elements, regardless of this setting - worth a second look that derived permissions (from inputs, falling back to history defaults) are what we want there.

</details>
```
