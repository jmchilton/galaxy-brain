The custom build API turns any failure to start the FASTA → `len` conversion into an opaque 500 "Failed to convert dataset.", including requests the server can never satisfy.

Adding a custom build from a FASTA dataset (`PUT /api/users/{user_id}/custom_builds/{key}` with `len_type: "fasta"`) when the server has no `fasta → len` converter:

```text
HTTP 500
{"err_msg": "Failed to convert dataset.", "err_code": 500004}

server log (INFO, no traceback):
MessageException: Failed to convert dataset.

actual cause, in neither the response nor the log:
NoConverterException: "Conversion from 'fasta' to 'len' not possible"
```

| What the caller passed / server state | Real cause | Response today | Expected |
|---|---|---|---|
| Dataset whose datatype has no `len` converter (e.g. a `bed` id via the API) | `NoConverterException` | 500 "Failed to convert dataset." | 4xx naming the source and target datatypes |
| `fasta` on a server whose datatypes config omits `fasta_to_len` or `len_to_linecount` | `NoConverterException` | 500 "Failed to convert dataset." | 4xx saying this server can't convert the datatype |
| A bug in the conversion setup path | anything | 500 "Failed to convert dataset." | 500 with the real error in the server log |

The default `datatypes_conf.xml.sample` ships both converters, so a stock server only hits the `fasta` row when an admin has trimmed the datatypes config. The test datatypes in `test/functional/tools/sample_datatypes_conf.xml` do omit them, which is how this surfaced. The `bed` row is reachable on any server through the API.

The `except` only covers *starting* the conversion. `get_converted_dataset` queues the converter job and returns, so a converter job that fails later never reaches this block.

<details><summary>Code (dev @ 2cca8565861)</summary>

[`lib/galaxy/webapps/galaxy/api/users.py` L577-583](https://github.com/galaxyproject/galaxy/blob/2cca8565861/lib/galaxy/webapps/galaxy/api/users.py#L577-L583):

```python
try:
    new_len = dataset.get_converted_dataset(trans, "len")
    new_linecount = new_len.get_converted_dataset(trans, "linecount")
    build_dict["len"] = new_len.id
    build_dict["linecount"] = new_linecount.id
except Exception:
    raise exceptions.ToolExecutionError("Failed to convert dataset.")
```

- `get_converted_dataset` raises `NoConverterException` when the target isn't in `get_converter_types()` ([`lib/galaxy/model/__init__.py` L5888-5934](https://github.com/galaxyproject/galaxy/blob/2cca8565861/lib/galaxy/model/__init__.py#L5888-L5934)). It is not a `MessageException`. (Its other error, `ConverterDependencyException`, needs a `depends_on` converter, and neither `fasta_to_len` nor `len_to_linecount` has one.)
- `ToolExecutionError` is a `MessageException` with `status_code = 500`. `message_exception_middleware` logs 5xx MessageExceptions with `log.info(f"MessageException: {exc}")` and no traceback ([`lib/galaxy/webapps/base/api.py` L335-342](https://github.com/galaxyproject/galaxy/blob/2cca8565861/lib/galaxy/webapps/base/api.py#L335-L342)).
- With Sentry configured, the Starlette integration captures handled exceptions whose `status_code` is 5xx, and the `NoConverterException` comes along as implicit exception context. So Sentry users see the cause, but every misconfigured-datatype or wrong-datatype request also becomes a Sentry error event for a condition that isn't a server bug.

</details>

## Context

Discovered while writing E2E coverage for the custom build FAQ against a server using the test datatypes config. Two other call sites already map `NoConverterException` to `RequestParameterInvalidException`: [`services/datasets.py` L988-992](https://github.com/galaxyproject/galaxy/blob/2cca8565861/lib/galaxy/webapps/galaxy/services/datasets.py#L988-L992) and the visualization data provider registry (🔀 #22398).

## Proposed Approach

Follow the existing convention: catch `NoConverterException` and raise `RequestParameterInvalidException` naming the source and target datatypes, and stop wrapping everything else so unexpected errors reach the log with a traceback.

<details><summary>Sketch</summary>

```diff
 try:
     new_len = dataset.get_converted_dataset(trans, "len")
     new_linecount = new_len.get_converted_dataset(trans, "linecount")
     build_dict["len"] = new_len.id
     build_dict["linecount"] = new_linecount.id
-except Exception:
-    raise exceptions.ToolExecutionError("Failed to convert dataset.")
+except NoConverterException as e:
+    raise exceptions.RequestParameterInvalidException(
+        f"Cannot create a custom build from this dataset: {e.value}"
+    )
```

`NoConverterException` needs adding to the existing `from galaxy.model import (...)` in `users.py`.

No API test covers custom builds today. One can pass a non-FASTA dataset and assert a 400 naming the datatypes, like `test_raw_data_no_converter_returns_400` in `lib/galaxy_test/api/test_datasets.py`.

</details>

## Alternative Approaches

Keeping the 500 and adding `log.exception` would fix the server log but still report caller and config errors as server failures. Dropping the wrapper alone would expose the cause, but as an unhandled 500. A blanket 4xx for every exception would hide real bugs. Mapping `NoConverterException` to a 4xx and leaving the rest unwrapped matches how Galaxy already handles `NoConverterException` elsewhere.

<details><summary>Alternatives In Detail</summary>

### Alternative: keep `ToolExecutionError`, add `log.exception`

<details><summary>Description</summary>

#### Details

Put `log.exception("Custom build conversion failed")` before the existing raise.

#### Why the proposed approach is preferred

The log gains a traceback, but a wrong-datatype request is still a 500 with a message that doesn't say what's wrong. Each such request still creates a Sentry error event.

</details>

### Alternative: remove the `try`/`except` entirely

<details><summary>Description</summary>

#### Details

Let every exception propagate unwrapped.

#### Why the proposed approach is preferred

Unexpected errors get a proper traceback, but `NoConverterException` becomes an unhandled 500 instead of a clear 4xx with no hint to the caller about which datatype was wrong.

</details>

### Alternative: map every exception to `RequestParameterInvalidException`

<details><summary>Description</summary>

#### Details

Keep the bare `except Exception` and change the raised type to a 4xx.

#### Why the proposed approach is preferred

Real bugs get blamed on the caller and lose their traceback, which is worse than today.

</details>

</details>
