---
upstream_base_branch: release_25.1
---
# job_parameters_input_access_25.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:job_parameters_input_access_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/job_parameters_input_access_25.1)

## Status

Status: in implementation. Base: `release_25.1` (`1e2458c196c`). Worktree: `~/projects/worktrees/galaxy/branch/job_parameters_input_access_25.1`.

No PR yet. CI not yet seen.

Tightens the `parameters_display` API contract: data inputs the caller can't access are described by `{src, id}` only (as `/api/jobs/{id}/inputs` does), not with `hid`/`name`.
