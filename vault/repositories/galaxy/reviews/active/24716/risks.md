Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door): reverting the lookup restores the old behavior, and no API, schema, or stored data changes.

The one behavior to expect at upgrade: on servers that set `user_tool_filters`, tool filter choices users saved while they had no effect will start applying, so those users may see fewer tools until they clear them. Servers that don't set the option are unaffected, and section and label filters already resolved to the right option names.
