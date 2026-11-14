"""Run pulsar-submit / pulsar-finish from staging images the way a TES task does.

Each scenario runs the executors as `docker run --read-only` containers sharing a
named volume at /pulsar_staging, against a throwaway RabbitMQ, and records exit
codes and the status messages that reached the broker.

Usage (Pulsar dev venv python, for kombu):
  verify.py NEW_IMAGE OLD_IMAGE

Environment: PULSARFIX_AMQP_USER, PULSARFIX_AMQP_PASS, PULSARFIX_AMQP_PORT,
PULSARFIX_GALAXY_PORT (fake Galaxy, started by verify.sh), PULSARFIX_CLOSED_PORT.
Output is redacted: no broker credentials, job keys or base64 arguments.
"""
import base64
import json
import os
import re
import subprocess
import sys
import time
import uuid

import kombu

NEW_IMAGE, OLD_IMAGE = sys.argv[1], sys.argv[2]
HOST_IP = "172.17.0.1"
USER = os.environ["PULSARFIX_AMQP_USER"]
PASS = os.environ["PULSARFIX_AMQP_PASS"]
AMQP_PORT = int(os.environ["PULSARFIX_AMQP_PORT"])
GALAXY_PORT = int(os.environ["PULSARFIX_GALAXY_PORT"])
CLOSED_PORT = int(os.environ["PULSARFIX_CLOSED_PORT"])
JOB_ID = "42"


def redact(text):
    text = text.replace(PASS, "REDACTED")
    text = re.sub(r"amqp://[^@\s]*@", "amqp://REDACTED@", text)
    text = re.sub(r"job_key=[^&\s'\"]+", "job_key=REDACTED", text)
    return re.sub(r"[A-Za-z0-9+/=]{80,}", "<base64 redacted>", text)


def b64(obj):
    return base64.b64encode(json.dumps(obj).encode()).decode()


def say(text=""):
    print(redact(text), flush=True)


class Scenario:
    def __init__(self, name, galaxy_port=GALAXY_PORT, amqp_port=AMQP_PORT):
        self.name = name
        self.prefix = "pulsarfix_%s" % uuid.uuid4().hex[:8]
        self.volume = "wes-tes-pulsarfix-%s" % self.prefix
        self.host_amqp_url = f"amqp://{USER}:{PASS}@127.0.0.1:{AMQP_PORT}//"
        container_amqp_url = f"amqp://{USER}:{PASS}@{HOST_IP}:{amqp_port}//"
        # Shaped like Galaxy's PulsarTesJobRunner job: the job key is fake.
        files_endpoint = f"http://{HOST_IP}:{galaxy_port}/api/jobs/{JOB_ID}/files?job_key=not-a-real-key"
        self.app_conf = {
            "staging_directory": "/pulsar_staging",
            "persistence_directory": "/pulsar_staging/persisted_data",
            "message_queue_url": container_amqp_url,
            "amqp_key_prefix": self.prefix,
            "manager": {"type": "coexecution", "monitor": "none"},
        }
        input_path = "/galaxy/files/dataset_1.dat"
        self.launch = {
            "job_id": JOB_ID,
            "setup": True,
            "setup_params": {"job_id": JOB_ID},
            "command_line": "cat '/pulsar_staging/42/inputs/dataset_1.dat' > '/pulsar_staging/42/outputs/dataset_2.dat'",
            "remote_staging": {
                "setup": [{
                    "name": "dataset_1.dat",
                    "type": "input",
                    "action": {
                        "action_type": "remote_transfer",
                        "path": input_path,
                        "source": {"path": input_path},
                        "url": files_endpoint + "&path=" + input_path + "&file_type=input",
                    },
                }],
                "action_mapper": {"default_action": "remote_transfer", "files_endpoint": files_endpoint},
                "client_outputs": {
                    "working_directory": "/galaxy/working",
                    "metadata_directory": None,
                    "output_files": ["/galaxy/working/dataset_2.dat"],
                    "dynamic_outputs": [],
                    "dynamic_file_sources": None,
                },
            },
        }
        self.queue = kombu.Queue(
            "%s_status_update" % self.prefix,
            kombu.Exchange("pulsar", "direct", durable=True),
            routing_key="%s_status_update" % self.prefix,
        )
        with kombu.Connection(self.host_amqp_url) as conn:
            self.queue(conn.default_channel).declare()
        subprocess.run(["docker", "volume", "create", self.volume], check=True, capture_output=True)

    def run(self, image, script, *extra, unset_dependency_env=False, show_log=True):
        args = [script]
        if script == "pulsar-submit":
            args.append("--no-wait")
        args += ["--base64", b64(self.launch), "--app_conf_base64", b64(self.app_conf)]
        if unset_dependency_env:
            args = ["env", "-u", "PULSAR_CONFIG_TOOL_DEPENDENCY_DIR", *args]
        cmd = ["docker", "run", "--rm", "--read-only", "-v", f"{self.volume}:/pulsar_staging", "-w", "/", *extra, image, *args]
        start = time.time()
        proc = subprocess.run(cmd, capture_output=True, text=True)
        elapsed = time.time() - start
        say(f"$ docker run --rm --read-only -v <staging volume>:/pulsar_staging {' '.join(extra)} {image} {' '.join(args[:3] if unset_dependency_env else args[:2])} ...")
        say(f"exit code: {proc.returncode} ({elapsed:.1f} s)")
        if show_log:
            interesting = [
                line for line in (proc.stdout + proc.stderr).splitlines()
                if re.search(r"ERROR|Error|error|Traceback|Exception|exit|status|Read-only", line)
            ]
            for line in interesting[-12:]:
                say("  | " + line[:300])
        return proc.returncode

    def tool(self, image):
        proc = subprocess.run(
            ["docker", "run", "--rm", "--read-only", "-v", f"{self.volume}:/pulsar_staging", image,
             "sh", "-c", "test -e /pulsar_staging/42/command_line && sh /pulsar_staging/42/command_line"],
            capture_output=True, text=True,
        )
        say(f"tool executor (sh /pulsar_staging/42/command_line): exit code {proc.returncode}")
        return proc.returncode

    def command_line_written(self, image):
        proc = subprocess.run(
            ["docker", "run", "--rm", "-v", f"{self.volume}:/pulsar_staging", image,
             "test", "-e", "/pulsar_staging/42/command_line"],
        )
        return proc.returncode == 0

    def messages(self):
        payloads = []
        with kombu.Connection(self.host_amqp_url) as conn:
            queue = self.queue(conn.default_channel)
            while True:
                message = queue.get(no_ack=True)
                if message is None:
                    break
                payloads.append(message.decode())
        for payload in payloads:
            stderr = (payload.get("stderr") or "").strip()
            say(f"published: status={payload['status']!r} stderr={stderr[:400]!r}")
        if not payloads:
            say("published: nothing")
        return [p["status"] for p in payloads]

    def cleanup(self):
        with kombu.Connection(self.host_amqp_url) as conn:
            self.queue(conn.default_channel).delete()
        subprocess.run(["docker", "volume", "rm", self.volume], check=True, capture_output=True)


