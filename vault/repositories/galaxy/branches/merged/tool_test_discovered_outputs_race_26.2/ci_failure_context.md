# CI failure context

## Run

- Workflow: Tool framework tests, job `Test (3.10, never)` (`GALAXY_TEST_USE_LEGACY_TOOL_API=never`)
- Run: https://github.com/galaxyproject/galaxy/actions/runs/39844786515/job/120055100553
- PR: [#24368](https://github.com/galaxyproject/galaxy/pull/24368) (`extract_next_followups_baseline`, head `602cf07cb37`, base `release_26.2`), `pull_request` event, 2026-10-22
- Result: 1 failed, 655 passed. Rerunning the failed job (attempt 2) passed, which confirms a flake.
- The PR changes only notebook extraction and pages code, so it doesn't exercise the tool test framework.

## Failure

`test/functional/test_toolbox_pytest.py::TestFrameworkTools::test_tool[output_filter/1.0.0-3]`

```
JobOutputsError: Incorrect number of outputs - expected 3, found 5
(dataset(s): out_1,out_2,__new_primary_file_list_output|4__,__new_primary_file_list_output|5__ collection(s): list_output)
```

Test 3 of `test/functional/tools/output_filter.xml` has `expect_num_outputs="3"`: `out_1`, `out_2` and the `list_output` collection, which discovers elements `4` and `5`.

## Stack trace (locals trimmed)

```
_____________ TestFrameworkTools.test_tool[output_filter/1.0.0-3] ______________
[gw0] linux -- Python 3.10.22

    @pytest.mark.parametrize("testcase", cases(), ids=idfn)
    def test_tool(self, testcase: ToolTest):
        use_legacy_api = os.environ.get("GALAXY_TEST_USE_LEGACY_TOOL_API", DEFAULT_USE_LEGACY_API)
        ...
>       self._test_driver.run_tool_test(
            testcase.tool_id, testcase.test_index, tool_version=testcase.tool_version, use_legacy_api=use_legacy_api
        )
        testcase   = ToolTest(tool_id='output_filter', tool_version='1.0.0', test_index=3)
        use_legacy_api = 'never'

test/functional/test_toolbox_pytest.py:91:
lib/galaxy_test/driver/driver_util.py:1285: in run_tool_test
    verify_tool(
lib/galaxy/tool_util/verify/interactor.py:1957: in verify_tool
    raise e
lib/galaxy/tool_util/verify/interactor.py:1951: in verify_tool
    job_stdio = _verify_outputs(
...
        if found_exceptions and not testdef.expect_test_failure:
>           raise JobOutputsError(found_exceptions, job_stdio)
E           galaxy.tool_util.verify.interactor.JobOutputsError: Incorrect number of outputs - expected 3, found 5 (dataset(s): out_1,out_2,__new_primary_file_list_output|4__,__new_primary_file_list_output|5__ collection(s): list_output)
        actual     = 5

lib/galaxy/tool_util/verify/interactor.py:2132: JobOutputsError
```

## Cause

`GalaxyInteractorApi.resolve_tool_submission` (non-legacy path) waits for the tool request to reach `submitted` and then lists `jobs/{job_id}/outputs`. Collection discovery associates each element with the job as `__new_primary_file_{name}|{identifier}__` (`lib/galaxy/model/store/discover.py`). A job that finished before the outputs were listed therefore shows up with extra dataset outputs. The legacy path reads the submit response, which never contains them. `verify_primary_datasets` already reads these associations separately, so dropping them from the output map loses nothing.
