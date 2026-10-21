# Debrief: custom_build_conversion_error_swallowed

Source: `custom_build_conversion_error_swallowed.md`. Proposal: `proposed_custom_build_conversion_error_swallowed.md`. Verified against origin/dev @ 2cca8565861.

## Verified

- `add_custom_builds` (`lib/galaxy/webapps/galaxy/api/users.py` L577-583) wraps conversion setup in a bare `except Exception` and raises `ToolExecutionError` ("Failed to convert dataset.", 500, err_code 500004).
- `message_exception_middleware` (`lib/galaxy/webapps/base/api.py` L335-342) logs 5xx MessageExceptions with `log.info` and no traceback.
- `NoConverterException` is a plain `Exception` (`lib/galaxy/model/__init__.py` L401), raised by `get_converted_dataset` (L5903) when the target type has no converter.
- The `except` only sees the conversion *starting*. Converter jobs are queued, so a job that fails later never reaches it.

## Corrected from the draft

- **"No Sentry event" is wrong.** Galaxy registers `StarletteIntegration` (`lib/galaxy/app/__init__.py`; made explicit in 22bf0a0f1a4, which is on release_26.2 but not 26.1/26.0). It was auto-enabled before that commit too. Its patched exception handler captures handled exceptions with a 5xx `status_code`, and the original `NoConverterException` comes along as `__context__`. So Sentry does get the cause. The issue now argues the reverse: caller and config errors create Sentry error noise. That supports mapping them to 4xx.
- The test datatypes path is `test/functional/tools/sample_datatypes_conf.xml`, not `lib/galaxy/tool_util/unittest_utils/...`.
- Reach: `datatypes_conf.xml.sample` ships `fasta_to_len` and `len_to_linecount`, so a stock server only hits the `fasta` case when an admin has trimmed the datatypes config. Passing a non-FASTA dataset id (e.g. `bed`) through the API hits it on any server.
- The review dropped `ConverterDependencyException` from the proposal: neither converter has `depends_on`, so it can't be reached here.

## Prior art

- No duplicate issue or PR found. Searched "custom build convert", "Failed to convert dataset", "custom_builds", "custom build fasta" and NoConverterException.
- Two places already map `NoConverterException` to `RequestParameterInvalidException`, and the proposal follows them: `services/datasets.py` L988-992 and the visualization data provider registry (#22398).

## Review round

One reviewer subagent confirmed the claims and found no grounds for pushback. Its edits:
- line pin changed to L577
- dependency-exception row and catch removed
- Sentry wording tightened to "implicit context"
- import note added for `NoConverterException` in users.py
- `test_raw_data_no_converter_returns_400` in `lib/galaxy_test/api/test_datasets.py` pointed to as the model for an API test (no custom-build API test exists yet)

## Unresolved

- If only `len_to_linecount` is missing, the `fasta → len` job is already queued before the error. The issue doesn't mention this.
- The memory note `galaxy-messageexception-hides-sentry` says 5xx MessageExceptions never reach Sentry. That looks wrong given `StarletteIntegration`, both auto-enabled and now explicit. Worth re-checking.

## Recommendation

Keep internal and fix PR-first. It's about a 5-line change with an established pattern, and the realistic triggers are API misuse and trimmed datatype configs. Post it only if a PR is not imminent.
