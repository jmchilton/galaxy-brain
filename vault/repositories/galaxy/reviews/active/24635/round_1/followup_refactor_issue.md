# Follow-up: adopt `image_references` across container code

#24635 added `galaxy.tool_util.deps.image_references` to `release_26.2`. It provides a Docker-CLI-compatible image reference parser and `ContainerAllowlist`. Several places still split image references by hand on the last `:`. That breaks on registry ports and digests, which is the bug the PR fixed in `biocontainer_tag_built`.

## Migrate ad-hoc image parsing to `parse_image_reference`

Candidates (check each one, since some handle Singularity paths or mulled hashes rather than Docker references):

- `lib/galaxy/tool_util/deps/container_resolvers/mulled.py` `identifier_to_cached_target` (`identifier.rsplit(":", 1)`)
- `lib/galaxy/tool_util/deps/container_resolvers/mulled.py` `_version_sorted_per_image_name` (`name.rsplit(":", 1)[0]`)
- `lib/galaxy/tool_util/deps/mulled/mulled_build.py` tag-suffix helper (`rfind(":")` / `rsplit(":", 1)`)
- `lib/galaxy/tool_util/deps/mulled/mulled_search.py` (`container.split(":")`)
- `lib/galaxy/tool_util/deps/requirements.py` `ContainerDescription` lowercasing (`rsplit(":", 1)`, which lowercases the tag of a `name:tag@digest` reference; it also handles filesystem paths, so it may need to stay separate)

Add a `str()`/`format` round-trip on `ImageReference` if callers need to rebuild a reference.

## Tests

`test_image_references.py` covers the parser and `ContainerAllowlist`. For each migrated caller, add parser cases for its inputs (port, digest, cached Singularity path), red first.
