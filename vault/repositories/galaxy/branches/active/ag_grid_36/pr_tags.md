- `kind/enhancement`
- `area/dependencies`
- `area/UI-UX`
- `area/dataset-collections`

The dependency upgrade and existing grid behavior are the central scope. The labeler matches `area/client`, `area/UI-UX`, `area/testing`, and `area/testing/selenium`; omit the broad client and incidental testing labels. Add dependencies and dataset collections explicitly; the dependency rule only watches Python requirements. No security label: #23938 already addressed the CVE.
