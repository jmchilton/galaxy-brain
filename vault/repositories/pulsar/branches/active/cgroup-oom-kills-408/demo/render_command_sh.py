"""Render a Pulsar job script with the cgroup OOM-kill check for a real-kernel demo."""
import sys

from pulsar.managers.util.job_script import job_script

out, check = sys.argv[1], sys.argv[2] == "on"
command = (
    "python3 -c 'bytearray(512 * 1024 * 1024)' | cat > /job/working/out.txt; "
    "return_code=$?; echo $return_code > /job/metadata/return_code;"
)
with open(out, "w") as f:
    f.write(job_script(working_directory="/job/working", metadata_directory="/job/metadata", command=command, check_cgroup_oom_kills=check))
