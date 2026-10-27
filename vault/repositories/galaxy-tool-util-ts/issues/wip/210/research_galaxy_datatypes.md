# Research: how Galaxy reasons about datatypes + collection shapes (for #210)

Refs: Galaxy `origin/dev` `a9a68082414` (2026-10-27), planemo `origin/master`, galaxy-tool-util-ts `origin/main` `a0476900`, port worktree `wf_tool_state` `8bf22007fcd`. Live probe: usegalaxy.org 26.1.2.dev0 (2026-10-27). Paths are relative to each repo root.

## TL;DR

- Client datatype reasoning rests on one API payload: `GET /api/datatypes/types_and_mapping?upload_only=false` → `DatatypesCombinedMap` → `DatatypesMapperModel.isSubType`. Converters, EDAM, sniffers are not consulted by the editor.
- **Main finding: the mapping payload collapses distinct datatypes.** `subclass="true"` and auto-compressed types are built with `type(<ParentClassName>, ...)`, so their `__module__` is `galaxy.datatypes.registry`. 334 of 808 extensions map to `galaxy.datatypes.registry.*` names, and 31 names are shared (e.g. 121 extensions → `galaxy.datatypes.registry.Text`). Client `isSubType("markdown","source.py")` = true. Python `isinstance` = false: each `type()` call makes a distinct class. Upstream fix candidate: give dynamic classes unique names (e.g. qualify by extension). That's a separate Galaxy issue.
- **Second divergence: compressed types.** Client: `fastqsanger.gz` isSubType `fastqsanger` (`FastqSanger` sits in its bases). Server: `DynamicCompressedArchive.matches_any` says no direct match; it's an implicit conversion via `CONVERTER_gz_to_uncompressed`. Reverse (`fastqsanger` → `fastqsanger.gz` input): client rejects, server implicitly converts. The editor never looks at converters.
- **At runtime Galaxy is lenient.** `data_input.format` and `data_collection_input.collection_type` are not enforced at invocation. Tool params convert implicitly when possible, and otherwise pass the dataset through silently. A static checker is stricter than Galaxy by design. It should use "direct match or implicit conversion" for datatypes and `accepts()` for collections, never string equality.
- **Output assertions.** Galaxy's framework workflow tests check `ftype` as exact string equality on `file_ext` and `collection_type` as exact equality. Planemo checks neither `ftype` nor top-level `collection_type`.
- **Offline snapshot is easy.** `example_datatype_registry_for_sample()` plus the `galaxy.managers.datatypes.view_*` functions reproduce the API without a server; converters need only the converter XML `id`. A prototype run on origin/dev gives 808 datatypes and 186 converters. usegalaxy.org (799/177) is a strict subset, so usegalaxy shows no extra tool-shed datatypes.

## 1. Datatype API (`lib/galaxy/webapps/galaxy/api/datatypes.py`, `lib/galaxy/managers/datatypes.py`, models `lib/galaxy/datatypes/_schema.py`)

All endpoints are `public=True`, on `FastAPIDatatypes` (api/datatypes.py:64).

