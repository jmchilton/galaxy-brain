# fileSources review — iteration 05

Selected originator: `client/src/composables/fileSources.test.ts`.

Baseline and final: 4 cases, 6 assertion statements. Preserves loading before completion; loading true→false and exact returned sources after mount; hasWritable=false with foo/bar both read-only; hasWritable=true with foo writable/bar read-only.

The component host exposes the composable with inferred setup types; removed its any-returning mount helper and explanatory setup narration. Uses fresh native plugin configuration via `withPlugins` and automatic unmounting. Scenario names identify loading and mixed/read-only conditions. Keeps a host because useFileSources actually fetches onMounted.

New `tests/test-data/fileSources.ts:getFakeFileSource` supplies a typed browsable/writable plugin, ID-derived default URI and fresh feature-support object, allowing partial support overrides without losing other defaults. Selected cases retain visible ID/writable inputs. Concrete supporting consumers are `RDMDestinationSelector.test.ts` (one preselected RDM fixture) and `HistoryExportWizard.test.ts` (POSIX, public Zenodo and private user Zenodo fixtures). Their IDs, URIs, type, label/doc, visibility/write flags, null/undefined requirements, URL, and all feature flags remain unchanged. Repeated all-false supports blocks become defaults; private Zenodo's pagination/search=true flags remain explicit. Supporting assertions/mounts are untouched.

Reuse search also found FilesDialog/testingData.ts, whose broad fixture exports already serve several consumers. No need to migrate that existing shared fixture solely to maximize usage; the selected composable and two direct supporting consumers establish useful reuse. No unresolved marginal advice or README addition.

Validation: supporting RDM 6 and wizard 14 cases passed before edits; all 4 selected plus 20 supporting cases pass in the affected 11-suite/63-case run. Scoped ESLint passes. Root performs final combined checks and type checking.
