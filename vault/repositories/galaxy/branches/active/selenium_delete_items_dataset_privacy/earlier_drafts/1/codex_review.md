# Codex review

Codex (read-only, `origin/release_26.2...c3348b90176`) raised two P2s, both about external servers with non-default config. Acted on neither; no code change.

- **Default-on switch assert** (`test_personal_information.py:146`) fails against a server with `new_user_dataset_access_role_default_private: false`. Kept: the assert pins 26.2's new default, which motivates the test; the framework-managed server CI uses has the default. Same as normal review nit 4. Question for John.
- **Purge needs `allow_user_dataset_purge`** (`test_history_panel.py:75`). Kept: no selenium test guards on server config, and `test_histories_list.py` already purges histories unconditionally. Default is true.

No defects for default-configured servers; no reuse findings.

<details><summary>Raw findings</summary>

1. P2 test-coverage `test_personal_information.py:146` — "Do not require an external server's initial privacy default to be true." Failure: external Galaxy with `new_user_dataset_access_role_default_private=false`; switch correctly shows false, line 146 fails before permissions are exercised. Suggests establishing initial state via the setter.
2. P2 test-coverage `test_history_panel.py:75` — "Check whether dataset purging is enabled before requiring it." Failure: external Galaxy with `allow_user_dataset_purge=false`; purge rejected by `error_unless_dataset_purge_allowed()`, test times out.

Coverage notes: all changed hunks plus surrounding client/server code reviewed; browser tests not executed.

</details>