| Endpoint | api line | Impl | Response | Client use |
|---|---|---|---|---|
| `GET /api/datatypes?extension_only=true&upload_only=true` | 69-81 | `view_index` mgr:16-30 | `list[str]` or `list[DatatypeDetails]` | Upload list (`Upload/utils.js:55`, `extension_only=false`, upload_only default true) + `useDetailedDatatypes` (`composables/datatypes.ts:28`, extension_only=false, upload_only default) |
| `GET /api/datatypes/mapping` | 83-91 | `view_mapping` mgr:33-53 | `DatatypesMap` | none directly |
| `GET /api/datatypes/types_and_mapping` | 93-110 | index + mapping | `DatatypesCombinedMap` | `Datatypes/factory.ts:7` (`getDatatypesMapper`) |
| `GET /api/datatypes/sniffers` | 112-120 | `view_sniffers` mgr:65-71 | `list[str]` (sniff order of `<sniffer type>`) | unused |
| `GET /api/datatypes/converters` | 122-130 | `view_converters` mgr:74-85 | `DatatypeConverterList` | unused |
| `GET /api/datatypes/edam_formats` / `edam_data` | 132-140 / 154-162 | registry props registry.py:1048-1059 | `dict[ext, "format_1234"]` | unused |
| `.../edam_formats/detailed` / `edam_data/detailed` | 142-152 / 164-174 | `_get_edam_details` mgr:88-99 | `DatatypesEDAMDetailsDict` | `composables/datatypes.ts:31-32` (AvailableDatatypes, DirectoryDatasetPicker) |
| `GET /api/datatypes/{datatype}/visualizations` | 176-196 | mgr:120-156 | `DatatypeVisualizationMappingsList` | `api/datatypeVisualizations.ts:31` |
| `GET /api/datatypes/{datatype}` | 198-~280 | inline | untyped dict | `api/datatypes.ts:14` → `stores/datatypeStore.js` (DatasetView, DatasetDisplay) |

Models (`_schema.py`):
- `DatatypeDetails` :36 has `extension`, `description?`, `description_url?`, `display_in_upload=False`, `composite_files?: CompositeFileInfo[]`, `upload_warning?`, `display_behavior?`. It has **no** mimetype or EDAM fields. The index dicts come from `registry.datatype_info_dicts` (registry.py:355-375). Auto-compressed entries (:412-420) omit `composite_files` and `display_behavior`.
- `CompositeFileInfo` :22 has `name`, `optional`, `mimetype?`, `description?`, `substitute_name_with_metadata?`, `is_binary`, `to_posix_lines`, `space_to_tab`.
- `DatatypesMap` :69 has `ext_to_class_name: dict[ext, "module.Class"]` and `class_to_classes: dict["module.Class", dict["module.Class", true]]`. The latter is self plus all `Data` subclasses among the bases, transitively (mgr:42-52), and covers abstract classes (e.g. `galaxy.datatypes.images.Image`, `galaxy.datatypes.binary.CompressedArchive`).
- `DatatypesCombinedMap` :82 has `datatypes: list[str]` and `datatypes_mapping: DatatypesMap`.
- `DatatypeConverter` :95 has `source`, `target`, `tool_id`. `DatatypeConverterList` :116 is the RootModel list.
- `DatatypeEDAMDetails` :120 has `prefix_IRI`, `label?`, `definition?`. `DatatypesEDAMDetailsDict` :139 is the RootModel dict.
- `show` (api:204+) returns `extension`, `description`, `display_in_upload`, `mimetype`, `is_binary`, `display_behavior`, `composite_files?`, `edam_format?`, `edam_data?`, `converters?` and `preferred_visualization?`. Its `converters` list is **already subclass-expanded** (`get_converters_by_datatype`), but one ext per call.

Quirks (verified live):
- `types_and_mapping?extension_only=false` → **HTTP 500** on usegalaxy.org. The model types `datatypes: list[str]` but `view_index` returns dicts. Snapshot with `extension_only=true&upload_only=false`, which is what the store uses.
- `/api/datatypes/converters` lists only **declared** source→target pairs from `registry.datatype_converters`. It isn't expanded through inheritance and omits converters that failed to load.
- Client `fetchDatatypeVisualizations` (`api/datatypeVisualizations.ts:19`) GETs `/api/datatypes/visualizations`, a route that doesn't exist (404 on usegalaxy.org).
- `mapping` has no entry for the pseudo-formats `input`, `_sniff_`, `auto`, `_infer_from_file_name_`. `data` → `galaxy.datatypes.data.Data`, which every class contains, so `isSubType(x,"data")` is true for every known x.

## 2. Client construction + consumption

