# Risks (gx_risk_assessment) — e245131d

Low. Single file, optional dependency path. Behavior change: existence-check errors now propagate instead of being treated as "missing" — safer (prevents overwriting remote with stale cache), called out in PR description. No P-labeled findings.
