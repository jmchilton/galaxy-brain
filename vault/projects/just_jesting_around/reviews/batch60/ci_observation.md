# CI observation before batch 60 publication

Prior pushed head bc3b5f773a059d2a19aa2be333d06ba53eaf246e remains draft and mergeable. Snapshot: 36 success, 2 skipped, 15 running, 3 failed checks.

The three failures exercise backend paths untouched by this client-test lane:

- [Framework Python 3.10](https://github.com/galaxyproject/galaxy/actions/runs/38305597338/job/114998751781): secure_hash_message_digest tool test timed out after 60.25 seconds, with a 409 when retrieving incomplete output.
- [Package tests Python 3.10](https://github.com/galaxyproject/galaxy/actions/runs/38305597443/job/114998752178) and [Python 3.14](https://github.com/galaxyproject/galaxy/actions/runs/38305597443/job/114998751994): collection ImportError for build_client_manager from installed pulsar.client, across Pulsar runner tests.

Observed through actual failed-job logs, not inferred from check names. No backend/dependency changes made. New batch publication triggers fresh CI; status remains ci_wait and draft status retained.