- Factory: `components/Datatypes/factory.ts:6-14` has `getDatatypesMapper(upload_only=true)` → `new DatatypesMapperModel(data)`. Store: `stores/datatypesMapperStore.ts:18-29` has `createMapper()`, which always calls `getDatatypesMapper(false)` and caches a singleton. Composable: `composables/datatypesMapper.ts:6-24` (`useDatatypesMapper` → `{datatypes, datatypesMapper, datatypesMapperLoading}`).
- Model (`components/Datatypes/model.ts`):
  - `isSubType(child, parent)` :24-37. Child must be an ext. Parent is an ext or a raw class name (abstract classes allowed). Unknowns → false.
  - `isSubTypeOfAny` :39-41.
  - `getParentDatatype` :44-47 is `ext_to_class_name[ext].split(".")[2]` (module segment). It has **no callers** on dev and would return `"registry"` for dynamic classes, so don't promote it.
- `isSubType`/`isSubTypeOfAny` callers:
  - Editor `modules/terminals.ts:942` (via `producesAcceptableDatatype`) and `modules/utilities.ts:81` (`getCompatibleRecommendations`, ToolRecommendation.vue:68, which also special-cases `input`/`_sniff_`/`input_collection`).
  - `Form/Elements/FormData/FormData.vue:806` (tool form drag/drop ext check).
  - `Collections/common/useExtensionFilter.ts:26,45` (collection builders).
  - `composables/uploadConfigurations.ts:79`.
  - `Markdown/.../HistoryDatasetDisplay.vue:59-67,165` (`pdf`, `html`, `tabular`, `galaxy.datatypes.images.Image`).
  - `Dataset/DatasetView.vue:65,76`. Line 65 passes the module path `"galaxy.datatypes.binary"`, not a class, so `isBinaryDataset` is effectively always false (minor client bug).
- Editor wrapper: `BaseInputTerminal._producesAcceptableDatatype` (terminals.ts:369-376) rejects `OutputParameterTerminal`, then calls `producesAcceptableDatatype(mapper, this.datatypes, other.datatypes)` (:925-971). Optionality check is at :377-382. Semantics:
  - Any input ext `input` → accept.
  - Otherwise accept if some output ext is `input`, `_sniff_`, or `isSubType(out, in)`.
  - Otherwise, if output exts aren't in `mapper.datatypes`, return the "unknown … contact the Administrator" reason. This relies on `upload_only=false`.
  - **No converter awareness.**
  - Side bug: terminals.ts:355 uses `indexOf("input") > 0` where it should be `>= 0`.
- Where editor exts come from: server `get_all_outputs`/`get_all_inputs` (`workflow/modules.py`).
  - `data_input` / `data_collection_input` with no `format` → output `["input"]` (:1241-1247, :1347-1352).
  - Tool output with `format_source` or collection → `["input"]`, plus any `change_format` formats (:2946-2958).
  - `PauseModule`/`PickValue` → `input`.
- Adoption: client **has not adopted** `@galaxy-tool-util/workflow-graph`. `client/package.json` has only workspace `@galaxyproject/*`, and there are no imports in `client/src`. The editor's `collectionTypeDescription.ts` still lives in Galaxy and is kept in sync by convention (`type_description.py:18-22`).
- Upload list: `Upload/utils.js:54-77` maps `DatatypeDetails` → `{id,text,description,description_url,composite_files,upload_warning}` and sorts. `getUploadDatatypes` :92 prepends `auto`.

## 3. Python runtime semantics vs client

Registry construction (`lib/galaxy/datatypes/registry.py`):
- Per `<datatype>`: `type="module:Class"` or `type_extension`.
  - `subclass="true"` → `type(datatype_class_name, (cls,), {})` :271. `is_subclass` is a **class attribute flag** (:276, default data.py:221), not a method. Required for `edam_format`/`edam_data` overrides :210-216.
  - `auto_compressed_types="gz,bz2"` → class `<Name>Gz` with bases `(cls, GzDynamicCompressedArchive)` :392-400, plus auto converters `uncompressed_to_gz.xml` / `gz_to_uncompressed.xml` :422-431.
  - Explicit `<converter file target_datatype>` → `self.converters` :312-321. These are loaded into the toolbox later (`load_datatype_converters` :702; no-toolbox variant :724).
