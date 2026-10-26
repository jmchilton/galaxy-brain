- `kind/bug` - missing tests are bugs (release-branch target).
- `area/testing/selenium` - new tool form test, `tool_form_set_switch` helper, existing boolean setters routed through it.
- release-testing-26.2

Bot would also add `area/testing` (`lib/galaxy_test/**`) and `area/client` (`navigation.yml`); dropped as not central. Not `area/jobs`: the test exercises the job cache through the UI but changes nothing in it.
