# Test challenges review: planemo#1744

- Profile: [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md)
- Model: Claude Opus 5.5, medium effort
- Reviewed commit: d3b5860134d8099a34f844bbcdadf32dad5dff24
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

Verdict: tests are mostly good — behavior-level, run the real gxformat2 and galaxy-tool-util staging code, and the local `stage_in` test is red on master for the right reason. One test mocks an internal helper and so is red on master for the wrong reason; there's no Galaxy-backed regression test. No bugs found (not hunted).

### P2 1: Remote-workflow test patches internal `get_dict_from_workflow` and is red on master only via `AttributeError`

`test_stage_in_passes_lists_to_multiple_value_parameter_inputs_of_remote_workflow` patches `planemo.galaxy.activity.get_dict_from_workflow` and asserts `assert_called_once_with(config.user_gi, "workflow1", False)`, restating the implementation. On master both parametrizations fail with `AttributeError: ... does not have the attribute 'get_dict_from_workflow'`, not the `hdca` mismatch the PR body describes. Fake at the Galaxy boundary instead, as the staging fake already does:

```python
config.user_gi.workflows._get.return_value = workflow
job_dict, _ = _stage_in(runnable, config, job_path)
```

Checked in a scratch worktree: passes on head; on master it fails with the real `{'data_list': ..., 'text_list': {'src': 'hdca', ...}}` mismatch.

### P2 2: No Galaxy-backed test for the reported 400

The fix targets a Galaxy invocation error that the PR reproduced by hand with `planemo run tests/data/wf_multiple_param_inputs.gxwf.yml`. Codify that in `tests/test_run.py` next to `test_run_export_invocation` (`@skip_if_environ("PLANEMO_SKIP_GALAXY_TESTS")`), with a committed job file (e.g. `tests/data/wf_multiple_param_inputs-job.yml`: `text_list`, `int_list`, one-element `data_list`) and `_check_exit_code`. Skip on Galaxy branches older than 24.2 via `target_galaxy_branch()`, since tox still has `release_23.1`. The mocked `make_post_request` can't catch a change in Galaxy's contract for list parameter values.

### P3 1: `gxid://workflow-instance/` (instance=True) path untested

The remote test only covers `gxid://workflows/` (instance False). Add `gxid://workflow-instance/workflow1` as a case, with a `side_effect` on `user_gi.workflows._get` that checks `params={"instance": ...}`, so a flipped `instance` flag is caught. That also replaces the call-arg assertion dropped in P2 1.

### P3 2: PR body misdescribes the remote tests' red state

The Tests section says the local and remote tests fail on master because lists become `{"src": "hdca", ...}`; the remote ones actually fail on the missing patch target. Moot once P2 1 is applied; otherwise correct the description.
