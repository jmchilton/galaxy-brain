No refactoring of the base branch was performed.

The fix in `lib/galaxy/webapps/galaxy/api/users.py` is one import and a narrowed `except` clause (`except Exception` → `except NoConverterException` raising `RequestParameterInvalidException`). There's nothing in it to split out ahead of the fix that wouldn't be the fix itself.

Candidates considered and rejected:

- **Shared `NoConverterException` → 400 helper with `services/datasets.py::_get_or_create_converted`.** The two callers differ: datasets returns `"Conversion not possible"` with `source`/`target`/`available` extra data for one conversion. Custom builds chain two conversions (`len`, then `linecount`) and forward the model's message. Other `NoConverterException` catchers (`model/__init__.py`, `visualization/data_providers/registry.py`) use it for fallback control flow, not HTTP mapping. With only two HTTP callers, each with its own shape, a helper would be speculative, and it would change `datasets.py` behavior on a release branch.
- **Extracting the fasta → len/linecount block from `set_custom_build` into a method.** It's possible, but the block is 6 lines and the fix touches only its `except`. Extracting it would add churn to a backport without making the fix easier to review.

Branch history unchanged: `75c806699c3` (fix + test), `96113857dae` (stricter test assertions) on `495b7fee26a`. No tests rerun, since no code changed.