- Matching: `Data.matches_any(targets)` = `isinstance(self, target_classes)` (data.py:1027-1033). Override for compressed: `DynamicCompressedArchive.matches_any` (binary.py:388-410). A gz type matches a gz target by comparing uncompressed instances, and otherwise only `CompressedArchive` targets. So `fastqsanger.gz` does **not** directly match `fastqsanger`, but does match `galaxy.datatypes.binary.CompressedArchive`-ish targets.
- `get_converters_by_datatype(ext)` (registry.py:943-956) unions converters of every declared source whose class is a superclass (`issubclass`), drops target==ext, then adds the ext's own.
- `find_conversion_destination_for_dataset_by_extensions(ext, accepted)` (:965-1024) returns `(direct_match, converted_ext, converted_dataset)`. Direct = `matches_any`; else the first converter target whose datatype `matches_any(accepted)`, with the uncompressed target sorted first. Unknown accepted exts are warned and dropped.
- Tool param formats: `parse_extensions` = `format` split on `,`, lowercased, default `"data"` (tool_util/parser/xml.py:1480-1481, yaml.py:587-595). `_parse_formats` (tools/parameters/basic.py:2195-2209) maps ext→datatype instance and **drops unknowns with a warning**, so a raw class name or `input` as a tool format is silently ignored server-side. `ValidDatatypes` linter (tool_util/linters/datatypes.py:62-110) errors on unknown/`auto`/`input` in `param` formats.
- `DatasetMatcher.valid_hda_match` (tools/parameters/dataset_matcher.py:120-143) gives `HdaDirectMatch` or `HdaImplicitMatch(target_ext)`. Implicit conversion is allowed by default.

Enforcement (or not):
- `DataToolParameter.from_json` (basic.py:2552-2661, match at :2659) calls `hda_match` only to flag `implicit_conversion`. **A falsy match is ignored.** `BaseDataToolParameter.validate` (:2361+) runs only explicit validators and min/max. No format raise exists in basic.py or dataset_matcher.py.
- Tool action (`tools/actions/__init__.py:207-217`): if not direct and a `target_ext` exists, the dataset is converted (or an existing conversion reused). Otherwise **the raw dataset is passed unchanged**.
- So client vs server:

| Case | Editor (`producesAcceptableDatatype`) | Server runtime |
|---|---|---|
| child subclass of input format | accept | direct |
| sibling `subclass="true"` types (markdown → source.py) | **accept (collapse bug)** | not direct, conversion only if declared, else passed raw |
| `x.gz` → input `x` | accept (bases) | implicit conversion (gz_to_uncompressed) |
| `x` → input `x.gz` | **reject** | implicit conversion (uncompressed_to_gz) |
| `bam` → input `sam`-like via converter | reject | implicit conversion if converter exists |
| unknown output ext | reject ("unknown") | dataset passed raw |
| output `input`/`_sniff_` (format_source etc.) | accept | n/a, resolved at runtime |

## 4. Collection shape + format semantics for test jobs

- Test job model: `lib/galaxy/tool_util_models/test_job.py`.
  - `BaseFile.filetype?` :56. `Collection` :134-141 has `collection_type?` (default None), `elements`, `rows` (sample_sheet), `name`, `identifier`.
  - Staging needs `collection_type`: `tool_util/cwl/util.py:367` asserts it. Nested elements get the suffix after the first `:` (:338-358). `sample_sheet*` passes `rows` (:371).
