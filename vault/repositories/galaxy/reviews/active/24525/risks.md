Profile: gx_risk_assessment · Model: claude-opus-5-5 · Effort: low · Reviewed commit: e37e3605

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is a client-only fix pointing the notebook sharing page at the existing `/api/pages/...` endpoints via an optional `resource` prop; no API, schema, or workflow/tool behavior changes, and the Visualizations and Workflows sharing routes keep their existing `pluralName`-derived URLs.
