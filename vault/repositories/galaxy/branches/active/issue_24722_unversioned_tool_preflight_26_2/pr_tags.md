- `kind/bug`
- `area/workflows`
- `area/API`

Bot (`.github/labeler.yml`) would also add `area/tool-framework` (`tool_util/toolbox/base.py`) and `area/testing`, `area/testing/integration`; dropped: the toolbox change is a small helper serving the workflow fix, and tests aren't central. `area/API` kept because the symptom is the invocation API's 400 (labeler won't add it; the change is in the service layer).
