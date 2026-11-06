# Re-scope review debrief

The re-scope commit `bf1ec9728a6` passed review with no blocking or substantive findings. Every factual claim in the new comments checks out: the action list matches Pulsar's `ACTION_CLASSES`, `message` is correctly omitted, `pulsar_rest` defaults to `transfer`, and the uncommented YAML line was an artifact of the XML-to-YAML conversion in `1cdb7b5bcd1`. I made no changes.

Not acted on (all optional and low):
- Noting that `rewrite`/rsync/scp need extra per-path settings. The text already says "per path basis ... See Pulsar documentation".
- Stating the `transfer` default. That would be new wording in a release-branch docs fix.
- Switching to a comma-separated list. Purely style.
- The commit stays last so it can be dropped or split off if a reviewer objects.

<details><summary>Full review</summary>

Run via Opus at low effort.

# Re-scope review: bf1ec9728a6 "Fix Pulsar file action docs in the sample job confs"

**Verdict: good to go. No blocking or substantive findings.** I checked every factual claim in the new comments against the code. The only things left are optional polish nits.

## Verification

- **Action names.** The new list is `none|transfer|copy|rewrite|remote_copy|remote_transfer|remote_transfer_tus|remote_object_store_copy|remote_rsync_transfer|remote_scp_transfer`. It matches `ACTION_CLASSES` in the installed `pulsar/client/action_mapper.py` exactly, all 10 entries. The installed version is pulsar-galaxy-lib 0.15.14, the same version pinned in `lib/galaxy/dependencies/pinned-requirements.txt`. `http` isn't an action type, so removing it is correct.
- **`message` correctly left out.** `MessageAction` (`action_type = "message"`) appears only in `DICTIFIABLE_ACTION_CLASSES`, for serialization. It isn't in `ACTION_CLASSES` / `actions`. So both `__action_class` and `BasePathMapper` would reject it with "Unknown action_type", which means it can't be configured as a default or a per-path action.
- **Default for pulsar_rest.** `PulsarRESTJobRunner.destination_defaults` has `default_file_action="transfer"`, in `lib/galaxy/jobs/runners/pulsar.py`. So commenting out `none` turns the sample destination into a normal HTTP-staging destination. That matches the "Uncomment ... to disable file staging" wording. The existing phrase "replace http transfers with file system copies" is also still accurate.
- **YAML vs XML parity.** The XML sample keeps `<!-- <param id="default_file_action">none</param> -->` commented, and the YAML now matches it. `git log -S` shows the uncommented line came from `1cdb7b5bcd1` "Replace XML job conf sample with YAML.", so it was a conversion artifact, not a deliberate choice. Restoring the comment is the right fix.
- **Typo fix.** The `galaxy_infrastructure_url1` → `` `galaxy_infrastructure_url` `` change is correct.
- **Dependents.**
  - `test/unit/app/jobs/test_job_configuration.py` loads both samples and validates the YAML against the schema (around line 417). It asserts nothing about `secure_pulsar_rest_dest` or `default_file_action`.
  - `grep` finds no other test, doc or code that references the line.
  - `doc/source/admin/jobs.md` and `scaling.md` only link to the samples.
  - `pytest test/unit/app/jobs/test_job_configuration.py test/unit/app/jobs/test_pulsar_compute_environment.py`: 47 passed.
- **Merge-forward.** `origin/dev` has no diff in these lines relative to release_25.1, so the commit should merge forward cleanly.
- **Interaction with the code fix.** There is none. The code fix (`input/output_extra_files_rewrite` falling back to `dataset.extra_files_path`) makes `none` work for extra files. With that in place, "set `none` to disable staging" is accurate advice for shared-FS setups. The incubating `none` + `remote_metadata: true` bug sits in the same `secure_pulsar_rest_dest` block (`#remote_metadata: true`), but it stays out of scope, as scope_evaluation.md recommends.

## Findings (ranked; all optional, low)

1. **Some listed actions need extra per-path keys** (nit). `rewrite` needs `source_directory`/`destination_directory`, and the rsync/scp actions need SSH settings. That makes them per-path only in practice; they aren't usable as `default_file_action`. The sentence already says "configured on a per path basis ... See Pulsar documentation", so this is acceptable as is. Optionally add "(some require extra per-path settings)". I'd leave it.
2. **Mention the default** (nit). The prose implies the default without stating it. Optionally add "Defaults to 'transfer' (Galaxy pushes/pulls files over HTTP)" after the uncomment line, so a reader knows what commenting the line out gives them. This is new wording, not a fix, so skipping it is fine for a release-branch PR.
3. **Line-wrapped `|` list** (cosmetic). The list breaks across lines with a trailing `|`, and the result reads a little awkwardly. A comma-separated list ("one of: none, transfer, copy, ...") would read better, but this is purely style.
4. **PR framing** (process). This is a docs-only change in a bug-fix PR. The commit stands alone and can be dropped or split into its own PR if a reviewer pushes back, as Option 3 in scope_evaluation.md describes. Keep it as the last commit, as it is now.

No security concerns.

</details>
