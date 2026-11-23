# Follow-up: adopt `image_references` across container code; one enforcement point for user-tool container policy

#24635 added `galaxy.tool_util.deps.image_references` (a Docker-CLI-compatible image reference parser) to `release_26.2`. Several places still split image references by hand on the last `:`. That breaks on registry ports and digests, which is the bug the PR fixed in `biocontainer_tag_built`.

## 1. Migrate ad-hoc image parsing to `parse_image_reference`

Candidates (check each one, since some handle Singularity paths rather than Docker refs):

- `lib/galaxy/tool_util/deps/container_resolvers/mulled.py` `identifier_to_cached_target` (`identifier.rsplit(":", 1)`)
- `lib/galaxy/tool_util/deps/container_resolvers/mulled.py` `_version_sorted_per_image_name` (`name.rsplit(":", 1)[0]`)
- `lib/galaxy/tool_util/deps/mulled/mulled_build.py` tag-suffix helper (`rfind("/")`/`rfind(":")`)
- `lib/galaxy/tool_util/deps/mulled/mulled_search.py` (`container.split(":")`)
- `lib/galaxy/tool_util/deps/requirements.py` `ContainerDescription` lowercasing (`rsplit(":", 1)`; mixes filesystem paths, so it may need to stay separate)

Add a `str()`/`format` round-trip on `ImageReference` if callers need to rebuild a reference.

## 2. Single runner-agnostic enforcement point for user-defined tool containers

The job-time allowlist check is inside `BaseJobRunner._find_container`. That helper has about 8 call sites across runners with different error contracts, so Pulsar needed a bespoke `except`. Move the check to one hook that runs once per job before any runner resolves a container, for example a `DynamicToolManager.ensure_tool_containers_allowed(tool)` call from the job handler/`JobWrapper` preparation path that Pulsar's remote-container branch also passes through. Then drop the per-runner exception handling.

## Tests

Existing unit tests (`test_image_references.py`, `test_user_defined_tool_container_allowlist.py`, `test_pulsar_runner.py`) cover the behavior. Add parser cases for each migrated caller's inputs (port, digest, cached Singularity path) red-first.
