- `kind/feature` - new `?dry_run=true` mode and response model on the Tool Shed upload API.
- `area/toolshed` - all production changes are in the Tool Shed upload and metadata code.
- `area/API` - new public query parameter and response schema clients (planemo) will depend on.

Bot would add only `area/testing` (`test/**`); dropped as not central. Its `area/toolshed` and `area/API` globs (`lib/toolshed/**`, `lib/galaxy/webapps/galaxy/api/**`) miss `lib/tool_shed/**`, so apply both by hand. Not `kind/bug` despite the `reset_metadata` sample fix: it rides along with the feature and the description calls it out.
