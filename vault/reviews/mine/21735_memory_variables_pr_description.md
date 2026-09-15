# Set Galaxy memory variables in GB and support memory overhead

This supersedes #21735 and preserves Nate Coraor's authorship on the original commits.
It rebases the work onto current `dev` and incorporates the discussion on the original
pull request.

## Summary

Galaxy already exposes scheduler memory allocations as `GALAXY_MEMORY_MB` and
`GALAXY_MEMORY_MB_PER_SLOT`. This also derives `GALAXY_MEMORY_GB` and
`GALAXY_MEMORY_GB_PER_SLOT`, so tool wrappers do not each need their own conversion.

Destinations can configure an additive `GALAXY_MEMORY_MB_OVERHEAD` when the tool's
own memory limit must remain below the scheduler's hard allocation. An optional
`GALAXY_MEMORY_MB_FLOOR`, defaulting to 256 MB, prevents that subtraction from
producing an unusably small value without ever raising the advertised memory above
the scheduler's original allocation.

The additive model is intentional: a proportional overhead can waste very large
amounts of memory on high-memory jobs, while the usual requirement is to reserve a
small fixed amount for processes and runtime overhead outside the tool's own limit.

## Review follow-up

- Normalize total and per-slot MB values before applying overhead. This makes the
  feature work when a runner such as SGE initially supplies only per-slot memory.
- Recalculate per-slot memory after subtracting overhead so all derived variables remain
  internally consistent.
- Cap floor handling at the scheduler allocation so a low-memory job never receives
  a larger advertised limit.
- Derive per-slot GB directly from per-slot MB rather than from an already rounded
  total-GB value.
- Round derived GB values down and leave them unset below 1 GB instead of claiming a
  1 GB per-slot allocation that may exceed the scheduler limit.
- Pass both GB variables through to containerized tools as well as native jobs.
- Document both GB variables for wrapper authors and clarify the behavior and default
  floor in the sample job configuration.

## Tests

The focused tests execute the real generated shell fragment and cover:

- total and per-slot MB-to-GB conversion;
- an SGE-shaped per-slot-only allocation with overhead;
- floor handling and sub-GB per-slot behavior;
- a scheduler allocation below the default floor;
- container environment pass-through.

Local validation:

- `test/unit/app/jobs/test_job_script.py`: 5 passed.
- Ruff, Black, isort, and flake8 pass for the changed Python files.
- `bash -n` passes for the memory statement template.
- `git diff --check` passes.

## How to test the changes?

- [x] I've included appropriate automated tests.

## License

- [x] I agree to license these and all my past contributions to the core Galaxy
  codebase under the MIT license.
