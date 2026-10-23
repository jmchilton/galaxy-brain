### P3 1: Test only checks that a subworkflow step survives the PUT (implementation verified)

`test_update_with_unchanged_export_of_workflow_with_subworkflow` asserts one subworkflow step exists after the update. That passes if the embedded subworkflow were rebuilt empty or altered, and it doesn't pin the `published` value the new expression computes.

Assert the inner `cat1` tool step is still in the re-exported subworkflow, and that no workflow (hidden subworkflow StoredWorkflows included) is published after the PUT.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at low effort.

</details>
