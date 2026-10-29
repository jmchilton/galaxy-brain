# job_files_resolve_paths_25.1_alt_original_scope

[View on GitHub](https://github.com/jmchilton/galaxy/tree/job_files_resolve_paths_25.1_alt_original_scope) at `21604435ae2`.

Parent minus the last commit: absolute-path check for job files writes plus the job ports log line. Doesn't turn invalid upload sources (missing file, bad/unknown tus session id, nginx path outside the store) into 4xx responses.
