FYI research, not a review finding: how this relates to the older `remote_object_store_copy` Pulsar action.

Pulsar already has an identity-based input action from 2019, added in galaxyproject/pulsar#191 with the Galaxy side in #8625. The runner still attaches `object_store_ref = {dataset_id, dataset_uuid, object_store_id}` to every `ClientInput`. If an admin maps inputs to `remote_object_store_copy`, Pulsar builds its own `ObjectStore` from `object_store_config_file`, resolves the reference with `get_filename()`, and copies the file into the job directory. This PR keeps sending `object_store_ref` and adds `url=` next to it. With pulsar#553, each action reads the key it needs (`object_store_ref`, `url` or `path`) and ignores the rest, so the two mechanisms already coexist per path rule in the file action config.

|                        | `remote_object_store_copy`                                                                   | `object_store_staging` (this PR)                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Who reads the store    | Pulsar, using a Galaxy-equivalent object store config                                        | Galaxy (`JobObjectStagingManager`); Pulsar only does HTTP                                                       |
| On the wire            | `{dataset_id, uuid, object_store_id}`                                                        | Signed per-object URL; with `redirect`, a 15-minute presigned URL                                               |
| Backend credentials    | Pulsar holds them                                                                            | Stay in Galaxy                                                                                                  |
| Authorization          | None. Any dataset in the store is readable                                                   | One object of one job; checked against the job's inputs and stops working when the job leaves its active states |
| Config coupling        | Pulsar's store config must match Galaxy's (ids, `store_by`, distributed backend ids)         | Only a Pulsar that understands `ClientInput.url`                                                                |
| Metadata files         | Not supported (runner TODO)                                                                  | Supported                                                                                                       |
| Extra files            | Not supported (runner TODO)                                                                  | Planned for a stacked PR, using a per-file URL manifest                                                         |
| Handler cache          | Still synced; the runner only skips the sync when `object_store_staging` is set              | Skipped for every input (`sync_cache=False`)                                                                    |
| Bytes path             | store → Pulsar, through Pulsar's own cache, which persists across jobs                       | `stream`: store → Galaxy → Pulsar; `redirect`: store → Pulsar, fetched again for each job                       |

**This is a trust split, not disk versus S3.** Disk stores that Pulsar can mount don't need either approach. A `rewrite` path rule (`source_directory`/`destination_directory`) lets the job read inputs in place at a different mount point, with one rule per backend's `files_dir` for distributed stores. `remote_copy` also works, but only if the paths are identical. The older action's real niche is *trusted* compute that has its own store credentials and network path, such as Pulsar in the same cloud region as the bucket. It also gets a compute-side cache that persists across jobs. For BYOC and other compute that shouldn't hold store-wide credentials, this PR's approach is much better. Galaxy keeps the credentials and the policy, Pulsar gets narrow capabilities revoked by job state, and `redirect` keeps the direct one-hop transfer.

**Extra files are cleaner in the Pulsar-owns-the-store route.** Galaxy's caching stores already pull a whole extra-files directory with `get_filename(dir_only=True, extra_dir=...)`, the same call local jobs rely on. A Pulsar-side store would get that for free. The URL route needs Galaxy to list the directory in the backend and sign one URL per file. Two caveats:

1. **Galaxy should send the store addressing on the wire.** Pulsar shouldn't recompute extra-dir names (`dataset_{uuid}_files` versus the legacy `dataset_{id}_files`). For metadata files the addressing is `MetadataFile.object_store_path_kwargs()`.
2. **The action copies one file today.** It needs a directory mode.

### When to converge

- **One description of each input's identity in the runner.** This PR builds signed URLs from `input_metadata_file_ids` and `object_store_path_kwargs()`, while `object_store_ref` is built separately and lacks metadata and extra-files support. One builder could produce `(kind, object_id, store addressing kwargs)` per input and write it out as both a URL and an `object_store_ref`. That closes the older action's metadata TODO almost for free and gives it the addressing it needs for extra files.
- **Decide cache sync per input from the chosen action, not the destination param.** Staging runs in Galaxy's process, so the runner can ask `FileActionMapper` which action each input gets. If action classes declared whether they read the Galaxy-side path, the decision would be correct in both directions:
  - Inputs staged by `remote_object_store_copy` would stop being pulled into the handler cache.
  - Under `object_store_staging`, an input that a path rule maps to a local action would still be synced. Today it isn't, and pulsar#553's existence check then fails it.

  #553's `fetched_from_url` check in `up.py` is already a special case of this.

### When not to converge

- **The trust models.** One approach has Pulsar holding store credentials and the other doesn't; that difference is the point.
- **Bytes paths.** A compute-side store cache versus fresh presigned fetches each job are different trade-offs. Neither replaces the other.
- **Deferred inputs.** Both correctly fall back to path staging; see the separate comment.
- **One admin setting.** Folding `remote_object_store_copy` into an `object_store_staging` value would mostly be about making the options easier to find. Per-path choice already works through the file action config.

<details><summary>When to use what</summary>

| Situation                                                                                                   | Use                                                                                                           |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Pulsar mounts Galaxy's disk store (same or different path)                                                   | Path rules: `none` (same path), `rewrite` (different mount, read in place), `remote_copy`/`copy` (copy in)    |
| No shared storage, no object store                                                                          | Default `remote_transfer` (job files API)                                                                     |
| Trusted Pulsar with its own store credentials and network path; you want a cache at the compute site        | `remote_object_store_copy` with Pulsar's `object_store_config_file`                                           |
| BYOC or other untrusted compute; S3-style store that can presign; Pulsar can reach the store's endpoint    | `object_store_staging: redirect` (needs `enable_direct_download`; Pulsar ≥ 0.15.16 to follow redirects)       |
| Store can't presign, presigning is off, or Pulsar can't reach the store's network                           | `object_store_staging: stream`                                                                                |
| Deferred inputs, any setup                                                                                  | Automatic path staging through the handler's job directory                                                    |

Natural home: the `object_store_staging` block this PR adds to `job_conf.sample.yml`, with a pointer to Pulsar's file action docs.

</details>

***Posted by agent [gx_reviews](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_reviews/AGENTS.md) using model Claude Opus 5.5 on John's behalf.***
