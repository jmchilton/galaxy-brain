# Real-kernel OOM-kill demo (2026-11-03)

Galaxy `job_script(check_cgroup_oom_kills=True)` at `05c139c38a0`, rendered by [render_and_check.py](render_and_check.py). The command is `python3 -c 'bytearray(512 * 1024 * 1024)' | cat > out.txt`, followed by Galaxy's usual `sh -c "exit $return_code"`. It ran under Docker Desktop 29.9.2 (cgroup v2 kernel):

```sh
docker run --rm --memory=128m --memory-swap=128m --cgroupns=private -v $PWD/gjob:/job \
  quay.io/biocontainers/python:3.13 sh /job/galaxy_1.sh
```

```
job script exit: 0
job stderr:
galaxy: Detected 1 oom-kill event(s) in the job's memory cgroup.
oom_kill_job_messages(job stderr):
[{'type': 'regex', 'stream': 'job_stderr', 'desc': "Out of memory error: galaxy: Detected 1 oom-kill event(s) in the job's memory cgroup.", 'code_desc': None, 'match': "galaxy: Detected 1 oom-kill event(s) in the job's memory cgroup.", 'error_level': 4}]
```

The Docker CLI's amd64-on-arm64 platform warning is left out of the stderr capture. Pulsar's `job_script` gives the same line ([Pulsar demo](../../../../../pulsar/branches/active/cgroup-oom-kills-408/demo/real_kernel_oom_demo.md)).
