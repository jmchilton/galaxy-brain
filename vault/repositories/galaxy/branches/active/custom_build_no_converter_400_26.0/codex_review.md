# Codex review

Ran Codex (read-only, `git diff 495b7fee26a...HEAD`, head `96113857dae`) with a neutral brief. It found nothing. No code changes.

I checked the widened failure surface myself (`get_converted_dataset`, `lib/galaxy/model/__init__.py`, around line 5550):

- `NoConverterException` is raised directly, and again when a dependency has no converter. Both now return 400.
- `ConverterDependencyException` ("dependency was in an error state") still returns 500. That's the same status as before, but it's no longer wrapped. `services/datasets.py::_get_or_create_converted` doesn't map it either, so matching its sibling is consistent. Not acted on.

Not acted on:
- `ConverterDependencyException` → 4xx. Possibly a user-state error, but sibling code treats it as 500. Better as a shared change across both callers than one special case here.
- Partial state: if `len_to_linecount` alone is missing, the `fasta → len` job is already queued when the 400 is raised. Stock datatypes ship both converters. Already noted in the initial debrief.

<details>
<summary>Codex output</summary>

```json
{"findings": [], "coverage": {"notes": "Reviewed the full diff and relevant surrounding conversion, exception, schema, and test code. Static review only; the API test was not executed.",
 "files_reviewed": ["lib/galaxy/webapps/galaxy/api/users.py", "lib/galaxy_test/api/test_users.py", "lib/galaxy/model/__init__.py", "lib/galaxy/webapps/galaxy/services/datasets.py", "lib/galaxy/datatypes/data.py", "lib/galaxy/datatypes/registry.py", "lib/galaxy/exceptions/__init__.py", "lib/galaxy/webapps/base/api.py", "lib/galaxy/webapps/galaxy/fast_app.py", "lib/galaxy/schema/schema.py", "lib/galaxy_test/base/api_asserts.py", "lib/galaxy_test/base/api.py", "lib/galaxy_test/base/populators.py", "lib/galaxy_test/api/_framework.py", "lib/galaxy_test/api/test_datasets.py", "config/datatypes_conf.xml.sample", "client/src/components/User/CustomBuilds.vue"]}}
```

</details>
