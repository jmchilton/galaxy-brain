- `kind/bug`
- `area/tool-framework`

The bot would add `area/tool-framework` (`lib/galaxy/tools/**`, `lib/galaxy/tool_util/**`), `area/testing` and `area/testing/api` (`lib/galaxy_test/**`), and `area/documentation` (`doc/source/dev/writing_tests.md`). Leave out the testing and documentation labels: the contract suite, fixture-scope fix and `writing_tests.md` note back the fix and aren't the point. `area/API` doesn't fit either, because no endpoint changes shape; `JobsService` only passes `tool.yaml_origin` into `strictify`.
