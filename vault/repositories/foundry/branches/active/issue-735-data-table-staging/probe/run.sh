#!/bin/bash
# Run red then green, from an unrelated cwd, no data-table flags.
S="$1"; cd "$S" || exit 1
for v in red green; do
  mkdir -p "$S/out-$v"; (cd /tmp && uvx --from planemo==0.75.47 planemo test --galaxy_branch release_26.1 --galaxy_python_version 3.11 --no_dependency_resolution --test_output_json "$S/out-$v/out.json" --test_output "$S/out-$v/out.html" "$S/$v/wf.gxwf.yml") > "$S/out-$v/log.txt" 2>&1
  echo "$v exit=$?" >> "$S/result.txt"
done
