- [x] P2 1: Pulsar `remote_container_handling` resolves the container before `prepare()` rejects the job
- [x] P2 2: The allowlist rejection message is duplicated in the manager and `JobWrapper.prepare`
- [x] P2 3: Pulsar's prepare-time rejection has no end-to-end test, and nothing pins its no-resubmit behavior
- [x] P2 4: `_store_tool_row` is copy-pasted between integration test files
- [x] P3 1: The Pulsar rejection unit test fails without the fix only because a fake attribute is missing
- [x] P3 2: The allowed-container and admin-tool job paths are only unit-tested
- [x] P3 3: The linter's `.strip()` hides whitespace that the parser and allowlist reject
- [x] P3 4: Importing a workflow that embeds a disallowed user tool is untested
- [x] P3 5: `biocontainer_tag_built` hardcodes the quay.io registry next to the existing constants
- [x] P3 6: `ContainerAllowlist` has two attributes called "entries" with different meanings

Other Actions:
