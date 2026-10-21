# Custom build API hides why a FASTA conversion failed

Found by the 26.2 FAQ loop while writing E2E coverage for `faqs/galaxy/analysis_add_custom_build.md`.

`lib/galaxy/webapps/galaxy/api/users.py` `add_custom_builds` (~576-583):

```python
try:
    new_len = dataset.get_converted_dataset(trans, "len")
    new_linecount = new_len.get_converted_dataset(trans, "linecount")
    ...
except Exception:
    raise exceptions.ToolExecutionError("Failed to convert dataset.")
```

- On a server whose datatypes lack the `fasta -> len` or `len -> linecount` converters (e.g. the
  framework test datatypes, `lib/galaxy/tool_util/unittest_utils/functional_tools/sample_datatypes_conf.xml`),
  the cause is `NoConverterException: "Conversion from 'fasta' to 'len' not possible"`. The API
  returns a 500 with "Failed to convert dataset." and logs only `MessageException: Failed to convert
  dataset.` at INFO. No traceback, no Sentry event.
- Fix: catch `NoConverterException` separately and raise a 4xx (`RequestParameterInvalidException`)
  saying the server can't convert this datatype; for other exceptions `log.exception(...)` before
  raising (or don't wrap them), so the real error reaches logs/Sentry.
- Also: the bare `except Exception` turns any bug in the conversion path into the same message.
