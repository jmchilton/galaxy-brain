# Codex review

Codex (read-only, `origin/release_26.0...1ba51ea6acc`) returned one finding; acted on it. Fixed in a follow-up commit: `_history_for_conversion` now requires the current history to be owned by the requester too (same `user_id` check as the dataset history). Unit 41, API datasets 6, custom_build 4 passed; lint/mypy clean.

Not acted on: nothing. No test added — setting another user's history as current needs an admin session (not API-key); covered by reading.

<details><summary>Full review</summary>

P1 (certain), histories.py:319 "The current-history fallback can queue conversions in another user's history": fallback checked only that current_history was active. An admin can set another user's history as current (`set_as_current` accepts admins); a conversion of a dataset there skips it as dataset history (user_id differs) then picks the same history via fallback, writing the job into B's history. Files reviewed: managers/histories.py, model/__init__.py, api/users.py, services/datasets.py, tests, populators, test_actions.py, controllers/history.py, managers/sharable.py, datatypes/data.py.

</details>