- File without `filetype` uploads as **`auto`** (`tool_util/client/staging.py:39`, used :101, :133, :193, :221), so it gets sniffed and its ext is statically unknown. The checker must skip (or `info`) such inputs, not flag them.
- Invocation (`workflow/run_request.py:433-517`):
  - Only `parameter_input` steps are `validate`d (:439-458). `hda`/`hdca`/URI inputs are resolved for access only.
  - `InputModule.execute` (modules.py:1154-1189) passes the value straight through. **No format or collection_type check**, and no conversion at the input step.
  - `DataCollectionToolParameter.from_json` (basic.py:3043-3105) checks deleted/populated only, never `collection_type`.
- Effect downstream:
  - `MapOverPlanner._find_collections_to_match` (workflow/map_over.py:55-102) uses `HistoryQuery.direct_match` = `CollectionTypeDescription.accepts` (dataset_collections/query.py:58-67). Else it uses `can_map_over` (:69-81).
  - So a test supplying `list:list` to a `list` input silently maps downstream steps over the outer list, which changes output shapes rather than erroring.
  - Datasets with off-format ext get implicit conversion per consuming tool step (§3), or pass raw.
- Collection-type algebra (`model/dataset_collections/type_description.py`):
  - `accepts` :177-210 (input.accepts(output)). `sample_sheet*` input requires a `sample_sheet*` output. Normalize `sample_sheet`→`list`. Equality passes, `paired`→`paired_or_unpaired` passes, and `X:paired_or_unpaired` accepts `X` and `X:paired`.
  - `can_map_over` :127-175. `compatible` :212-227.
- Recommended test-job check: `CollectionTypeDescription(input.collection_type).accepts(test.collection_type)`. Map-over (`can_map_over`) should be a **warning**, since Galaxy runs it but the shape differs. Anything else is an error.
- Comma lists: workflow `data_collection_input.collection_type` is a single type. `validate_state` (modules.py:1310-1318) uses `COLLECTION_TYPE_REGEX` (type_description.py:38-40), which has no commas. Comma lists exist only on tool `data_collection` params (`DataCollectionToolParameter.__init__` basic.py:3015-3020; `HistoryQuery.from_collection_types` sorts by dimension).
- Recommended `data_input` format check: `filetype` known and `findConversionDestination(filetype, format)` gives direct (ok) or converted (info/warn: "implicitly converted by consuming steps"). Neither → warning, not error, because Galaxy would pass it raw. `class: Collection` given to a `data_input` (or File to a `data_collection_input`) is a structural error; Galaxy would map over or fail downstream.

## 5. Output assertions in workflow tests

- Galaxy framework runner (`lib/galaxy_test/workflow/test_framework_workflows.py:91-137`):
  - It is a collection test iff `elements`, `element_tests`, or `class: Collection` is present. Uses `TestCollectionOutputDef.from_yaml_test_format`, which maps top-level `collection_type` → `attributes.type` (tool_util/parser/interface.py:937-946).
  - `verify_collection` (tool_util/verify/interactor.py:1658-1676): a dataset where a collection was expected raises "expected a collection … use 'asserts'". `collection_type` uses **exact string equality** (no `accepts`, no sample_sheet normalization).
  - Dataset form on a collection output: `assert output_name in invocation_details["outputs"]` fails (:132-135).
  - `ftype` → `get_metadata_to_test` (interactor.py:2487-2500) → `file_ext`, compared by `str(val) != str(expected)` (:2462-2484). **Exact, not subclass-aware.** Also checked for collection elements.
- Planemo (`planemo/runnable.py:392-428`, `planemo/test/_check_output.py`):
  - Collection path only when `element_tests` is present (:27-28). `elements` alias and `class: Collection` aren't detected.
  - Uses `TestCollectionOutputDef.from_dict` (:34), which reads `attributes.type`, so top-level **`collection_type` is ignored**.
  - `class: Collection` without `element_tests` takes the file path → "No path specified for expected output file".
  - **`ftype` is never checked**: no `get_metadata_to_test`/`compare_expected_metadata` in planemo. Galaxy `verify()` uses `ftype` only for bam/cram→sam diffing (tool_util/verify/__init__.py:205-215).
