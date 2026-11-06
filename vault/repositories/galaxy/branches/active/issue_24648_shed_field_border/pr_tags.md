- `kind/bug`
- `area/toolshed`
- `area/accessibility`

The labeler globs (`lib/toolshed/**`, `client/src/**`) don't match `lib/tool_shed/webapp/frontend`, so the bot won't apply these. `area/accessibility` matches issue #24648's label but isn't listed in `issues.rst`.
