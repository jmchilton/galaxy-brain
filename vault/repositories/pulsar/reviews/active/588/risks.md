The one lasting commitment is wire protocol: an optional `executable` query arg on `POST /jobs/{job_id}/files` and an optional `"executable"` key in remote staging setup entries, which future Pulsar servers and clients must keep honoring. Everything else can be reverted cheaply.

<details><summary>Risk Details</summary>

- New protocol surface: once released, clients send `executable=True` and staging entries carry `"executable": true`. Dropping support later means tool helper scripts silently lose their execute bits again, with no error.
- Mixed versions work both ways. Older servers drop unknown query args (`build_func_args` filters by the function signature) and never read the extra staging key, so jobs behave as they do today. A new server talking to an old client just never sees the flag.
- Behavior change on the server: Pulsar now runs `chmod` on staged tool files in job directories. `add_executable_bits` only sets an execute bit where the matching read bit already exists, so permissions never get wider than the umask allowed. Still, files that used to be non-executable will now be executable.
- Scope: this applies only to `path_type.TOOL` files on the upload, copy and remote-staging paths. `rsync`, `scp` and object-store actions are remote staging actions, so `preprocess` covers them too. Hardlinked files share the source inode, so a chmod on them changes Galaxy's original tool file. As submitted, `remote_hardlink` does exactly that (P1 1).
- `routes.py` now imports `asbool` from `galaxy.util`. `galaxy-util` is already a dependency, so the risk is low.

</details>

<details><summary>Risk Review Advice</summary>

Check that the flag name and semantics (`executable`: a boolean that only ever adds bits, gated on the read bits) are what maintainers want to support long term, since that is the only part that is hard to undo. Also confirm that adding execute bits to tool files in job directories is acceptable under the deployment's security posture. A client can request it, but only inside the job directory it already controls.

</details>