- Implication for TS: validate output `ftype` against the workflow output's possible exts, using string equality with known-ext membership plus a subclass-aware hint. Flag `class`/`collection_type`/`element_tests` vs output collection-ness as an error (it fails in Galaxy's runner). Note the planemo blind spots in messages; don't encode planemo's leniency.

## 6. Static/offline datatype sources

- Existing Python static reader: `galaxy.tool_util.linters.datatypes._parse_datatypes` (linters/datatypes.py:26-36). It reads extensions plus auto-compressed variants only (no hierarchy) from `DATATYPES_CONF` (env override or the packaged symlink `linters/datatypes_conf.xml.sample`), and merges a tool-dir `datatypes_conf.xml`. That's the only static datatype abstraction in tool_util. No hierarchy or converters offline.
- Full offline registry: `galaxy.datatypes.registry.example_datatype_registry_for_sample()` (registry.py:1128-1134) loads `lib/galaxy/config/sample/datatypes_conf.xml.sample` and needs a Galaxy tree (or `galaxy-data`, which ships converters per packages/data/MANIFEST.in).
- Prototype generator (verified on `git archive origin/dev lib`; script at scratchpad `gen/snap.py`, ~15 lines):
  ```python
  r = example_datatype_registry_for_sample()
  tam = {"datatypes": view_index(r, True, False), "datatypes_mapping": view_mapping(r).model_dump()}
  index = view_index(r, False, False); sniffers = view_sniffers(r)
  converters = [{"source": s, "target": t, "tool_id": ET.parse(join(r.converters_path, f)).getroot().get("id")}
                for f, s, t in r.converters]           # no toolbox needed
  edam_formats, edam_data = r.edam_formats, r.edam_data   # detailed labels need EDAM tabular (registry.py:76)
  ```
  - Output on origin/dev: 808 datatypes, 186 converters, 334 `galaxy.datatypes.registry.*` exts in 31 collision groups.
  - usegalaxy.org: 799 datatypes / 177 converters, all contained in the offline set. Offline-only: `mzspeclib.*`, `netcdf4`, `nxxps`, `pdb.gz`, `vamas`, `varri.json`, `warc.gz`, and parquet/pdb.gz converters.
- Offline vs live trade-offs:
  - Offline is reproducible, pinned to a Galaxy commit, and needs no network. It only covers datatypes in the sample conf.
  - Live (`types_and_mapping?upload_only=false`, `/api/datatypes?extension_only=false&upload_only=false`, `/converters`, `/edam_*/detailed`, `/sniffers`, `/api/version`) captures admin `datatypes_config` overrides and repo-installed datatypes (loaded via `load_datatypes(..., override=True)`, app/__init__.py:605-620). Those exist only on live servers.
  - Recommend offline as the default, CI-refreshed (record the Galaxy commit and version). Add an optional live fetch (`--galaxy-url`) using the same file layout, and union-merge for multi-server.
- Missing from the API for server parity: `uncompressed_datatype_instance` / `compressed_format`. Derivable: an ext whose class_to_classes contains `galaxy.datatypes.binary.GzDynamicCompressedArchive` (or `Bz2…`) and whose ext ends `.gz`/`.bz2`, giving uncompressed ext = strip suffix. Also missing: the `is_subclass` flag, which `ext_to_class_name` startswith `galaxy.datatypes.registry.` approximates.

## 7. Recommendations: shared abstractions

Keep Galaxy names and API types verbatim so upstreaming is a re-export.

