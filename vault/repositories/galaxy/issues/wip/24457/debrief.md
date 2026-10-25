# Debrief: password_reset_stale_session_after_save

- Source: `password_reset_stale_session_after_save.md` (26.2 GTN FAQ loop, fix on `jmchilton/galaxy_ui_driver` 76c58d2fb7f).
- Verified on origin/dev and origin/release_26.2: `change_password` calls `handle_user_login`; `ChangePassword.vue:42` only `router.push("/")`; `LoginForm.vue` does a full reload.
- `router.push("/")` dates at least to dbbf78ea034 (2024-02-28, composition API refactor), so older releases are likely affected too.
- Expired-password flow shares the component and endpoint (`expiredUser` -> `id`), but it wasn't tested.
- Duplicates: none. Only related hit is #6671 (closed, 2018, uWSGI).
- Review subagent (one round): claims hold. It made two wording edits. Red/green test claims were not re-run.
- Leftover: the fix lives on `galaxy_ui_driver` alongside other work; a dedicated branch/PR would make a cleaner link.
- Recommendation: post. It's a real, user-facing bug on a documented GTN flow.
