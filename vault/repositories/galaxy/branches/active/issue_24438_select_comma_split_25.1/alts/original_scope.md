# original_scope

Branch `issue_24438_select_comma_split_25.1_alt_original_scope` (`6caf89ba51d`): the parse fix only - single-valued test params and conditional discriminators no longer comma-split (`ftpfile` keeps its implicit multiple), plus the `select_comma_value` framework tool and the ftpfile unit test.

Parent adds, per the scope evaluation: a `TestsParamMultipleSelectCommaOptions` linter warning for `value=` on multiple selects whose option values contain commas, `galaxy.xsd` test-param docs for comma values, and framework cases proving the `value_json` list form for multiple selects.
