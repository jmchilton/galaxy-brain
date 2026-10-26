Profile: gx_risk_assessment · Model: claude-opus-5-5 · Effort: low · Reviewed commit: 4f2e4126a6b

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It turns a 500 into success for PUT of workflows embedding subworkflows; hidden subworkflow StoredWorkflows created during update are now unpublished, matching create's default (`publish=False`). No API, schema, or format changes; trivially revertable.
