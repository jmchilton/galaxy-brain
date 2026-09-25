Supersedes #1438.

## Motivation

When a workflow test embeds its job definition directly in the test YAML, Planemo currently serializes that job to a temporary JSON file beside the test definition. This briefly modifies the source checkout and requires the source directory to be writable.

#1438 correctly proposed moving these generated files to the system temporary directory. However, the location of a job file is also the base directory for relative test-data paths, so moving the file without preserving that base breaks inputs such as `path: hello.txt`.

## Changes

- Materialize inline test jobs in a dedicated system temporary directory instead of the workflow or code directory.
- Resolve local `File` and `Directory` paths against the original test-definition directory before serialization.
- Preserve relative-path behavior for nested collections, secondary files, and composite inputs.
- Leave remote URIs, unrelated `path` parameters, and the original in-memory test definition unchanged.
- Clean up the complete temporary directory on success and on exceptions.

## Validation

- Added focused regression coverage for temporary-file placement, nested relative inputs, URI preservation, immutability, and exception cleanup.
- Passed 16 focused and adjacent engine tests.
- Passed `test_galaxy_workflow_nested_collection_inputs` against a real managed Galaxy, exercising nested collections whose inputs use relative `hello.txt` paths.
- Passed Black, isort, flake8, and `git diff --check` for the changed files.
