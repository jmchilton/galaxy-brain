# Component - Datatypes Registry and Sniffing

Document `lib/galaxy/datatypes/registry.py` and `lib/galaxy/datatypes/sniff.py` as a component: how `Registry.load_datatypes` builds `datatypes_by_extension`, `datatypes_by_suffix_inferences`, `mimetypes_by_extension`, subclass and compressed dynamic datatypes, and `sniff_order` (explicit `<sniffers>` plus `append_to_sniff_order`); filename-based inference (`get_datatype_from_filename`); `guess_ext`, `guess_ext_from_file_name` and `handle_uploaded_dataset_file_internal` as used by uploads and data fetch (auto-detection, validation of an explicitly requested type, text conversion); redetection and datatype changes (`change_datatype`, the API, Celery `change_datatype` task and `DatasetAssociationManager.detect_datatype`); how tool inputs match datasets (`Data.matches_any`, `DataToolParameter` formats) and how converters are indexed (`datatype_converters`, `get_converters_by_datatype`, `converter_deps`); and how the registry reaches compute hosts (`to_xml_file` / `registry.xml`, `validate_and_load_datatypes_config` in `set_metadata.py`, `use_remote_datatypes`). If galaxyproject/galaxy#23986 has merged, cover its dynamically registered `<inner>.c4gh` wrapper datatypes, the `crypt4gh_enabled` registry attribute, `redetect_ext` and `get_converter_deps` as an example of datatypes derived from others at load time.

Leave out individual datatype implementations beyond one or two examples, display applications, and the implicit-conversion job flow (`Component - Implicit Dataset Conversion`).

## Why

#23986 registers a wrapper datatype for every registered datatype, changes filename inference, upload sniffing, redetection, converter lookup and input matching, and ships a registry flag to compute hosts. No research note describes the registry or sniffing; `Component - Data Fetch` and `Component - Implicit Dataset Conversion` each touch only a slice.

## Requested by

- vault/repositories/galaxy/reviews/active/23986: learning review needed a baseline of registry loading, sniff order, filename inference, `matches_any` and converter indexing to explain the Crypt4GH wrapper datatypes.
