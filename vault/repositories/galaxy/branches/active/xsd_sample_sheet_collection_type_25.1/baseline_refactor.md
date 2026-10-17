No refactoring of the base branch was performed. The re-scope added no new refactors, and the earlier refactor split (`fe374b41698`) still stands.

## Branch (base `release_25.1`, head `5d35c8c7db3`, unchanged)

1. `fe374b41698` Make validate_test_tools.sh shellcheck-clean. This is the refactor from the prior run, kept as is.
2. `cead13cc9d8` Allow sample_sheet collection types in tool XSD
3. `7ccd03c658d` Document sample_sheet in param collection_type XSD docs
4. `c7bf3b5e22f` Lint the tool XSD at its real path in validate_test_tools.sh (re-scope)
5. `5d35c8c7db3` Accept sample_sheet:record in convert_sample_sheet tool (re-scope)

## Re-scope commits checked

- `c7bf3b5e22f` changes CI behavior: it fixes the XSD path and fails fast. That makes it a fix, not a behavior-preserving refactor. It doesn't depend on the XSD change, so it could sit ahead of `cead13cc9d8`, but moving it there would gain little. Its lines are byte-identical to `issue_23978_parameter_tools_xsd`, so either order merges forward cleanly.
- `5d35c8c7db3` is a one-token tool-declaration fix with nothing to extract. The new core-tools lint loop doesn't cover `convert_sample_sheet.xml` because the tool has `<type class=`. That's expected and has no effect on ordering.

## Recommendations (not done; history rewrite out of scope for this run)

- None. A reorder that moves `c7bf3b5e22f` first is possible but not worth the force-push.
