"""Render a Galaxy job script with the cgroup OOM-kill check, or check a captured job stderr."""
import sys

from galaxy.jobs.runners.util.job_script import job_script
from galaxy.tool_util.output_checker import oom_kill_job_messages

if sys.argv[1] == "render":
    command = "python3 -c 'bytearray(512 * 1024 * 1024)' | cat > /job/working/out.txt; return_code=$?; sh -c \"exit $return_code\""
    with open(sys.argv[2], "w") as f:
        f.write(job_script(working_directory="/job/working", command=command, check_cgroup_oom_kills=True))
else:
    with open(sys.argv[2]) as f:
        print(oom_kill_job_messages(f.read()))
