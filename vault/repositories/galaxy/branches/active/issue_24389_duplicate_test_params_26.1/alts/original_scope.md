# original_scope

Branch `issue_24389_duplicate_test_params_26.1_alt_original_scope` (`497b90bc667`, on `jmchilton`). This is the branch as it stood before the scope-evaluation re-scope.

It contains the duplicate-param fix plus the Codex follow-up. In that follow-up, `_comparable_test_input` turns raw XML `edit_attributes` elements into dicts with `hasattr` duck-typing. The parent instead stores `edit_attributes` as dicts in the parser (`5619906bc1a`). That drops the duck-typing and also fixes a test data API bug: tests that use `<edit_attributes>` couldn't be serialized and disappeared.
