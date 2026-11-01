# Follow-up: adopt `image_references` across container code; one enforcement point for user-tool rejections

#24635 added `galaxy.tool_util.deps.image_references` (a Docker-CLI-compatible image reference parser and `ContainerAllowlist`) to `release_26.2`. Several places still split image references by hand on the last `:`. That breaks on registry ports and digests, which is the bug the PR fixed in `biocontainer_tag_built`.

## 1. Migrate ad-hoc image parsing to `parse_image_reference`

Candidates (check each one, since some handle Singularity paths rather than Docker refs):

- `lib/galaxy/tool_util/deps/container_resolvers/mulled.py` `identifier_to_cached_target` (`identifier.rsplit(":", 1)`)
- `lib/galaxy/tool_util/deps/container_resolvers/mulled.py` `_version_sorted_per_image_name` (`name.rsplit(":", 1)[0]`)
- `lib/galaxy/tool_util/deps/mulled/mulled_build.py` tag-suffix helper (`rfind("/")`/`rfind(":")`)
- `lib/galaxy/tool_util/deps/mulled/mulled_search.py` (`container.split(":")`)
- `lib/galaxy/tool_util/deps/requirements.py` `ContainerDescription` lowercasing (`rsplit(":", 1)`, which lowercases the tag of a `name:tag@digest` reference; it also handles filesystem paths, so it may need to stay separate)

Add a `str()`/`format` round-trip on `ImageReference` if callers need to rebuild a reference.

## 2. One runner-agnostic enforcement point for user-defined tool rejections

The job-time allowlist check is inside `BaseJobRunner._find_container`. That helper has about 8 call sites across runners. Rejections from it need a fourth entry in the `prepare_job` except-tuple and a bespoke `except ContainerNotAllowedError` arm in `PulsarJobRunner.__prepare_job`.

The sibling execute-role recheck (#24607) lives in `JobWrapper.prepare` and is handled differently on Pulsar: it goes through `fail_job`, so it can be resubmitted, while the container refusal bypasses it. Both are deterministic rejections of a user-defined tool.

Move the container check next to the role recheck in `JobWrapper.prepare`, for example as a `DynamicToolManager.ensure_tool_containers_allowed(tool)` that raises from `ContainerAllowlist.rejection()`. Alternatively, derive both errors from one "job rejected" exception. Then handle that once per runner, with the same no-resubmit semantics for both, and drop the per-runner arms.

## Tests

`test_image_references.py` covers the parser and `ContainerAllowlist.rejection()`. `test/integration/test_user_defined_tool_container_allowlist.py` covers creation, job-time rejection on the local runner and on embedded Pulsar, and workflow import. For section 1, add parser cases for each migrated caller's inputs (port, digest, cached Singularity path), red first. For section 2, add an embedded-Pulsar case for a role revoked after queueing, asserting the same failure handling as the container refusal.
