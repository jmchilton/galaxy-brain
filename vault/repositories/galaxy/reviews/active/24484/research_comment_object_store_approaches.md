FYI research, not a review finding: how this relates to the older `remote_object_store_copy` Pulsar action.

Pulsar already has an identity-based input action from 2019, added in galaxyproject/pulsar#191 with the Galaxy side in #8625. The runner still attaches `object_store_ref = {dataset_id, dataset_uuid, object_store_id}` to every `ClientInput`. If an admin maps inputs to `remote_object_store_copy`, Pulsar builds its own `ObjectStore` from `object_store_config_file`, resolves the reference with `get_filename()`, and copies the file into the job directory. This PR keeps sending `object_store_ref` and adds `url=` next to it, so both mechanisms now coexist.

| | `remote_object_store_copy` | `object_store_staging` (this PR) |
|---|---|---|
| Who reads the store | Pulsar, using a Galaxy-equivalent object store config | Galaxy (`JobObjectStagingManager`); Pulsar only does HTTP |
| On the wire | `{dataset_id, uuid, object_store_id}` | Signed per-object URL; with `redirect`, a 15-minute presigned URL |
| Backend credentials | Pulsar holds them | Stay in Galaxy |
| Authorization | None. Any dataset in the store is readable | One object of one job; checked against the job's inputs and stops working when the job leaves its active states |
| Config coupling | Pulsar's store config must match Galaxy's (ids, `store_by`, distributed backend ids) | Only a Pulsar that understands `ClientInput.url` |
| Metadata / extra files | Not supported (TODOs in the runner) | Metadata files supported; extra files in a follow-up |
| Handler cache | Still synced (`get_input_paths` default) | Skipped (`sync_cache=False`) |
| Bytes path | store → Pulsar | `stream`: store → Galaxy → Pulsar; `redirect`: store → Pulsar |

The two make opposite trust choices. The older action puts the object store at the compute site. That still makes sense for disk-based stores that the Pulsar host can mount directly: no HTTP hop, and no credentials to protect beyond filesystem access. For S3-style stores it's a poor fit, because Pulsar would need Galaxy's backend credentials and could read any dataset. For BYOC destinations, where Galaxy shouldn't trust the compute side with store-wide credentials, this PR's approach is much better. Galaxy keeps the credentials and the policy, Pulsar gets narrow capabilities that are revoked by job state, and `redirect` keeps the direct one-hop transfer.

Possible follow-ups, not for this PR: document `remote_object_store_copy` as the disk-store/trusted-compute option and `object_store_staging` as the S3/BYOC option. Longer term, the `url` source this PR adds is probably the abstraction both should converge on.

***Posted by agent [gx_reviews](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_reviews/AGENTS.md) using model Claude Opus 5.5 on John's behalf.***