def header(text):
    say()
    say("## " + text)
    say()


results = []


def check(name, ok):
    results.append((name, ok))
    say(f"CHECK {'PASS' if ok else 'FAIL'}: {name}")


header(f"A. Stage-in from an unreachable Galaxy, {NEW_IMAGE}")
s = Scenario("A", galaxy_port=CLOSED_PORT)
code = s.run(NEW_IMAGE, "pulsar-submit")
statuses = s.messages()
check("A: pulsar-submit exits non-zero", code != 0)
check("A: publishes exactly ['failed']", statuses == ["failed"])
check("A: no command_line written", not s.command_line_written(NEW_IMAGE))
s.cleanup()

header(f"B. Same, before the fix: {OLD_IMAGE}")
s = Scenario("B", galaxy_port=CLOSED_PORT)
code = s.run(OLD_IMAGE, "pulsar-submit")
statuses = s.messages()
check("B: old image exits 0 (the bug)", code == 0)
s.cleanup()

header(f"C. Stage-in failure with the broker unreachable too, {NEW_IMAGE}")
s = Scenario("C", galaxy_port=CLOSED_PORT, amqp_port=CLOSED_PORT)
code = s.run(NEW_IMAGE, "pulsar-submit")
statuses = s.messages()
check("C: pulsar-submit exits non-zero with no broker", code != 0)
s.cleanup()

header(f"D. Success path, read-only root, no PULSAR_CONFIG_TOOL_DEPENDENCY_DIR, {NEW_IMAGE}")
env = subprocess.run(["docker", "image", "inspect", "-f", "{{json .Config.Env}}", NEW_IMAGE], capture_output=True, text=True).stdout.strip()
say(f"image Env: {env}")
check("D: image sets no PULSAR_CONFIG_TOOL_DEPENDENCY_DIR", "PULSAR_CONFIG_TOOL_DEPENDENCY_DIR" not in env)
s = Scenario("D")
code_submit = s.run(NEW_IMAGE, "pulsar-submit")
code_tool = s.tool(NEW_IMAGE)
code_finish = s.run(NEW_IMAGE, "pulsar-finish")
statuses = s.messages()
uploaded = os.path.join(os.environ["PULSARFIX_UPLOAD_DIR"], "dataset_2.dat")
contents = open(uploaded).read() if os.path.exists(uploaded) else None
say(f"output received by fake Galaxy: {contents!r}")
check("D: submit, tool and finish exit 0", (code_submit, code_tool, code_finish) == (0, 0, 0))
check("D: publishes ['running', 'complete']", statuses == ["running", "complete"])
check("D: output staged back", contents == "cow file contents\n")
s.cleanup()

header(f"F. Read-only root without the image's dependency dir ENV, old vs new code")
s = Scenario("F")
code_old = s.run(OLD_IMAGE, "pulsar-submit", unset_dependency_env=True)
s.messages()
check("F: old code without the ENV fails on the read-only root", code_old != 0)
s.cleanup()
s = Scenario("F2")
code_new = s.run(NEW_IMAGE, "pulsar-submit", unset_dependency_env=True)
s.messages()
check("F: new code without the ENV starts and submits", code_new == 0)
s.cleanup()

header(f"E. Stage-out failure (fake Galaxy answers 500 to uploads), {NEW_IMAGE}")
s = Scenario("E", galaxy_port=int(os.environ["PULSARFIX_REJECT_PORT"]))
code_submit = s.run(NEW_IMAGE, "pulsar-submit")
s.tool(NEW_IMAGE)
code_finish = s.run(NEW_IMAGE, "pulsar-finish")
statuses = s.messages()
check("E: submit exits 0", code_submit == 0)
check("E: pulsar-finish exits non-zero", code_finish != 0)
check("E: publishes ['running', 'failed']", statuses == ["running", "failed"])
s.cleanup()

say()
say("Summary: %d/%d checks passed" % (sum(ok for _, ok in results), len(results)))
sys.exit(0 if all(ok for _, ok in results) else 1)
