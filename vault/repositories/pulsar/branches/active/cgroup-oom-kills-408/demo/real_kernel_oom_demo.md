# Real-kernel OOM-kill demo (2026-11-03)

Pulsar `job_script()` at `63969ff` rendered by [render_command_sh.py](render_command_sh.py) (command: `python3 -c 'bytearray(512 * 1024 * 1024)' | cat > /job/working/out.txt`), run with Docker Desktop 29.9.2 (cgroup v2 kernel):

```sh
docker run --rm --memory=128m --memory-swap=128m --cgroupns=private -v $PWD/job:/job \
  quay.io/biocontainers/python:3.13 sh /job/command_<off|on>.sh
```

```
=== check_cgroup_oom_kills=off
job script exit: 0, recorded return_code: 0
job stderr:
=== check_cgroup_oom_kills=on
job script exit: 0, recorded return_code: 0
job stderr:
galaxy: Detected 1 oom-kill event(s) in the job's memory cgroup.
```

(The Docker CLI's amd64-on-arm64 platform warning is omitted from both stderr captures.)
