- [x] P2 1: The allowlist check and its rejection message are duplicated in the manager and the runner
- [x] P2 2: The job-time guard is tested through heavy mocks that integration tests can replace
- [x] P2 3: The Pulsar refusal path has no integration coverage
- [x] P2 4: `_store_tool_row` is copy-pasted between integration test files
- [x] P3 1: The container rejection is placed and handled differently from the sibling role recheck (#24607)
- [x] P3 2: The linter's `.strip()` hides whitespace that the parser and allowlist reject
- [x] P3 3: Importing a workflow that embeds a disallowed user tool is untested
- [x] P3 4: `biocontainer_tag_built` hardcodes the quay.io registry next to the existing constants
- [x] P3 5: `ContainerAllowlist` has two attributes called "entries" with different meanings

Other Actions:
