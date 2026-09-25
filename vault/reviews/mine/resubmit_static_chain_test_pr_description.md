Adds integration coverage for a job resubmitting more than once through a chain of **static** destinations, with a per-hop `<env>`.

This is test-only. No behavior changes.

### What was missing

`test/integration/test_job_resubmission.py` covers:

- a **single** static resubmit hop — `resubmission_tool_detected_resubmit_job_conf.xml` (`local_resubmit` → `local_good`)
- chained **dynamic** destinations, added by #22670 (`test_chained_dynamic_resubmission_with_params_carry_forward`)

Nothing covered a static chain resubmitting twice. The new `resubmission_tool_detected_resubmit_twice_job_conf.xml` inserts a middle hop:

```
local_resubmit (GX_TARGET_EXIT_CODE=4)
  -> local_not_yet_good (GX_TARGET_EXIT_CODE=4)
    -> local_good (GX_TARGET_EXIT_CODE=0)
```

### Why it can't pass vacuously

`exit_code_from_env` runs `exit ${GX_TARGET_EXIT_CODE:-1}` and its tool test is `expect_failure="true"`, so `_run_tool_test` raises when the job *succeeds*. `_assert_job_fails` asserts that raise — which means the test asserts the job finished cleanly on the third destination.

- Drop a hop's `<env>` and the final attempt falls back to `exit 1`.
- Stop after one resubmit and it ends on `exit 4`.

Either way the test goes red. Confirmed by running it: removing the second `<resubmit>` gives `1 failed — assert False`; as written it gives `1 passed`.

### Provenance

Ported from #12852, which is closed as superseded. Both bugs it reported are fixed — #19753 restored `env` and `tags` on resubmission, and #22670 deferred dynamic destination evaluation across resubmits, adopting the approach proposed in #9747. The test written back in 2021 to demonstrate the problem was never merged, and the static-chain path it exercises is still uncovered. Credit for the config and test class belongs to the author of #12852; the commit carries a `Co-Authored-By` trailer.

### How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

```
./run_tests.sh -integration 'test/integration/test_job_resubmission.py::TestJobResubmissionToolDetectedErrorResubmitsTwiceIntegration'
```

`1 passed in 39.69s` against `release_26.1`.

### Why `release_26.1`

The chained-resubmit behavior this pins only exists as of #22670, which is in `release_26.1` and no earlier branch. Happy to retarget to `dev` if that is preferred for a test-only change.

### License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