1. **API types** (new module, e.g. `@galaxy-tool-util/workflow-graph/datatypes` or a new `@galaxy-tool-util/datatypes` package): `DatatypesCombinedMap`, `DatatypesMap`, `DatatypeDetails`, `CompositeFileInfo`, `DatatypeConverter`/`DatatypeConverterList`, `DatatypeEDAMDetails`/`DatatypesEDAMDetailsDict`. Galaxy side: `components["schemas"][...]`; compile-time structural check as today (`datatypes-combined-map.ts`).
2. **`DatatypesSource`** (async loader interface):
   ```ts
   interface DatatypesSource {
     getTypesAndMapping(): Promise<DatatypesCombinedMap>;          // upload_only=false
     getDatatypes?(): Promise<DatatypeDetails[]>;                   // index, extension_only=false, upload_only=false
     getConverters?(): Promise<DatatypeConverter[]>;
     getEdamFormats?(): Promise<DatatypesEDAMDetailsDict>; getEdamData?(): Promise<DatatypesEDAMDetailsDict>;
     getSniffers?(): Promise<string[]>;
     describe(): { kind: "api" | "snapshot"; galaxyVersion?: string; galaxyCommit?: string; url?: string };
   }
   ```
   Implementations: `ApiDatatypesSource(fetchLike, baseUrl)` (Galaxy client: wraps `GalaxyApi().GET`), `SnapshotDatatypesSource(json)` (embedded/on-disk), plus a `createDatatypesMapper(source)` that mirrors `getDatatypesMapper`.
3. **`DatatypesMapperModel` + `producesAcceptableDatatype` + `ConnectionAcceptable`**: leave unchanged (editor parity, already ported). Don't promote `getParentDatatype`.
4. **New server-parity layer** (separate names so the editor semantics aren't silently changed): `DatatypesRegistryModel` (or `DatatypeConversionModel`) built from mapping + converters:
   - `matchesAny(ext, formats)` = `isSubTypeOfAny` plus the compressed rule from binary.py:388.
   - `getConvertersByDatatype(ext)` = issubclass-expanded via `class_to_classes`, matching registry.py:943.
   - `findConversionDestination(ext, formats) → {directMatch: boolean; convertedExt: string | null}` matching registry.py:965 (uncompressed first).
   - `isKnownDatatype(ext)` and `isPseudoFormat(ext)` for `input`/`_sniff_`/`auto`/`data`/`_infer_from_file_name_`.
   - Document this layer as **approximate** until Galaxy emits unique names for dynamic classes. Known false positives: siblings of `subclass="true"` types.
   - Optional mitigation in the snapshot generator: emit an extension-qualified name for dynamic classes. That diverges from the live API, so put it behind a flag, or better, fix upstream in `view_mapping`.
5. **Collections**: reuse `CollectionTypeDescription.accepts`/`canMapOver` from workflow-graph. Add a thin `checkTestCollectionInput(inputType, testType) → "ok" | "map_over" | "mismatch"`.
6. **Snapshot**: commit the JSON produced by a Python generator, with commit/version metadata, under the new package (not `test/fixtures`). Refresh via a scheduled workflow. Replace the toy `test/fixtures/datatypes*.json` (short class names like `"Text"` hide fully-qualified-name and collision bugs) with the real snapshot.
7. **Galaxy upstream candidates** (separate issues, not blockers):
   - (a) unique dynamic-class names in `view_mapping`
   - (b) `types_and_mapping?extension_only=false` 500 (model typing)
   - (c) dead `/api/datatypes/visualizations` client call
   - (d) `DatasetView.vue:65` module-path arg
   - (e) terminals.ts:355 `> 0`
   - (f) planemo ignores `ftype` and top-level `collection_type`

## Unresolved questions

- New package (`@galaxy-tool-util/datatypes`) vs grow `workflow-graph`?
- Snapshot source: offline sample (default) vs usegalaxy.org; ship both?
- Ext-qualify dynamic class names in our snapshot (diverge from API) or wait for the upstream fix?
- `data_input` format mismatch with no converter: warn or error? (Galaxy passes it raw.)
- Collection map-over in a test input: warn or error?
- Check `ftype` on outputs given that planemo ignores it?
